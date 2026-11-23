import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { expandCommand, parseSshCommand, safeName, shellQuote, validateRemoteBase } from './remote.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputRoot = path.join(rootDir, 'outputs');
const tempRoot = path.join(rootDir, '.tmp');
const rvmRunnerPath = path.join(rootDir, 'remote', 'rvm_runner.py');
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

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    remoteJobDir: job.remoteJobDir,
    error: job.error,
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

function setStatus(job, status, extra = {}) {
  Object.assign(job, extra, { status, updatedAt: new Date().toISOString() });
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
    const preset = req.body.preset === 'rvm' ? 'rvm' : 'custom';
    const commandTemplate = req.body.command?.trim();
    if (!commandTemplate) throw new Error('Cần nhập command chạy model');
    if (!uploaded.length) throw new Error('Cần chọn ít nhất một ảnh hoặc video reference');
    if (preset === 'rvm' && !(req.files?.videos || []).length) throw new Error('Preset RVM cần ít nhất một video reference');

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
      commandTemplate,
      prompt: req.body.prompt || '',
      files: uploaded,
      imageTempNames: new Set((req.files?.images || []).map((file) => file.filename)),
      logs: [],
      listeners: new Set(),
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
  try {
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
    }

    const inputDir = `${job.remoteJobDir}/input`;
    const outputDir = `${job.remoteJobDir}/output`;
    const mkdir = await execRemote(job.ssh, `mkdir -p ${shellQuote(inputDir)} ${shellQuote(outputDir)}`);
    if (mkdir.code !== 0) throw new Error('Không tạo được remote job directory');
    const usedNames = new Set();
    const images = [];
    const videos = [];
    let runner = '';
    setStatus(job, 'uploading');

    if (job.preset === 'rvm') {
      runner = `${job.remoteJobDir}/rvm_runner.py`;
      log(job, 'Upload RVM worker bằng native SCP');
      await uploadFile(job.ssh, rvmRunnerPath, runner);
    }

    for (let index = 0; index < job.files.length; index += 1) {
      const file = job.files[index];
      let name = safeName(file.originalname);
      if (usedNames.has(name)) name = `${index + 1}-${name}`;
      usedNames.add(name);
      const remotePath = `${inputDir}/${name}`;
      log(job, `Native SCP upload ${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      await uploadFile(job.ssh, file.path, remotePath);
      (job.imageTempNames.has(file.filename) ? images : videos).push(remotePath);
    }

    const command = expandCommand(job.commandTemplate, { inputDir, outputDir, images, videos, prompt: job.prompt, runner });
    setStatus(job, 'running');
    log(job, `Chạy model trong ${job.remoteJobDir}`);
    const wrapped = `cd ${shellQuote(job.remoteJobDir)} && bash -lc ${shellQuote(command)}`;
    const result = await execRemote(
      job.ssh,
      wrapped,
      (chunk) => chunk.split('\n').filter(Boolean).forEach((line) => log(job, line, 'stdout')),
      (chunk) => chunk.split('\n').filter(Boolean).forEach((line) => log(job, line, 'stderr')),
    );
    if (result.code !== 0) throw new Error(`Model command kết thúc với exit code ${result.code}${result.signal ? ` (${result.signal})` : ''}`);

    setStatus(job, 'downloading');
    const localDir = path.join(outputRoot, job.id);
    log(job, 'Native SCP download toàn bộ output qua direct SSH/WARP');
    const transfer = await downloadDirectory(job.ssh, outputDir, localDir);
    job.outputs = transfer.outputs;
    const megabytes = transfer.bytes / 1024 / 1024;
    const speed = megabytes / transfer.seconds;
    log(job, `Đã tải ${megabytes.toFixed(1)} MB trong ${transfer.seconds.toFixed(1)}s · ${speed.toFixed(1)} MB/s`);
    if (!job.outputs.length) log(job, 'Command chạy xong nhưng thư mục output đang trống', 'stderr');
    setStatus(job, 'completed');
    log(job, `Hoàn tất: ${job.outputs.length} file output`);
  } catch (error) {
    log(job, error.message, 'stderr');
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
