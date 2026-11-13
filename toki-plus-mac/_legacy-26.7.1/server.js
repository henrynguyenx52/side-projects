const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ══════════════════════════════════════════════
// BỘ BẮT LỖI TOÀN CỤC (CHỐNG SẬP SERVER)
// ══════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err?.message || err);
  if (err?.stack) console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[WARNING] Unhandled Rejection:', reason?.message || reason);
});

const store = require('./src/data/store');
const queue = require('./src/jobs/queue');
const {
  getActiveLicenseStatus,
  saveActiveLicense,
  generateLicenseKey,
  removeActiveLicense,
  getSavedKeys,
  saveKeyToList,
  deleteSavedKey,
  getHardwareId
} = require('./src/license/license-service');
const { RunningHubClient } = require('./src/runninghub/client');
// userStore (Vô hiệu hóa cho bản Client)
const userStore = { getUsers: () => [], getOrders: () => [], getGiftcodes: () => [], getPackages: () => [] };
// vietqr (Vô hiệu hóa cho bản Client)
const vietqr = { generateQrDataUrl: () => Promise.resolve(''), checkPaidStatus: () => Promise.resolve({ paid: false }) };
// Telegram Bot (Vô hiệu hóa cho bản Client)
const initTelegramBot = () => null;
const getBotInstance = () => null;
const updateService = require('./src/update/update-service');

const app = express();
const PORT = process.env.PORT || 3030;

// Directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/outputs', (req, res, next) => {
  const settings = store.getSettings();
  express.static(settings.outputDir || store.OUTPUTS_DIR)(req, res, next);
});
app.use('/Video', (req, res, next) => {
  const settings = store.getSettings();
  express.static(settings.outputDir || store.OUTPUTS_DIR)(req, res, next);
});

// Middleware: Check license for production endpoints
function requireLicense(req, res, next) {
  const status = getActiveLicenseStatus();
  if (!status.activated) {
    return res.status(403).json({ ok: false, error: status.error || 'Ứng dụng chưa được kích hoạt bản quyền!' });
  }
  next();
}

// ══════════════════════════════════════════════
// 1. LICENSE & HARDWARE ENDPOINTS
// ══════════════════════════════════════════════
const ADMIN_KEY_FILE = ''; // (Vô hiệu hóa cho bản Client)

app.get('/api/license/status', (req, res) => {
  const status = getActiveLicenseStatus();
  const hardwareId = getHardwareId();
  const isAdmin = fs.existsSync(ADMIN_KEY_FILE);
  res.json({ ...status, currentHardwareId: hardwareId, isAdmin });
});

app.post('/api/license/activate', (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: 'Vui lòng nhập License Key!' });
    const result = saveActiveLicense(key);
    res.json({ ok: true, message: 'Kích hoạt bản quyền thành công!', info: result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Logout / Deactivate License
app.post('/api/license/logout', (req, res) => {
  try {
    const result = removeActiveLicense();
    res.json({ ok: true, message: 'Đã đăng xuất key bản quyền thành công!' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Saved Keys Management
app.get('/api/license/saved-keys', (req, res) => {
  res.json({ ok: true, keys: getSavedKeys() });
});

app.post('/api/license/saved-keys', (req, res) => {
  try {
    const { key, note } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: 'Thiếu License Key' });
    const keys = saveKeyToList(key, note);
    res.json({ ok: true, keys });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/license/saved-keys', (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: 'Thiếu License Key' });
    const keys = deleteSavedKey(key);
    res.json({ ok: true, keys });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Admin-only key generator API (Vô hiệu hóa cho bản Client)
app.post('/api/admin/generate-key', (req, res) => res.status(403).json({ ok: false, error: 'Chức năng chỉ dành cho Admin' }));

// ══════════════════════════════════════════════
// 2. UPLOADS & FILE SYSTEM
// ══════════════════════════════════════════════
app.post('/api/upload', upload.array('files', 50), (req, res) => {
  try {
    const files = (req.files || []).map(f => ({
      name: f.originalname,
      filename: f.filename,
      path: f.path,
      url: `/uploads/${f.filename}`,
      size: f.size,
      mimetype: f.mimetype,
      isImage: /\.(jpg|jpeg|png|webp)$/i.test(f.originalname),
      isVideo: /\.(mp4|mov|webm)$/i.test(f.originalname)
    }));
    res.json({ ok: true, files });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/open-folder', (req, res) => {
  const settings = store.getSettings();
  let target = (req.body && req.body.path) ? req.body.path.trim() : '';
  if (!target) {
    target = settings.outputDir || store.OUTPUTS_DIR;
  }

  // Đảm bảo thư mục tồn tại nếu là mở thư mục
  if (!fs.existsSync(target)) {
    const parentDir = path.dirname(target);
    if (fs.existsSync(parentDir)) {
      target = parentDir;
    } else {
      const defDir = settings.outputDir || store.OUTPUTS_DIR;
      if (!fs.existsSync(defDir)) fs.mkdirSync(defDir, { recursive: true });
      target = defDir;
    }
  }

  const isFile = fs.existsSync(target) && fs.statSync(target).isFile();

  // 1. Thử qua Electron shell nếu đang chạy trong app desktop
  let opened = false;
  try {
    const electron = require('electron');
    if (isFile && electron?.shell?.showItemInFolder) {
      electron.shell.showItemInFolder(target);
      opened = true;
    } else if (electron?.shell?.openPath) {
      electron.shell.openPath(isFile ? path.dirname(target) : target);
      opened = true;
    }
  } catch (e) {}

  // 2. Fallback: open folder in OS file manager
  if (!opened) {
    if (process.platform === 'darwin') {
      if (isFile) {
        exec(`open -R ${JSON.stringify(target)}`, () => {});
      } else {
        exec(`open ${JSON.stringify(target)}`, () => {});
      }
    } else if (process.platform === 'win32') {
      const winPath = target.replace(/\//g, '\\');
      if (isFile) {
        exec(`explorer.exe /select,"${winPath}"`, () => {});
      } else {
        exec(`start "" "${winPath}"`, { shell: 'cmd.exe' }, () => {});
      }
    } else {
      exec(`xdg-open ${JSON.stringify(isFile ? path.dirname(target) : target)}`, () => {});
    }
  }

  res.json({ ok: true, target, isFile });
});

// Cache & Uploads Cleaning Management
function getActiveUploadFilePaths() {
  const activePaths = new Set();
  try {
    const jobs = store.getJobs();
    for (const j of jobs) {
      if (j.status === 'pending' || j.status === 'running') {
        if (j.imagePath) activePaths.add(path.normalize(j.imagePath));
        if (j.videoPath) activePaths.add(path.normalize(j.videoPath));
      }
    }
  } catch (e) {}
  return activePaths;
}

function cleanUploadsCache(maxAgeHours = 24) {
  let removedCount = 0;
  let freedBytes = 0;
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return { removedCount, freedBytes, freedMb: '0.00' };
    const now = Date.now();
    const activePaths = getActiveUploadFilePaths();
    const files = fs.readdirSync(UPLOADS_DIR);

    for (const f of files) {
      const fullPath = path.join(UPLOADS_DIR, f);
      if (activePaths.has(path.normalize(fullPath))) continue; // Đang xử lý không xóa

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const ageHours = (now - stat.mtimeMs) / (1000 * 60 * 60);
          if (maxAgeHours === 0 || ageHours >= maxAgeHours) {
            freedBytes += stat.size;
            fs.unlinkSync(fullPath);
            removedCount++;
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error('[CleanCache] Lỗi:', err.message);
  }
  return { removedCount, freedBytes, freedMb: (freedBytes / (1024 * 1024)).toFixed(2) };
}

// Tự động dọn dẹp file tạm uploads cũ hơn 24 giờ mỗi 6 tiếng một lần
setInterval(() => {
  cleanUploadsCache(24);
}, 6 * 60 * 60 * 1000);

app.get('/api/cache-info', (req, res) => {
  try {
    let totalBytes = 0;
    let count = 0;
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const f of files) {
        try {
          const stat = fs.statSync(path.join(UPLOADS_DIR, f));
          if (stat.isFile()) {
            totalBytes += stat.size;
            count++;
          }
        } catch (e) {}
      }
    }
    res.json({
      ok: true,
      count,
      sizeBytes: totalBytes,
      sizeMb: (totalBytes / (1024 * 1024)).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/clean-cache', (req, res) => {
  try {
    const hours = req.body?.hours !== undefined ? parseInt(req.body.hours, 10) : 0;
    const result = cleanUploadsCache(hours);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ══════════════════════════════════════════════
// 3. ACCOUNTS (RunningHub API Keys)
// ══════════════════════════════════════════════
app.get('/api/accounts', requireLicense, (req, res) => {
  res.json({ ok: true, accounts: store.getAccounts() });
});

app.post('/api/accounts', requireLicense, async (req, res) => {
  try {
    const { name, apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ ok: false, error: 'Thiếu API Key!' });
    const acc = store.addAccount({ name, apiKey });
    
    // Auto check balance
    try {
      const client = new RunningHubClient(acc.apiKey);
      const info = await client.getAccountInfo();
      store.updateAccount(acc.id, { balance: info.remainCoins, lastChecked: Date.now() });
    } catch (e) {}

    res.json({ ok: true, account: store.getAccounts().find(a => a.id === acc.id) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/accounts/:id', requireLicense, (req, res) => {
  store.deleteAccount(req.params.id);
  res.json({ ok: true });
});

// Thêm hàng loạt tài khoản (Mỗi dòng 1 tài khoản)
app.post('/api/accounts/bulk', requireLicense, async (req, res) => {
  try {
    const { rawText, accounts } = req.body;
    let listToAdd = [];

    if (Array.isArray(accounts) && accounts.length > 0) {
      listToAdd = accounts;
    } else if (typeof rawText === 'string') {
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let name = '';
        let apiKey = line;

        if (line.includes('|')) {
          const parts = line.split('|');
          name = parts[0].trim();
          apiKey = parts.slice(1).join('|').trim();
        } else if (line.includes('----')) {
          const parts = line.split('----');
          name = parts[0].trim();
          apiKey = parts.slice(1).join('----').trim();
        } else if (line.includes('\t')) {
          const parts = line.split('\t');
          name = parts[0].trim();
          apiKey = parts.slice(1).join('\t').trim();
        }

        if (apiKey) {
          listToAdd.push({ name: name || '', apiKey });
        }
      }
    }

    if (listToAdd.length === 0) {
      return res.status(400).json({ ok: false, error: 'Không tìm thấy API Key nào trong nội dung nhập vào!' });
    }

    const result = store.addBulkAccounts(listToAdd);

    // Tự động kiểm tra số dư nền cho các tài khoản vừa thêm
    (async () => {
      for (const acc of result.added) {
        try {
          const client = new RunningHubClient(acc.apiKey);
          const info = await client.getAccountInfo();
          store.updateAccount(acc.id, {
            balance: info.remainCoins,
            status: 'active',
            lastChecked: Date.now()
          });
        } catch (e) {
          store.updateAccount(acc.id, {
            status: 'disabled',
            lastChecked: Date.now()
          });
        }
      }
    })();

    res.json({
      ok: true,
      addedCount: result.added.length,
      totalAccounts: result.totalExisting,
      message: `Đã thêm thành công ${result.added.length} tài khoản!`
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Kiểm tra số dư tất cả tài khoản
app.post('/api/accounts/check-all', requireLicense, async (req, res) => {
  try {
    const accounts = store.getAccounts();
    const results = [];
    for (const acc of accounts) {
      try {
        const client = new RunningHubClient(acc.apiKey);
        const info = await client.getAccountInfo();
        store.updateAccount(acc.id, {
          balance: info.remainCoins,
          status: 'active',
          lastChecked: Date.now()
        });
        results.push({ id: acc.id, ok: true, balance: info.remainCoins });
      } catch (e) {
        store.updateAccount(acc.id, {
          status: 'disabled',
          lastChecked: Date.now()
        });
        results.push({ id: acc.id, ok: false, error: e.message });
      }
    }
    res.json({ ok: true, accounts: store.getAccounts() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/accounts/:id/check', requireLicense, async (req, res) => {
  try {
    const acc = store.getAccounts().find(a => a.id === req.params.id);
    if (!acc) return res.status(404).json({ ok: false, error: 'Không tìm thấy tài khoản!' });

    const client = new RunningHubClient(acc.apiKey);
    const info = await client.getAccountInfo();
    const updated = store.updateAccount(acc.id, {
      balance: info.remainCoins,
      status: 'active',
      lastChecked: Date.now()
    });

    res.json({ ok: true, account: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ══════════════════════════════════════════════
// 4. JOBS (Video Production & Queue)
// ══════════════════════════════════════════════
app.get('/api/jobs', requireLicense, (req, res) => {
  res.json({ ok: true, jobs: store.getJobs() });
});

app.post('/api/jobs/create-batch', requireLicense, (req, res) => {
  try {
    const { pairings, workflowId, prompt } = req.body;
    if (!Array.isArray(pairings) || pairings.length === 0) {
      return res.status(400).json({ ok: false, error: 'Danh sách cặp ghép (Pairings) không được để trống!' });
    }

    const activeAccounts = store.getAccounts().filter(a => a.status === 'active');
    if (activeAccounts.length === 0) {
      return res.status(400).json({ ok: false, error: 'Không tìm thấy tài khoản RunningHub nào đang hoạt động! Vui lòng vào mục "Tài Khoản AI" để thêm API Key.' });
    }

    const created = [];
    for (const p of pairings) {
      if (!p.imagePath || !p.videoPath) continue;
      const job = store.addJob({
        imagePath: p.imagePath,
        videoPath: p.videoPath,
        imageName: p.imageName,
        videoName: p.videoName,
        prompt: p.prompt || prompt || '',
        workflowId: p.workflowId || workflowId || 'runninghub-standard'
      });
      created.push(job);
    }

    // Trigger queue execution
    queue.processNext();

    res.json({ ok: true, count: created.length, jobs: created });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/jobs/:id', requireLicense, (req, res) => {
  queue.cancelJob(req.params.id);
  store.deleteJob(req.params.id);
  res.json({ ok: true });
});

app.post('/api/jobs/:id/cancel', requireLicense, (req, res) => {
  queue.cancelJob(req.params.id);
  res.json({ ok: true });
});

app.post('/api/jobs/:id/retry', requireLicense, (req, res) => {
  const ok = queue.retryJob(req.params.id);
  if (!ok) {
    return res.status(400).json({ ok: false, error: 'Không tìm thấy tác vụ hoặc tác vụ không thể thử lại!' });
  }
  res.json({ ok: true });
});

app.post('/api/jobs/clear-finished', requireLicense, (req, res) => {
  const jobs = store.clearFinishedJobs();
  res.json({ ok: true, jobs });
});

// SSE (Server-Sent Events) for real-time progress
app.get('/api/jobs/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const unsubscribe = queue.onEvent((type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// ══════════════════════════════════════════════
// 5. SETTINGS
// ══════════════════════════════════════════════
app.get('/api/settings', requireLicense, (req, res) => {
  res.json({ ok: true, settings: store.getSettings() });
});

app.post('/api/settings', requireLicense, (req, res) => {
  const oldSettings = store.getSettings();
  const updated = store.saveSettings(req.body);
  if (oldSettings.telegramBotToken !== updated.telegramBotToken || oldSettings.sepayApiToken !== updated.sepayApiToken) {
    // initTelegramBot(); (Disabled for Client)
  }
  res.json({ ok: true, settings: store.getSettings() });
});

// ══════════════════════════════════════════════
// 5.1. AUTO-UPDATE & GITHUB RELEASES
// ══════════════════════════════════════════════
app.get('/api/update/check', async (req, res) => {
  try {
    const result = await updateService.checkForUpdate(req.query.repo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/update/open-link', (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ ok: false, error: 'URL không hợp lệ' });
    }
    const safeUrl = url.replace(/"/g, '');
    const cmd = process.platform === 'win32' ? `start "" "${safeUrl}"` : (process.platform === 'darwin' ? `open "${safeUrl}"` : `xdg-open "${safeUrl}"`);
    exec(cmd);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ══════════════════════════════════════════════
// 6. TELEGRAM BOT & COMMERCE (Đã loại bỏ cho bản Client)

// Start Background Queue, Telegram Bot & Listen
queue.start();
initTelegramBot();

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TOKI PLUS / MOTION AI RUNNING SERVER ONLINE!`);
  console.log(`🌐 Web UI: http://localhost:${PORT}`);
  console.log(`💻 Hardware ID: ${getHardwareId()}`);
  console.log(`======================================================\n`);
});
