import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import {
  createLineReader,
  expandCommand,
  parseAigcProgressLine,
  parseSshCommand,
  safeName,
  shellQuote,
  validateRemoteBase,
} from './remote.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputRoot = path.join(rootDir, 'outputs');
const tempRoot = path.join(rootDir, '.tmp');
const rvmRunnerPath = path.join(rootDir, 'remote', 'rvm_runner.py');
const aigcCleanerPath = path.join(rootDir, 'remote', 'aigc_cleaner.py');
const aigcProfiles = new Map([
  ['aigc_clean', 'synthid'],
  ['aigc_wan', 'wan21-synthid'],
]);
const scail2InstallerPath = path.join(rootDir, 'remote', 'scail2_installer.py');
const scail2PipelinePath = path.join(rootDir, 'remote', 'scail2_pipeline.py');
const scail2WorkflowFilename = '22_v4.6_full_15s_fast_low_memory.json';
const scail2WorkflowPath = path.resolve(rootDir, '..', scail2WorkflowFilename);
const scail2ExtendedWorkflowFilename = '22_v4.6_full_20s_fast_low_memory.json';
const scail2FullWorkflowFilename = '22_v4.6_full_15s_fast.json';
const scail2FullWorkflowPath = path.resolve(rootDir, '..', scail2FullWorkflowFilename);
const scail2FullPipelinePath = path.join(rootDir, 'remote', 'scail2_full_pipeline.py');
const scail2RunPresets = ['scail2_run', 'scail2_run_20s', 'scail2_full'];
const scail2InstallPresets = ['scail2_install', 'scail2_full_install'];
await fsp.mkdir(outputRoot, { recursive: true });
await fsp.mkdir(tempRoot, { recursive: true });

const app = express();
const jobs = new Map();
const upload = multer({
  dest: tempRoot,
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 20 },
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(rootDir, 'public')));

const STATUS_PROGRESS = {
  queued: [2, 'Đang xếp hàng'],
  connecting: [6, 'Đang kết nối SSH'],
  preparing: [12, 'Kiểm tra môi trường GPU'],
  uploading: [18, 'Đang upload video lên GPU'],
  running: [45, 'Model đang chạy'],
  cleaning: [20, 'Đang chuẩn bị xoá AIGC'],
  downloading: [96, 'Đang tải kết quả về máy'],
  completed: [100, 'Hoàn tất'],
};

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    remoteJobDir: job.remoteJobDir,
    error: job.error,
    progress: job.progress || { percent: 0, stage: 'Chờ chạy', etaSeconds: null, updatedAt: job.updatedAt },
    outputs: job.outputs,
    logs: job.logs.slice(-500),
  };
}

function log(job, message, stream = 'info') {
  const entry = { time: new Date().toISOString(), stream, message: String(message).replace(/\r$/, '') };
  job.logs.push(entry);
  job.updatedAt = entry.time;
  for (const response of job.listeners) response.write(`data: ${JSON.stringify({ type: 'log', entry })}\n\n`);
}

function setProgress(job, progress) {
  const updatedAt = new Date().toISOString();
  job.progress = {
    percent: progress.percent,
    stage: progress.stage,
    etaSeconds: typeof progress.etaSeconds === 'number' ? progress.etaSeconds : null,
    updatedAt,
  };
  job.updatedAt = updatedAt;
  for (const response of job.listeners) response.write(`data: ${JSON.stringify({ type: 'status', job: publicJob(job) })}\n\n`);
}

function setStatus(job, status, extra = {}) {
  const now = new Date().toISOString();
  const preset = STATUS_PROGRESS[status];
  let nextProgress = job.progress;
  if (status === 'failed') {
    nextProgress = { percent: job.progress?.percent ?? 0, stage: 'Thất bại', etaSeconds: null, updatedAt: now };
  } else if (status === 'completed') {
    nextProgress = { percent: 100, stage: 'Hoàn tất', etaSeconds: 0, updatedAt: now };
  } else if (preset) {
    const keepGranular = status === 'cleaning' && (job.progress?.percent ?? 0) > preset[0];
    if (!keepGranular) nextProgress = { percent: preset[0], stage: preset[1], etaSeconds: null, updatedAt: now };
  }
  Object.assign(job, extra, { status, updatedAt: now, progress: nextProgress });
  for (const response of job.listeners) response.write(`data: ${JSON.stringify({ type: 'status', job: publicJob(job) })}\n\n`);
}

function sshArgs(config) {
  const args = [
    '-p', String(config.port),
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=15',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'Compression=no',
    '-o', 'IPQoS=throughput',
  ];
  if (config.identityPath) args.push('-i', config.identityPath);
  return args;
}

function scpArgs(config) {
  const args = [
    '-P', String(config.port),
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=15',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'Compression=no',
    '-o', 'IPQoS=throughput',
  ];
  if (config.identityPath) args.push('-i', config.identityPath);
  return args;
}

function runProcess(program, args, onStdout = () => {}, onStderr = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (data) => onStdout(data.toString()));
    child.stderr.on('data', (data) => onStderr(data.toString()));
    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

function execRemote(config, command, onStdout = () => {}, onStderr = () => {}) {
  const target = `${config.username}@${config.host}`;
  return runProcess('ssh', [...sshArgs(config), target, command], onStdout, onStderr);
}

async function execRemoteJob(job, command) {
  const stdoutReader = createLineReader((line) => {
    const progress = parseAigcProgressLine(line);
    if (progress) {
      setProgress(job, progress);
      return;
    }
    log(job, line, 'stdout');
  });
  const stderrReader = createLineReader((line) => log(job, line, 'stderr'));
  const result = await execRemote(
    job.ssh,
    command,
    (chunk) => stdoutReader.push(chunk),
    (chunk) => stderrReader.push(chunk),
  );
  stdoutReader.flush();
  stderrReader.flush();
  return result;
}

async function uploadFile(config, localPath, remotePath) {
  let stderr = '';
  const target = `${config.username}@${config.host}:${remotePath}`;
  const result = await runProcess('scp', [...scpArgs(config), localPath, target], () => {}, (chunk) => { stderr += chunk; });
  if (result.code !== 0) throw new Error(`SCP upload thất bại: ${stderr.trim() || `exit ${result.code}`}`);
}

async function listLocalOutputs(localDir, relative = '') {
  const entries = await fsp.readdir(localDir, { withFileTypes: true });
  const outputs = [];
  for (const entry of entries) {
    const name = entry.name;
    const localPath = path.join(localDir, name);
    const relPath = relative ? `${relative}/${name}` : name;
    if (entry.isDirectory()) {
      outputs.push(...await listLocalOutputs(localPath, relPath));
    } else if (entry.isFile()) {
      const stat = await fsp.stat(localPath);
      outputs.push({ name: relPath, size: stat.size });
    }
  }
  return outputs;
}

async function downloadDirectory(config, remoteDir, localDir) {
  await fsp.mkdir(localDir, { recursive: true });
  let stderr = '';
  const target = `${config.username}@${config.host}:${remoteDir}/.`;
  const startedAt = Date.now();
  const result = await runProcess('scp', ['-r', ...scpArgs(config), target, localDir], () => {}, (chunk) => { stderr += chunk; });
  if (result.code !== 0) throw new Error(`SCP download thất bại: ${stderr.trim() || `exit ${result.code}`}`);
  const outputs = await listLocalOutputs(localDir);
  const bytes = outputs.reduce((total, file) => total + file.size, 0);
  const seconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
  return { outputs, bytes, seconds };
}

function sshConfigFromBody(body) {
  if (body.sshCommand?.trim()) {
    const parsed = parseSshCommand(body.sshCommand);
    let identityFile = parsed.identityFile;

    if (identityFile.startsWith('~/')) identityFile = path.join(os.homedir(), identityFile.slice(2));
    if (identityFile) {
      identityFile = path.resolve(identityFile);
      return { ...parsed, identityPath: identityFile };
    }
    return { ...parsed, identityPath: '' };
  }

  throw new Error('Cần paste nguyên lệnh SSH direct');
}

app.post('/api/ssh/test', async (req, res) => {
  try {
    const config = sshConfigFromBody(req.body);
    let details = '';
    let stderr = '';
    const result = await execRemote(
      config,
      'if command -v nvidia-smi >/dev/null; then nvidia-smi --query-gpu=name,memory.total --format=csv,noheader; else printf "nvidia-smi not found"; fi',
      (chunk) => { details += chunk; },
      (chunk) => { stderr += chunk; },
    );
    if (result.code !== 0) throw new Error(stderr.trim() || `SSH exit ${result.code}`);
    res.json({ ok: true, message: `Direct SSH qua system route thành công · ${details.trim()}` });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post('/api/jobs', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 10 }]), async (req, res) => {
  const uploaded = [...(req.files?.images || []), ...(req.files?.videos || [])];
  try {
    const ssh = sshConfigFromBody(req.body);
    const remoteBase = validateRemoteBase(req.body.remoteBase || `/home/${ssh.username}/gpu-jobs`);
    const requestedPreset = req.body.preset === 'scail2' ? 'scail2_install' : req.body.preset;
    const standaloneCleaner = aigcProfiles.has(requestedPreset);
    const preset = standaloneCleaner || ['rvm', ...scail2InstallPresets, ...scail2RunPresets].includes(requestedPreset)
      ? requestedPreset
      : 'custom';
    const commandTemplate = standaloneCleaner ? '' : req.body.command?.trim();
    if (standaloneCleaner) {
      const videos = req.files?.videos || [];
      if (req.files?.images?.length || !videos.length || videos.some((file) => !/\.(mp4|mov|m4v)$/i.test(file.originalname))) {
        throw new Error('Preset xoá watermark AIGC chỉ nhận từ 1 đến 10 video MP4, MOV hoặc M4V.');
      }
    } else if (!commandTemplate) {
      throw new Error('Cần nhập command chạy model');
    }
    if (!uploaded.length && !scail2InstallPresets.includes(preset)) throw new Error('Cần chọn ít nhất một ảnh hoặc video reference');
    if (uploaded.length && preset === 'scail2_full_install') throw new Error('Preset chỉ cài FP16 không nhận ảnh hoặc video');
    if (preset === 'rvm' && !(req.files?.videos || []).length) throw new Error('Preset RVM cần ít nhất một video reference');
    if (scail2RunPresets.includes(preset) && (req.files?.images || []).length !== 1) throw new Error('Run SCAIL2 cần đúng 1 ảnh reference');
    if (scail2RunPresets.includes(preset) && (req.files?.videos || []).length !== 1) throw new Error('Run SCAIL2 cần đúng 1 video driving');

    const id = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const job = {
      id,
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ssh,
      remoteBase,
      remoteJobDir: `${remoteBase}/${id}`,
      preset,
      cleanAigc: !standaloneCleaner && req.body.cleanAigc === 'true',
      commandTemplate,
      prompt: req.body.prompt || '',
      files: uploaded,
      imageTempNames: new Set((req.files?.images || []).map((file) => file.filename)),
      logs: [],
      listeners: new Set(),
      progress: { percent: 2, stage: 'Đang xếp hàng', etaSeconds: null, updatedAt: new Date().toISOString() },
      outputs: [],
      error: null,
    };
    jobs.set(id, job);
    res.status(202).json({ job: publicJob(job) });
    void runJob(job);
  } catch (error) {
    await Promise.all(uploaded.map((file) => fsp.rm(file.path, { force: true })));
    res.status(400).json({ error: error.message });
  }
});

async function runJob(job) {
  const startedAt = performance.now();
  const aigcProfile = aigcProfiles.get(job.preset);
  const standaloneCleaner = Boolean(aigcProfile);
  const isScail2 = [...scail2InstallPresets, ...scail2RunPresets].includes(job.preset);
  try {
    const scail2Full = ['scail2_full', 'scail2_full_install'].includes(job.preset);
    const lowWorkflowFilename = job.preset === 'scail2_run_20s' ? scail2ExtendedWorkflowFilename : scail2WorkflowFilename;
    const lowWorkflowPath = path.resolve(rootDir, '..', lowWorkflowFilename);
    setStatus(job, 'connecting');
    log(job, `Native OpenSSH direct ${job.ssh.username}@${job.ssh.host}:${job.ssh.port} · WARP dùng system route`);
    let connectError = '';
    const connection = await execRemote(job.ssh, 'true', () => {}, (chunk) => { connectError += chunk; });
    if (connection.code !== 0) throw new Error(connectError.trim() || `SSH exit ${connection.code}`);

    if (job.preset === 'rvm') {
      setStatus(job, 'preparing');
      log(job, 'Kiểm tra Python, PyTorch và CUDA');
      const checkCode = "import torch, torchvision; assert torch.cuda.is_available(), 'CUDA unavailable'; print('PyTorch', torch.__version__, '| GPU:', torch.cuda.get_device_name(0))";
      const pythonCommand = 'if [ -x /venv/main/bin/python ]; then PYTHON=/venv/main/bin/python; else PYTHON=python3; fi; "$PYTHON"';
      const check = await execRemote(
        job.ssh,
        `${pythonCommand} -c ${shellQuote(checkCode)}`,
        (chunk) => chunk.split('\n').filter(Boolean).forEach((line) => log(job, line, 'stdout')),
        (chunk) => chunk.split('\n').filter(Boolean).forEach((line) => log(job, line, 'stderr')),
      );
      if (check.code !== 0) throw new Error('RVM preflight thất bại: cloud cần Python 3, PyTorch, Torchvision và CUDA hoạt động');
    } else if (isScail2) {
      setStatus(job, 'preparing');
      log(job, 'Kiểm tra công cụ cài SCAIL2/ComfyUI trên GPU');
      const check = await execRemote(job.ssh, 'command -v python3 && command -v git && command -v curl');
      if (check.code !== 0) throw new Error('SCAIL2 preflight thất bại: cloud cần python3, git và curl');
      await fsp.access(scail2Full ? scail2FullWorkflowPath : lowWorkflowPath);
    }

    const inputDir = `${job.remoteJobDir}/input`;
    const outputDir = `${job.remoteJobDir}/output`;
    const mkdir = await execRemote(job.ssh, `mkdir -p ${shellQuote(inputDir)} ${shellQuote(outputDir)}`);
    if (mkdir.code !== 0) throw new Error('Không tạo được remote job directory');
    const usedNames = new Set();
    const images = [];
    const videos = [];
    let runner = '';
    let workflow = '';
    const uploadStartedAt = performance.now();
    setStatus(job, 'uploading');

    if (job.preset === 'rvm') {
      runner = `${job.remoteJobDir}/rvm_runner.py`;
      log(job, 'Upload RVM worker bằng native SCP');
      await uploadFile(job.ssh, rvmRunnerPath, runner);
    } else if (job.preset === 'scail2_install') {
      runner = `${job.remoteJobDir}/scail2_installer.py`;
      workflow = `${job.remoteJobDir}/${scail2WorkflowFilename}`;
      log(job, 'Upload bộ cài và workflow SCAIL2 v4.6 bằng native SCP');
      await uploadFile(job.ssh, scail2InstallerPath, runner);
      await uploadFile(job.ssh, scail2WorkflowPath, workflow);
    } else if (scail2RunPresets.includes(job.preset) && !scail2Full) {
      runner = `${job.remoteJobDir}/scail2_pipeline.py`;
      workflow = `${job.remoteJobDir}/${lowWorkflowFilename}`;
      log(job, 'Upload pipeline, installer và workflow SCAIL2 v4.6 bằng native SCP');
      await uploadFile(job.ssh, scail2PipelinePath, runner);
      await uploadFile(job.ssh, scail2InstallerPath, `${job.remoteJobDir}/scail2_installer.py`);
      await uploadFile(job.ssh, lowWorkflowPath, workflow);
    } else if (scail2Full) {
      runner = `${job.remoteJobDir}/scail2_full_pipeline.py`;
      workflow = `${job.remoteJobDir}/${scail2FullWorkflowFilename}`;
      log(job, 'Upload workflow SCAIL2 FP16 15 giây cho máy khỏe');
      await uploadFile(job.ssh, scail2FullPipelinePath, runner);
      await uploadFile(job.ssh, scail2PipelinePath, `${job.remoteJobDir}/scail2_pipeline.py`);
      await uploadFile(job.ssh, scail2InstallerPath, `${job.remoteJobDir}/scail2_installer.py`);
      await uploadFile(job.ssh, scail2FullWorkflowPath, workflow);
    }

    for (let index = 0; index < job.files.length; index += 1) {
      const file = job.files[index];
      const baseName = standaloneCleaner
        ? `${safeName(file.originalname.slice(0, -4)).slice(0, 136)}${file.originalname.slice(-4).toLowerCase()}`
        : safeName(file.originalname);
      let name = baseName;
      for (let suffix = index + 1; usedNames.has(name); suffix += 1) name = `${suffix}-${baseName}`;
      usedNames.add(name);
      const remotePath = `${inputDir}/${name}`;
      log(job, `Native SCP upload ${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      await uploadFile(job.ssh, file.path, remotePath);
      (job.imageTempNames.has(file.filename) ? images : videos).push(remotePath);
    }

    const aigcCleaner = `${job.remoteJobDir}/aigc_cleaner.py`;
    const cleanerCommand = `if [ -x /venv/main/bin/python ]; then PYTHON=/venv/main/bin/python; else PYTHON=python3; fi; "$PYTHON" ${shellQuote(aigcCleaner)} --output-dir ${shellQuote(outputDir)}`;
    if (standaloneCleaner || job.cleanAigc) {
      log(job, `Upload worker xoá watermark AIGC · ${aigcProfile ?? 'wan21-synthid'}`);
      await uploadFile(job.ssh, aigcCleanerPath, aigcCleaner);
    }
    const command = standaloneCleaner
      ? `${cleanerCommand} --profile ${shellQuote(aigcProfile)} --inputs ${videos.map(shellQuote).join(' ')}`
      : expandCommand(job.commandTemplate, { inputDir, outputDir, images, videos, prompt: job.prompt, runner, workflow });
    const remoteStartedAt = performance.now();
    setStatus(job, standaloneCleaner ? 'cleaning' : 'running');
    log(job, `${standaloneCleaner ? 'Xoá watermark AIGC' : 'Chạy model'} trong ${job.remoteJobDir}`);
    const wrapped = `cd ${shellQuote(job.remoteJobDir)} && bash -lc ${shellQuote(command)}`;
    const result = await execRemoteJob(job, wrapped);
    if (result.code !== 0) {
      const task = standaloneCleaner ? 'Xoá watermark AIGC' : 'Model command';
      throw new Error(`${task} kết thúc với exit code ${result.code}${result.signal ? ` (${result.signal})` : ''}`);
    }
    if (job.cleanAigc) {
      setStatus(job, 'cleaning');
      log(job, 'Bắt đầu bước xoá watermark Wan 2.1 (8 steps) cho MP4 trong output');
      const cleanResult = await execRemoteJob(
        job,
        `cd ${shellQuote(job.remoteJobDir)} && bash -lc ${shellQuote(`${cleanerCommand} --profile wan21-synthid --wan-steps 8`)}`,
      );
      if (cleanResult.code !== 0) throw new Error(`Bước xoá watermark AIGC thất bại với exit code ${cleanResult.code}`);
    }
    const remoteFinishedAt = performance.now();

    setStatus(job, 'downloading');
    const localDir = path.join(outputRoot, job.id);
    log(job, 'Native SCP download toàn bộ output qua direct SSH/WARP');
    const transfer = await downloadDirectory(job.ssh, outputDir, localDir);
    job.outputs = transfer.outputs;
    if (isScail2) {
      const timings = {
        connect_and_preflight: (uploadStartedAt - startedAt) / 1000,
        upload: (remoteStartedAt - uploadStartedAt) / 1000,
        remote_command: (remoteFinishedAt - remoteStartedAt) / 1000,
        download_to_local: transfer.seconds,
        total: (performance.now() - startedAt) / 1000,
      };
      try {
        const name = 'job-timings.json';
        const report = JSON.stringify({ timings_seconds: timings, downloaded_bytes: transfer.bytes }, null, 2) + '\n';
        await fsp.writeFile(path.join(localDir, name), report, { flag: 'wx' });
        job.outputs.push({ name, size: Buffer.byteLength(report) });
      } catch (error) {
        log(job, `Không ghi được báo cáo thời gian: ${error.message}`, 'stderr');
      }
    }
    const megabytes = transfer.bytes / 1024 / 1024;
    const speed = megabytes / transfer.seconds;
    log(job, `Đã tải ${megabytes.toFixed(1)} MB trong ${transfer.seconds.toFixed(1)}s · ${speed.toFixed(1)} MB/s`);
    if (!job.outputs.length) log(job, 'Command chạy xong nhưng thư mục output đang trống', 'stderr');
    setStatus(job, 'completed');
    log(job, `Hoàn tất: ${job.outputs.length} file output`);
  } catch (error) {
    log(job, error.message, 'stderr');
    if (scail2RunPresets.includes(job.preset) && job.ssh) {
      try {
        const localDir = path.join(outputRoot, job.id);
        const transfer = await downloadDirectory(job.ssh, `${job.remoteJobDir}/output`, localDir);
        job.outputs = transfer.outputs;
        if (job.outputs.length) log(job, `Đã tải ${job.outputs.length} file chẩn đoán từ job lỗi`, 'stderr');
      } catch (downloadError) {
        log(job, `Không tải được file chẩn đoán: ${downloadError.message}`, 'stderr');
      }
    }
    setStatus(job, 'failed', { error: error.message });
  } finally {
    await Promise.all(job.files.map((file) => fsp.rm(file.path, { force: true })));
    job.files = [];
    job.imageTempNames = new Set();
    job.ssh = null;
  }
}

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Không tìm thấy job' });
  res.json({ job: publicJob(job) });
});

app.get('/api/jobs/:id/events', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).end();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'status', job: publicJob(job) })}\n\n`);
  job.listeners.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    job.listeners.delete(res);
  });
});

app.get('/api/jobs/:id/files/*name', (req, res) => {
  const job = jobs.get(req.params.id);
  const requested = Array.isArray(req.params.name) ? req.params.name.join('/') : req.params.name;
  if (!job || !job.outputs.some((file) => file.name === requested)) return res.status(404).json({ error: 'Không tìm thấy file' });
  const base = path.resolve(outputRoot, job.id);
  const filePath = path.resolve(base, requested);
  if (!filePath.startsWith(`${base}${path.sep}`)) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
  res.download(filePath, path.basename(requested));
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: `Upload lỗi: ${error.message}` });
  console.error(error);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, (error) => {
  if (error) {
    console.error(`Không thể mở local server: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`GPU Cloud Runner: http://${host}:${port}`);
});
server.on('error', (error) => {
  console.error(`Local server error: ${error.message}`);
  process.exitCode = 1;
});
