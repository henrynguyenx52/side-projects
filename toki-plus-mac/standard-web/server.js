'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { TokiWebAppClient } = require('./toki-webapp-client');
const {
  STANDARD_WORKFLOW_ID,
  SOURCE_WORKFLOW_ID,
  STANDARD_APP_ID,
} = require('./config');

const HOST = process.env.STANDARD_WEB_HOST || '127.0.0.1';
const PORT = Number(process.env.STANDARD_WEB_PORT || 4177);
const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMP_DIR = path.join(os.tmpdir(), 'motion-standard-web');
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const uploads = new Map();
const jobs = new Map();

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
    message: job.message,
    taskId: job.taskId || null,
    result: job.result || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: Date.now() });
}

async function removeUpload(upload) {
  if (!upload) return;
  uploads.delete(upload.id);
  await fsp.unlink(upload.path).catch(() => {});
}

async function executeJob(job, payload, imageUpload, videoUpload) {
  let email = String(payload.email || '').trim();
  let password = String(payload.password || '');
  let client;
  try {
    client = new TokiWebAppClient({ email, password });
    updateJob(job, { state: 'running', stage: 'checking', message: 'Đang đăng nhập tài khoản Toki WebApp…' });
    const balanceBefore = await client.getBalance();

    updateJob(job, { stage: 'uploading-image', message: `Còn ${balanceBefore} free coins · đang upload ảnh…` });
    const image = await client.upload(imageUpload.path);
    updateJob(job, { stage: 'uploading-video', message: 'Đang upload video chuyển động…' });
    const video = await client.upload(videoUpload.path);

    updateJob(job, { stage: 'submitting', message: 'Đang gọi Motion Toki Standard WebApp…' });
    const taskId = await client.run(image, video);
    updateJob(job, { taskId, stage: 'processing', message: 'RunningHub đang render video…' });

    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      const result = await client.query(taskId);
      if (result.done) {
        updateJob(job, {
          state: 'completed',
          stage: 'completed',
          message: 'Video đã hoàn tất.',
          result: { ...result, balanceBefore },
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
    'content-security-policy': "default-src 'self'; img-src 'self' blob: data: https:; media-src 'self' blob: https:; connect-src 'self' https://www.runninghub.ai https://*.xiaoyaoyou.com; style-src 'self'; script-src 'self'; frame-ancestors 'none';",
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
        mode: 'toki-webapp',
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
      const client = new TokiWebAppClient({ email: body.email, password: body.password });
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
      const job = { id, state: 'queued', stage: 'queued', message: 'Đã xếp task.', createdAt: now, updatedAt: now };
      jobs.set(id, job);
      void executeJob(job, body, imageUpload, videoUpload);
      return json(res, 202, { ok: true, job: publicJob(job) });
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
  await fsp.mkdir(TEMP_DIR, { recursive: true });
  const server = http.createServer((req, res) => void handle(req, res));
  server.listen(PORT, HOST, () => {
    console.log(`Motion Standard Web đang chạy tại http://${HOST}:${PORT}`);
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

module.exports = { start, handle, safeError };
