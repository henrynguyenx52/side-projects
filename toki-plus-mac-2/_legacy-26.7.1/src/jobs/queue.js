const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const store = require('../data/store');
const { RunningHubClient } = require('../runninghub/client');

class JobQueue {
  constructor() {
    this.isProcessing = false;
    this.activeWorkers = 0;
    this.listeners = new Set();
    this.runningJobIds = new Set();
    this.abortControllers = new Map();
  }

  onEvent(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emitEvent(type, data) {
    for (const cb of this.listeners) {
      try { cb(type, data); } catch (e) {}
    }
  }

  notifyUpdate(job) {
    this.emitEvent('job_update', job);
  }

  start() {
    // 1. Phục hồi một lần duy nhất khi khởi động
    this.resumeUnfinishedJobs();

    // 2. Vòng lặp điều phối hàng đợi nhẹ nhàng (5s/lần)
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processNext();
    }, 5000);

    // 3. Watchdog giám sát chống treo/kẹt luồng (30s/lần)
    if (!this.watchdogTimer) {
      this.watchdogTimer = setInterval(() => {
        this.runWatchdog();
      }, 30000);
    }

    this.processNext();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Watchdog: Tự động kiểm tra và giải phóng các job bị kẹt bất thường
   */
  runWatchdog() {
    try {
      const jobs = store.getJobs();
      const now = Date.now();

      for (const job of jobs) {
        // Nếu job ghi 'running' nhưng không có worker nào trong bộ nhớ đang xử lý (sau restart hoặc crash ngầm)
        if (job.status === 'running' && !this.runningJobIds.has(job.id)) {
          const elapsed = now - (job.startedAt || now);
          // Nếu đã chạy dở và có TaskId, kích hoạt lại để lấy kết quả
          if (job.taskId) {
            console.log(`[Watchdog] Tác vụ ${job.id} (Task: ${job.taskId}) đang chạy dở. Đang khôi phục kiểm tra kết quả...`);
            const accounts = store.getAccounts();
            let account = accounts.find(a => a.id === job.accountId) || accounts.find(a => a.status === 'active');
            if (account) {
              this.runningJobIds.add(job.id);
              this.activeWorkers++;
              this.executeJob(job, account)
                .catch(err => console.error(`[Watchdog Job ${job.id}] Uncaught error:`, err))
                .finally(() => {
                  this.runningJobIds.delete(job.id);
                  this.activeWorkers--;
                  this.processNext();
                });
            }
          } else if (elapsed > 180000) {
            // Chưa có TaskId mà kẹt quá 3 phút -> đưa lại về pending
            console.log(`[Watchdog] Tác vụ ${job.id} chưa có TaskId bị kẹt. Đang đưa lại về hàng đợi...`);
            store.updateJob(job.id, {
              status: 'pending',
              progress: 0,
              phase: 'Hệ thống tự động đưa lại vào hàng đợi...'
            });
            this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
            this.processNext();
          }
        }
      }
    } catch (e) {
      console.error('[Watchdog] Lỗi kiểm tra:', e.message);
    }
  }

  /**
   * Tự động khôi phục các tác vụ đang chạy dở sau khi server restart
   */
  resumeUnfinishedJobs() {
    try {
      const jobs = store.getJobs();
      const runningJobs = jobs.filter(j => j.status === 'running');
      if (runningJobs.length === 0) return;

      const accounts = store.getAccounts();

      for (const job of runningJobs) {
        if (this.runningJobIds.has(job.id)) continue;

        if (job.taskId) {
          let account = accounts.find(a => a.id === job.accountId);
          if (!account) {
            account = accounts.find(a => a.status === 'active');
          }
          if (account) {
            console.log(`[JobQueue] Phát hiện tác vụ ${job.id} (Task: ${job.taskId}) đang chạy dở sau restart. Đang tiếp tục kiểm tra kết quả...`);
            this.runningJobIds.add(job.id);
            this.activeWorkers++;
            this.executeJob(job, account)
              .catch(err => console.error(`Job ${job.id} uncaught error:`, err))
              .finally(() => {
                this.runningJobIds.delete(job.id);
                this.activeWorkers--;
                this.processNext();
              });
          }
        } else {
          // Chưa gửi lên AI -> chuyển lại về pending để nạp lại
          store.updateJob(job.id, {
            status: 'pending',
            progress: 0,
            phase: 'Tự động đưa lại vào hàng đợi...'
          });
          this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
        }
      }
    } catch (e) {
      console.error('[JobQueue] Lỗi resumeUnfinishedJobs:', e.message);
    }
  }

  /**
   * Hủy một tác vụ (đang chạy hoặc đang chờ)
   */
  cancelJob(jobId) {
    const ctrl = this.abortControllers.get(jobId);
    if (ctrl) {
      try { ctrl.abort(); } catch (e) {}
      this.abortControllers.delete(jobId);
    }
    this.runningJobIds.delete(jobId);

    const job = store.getJobs().find(j => j.id === jobId);
    if (job && (job.status === 'running' || job.status === 'pending')) {
      store.updateJob(jobId, {
        status: 'failed',
        phase: 'Đã hủy bởi người dùng',
        error: 'Người dùng đã bấm hủy tác vụ này',
        completedAt: Date.now()
      });
      this.notifyUpdate(store.getJobs().find(j => j.id === jobId));
    }
    this.processNext();
    return true;
  }

  /**
   * Chạy lại một tác vụ bị lỗi (Retry)
   */
  retryJob(jobId) {
    const job = store.getJobs().find(j => j.id === jobId);
    if (!job) return false;

    this.runningJobIds.delete(jobId);
    if (this.abortControllers.has(jobId)) {
      try {
        this.abortControllers.get(jobId).abort();
      } catch (e) {}
      this.abortControllers.delete(jobId);
    }

    store.updateJob(jobId, {
      status: 'pending',
      progress: 0,
      phase: 'Sẵn sàng chạy lại...',
      error: null,
      taskId: null,
      accountId: null,
      resultUrl: null,
      outputPath: null,
      consumeCoins: null,
      taskCostTime: null,
      retryCount: 0,
      startedAt: null,
      completedAt: null
    });
    this.notifyUpdate(store.getJobs().find(j => j.id === jobId));
    this.processNext();
    return true;
  }

  async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const jobs = store.getJobs();
      const pendingJobs = jobs.filter(j => j.status === 'pending');
      if (pendingJobs.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Lấy danh sách tài khoản đang hoạt động (active)
      const accounts = store.getAccounts().filter(a => a.status === 'active');
      if (accounts.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Lấy danh sách các tài khoản đang bận chạy tác vụ trên hệ thống
      const busyAccountIds = new Set(
        jobs.filter(j => j.status === 'running').map(j => j.accountId).filter(Boolean)
      );

      // KHÔNG GIỚI HẠN SỐ LUỒNG: Chạy song song tối đa bằng đúng số API Key rảnh và đủ Coins!
      while (pendingJobs.length > 0) {
        const job = pendingJobs[0];
        const minCoins = (job.workflowId === 'runninghub-standard') ? 180 : 380;

        // Tìm tài khoản phù hợp
        const availableAccounts = accounts.filter(a =>
          !busyAccountIds.has(a.id) &&
          (a.currentTaskCounts === undefined || a.currentTaskCounts === 0) &&
          (typeof a.balance !== 'number' || a.balance >= minCoins)
        );

        if (availableAccounts.length === 0) {
          // Tất cả tài khoản có đủ coins đều đang bận
          store.updateJob(job.id, {
            phase: 'Đang xếp hàng chờ tài khoản AI trống luồng và đủ Coins...'
          });
          this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
          break;
        }

        // Bốc job và tài khoản phù hợp
        pendingJobs.shift();
        const account = availableAccounts[0];
        busyAccountIds.add(account.id);

        this.runningJobIds.add(job.id);
        this.activeWorkers++;
        this.executeJob(job, account)
          .catch(err => console.error(`Job ${job.id} uncaught error:`, err))
          .finally(() => {
            this.runningJobIds.delete(job.id);
            this.abortControllers.delete(job.id);
            this.activeWorkers--;
            this.processNext();
          });
      }
    } catch (err) {
      console.error('Queue loop error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async executeJob(job, account) {
    const abortCtrl = new AbortController();
    this.abortControllers.set(job.id, abortCtrl);

    store.updateJob(job.id, {
      status: 'running',
      progress: 5,
      phase: 'Đang chuẩn bị dữ liệu...',
      accountId: account.id,
      startedAt: job.startedAt || Date.now()
    });
    this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

    const client = new RunningHubClient(account.apiKey);

    try {
      // 0. Kiểm tra số dư và trạng thái tài khoản trên RunningHub
      const minRequiredCoins = (job.workflowId === 'runninghub-standard') ? 180 : 380;
      let accountInfo = null;
      try {
        accountInfo = await client.getAccountInfo();
        store.updateAccount(account.id, {
          balance: accountInfo.remainCoins,
          currentTaskCounts: accountInfo.currentTaskCounts,
          lastChecked: Date.now()
        });
      } catch (e) {}

      if (accountInfo) {
        if (typeof accountInfo.remainCoins === 'number' && accountInfo.remainCoins < minRequiredCoins) {
          // Tự động tạm ngưng tài khoản thiếu coin và trả job về hàng đợi cho tài khoản khác
          store.updateAccount(account.id, {
            balance: accountInfo.remainCoins,
            status: 'disabled',
            lastChecked: Date.now()
          });
          store.updateJob(job.id, {
            status: 'pending',
            progress: 0,
            phase: `Tài khoản "${account.name}" không đủ Coins (${accountInfo.remainCoins}), đang chuyển sang tài khoản khác...`
          });
          this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
          return;
        }
        if (accountInfo.currentTaskCounts > 0 && !job.taskId) {
          // Tài khoản đang có tác vụ khác đang chạy trên RunningHub -> tạm hoãn tác vụ này để chạy lại sau
          store.updateJob(job.id, {
            status: 'pending',
            progress: 0,
            phase: `Đang chờ tài khoản "${account.name}" hoàn tất tác vụ trước...`
          });
          this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
          return;
        }
      }

      let taskId = job.taskId;
      if (!taskId) {
        // 1. Upload Character Image
        store.updateJob(job.id, { progress: 15, phase: 'Đang tải ảnh nhân vật lên server AI...' });
        this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

        const imageUrl = await client.uploadMedia(job.imagePath);

        // 2. Upload Dance Video
        store.updateJob(job.id, { progress: 30, phase: 'Đang tải video mẫu chuyển động...' });
        this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

        const videoUrl = await client.uploadMedia(job.videoPath);

        // 3. Create Motion Task
        store.updateJob(job.id, { progress: 45, phase: 'Đang khởi tạo tác vụ Motion...' });
        this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

        try {
          taskId = await client.createMotionTask({
            workflowId: job.workflowId,
            imageUrl,
            videoUrl,
            prompt: job.prompt
          });
        } catch (createErr) {
          // Xử lý lỗi 421 (API limit reached / concurrent) xoay tua tài khoản thông minh
          if (createErr.isConcurrentLimit || createErr.errorCode === 421 || /421|limit reached|bận xử lý tác vụ khác/i.test(createErr.message)) {
            console.log(`[Job ${job.id}] Tài khoản ${account.name} bận luồng. Đang chuyển hàng đợi...`);
            store.updateAccount(account.id, { currentTaskCounts: 1, lastChecked: Date.now() });
            store.updateJob(job.id, {
              status: 'pending',
              progress: 0,
              phase: `Tài khoản "${account.name}" đang bận, tự động chuyển sang tài khoản khác...`
            });
            this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
            setTimeout(() => this.processNext(), 10000);
            return;
          }
          throw createErr;
        }

        store.updateJob(job.id, { taskId });
      }

      store.updateJob(job.id, { taskId, progress: 50, phase: 'AI đang render chuyển động...' });
      this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

      // 4. Polling for completion (tối đa 90 phút cho các video dài hoặc giờ cao điểm)
      const maxPollSeconds = 5400; // 90 mins
      const startPoll = Date.now();
      const jobStartedAt = job.startedAt || startPoll;
      let pollProgress = job.progress || 50;
      let finalResultUrl = null;
      let consumeCoins = null;
      let taskCostTime = null;
      let consecutiveNetworkErrors = 0;

      while (Date.now() - startPoll < maxPollSeconds * 1000) {
        if (abortCtrl.signal.aborted) {
          throw new Error('Tác vụ đã bị hủy bởi người dùng.');
        }

        await new Promise(r => setTimeout(r, 6000));

        let result = null;
        try {
          result = await client.queryTask(taskId);
          consecutiveNetworkErrors = 0;
        } catch (queryErr) {
          if (abortCtrl.signal.aborted) throw new Error('Tác vụ đã bị hủy bởi người dùng.');

          const errMsg = queryErr.message || String(queryErr);
          const isNetworkError = queryErr.isNetworkError || /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|UND_ERR|socket hang up|timeout/i.test(errMsg);

          // Chỉ throw nếu là lỗi thất bại tác vụ chính thức từ RunningHub
          if (queryErr.isTaskFailure || (!isNetworkError && /Task \S+ thất bại|RunningHub Error Code/i.test(errMsg))) {
            throw queryErr;
          }

          consecutiveNetworkErrors++;
          console.warn(`[Job ${job.id}] Cảnh báo mạng khi check tiến độ (${consecutiveNetworkErrors}/30):`, errMsg);

          store.updateJob(job.id, {
            phase: `Mạng chập chờn, đang tự động kết nối lại AI (${consecutiveNetworkErrors}/30)...`
          });
          this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

          if (consecutiveNetworkErrors >= 30) {
            throw new Error(`Mất kết nối máy chủ AI sau 30 lần thử liên tục (${errMsg})`);
          }
          continue;
        }

        if (result && result.done && result.url) {
          finalResultUrl = result.url;
          consumeCoins = result.consumeCoins;
          taskCostTime = result.taskCostTime;
          break;
        }

        const elapsedSec = Math.floor((Date.now() - jobStartedAt) / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        pollProgress = Math.min(94, 50 + Math.floor((elapsedSec / 2100) * 44));
        store.updateJob(job.id, {
          progress: pollProgress,
          phase: `AI đang xử lý render (${pollProgress}% - ${elapsedMin}p)...`
        });
        this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
      }

      if (!finalResultUrl) {
        throw new Error('Quá thời gian chờ render video từ RunningHub (Timeout sau 90 phút).');
      }

      // 5. Tải video dạng STREAM vào file .tmp (Chống sập RAM & Chống hỏng file video)
      store.updateJob(job.id, {
        progress: 95,
        phase: 'Đang tải video kết quả về máy tính...',
        resultUrl: finalResultUrl
      });
      this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

      const settings = store.getSettings();
      const outputDir = settings.outputDir || store.OUTPUTS_DIR;
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outFilename = `motion_${job.id}_${timestamp}.mp4`;
      const finalOutputPath = path.join(outputDir, outFilename);
      const tempOutputPath = `${finalOutputPath}.tmp_${Date.now()}`;

      let downloaded = false;
      let downloadError = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        if (abortCtrl.signal.aborted) throw new Error('Tác vụ đã bị hủy bởi người dùng.');

        try {
          if (attempt > 1) {
            store.updateJob(job.id, {
              phase: `Mạng chậm, đang thử tải lại video (lần ${attempt}/5)...`
            });
            this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
            await new Promise(r => setTimeout(r, 3000 * attempt));
          }

          const dlController = new AbortController();
          const dlTimer = setTimeout(() => dlController.abort(), 240000); // 4 mins timeout per attempt

          const res = await fetch(finalResultUrl, { signal: dlController.signal });
          clearTimeout(dlTimer);

          if (!res.ok) throw new Error(`Không tải được video từ URL: HTTP ${res.status}`);

          // Tải dạng Stream trực tiếp vào file .tmp
          if (res.body) {
            const readable = Readable.fromWeb ? Readable.fromWeb(res.body) : res.body;
            const fileStream = fs.createWriteStream(tempOutputPath);
            await pipeline(readable, fileStream);
          } else {
            const arrayBuf = await res.arrayBuffer();
            fs.writeFileSync(tempOutputPath, Buffer.from(arrayBuf));
          }

          // Kiểm tra dung lượng file hợp lệ (> 1000 bytes)
          const stat = fs.statSync(tempOutputPath);
          if (stat.size < 1000) {
            try { fs.unlinkSync(tempOutputPath); } catch (e) {}
            throw new Error(`Dung lượng video tải về không hợp lệ (${stat.size} bytes).`);
          }

          // Hoàn tất đổi tên file sang .mp4 chính thức
          if (fs.existsSync(finalOutputPath)) fs.unlinkSync(finalOutputPath);
          fs.renameSync(tempOutputPath, finalOutputPath);
          downloaded = true;
          break;
        } catch (dlErr) {
          try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch (e) {}
          downloadError = dlErr;
          console.warn(`[Job ${job.id}] Lỗi tải video (lần ${attempt}/5):`, dlErr.message);
        }
      }

      if (!downloaded) {
        throw new Error(`Không thể tải video kết quả về máy tính sau 5 lần thử (${downloadError?.message || 'Lỗi mạng'})`);
      }

      // 6. Refresh balance
      try {
        const bal = await client.getAccountInfo();
        store.updateAccount(account.id, { balance: bal.remainCoins, lastChecked: Date.now() });
      } catch (e) {}

      store.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        phase: 'Hoàn thành!',
        resultUrl: finalResultUrl,
        outputPath: finalOutputPath,
        consumeCoins: consumeCoins,
        taskCostTime: taskCostTime,
        completedAt: Date.now()
      });
      this.notifyUpdate(store.getJobs().find(j => j.id === job.id));

    } catch (err) {
      console.error(`Error processing job ${job.id}:`, err.message);

      const errMsg = err.message || String(err);
      const isCreditFail = /credit|coin|balance|insufficient|not enough|không đủ.*coin|hết.*coin|余额|积分/i.test(errMsg);
      if (isCreditFail) {
        store.updateAccount(account.id, { status: 'disabled', lastChecked: Date.now() });
      }

      // Tự động thử lại thông minh (Smart Auto-Retry tối đa 3 lần cho lỗi mạng/server tạm thời)
      const isCancelled = /hủy bởi người dùng/i.test(errMsg);
      const isTransientError = !isCancelled && !isCreditFail && !err.isTaskFailure &&
        /timeout|fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|502|503|504|socket hang up|network/i.test(errMsg);

      const currentRetry = job.retryCount || 0;
      if (isTransientError && currentRetry < 3) {
        const nextRetry = currentRetry + 1;
        console.warn(`[Job ${job.id}] Gặp sự cố mạng, tự động thử lại lần ${nextRetry}/3 sau 12s...`);
        store.updateJob(job.id, {
          status: 'pending',
          retryCount: nextRetry,
          progress: 0,
          phase: `Mạng chập chờn, tự động thử lại lần ${nextRetry}/3 sau 12s...`
        });
        this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
        setTimeout(() => this.processNext(), 12000);
        return;
      }

      store.updateJob(job.id, {
        status: 'failed',
        progress: 100,
        phase: isCancelled ? 'Đã hủy' : (isCreditFail ? 'Thất bại: Không đủ Coins' : 'Thất bại'),
        error: errMsg,
        completedAt: Date.now()
      });
      this.notifyUpdate(store.getJobs().find(j => j.id === job.id));
    }
  }
}

const queue = new JobQueue();
module.exports = queue;
