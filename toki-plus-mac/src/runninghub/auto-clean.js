'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const _DEBUG_LOG = path.join(process.env.APPDATA || '', 'Motion Toki', 'job_debug.log');
function logFile(msg, data = null) {
  try {
    const line = `[${new Date().toISOString()}] [AutoCrop] ${msg}${data !== null ? ' ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(_DEBUG_LOG, line);
  } catch(e) {}
}

function findFfmpegBinary() {
  const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [
    typeof process.resourcesPath === 'string' ? path.join(process.resourcesPath, 'bin', binName) : null,
    path.join(__dirname, '..', '..', 'resources', 'bin', binName),
    path.join(__dirname, '..', '..', '..', 'resources', 'bin', binName),
    path.join(process.cwd(), 'resources', 'bin', binName)
  ];

  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c)) return c;
    } catch(e) {}
  }

  // Fallback to PATH
  const envPath = (process.env.PATH || '').split(path.delimiter);
  for (const p of envPath) {
    const candidate = path.join(p, binName);
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch(e) {}
  }

  return 'ffmpeg';
}

function getVideoDimensions(ffmpegBin, videoPath) {
  return new Promise((resolve) => {
    try {
      const p = spawn(ffmpegBin, ['-hide_banner', '-i', videoPath], { windowsHide: true });
      let output = '';
      p.stderr.on('data', d => { output += d.toString(); });
      p.on('error', () => resolve({ width: 1080, height: 1920 }));
      p.on('close', () => {
        const m = output.match(/,\s*(\d{3,5})x(\d{3,5})/);
        if (m) {
          resolve({
            width: parseInt(m[1], 10),
            height: parseInt(m[2], 10)
          });
        } else {
          resolve({ width: 1080, height: 1920 });
        }
      });
      setTimeout(() => {
        try { p.kill('SIGKILL'); } catch(e) {}
        resolve({ width: 1080, height: 1920 });
      }, 5000);
    } catch(e) {
      resolve({ width: 1080, height: 1920 });
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mutex queue để chạy tuần tự các tác vụ FFmpeg tránh nghẽn CPU khi nhiều video hoàn thành cùng lúc
let _cleanChain = Promise.resolve();

/**
 * Automatically crop top 4.5% (RunningHub watermark) and scale back to original resolution.
 * Strips metadata (-map_metadata -1) to remove AIGC trace.
 */
function cleanRunningHubVideo(videoPath, logger = null) {
  const currentOp = _cleanChain.then(() => _doCleanRunningHubVideo(videoPath, logger));
  _cleanChain = currentOp.catch(() => {});
  return currentOp;
}

async function _doCleanRunningHubVideo(videoPath, logger = null) {
  const log = (msg, data = null) => {
    if (logger && typeof logger.info === 'function') logger.info(`[AutoClean] ${msg}`);
    logFile(msg, data);
  };

  const warn = (msg, data = null) => {
    if (logger && typeof logger.warn === 'function') logger.warn(`[AutoClean] ${msg}`);
    logFile(`WARN: ${msg}`, data);
  };

  if (!videoPath || !fs.existsSync(videoPath)) {
    warn('File video không tồn tại:', videoPath);
    return false;
  }

  const ffmpeg = findFfmpegBinary();
  log('Bắt đầu xử lý tự động xóa logo RunningHub...', { videoPath, ffmpeg });

  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath) || '.mp4';
  const tempPath = path.join(dir, `.clean_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);

  try {
    const { width: origW, height: origH } = await getVideoDimensions(ffmpeg, videoPath);

    // Crop 4.5% mỗi chiều (zoom ~9%) để cắt trên sâu ~86px trên video 1080x1920, loại bỏ hoàn toàn watermark
    const cropH = Math.round(origH * 0.91 / 2) * 2;
    const cropW = Math.round(origW * 0.91 / 2) * 2;
    const cropX = Math.round((origW - cropW) / 2);
    const cropY = Math.round((origH - cropH) / 2);

    const filter = `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${origW}:${origH}:flags=bicubic`;
    log('Thông số crop & scale:', { origW, origH, cropW, cropH, cropX, cropY, filter });

    const cpuCount = typeof os.cpus === 'function' ? os.cpus().length : 2;
    const threadsToUse = Math.max(1, Math.min(cpuCount, 4));

    const args = [
      '-y',
      '-threads', String(threadsToUse),
      '-i', videoPath,
      '-vf', filter,
      '-c:v', 'libx264',
      '-preset', 'superfast',
      '-crf', '19',
      '-c:a', 'copy',
      '-map_metadata', '-1',
      tempPath
    ];

    const success = await new Promise((resolve) => {
      let timer = null;
      const proc = spawn(ffmpeg, args, { windowsHide: true });
      let stderr = '';

      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('error', err => {
        if (timer) clearTimeout(timer);
        warn('Lỗi tiến trình FFmpeg:', err.message);
        resolve(false);
      });

      proc.on('close', code => {
        if (timer) clearTimeout(timer);
        if (code === 0 && fs.existsSync(tempPath) && fs.statSync(tempPath).size > 1000) {
          resolve(true);
        } else {
          warn(`FFmpeg thoát với mã ${code}: ${stderr.slice(-300)}`);
          resolve(false);
        }
      });

      // Timeout bảo vệ 300 giây (5 phút)
      timer = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch(e) {}
        warn('FFmpeg timeout sau 300s.');
        resolve(false);
      }, 300000);
    });

    if (success) {
      let replaced = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
          fs.renameSync(tempPath, videoPath);
          replaced = true;
          break;
        } catch (lockErr) {
          await sleep(200);
        }
      }

      if (replaced) {
        log('Đã cắt xén và làm sạch 100% logo RunningHub thành công!', { videoPath });
        return true;
      } else {
        warn('Không thể ghi đè file do bị khóa tiến trình.');
      }
    }
  } catch (err) {
    warn('Ngoại lệ khi tự động làm sạch video:', err.message);
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch(e) {}
  }

  return false;
}

module.exports = { cleanRunningHubVideo };
