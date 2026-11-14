'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { TokiWebAppClient: RunningHubWebAppClient } = require('./toki-webapp-client');
const { cleanRunningHubVideo } = require('../src/runninghub/auto-clean');
const {
  STANDARD_WORKFLOW_ID,
  SOURCE_WORKFLOW_ID,
  STANDARD_APP_ID,
} = require('./config');

const HOST = process.env.STANDARD_WEB_HOST || '127.0.0.1';
const PORT = Number(process.env.STANDARD_WEB_PORT || 4177);
const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMP_DIR = path.join(os.tmpdir(), 'henry-motion-web');
const DATA_DIR = process.env.HENRY_MOTION_DATA_DIR || path.join(__dirname, '.data');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const uploads = new Map();
const jobs = new Map();
let persistChain = Promise.resolve();

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(data);
}

function safeError(error) {
  const message = String(error?.message || error || 'Lỗi không xác định');
  return message.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [ẩn]');
}

async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Dữ liệu gửi lên quá lớn.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const body = await readBody(req);
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new Error('JSON không hợp lệ.');
  }
}

function sanitizeName(name) {
  return path.basename(String(name || 'upload.bin')).replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function acceptUpload(req, res, kind) {
  const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > maxBytes) throw new Error(`${kind === 'image' ? 'Ảnh' : 'Video'} quá lớn.`);
  const id = crypto.randomUUID();
  const filename = sanitizeName(req.headers['x-file-name']);
  const target = path.join(TEMP_DIR, `${id}-${filename}`);
  let bytes = 0;
  req.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > maxBytes) req.destroy(new Error('File vượt giới hạn dung lượng.'));
  });
  await pipeline(req, fs.createWriteStream(target, { flags: 'wx' }));
  uploads.set(id, { id, kind, filename, path: target, bytes, createdAt: Date.now() });
  json(res, 201, { ok: true, upload: { id, kind, filename, bytes } });
}

function publicJob(job) {
  return {
    id: job.id,
    state: job.state,
    stage: job.stage,
    instanceType: job.instanceType || 'default',
    message: job.message,
    taskId: job.taskId || null,
    result: job.result || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function persistedJob(job) {
  return {
    ...publicJob(job),
    outputFile: job.outputFile || null,
  };
}

async function writeJobsSnapshot(directory, records) {
  await fsp.mkdir(directory, { recursive: true });
  const target = path.join(directory, 'jobs.json');
  const temporary = `${target}.${process.pid}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify({ version: 1, jobs: records }, null, 2)}\n`, { mode: 0o600 });
  await fsp.rename(temporary, target);
}

async function readJobsSnapshot(directory) {
  try {
    const data = JSON.parse(await fsp.readFile(path.join(directory, 'jobs.json'), 'utf8'));
    return Array.isArray(data?.jobs) ? data.jobs : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function persistJobs() {
  const snapshot = Array.from(jobs.values()).map(persistedJob);
  persistChain = persistChain
    .catch(() => {})
    .then(() => writeJobsSnapshot(DATA_DIR, snapshot))
    .catch((error) => console.error(`Không lưu được Jobs: ${safeError(error)}`));
  return persistChain;
}

async function restoreJobs() {
  const records = await readJobsSnapshot(DATA_DIR);
  let changed = false;
  for (const record of records) {
    if (!record?.id || typeof record.id !== 'string') continue;
    const outputFile = record.outputFile ? path.basename(String(record.outputFile)) : null;
    const job = {
      ...record,
      outputFile,
      outputPath: outputFile ? path.join(OUTPUT_DIR, outputFile) : null,
    };
    if (job.state === 'queued' || job.state === 'running') {
      job.state = 'failed';
      job.stage = 'failed';
      job.message = 'Task bị gián đoạn vì server đã khởi động lại.';
      job.error = 'Không thể tự tiếp tục task sau khi server restart.';
      job.updatedAt = Date.now();
      changed = true;
    }
    if (job.state === 'completed' && job.outputPath) {
      try {
        await fsp.access(job.outputPath);
      } catch {
        job.state = 'failed';
        job.stage = 'failed';
        job.message = 'File video đã lưu không còn tồn tại.';
        job.error = 'Không tìm thấy file video local.';
        job.result = null;
        job.outputFile = null;
        job.outputPath = null;
        job.updatedAt = Date.now();
        changed = true;
      }
    }
    jobs.set(job.id, job);
  }
  if (changed) await persistJobs();
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: Date.now() });
  void persistJobs();
}

async function removeUpload(upload) {
  if (!upload) return;
  uploads.delete(upload.id);
  await fsp.unlink(upload.path).catch(() => {});
}

function byteLimit(maxBytes) {
  let received = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > maxBytes) return callback(new Error('Video kết quả vượt giới hạn 2 GB.'));
      callback(null, chunk);
    },
  });
}

async function downloadResultVideo(url, target) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30 * 60_000) });
  if (!response.ok || !response.body) throw new Error(`Không tải được video kết quả (HTTP ${response.status}).`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_VIDEO_BYTES) throw new Error('Video kết quả vượt giới hạn 2 GB.');
  const partial = `${target}.part`;
  try {
    await pipeline(Readable.fromWeb(response.body), byteLimit(MAX_VIDEO_BYTES), fs.createWriteStream(partial, { flags: 'wx' }));
    await fsp.rename(partial, target);
  } catch (error) {
    await fsp.unlink(partial).catch(() => {});
    throw error;
  }
}

async function prepareCleanResult(job, result) {
  const outputFile = `${job.id}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);
  updateJob(job, { stage: 'downloading', message: 'Đang tải video kết quả về máy…' });
  await downloadResultVideo(result.url, outputPath);
  job.outputFile = outputFile;
  job.outputPath = outputPath;
  job.sourceUrl = result.url;
  updateJob(job, { stage: 'cleaning', message: 'Đang crop watermark và xóa metadata…' });
  const logger = {
    info(message) { updateJob(job, { message: String(message).replace(/^\[AutoClean\]\s*/, '') }); },
    warn(message) { job.cleanWarning = safeError(message); },
  };
  const cleaned = await cleanRunningHubVideo(outputPath, logger);
  return {
    ...result,
    url: `/api/jobs/${job.id}/video`,
    outputs: [`/api/jobs/${job.id}/video`],
    sourceUrl: undefined,
    cleaned,
    filename: `henry-motion-${job.id.slice(0, 8)}.mp4`,
  };
}

async function executeJob(job, payload, imageUpload, videoUpload) {
  let email = String(payload.email || '').trim();
  let password = String(payload.password || '');
  let client;
  try {
    client = new RunningHubWebAppClient({ email, password });
    updateJob(job, { state: 'running', stage: 'checking', message: 'Đang đăng nhập tài khoản RunningHub…' });
    const balanceBefore = await client.getBalance();

    updateJob(job, { stage: 'uploading-image', message: `Còn ${balanceBefore} free coins · đang upload ảnh…` });
    const image = await client.upload(imageUpload.path);
    updateJob(job, { stage: 'uploading-video', message: 'Đang upload video chuyển động…' });
    const video = await client.upload(videoUpload.path);

    const modeLabel = job.instanceType === 'plus' ? 'Plus' : 'Standard';
    updateJob(job, { stage: 'submitting', message: `Đang gọi Henry Motion ${modeLabel}…` });
    const taskId = await client.run(image, video, job.instanceType);
    updateJob(job, { taskId, stage: 'processing', message: 'RunningHub đang render video…' });

    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      const result = await client.query(taskId);
      if (result.done) {
        const localResult = await prepareCleanResult(job, result);
        updateJob(job, {
          state: 'completed',
          stage: 'completed',
          message: localResult.cleaned ? 'Video đã hoàn tất và được xóa watermark.' : 'Video đã hoàn tất; bước xóa watermark không thành công.',
          result: { ...localResult, balanceBefore },
        });
        break;
      }
      updateJob(job, { message: `RunningHub đang xử lý (${result.status.toLowerCase()})…` });
    }
  } catch (error) {
    updateJob(job, { state: 'failed', stage: 'failed', error: safeError(error), message: 'Không thể hoàn tất task.' });
  } finally {
    email = '';
    password = '';
    client?.clearSecrets();
    await Promise.all([removeUpload(imageUpload), removeUpload(videoUpload)]);
  }
}

async function serveJobVideo(req, res, job) {
  if (!job?.outputPath) return json(res, 404, { ok: false, error: 'Video local chưa sẵn sàng.' });
  let stat;
  try {
    stat = await fsp.stat(job.outputPath);
  } catch {
    return json(res, 404, { ok: false, error: 'Không tìm thấy video local.' });
  }
  const total = stat.size;
  const range = req.headers.range;
  const filename = job.result?.filename || `henry-motion-${job.id}.mp4`;
  const baseHeaders = {
    'content-type': 'video/mp4',
    'accept-ranges': 'bytes',
    'cache-control': 'private, no-store',
    'content-disposition': `inline; filename="${filename}"`,
    'x-content-type-options': 'nosniff',
  };
  if (!range) {
    res.writeHead(200, { ...baseHeaders, 'content-length': total });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(job.outputPath).pipe(res);
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.writeHead(416, { 'content-range': `bytes */${total}` });
    return res.end();
  }
  const suffixLength = !match[1] && match[2] ? Number(match[2]) : null;
  const start = suffixLength !== null ? Math.max(0, total - suffixLength) : Number(match[1] || 0);
  const end = suffixLength !== null ? total - 1 : (match[2] ? Math.min(Number(match[2]), total - 1) : total - 1);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= total) {
    res.writeHead(416, { 'content-range': `bytes */${total}` });
    return res.end();
  }
  res.writeHead(206, {
    ...baseHeaders,
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${total}`,
  });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(job.outputPath, { start, end }).pipe(res);
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const target = path.resolve(PUBLIC_DIR, relative);
  if (!target.startsWith(`${PUBLIC_DIR}${path.sep}`)) return false;
  let data;
  try {
    data = await fsp.readFile(target);
  } catch {
    return false;
  }
  const ext = path.extname(target);
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'content-type': mime,
    'content-length': data.length,
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'self'; img-src 'self' blob: data: https:; media-src 'self' blob: https:; connect-src 'self' https://www.runninghub.ai https://*.xiaoyaoyou.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none';",
  });
  res.end(data);
  return true;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/config') {
      return json(res, 200, {
        ok: true,
        workflowId: STANDARD_WORKFLOW_ID,
        sourceWorkflowId: SOURCE_WORKFLOW_ID,
        appId: STANDARD_APP_ID,
        mode: 'henry-motion',
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/upload/image') {
      return await acceptUpload(req, res, 'image');
    }
    if (req.method === 'POST' && url.pathname === '/api/upload/video') {
      return await acceptUpload(req, res, 'video');
    }
    if (req.method === 'POST' && url.pathname === '/api/check-account') {
      const body = await readJson(req);
      const client = new RunningHubWebAppClient({ email: body.email, password: body.password });
      const balance = await client.getBalance();
      client.clearSecrets();
      return json(res, 200, { ok: true, balance });
    }
    if (req.method === 'POST' && url.pathname === '/api/jobs') {
      const body = await readJson(req);
      const imageUpload = uploads.get(body.imageUploadId);
      const videoUpload = uploads.get(body.videoUploadId);
      if (!String(body.email || '').trim() || !String(body.password || '')) {
        throw new Error('Vui lòng nhập email và mật khẩu RunningHub.');
      }
      if (!imageUpload || imageUpload.kind !== 'image') throw new Error('Ảnh upload không hợp lệ hoặc đã hết hạn.');
      if (!videoUpload || videoUpload.kind !== 'video') throw new Error('Video upload không hợp lệ hoặc đã hết hạn.');
      const id = crypto.randomUUID();
      const now = Date.now();
      const instanceType = body.instanceType === 'plus' ? 'plus' : 'default';
      const job = { id, instanceType, state: 'queued', stage: 'queued', message: `Đã xếp task ${instanceType === 'plus' ? 'Plus' : 'Standard'}.`, createdAt: now, updatedAt: now };
      jobs.set(id, job);
      void persistJobs();
      void executeJob(job, body, imageUpload, videoUpload);
      return json(res, 202, { ok: true, job: publicJob(job) });
    }
    if (req.method === 'GET' && url.pathname === '/api/jobs') {
      const list = Array.from(jobs.values())
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 100)
        .map(publicJob);
      return json(res, 200, { ok: true, jobs: list });
    }
    const videoMatch = /^\/api\/jobs\/([^/]+)\/video$/.exec(url.pathname);
    if ((req.method === 'GET' || req.method === 'HEAD') && videoMatch) {
      const job = jobs.get(videoMatch[1]);
      if (!job) return json(res, 404, { ok: false, error: 'Không tìm thấy task.' });
      return await serveJobVideo(req, res, job);
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
      const id = url.pathname.slice('/api/jobs/'.length);
      const job = jobs.get(id);
      if (!job) return json(res, 404, { ok: false, error: 'Không tìm thấy task.' });
      return json(res, 200, { ok: true, job: publicJob(job) });
    }
    if (req.method === 'GET' && await serveStatic(req, res, url.pathname)) return;
    return json(res, 404, { ok: false, error: 'Không tìm thấy.' });
  } catch (error) {
    return json(res, 400, { ok: false, error: safeError(error) });
  }
}

async function start() {
  await Promise.all([
    fsp.mkdir(TEMP_DIR, { recursive: true }),
    fsp.mkdir(OUTPUT_DIR, { recursive: true }),
  ]);
  await restoreJobs();
  const server = http.createServer((req, res) => void handle(req, res));
  server.listen(PORT, HOST, () => {
    console.log(`Henry Motion đang chạy tại http://${HOST}:${PORT}`);
    console.log('Nhấn Ctrl+C để dừng.');
  });
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
}

module.exports = {
  start,
  handle,
  safeError,
  downloadResultVideo,
  serveJobVideo,
  readJobsSnapshot,
  writeJobsSnapshot,
};
