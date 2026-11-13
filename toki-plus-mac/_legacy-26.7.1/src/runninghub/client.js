const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.runninghub.ai';
const JSON_TIMEOUT_MS = 60000;
const UPLOAD_TIMEOUT_MS = 300000; // 5 minutes for video upload

const WORKFLOWS = {
  'runninghub-standard': '2087543712553828354', // TOKI Standard (24GB)
  'runninghub-aiplus': '2087545174117777409'    // TOKI AI Plus (48GB)
};

class RunningHubClient {
  constructor(apiKey) {
    this.apiKey = (apiKey || '').trim();
    if (!this.apiKey) {
      throw new Error('API Key RunningHub không được để trống!');
    }
  }

  async _fetch(endpoint, options = {}, timeoutMs = JSON_TIMEOUT_MS) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }

      if (!res.ok) {
        const httpErr = new Error(data.msg || data.message || `RunningHub HTTP Error: ${res.status}`);
        if (res.status >= 500 || res.status === 429) {
          httpErr.isNetworkError = true;
        }
        throw httpErr;
      }

      if (typeof data.code === 'number' && data.code !== 0) {
        throw new Error(data.msg || data.message || `RunningHub Error Code ${data.code}`);
      }

      return data.data !== undefined ? data.data : data;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`RunningHub API timeout sau ${Math.round(timeoutMs / 1000)}s`);
        timeoutErr.isNetworkError = true;
        throw timeoutErr;
      }
      if (err.message && /fetch failed|network|ECONN|ETIMEDOUT|ENOTFOUND|UND_ERR/i.test(err.message)) {
        err.isNetworkError = true;
      }
      throw err;
    }
  }

  /**
   * Check balance / account status
   */
  async getAccountInfo() {
    const data = await this._fetch('/uc/openapi/accountStatus', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ apikey: this.apiKey })
    });

    const remainCoins = Number(data.remainCoins ?? data.balance ?? 0);
    return {
      remainCoins,
      balance: remainCoins,
      currentTaskCounts: Number(data.currentTaskCounts) || 0,
      remainMoney: data.remainMoney,
      currency: data.currency || 'RH'
    };
  }

  /**
   * Upload binary file (image or video) to RunningHub CDN with retry and adaptive timeout
   * @param {string} filePath - Local absolute file path
   * @param {number} [maxRetries=3]
   */
  async uploadMedia(filePath, maxRetries = 3) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const sizeMb = stats.size / (1024 * 1024);
    // Adaptive timeout: minimum 5 minutes, plus 1 minute for every 20MB of file size, up to 12 minutes
    const adaptiveTimeoutMs = Math.min(720000, Math.max(UPLOAD_TIMEOUT_MS, Math.floor(UPLOAD_TIMEOUT_MS + (sizeMb / 20) * 60000)));

    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[UploadMedia] Thử tải lại file ${path.basename(filePath)} (${sizeMb.toFixed(1)}MB, lần ${attempt}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, 2500 * attempt));
        }

        let fileBlob;
        if (typeof fs.openAsBlob === 'function') {
          fileBlob = await fs.openAsBlob(filePath);
        } else {
          const fileBuffer = fs.readFileSync(filePath);
          fileBlob = new Blob([fileBuffer]);
        }
        const fileName = path.basename(filePath);
        const formData = new FormData();
        formData.append('file', fileBlob, fileName);

        const data = await this._fetch('/openapi/v2/media/upload/binary', {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${this.apiKey}`
          },
          body: formData
        }, adaptiveTimeoutMs);

        const remoteUrl = data.download_url || data.fileUrl || data.url || data.fileName || data.name || data;
        if (!remoteUrl || typeof remoteUrl !== 'string') {
          throw new Error('Upload thành công nhưng RunningHub không trả về URL media hợp lệ.');
        }
        return remoteUrl;
      } catch (err) {
        lastError = err;
        console.warn(`[UploadMedia] Lỗi tải file ${path.basename(filePath)} (lần ${attempt}/${maxRetries}):`, err.message);
      }
    }
    throw lastError || new Error(`Upload file thất bại sau ${maxRetries} lần thử.`);
  }

  /**
   * Create Motion Dance Video Task (with retry on network glitch)
   * @param {Object} options
   * @param {string} options.workflowId - 'runninghub-standard' hoặc 'runninghub-aiplus' hoặc custom workflow ID
   * @param {string} options.imageUrl - Image URL from RunningHub CDN
   * @param {string} options.videoUrl - Dance reference Video URL from RunningHub CDN
   * @param {string} [options.prompt] - Optional prompt
   * @param {string} [options.negativePrompt] - Optional negative prompt
   * @param {boolean} [options.usePersonalQueue=false]
   */
  async createMotionTask({ workflowId = 'runninghub-standard', imageUrl, videoUrl, prompt = '', negativePrompt = '', usePersonalQueue = false }) {
    const actualWorkflowId = WORKFLOWS[workflowId] || workflowId;
    const isPlus = workflowId === 'runninghub-aiplus' || actualWorkflowId === WORKFLOWS['runninghub-aiplus'];

    const nodeInfoList = [
      imageUrl && { nodeId: '30', fieldName: 'image', fieldValue: imageUrl },
      videoUrl && { nodeId: '33', fieldName: 'video', fieldValue: videoUrl },
      prompt && { nodeId: '3', fieldName: 'text', fieldValue: prompt },
      negativePrompt && { nodeId: '4', fieldName: 'text', fieldValue: negativePrompt }
    ].filter(Boolean);

    const payload = {
      addMetadata: true,
      nodeInfoList,
      instanceType: isPlus ? 'plus' : 'default',
      usePersonalQueue: Boolean(usePersonalQueue)
    };

    let data = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }

        data = await this._fetch(`/openapi/v2/run/workflow/${encodeURIComponent(actualWorkflowId)}`, {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${this.apiKey}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        break;
      } catch (err) {
        lastError = err;
        // Don't retry if it's not a network error
        if (!err.isNetworkError && !/fetch failed|timeout|ECONN/i.test(err.message)) {
          throw err;
        }
      }
    }

    if (!data) {
      throw lastError || new Error('Không thể kết nối để khởi tạo tác vụ trên RunningHub.');
    }

    if (data.errorCode && data.errorCode !== '0' && data.errorCode !== 0) {
      const msg = data.errorMessage || data.msg || `RunningHub Error Code ${data.errorCode}`;
      if (String(data.errorCode) === '421' || /limit reached|并发|concurren/i.test(msg)) {
        const limitErr = new Error('Tài khoản RunningHub này đang bận xử lý tác vụ khác (API limit). Đang xoay tua sang tài khoản khác...');
        limitErr.isConcurrentLimit = true;
        limitErr.errorCode = 421;
        throw limitErr;
      }
      throw new Error(`RunningHub Error: ${msg}`);
    }

    const taskId = data.taskId || data.id;
    if (!taskId) {
      const msg = data.errorMessage || data.msg || (data.code ? `Error ${data.code}` : '');
      throw new Error(msg ? `RunningHub: ${msg}` : 'Không nhận được Task ID từ RunningHub.');
    }
    return taskId;
  }

  /**
   * Query task status & output results (with recursive URL search)
   * @param {string} taskId
   */
  async queryTask(taskId) {
    const data = await this._fetch('/openapi/v2/query', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ taskId })
    });

    const status = String(data.status || data.taskStatus || '').toUpperCase();

    // Only fail if status is explicitly FAILED or failedReason has actual content
    const hasFailedReason = typeof data.failedReason === 'string'
      ? Boolean(data.failedReason.trim())
      : Boolean(data.failedReason && typeof data.failedReason === 'object' && Object.keys(data.failedReason).length > 0);

    const isFailed = status === 'FAILED' || status === 'ERROR' || hasFailedReason;
    if (isFailed) {
      const reason = (hasFailedReason && data.failedReason) || data.errorMessage || data.msg || data.message || 'Tác vụ RunningHub thất bại.';
      const err = new Error(`Task ${taskId} thất bại: ${typeof reason === 'object' ? JSON.stringify(reason) : reason}`);
      err.isTaskFailure = true;
      throw err;
    }

    // Deep recursive extractor for video URLs across any JSON structure
    const extractUrls = (obj, depth = 0) => {
      if (!obj || depth > 5) return [];
      const res = [];
      if (typeof obj === 'string') {
        if (/^https?:\/\/.+/i.test(obj) && (/video|mp4|mov|webm/i.test(obj) || /cdn|oss|runninghub|download/i.test(obj))) {
          res.push(obj);
        }
      } else if (Array.isArray(obj)) {
        for (const item of obj) res.push(...extractUrls(item, depth + 1));
      } else if (typeof obj === 'object') {
        const candidateKeys = ['fileUrl', 'url', 'download_url', 'downloadUrl', 'videoUrl', 'video_url', 'outputPath', 'resultUrl'];
        for (const k of candidateKeys) {
          if (typeof obj[k] === 'string' && /^https?:\/\//i.test(obj[k])) {
            res.push(obj[k]);
          }
        }
        for (const [k, v] of Object.entries(obj)) {
          if (['results', 'fileUrlList', 'outputs', 'data', 'taskOutput', 'output', 'nodeInfoList'].includes(k)) {
            res.push(...extractUrls(v, depth + 1));
          }
        }
      }
      return [...new Set(res)];
    };

    const foundUrls = extractUrls(data);

    if (foundUrls.length > 0) {
      // Prioritize video files
      const bestUrl = foundUrls.find(u => /\.mp4|\.mov|\.webm/i.test(u)) || foundUrls[0];
      const usage = data.usage || {};
      const consumeCoins = usage.consumeCoins !== undefined && usage.consumeCoins !== null ? Number(usage.consumeCoins) : null;
      const taskCostTime = usage.taskCostTime !== undefined && usage.taskCostTime !== null ? Number(usage.taskCostTime) : null;

      return {
        done: true,
        url: bestUrl,
        urls: foundUrls,
        usage,
        consumeCoins,
        taskCostTime
      };
    }

    return { done: false, status: status || 'RUNNING' };
  }
}

module.exports = {
  RunningHubClient,
  WORKFLOWS
};
