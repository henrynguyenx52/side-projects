const fs = require('fs');
const path = require('path');

const { getDataDir } = require('./paths');

const DATA_DIR = getDataDir();

// Thư mục lưu Video mặc định: Đặt tại thư mục "Video"
let VIDEO_DIR = path.join(__dirname, '..', '..', 'Video');
if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
  // Khi chạy trong file .exe đóng gói, đặt thư mục Video ngay cạnh file TOKI.exe
  VIDEO_DIR = path.join(process.resourcesPath, '..', 'Video');
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

const OUTPUTS_DIR = VIDEO_DIR; // Alias tương thích ngược

const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function readJson(file, defaultVal) {
  const bakFile = file + '.bak';
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8').trim();
      if (content.length > 0) {
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.error(`[Store] Lỗi đọc file ${path.basename(file)}:`, e.message);
  }

  // Tự động khôi phục từ bản sao lưu dự phòng .bak nếu file chính bị lỗi hoặc trống
  try {
    if (fs.existsSync(bakFile)) {
      const bakContent = fs.readFileSync(bakFile, 'utf8').trim();
      if (bakContent.length > 0) {
        console.warn(`[Store] Đã tự động khôi phục dữ liệu từ ${path.basename(bakFile)}`);
        const data = JSON.parse(bakContent);
        // Khôi phục lại file chính
        fs.writeFileSync(file, bakContent, 'utf8');
        return data;
      }
    }
  } catch (bakErr) {
    console.error(`[Store] Lỗi đọc file backup ${path.basename(bakFile)}:`, bakErr.message);
  }

  return defaultVal;
}

function writeJson(file, data) {
  const tmpFile = `${file}.${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`;
  const bakFile = file + '.bak';
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    // 1. Ghi ra file tạm thời
    fs.writeFileSync(tmpFile, jsonStr, 'utf8');

    // 2. Tạo bản sao lưu dự phòng .bak nếu file chính đang tồn tại và hợp lệ
    if (fs.existsSync(file)) {
      try {
        fs.copyFileSync(file, bakFile);
      } catch (e) {}
    }

    // 3. Đổi tên nguyên tử (Atomic replace)
    fs.renameSync(tmpFile, file);
  } catch (err) {
    // Fallback nếu rename bị lock trên Windows
    try {
      fs.writeFileSync(file, jsonStr, 'utf8');
    } catch (directErr) {
      console.error(`[Store] Lỗi nghiêm trọng khi ghi file ${path.basename(file)}:`, directErr.message);
    }
    // Dọn file tạm nếu còn sót
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
  }
}

// --- ACCOUNTS ---
function getAccounts() {
  return readJson(ACCOUNTS_FILE, []);
}

function saveAccounts(accounts) {
  writeJson(ACCOUNTS_FILE, accounts);
}

function addAccount({ name, apiKey }) {
  const accounts = getAccounts();
  const id = 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const newAcc = {
    id,
    name: name || `Tài khoản ${accounts.length + 1}`,
    apiKey: apiKey.trim(),
    status: 'active',
    balance: 0,
    lastChecked: null,
    createdAt: new Date().toISOString()
  };
  accounts.push(newAcc);
  saveAccounts(accounts);
  return newAcc;
}

function addBulkAccounts(list) {
  const existing = getAccounts();
  const existingKeys = new Set(existing.map(a => a.apiKey.trim().toLowerCase()));
  const added = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const key = (item.apiKey || '').trim();
    if (!key) continue;
    if (existingKeys.has(key.toLowerCase())) continue; // Bỏ qua trùng lặp

    const id = 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '_' + i;
    const newAcc = {
      id,
      name: item.name || `Tài khoản ${existing.length + 1}`,
      apiKey: key,
      status: 'active',
      balance: 0,
      lastChecked: null,
      createdAt: new Date().toISOString()
    };
    existing.push(newAcc);
    existingKeys.add(key.toLowerCase());
    added.push(newAcc);
  }

  if (added.length > 0) {
    saveAccounts(existing);
  }
  return { added, totalExisting: existing.length };
}

function updateAccount(id, updateFields) {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...updateFields };
    saveAccounts(accounts);
    return accounts[index];
  }
  return null;
}

function deleteAccount(id) {
  let accounts = getAccounts();
  accounts = accounts.filter(a => a.id !== id);
  saveAccounts(accounts);
}

// --- JOBS ---
function getJobs() {
  return readJson(JOBS_FILE, []);
}

function saveJobs(jobs) {
  writeJson(JOBS_FILE, jobs);
}

function addJob(jobData) {
  const jobs = getJobs();
  const id = 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const newJob = {
    id,
    status: 'pending', // pending, running, completed, failed
    progress: 0,
    phase: 'Chờ thực hiện',
    imagePath: jobData.imagePath,
    videoPath: jobData.videoPath,
    imageName: jobData.imageName || path.basename(jobData.imagePath || ''),
    videoName: jobData.videoName || path.basename(jobData.videoPath || ''),
    prompt: jobData.prompt || '',
    workflowId: jobData.workflowId || 'runninghub-standard',
    accountId: null,
    taskId: null,
    resultUrl: null,
    outputPath: null,
    error: null,
    meta: jobData.meta || null,
    createdAt: Date.now(),
    completedAt: null
  };
  jobs.unshift(newJob);
  saveJobs(jobs);
  return newJob;
}

function updateJob(id, fields) {
  const jobs = getJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx !== -1) {
    jobs[idx] = { ...jobs[idx], ...fields };
    saveJobs(jobs);
    return jobs[idx];
  }
  return null;
}

function clearFinishedJobs() {
  let jobs = getJobs();
  jobs = jobs.filter(j => j.status === 'running' || j.status === 'pending');
  saveJobs(jobs);
  return jobs;
}

function deleteJob(id) {
  let jobs = getJobs();
  jobs = jobs.filter(j => j.id !== id);
  saveJobs(jobs);
}

// --- SETTINGS ---
function getSettings() {
  const defaults = {
    outputDir: OUTPUTS_DIR,
    threadCount: 2,
    defaultModel: 'runninghub-standard',
    defaultPrompt: 'Create high quality smooth dance video with character matching reference motion perfectly',
    telegramBotToken: '',
    adminTelegramId: '',
    initialFreeCredits: 2,
    bankCode: 'MB',
    bankAccountNo: '',
    bankAccountName: '',
    sepayApiToken: '',
    botWelcomeText: '',
    botGuideText: '',
    githubRepo: 'trandangnhat19021999-oss/Toki-Plus'
  };
  const saved = readJson(SETTINGS_FILE, {});
  return { ...defaults, ...saved };
}

function saveSettings(settings) {
  const current = getSettings();
  const toSave = { ...settings };

  // Nếu token gửi lên chứa dấu sao (bị che) hoặc để trống nhưng cấu hình cũ đã có -> giữ nguyên cấu hình cũ
  if (toSave.telegramBotToken && toSave.telegramBotToken.includes('*')) {
    toSave.telegramBotToken = current.telegramBotToken;
  } else if (!toSave.telegramBotToken && current.telegramBotToken) {
    toSave.telegramBotToken = current.telegramBotToken;
  }

  if (toSave.sepayApiToken && toSave.sepayApiToken.includes('*')) {
    toSave.sepayApiToken = current.sepayApiToken;
  } else if (!toSave.sepayApiToken && current.sepayApiToken) {
    toSave.sepayApiToken = current.sepayApiToken;
  }

  const updated = { ...current, ...toSave };
  writeJson(SETTINGS_FILE, updated);
  return updated;
}

module.exports = {
  getAccounts,
  saveAccounts,
  addAccount,
  addBulkAccounts,
  updateAccount,
  deleteAccount,
  getJobs,
  saveJobs,
  addJob,
  updateJob,
  clearFinishedJobs,
  deleteJob,
  getSettings,
  saveSettings,
  OUTPUTS_DIR,
  VIDEO_DIR
};
