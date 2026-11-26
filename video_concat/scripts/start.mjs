import { createReadStream } from 'node:fs';
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const root = fileURLToPath(new URL('../dist/', import.meta.url));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function isTikTokUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && /(^|\.)tiktok\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function downloadTikTok(url, directory) {
  return new Promise((resolve, reject) => {
    const args = [
      '-m', 'yt_dlp', '--impersonate', 'chrome', '--no-playlist', '--restrict-filenames',
      '--max-filesize', '250M', '--socket-timeout', '25',
      '--merge-output-format', 'mp4', '-o', join(directory, 'video.%(ext)s'), url
    ];
    const child = spawn('python3', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-6000); });
    child.on('error', error => reject(new Error(`Could not start yt-dlp: ${error.message}`)));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(errors.split('\n').filter(Boolean).at(-1) || 'TikTok download failed.')));
  });
}

async function downloadTikTokFallback(url, directory) {
  const apiRes = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url), {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!apiRes.ok) throw new Error('TikTok fallback service unavailable');
  const data = await apiRes.json();
  if (data.code !== 0 || !data.data) throw new Error(data.msg || 'TikTok fallback returned no video');
  const videoUrl = data.data.play || data.data.wmplay;
  if (!videoUrl) throw new Error('TikTok fallback returned no valid download stream');
  const vRes = await fetch(videoUrl);
  if (!vRes.ok) throw new Error('Failed to download video stream from fallback');
  const buffer = Buffer.from(await vRes.arrayBuffer());
  await writeFile(join(directory, 'video.mp4'), buffer);
}

async function handleTikTok(request, response) {
  let directory;
  try {
    const body = await readJson(request);
    if (!isTikTokUrl(body.url)) return sendJson(response, 400, { error: 'Enter a valid TikTok URL.' });
    directory = await mkdtemp(join(tmpdir(), 'audio-keeper-cut-'));
    try {
      await downloadTikTok(body.url, directory);
    } catch (firstError) {
      try {
        await downloadTikTokFallback(body.url, directory);
      } catch {
        throw firstError;
      }
    }
    const files = await readdir(directory);
    const filename = files.find(name => name.startsWith('video.'));
    if (!filename) throw new Error('TikTok returned no video file.');
    const filePath = join(directory, filename);
    const info = await stat(filePath);
    response.writeHead(200, {
      'Content-Type': extname(filename).toLowerCase() === '.mp4' ? 'video/mp4' : 'application/octet-stream',
      'Content-Length': info.size,
      'X-Video-Filename': filename,
      'Cache-Control': 'no-store'
    });
    createReadStream(filePath).pipe(response);
    response.on('close', () => rm(directory, { recursive: true, force: true }).catch(() => {}));
  } catch (error) {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    sendJson(response, 502, { error: error.message || 'TikTok video could not be fetched.' });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/fetch-tiktok') {
    await handleTikTok(request, response);
    return;
  }
  try {
    const requestPath = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const safePath = normalize(relativePath);

    if (safePath.startsWith('..')) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const filePath = join(root, safePath);
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');

    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Audio Keeper Cut is running at http://${host}:${port}`);
  console.log('Press Ctrl+C to stop.');
});
