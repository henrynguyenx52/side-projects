const $ = (id) => document.getElementById(id);

const el = {
  fileA: $('fileA'), fileB: $('fileB'), cardA: $('cardA'), cardB: $('cardB'),
  nameA: $('nameA'), nameB: $('nameB'), metaA: $('metaA'), metaB: $('metaB'),
  videoA: $('videoA'), videoB: $('videoB'), canvas: $('canvas'),
  settings: $('settings'),
  tiktokUrlA: $('tiktokUrlA'), tiktokUrlB: $('tiktokUrlB'),
  fetchTikTokA: $('fetchTikTokA'), fetchTikTokB: $('fetchTikTokB'),
  fetchStatusA: $('fetchStatusA'), fetchStatusB: $('fetchStatusB'),
  splitRange: $('splitRange'), splitVal: $('splitVal'), splitReadout: $('splitReadout'),
  featherRange: $('featherRange'), featherVal: $('featherVal'), fitSelect: $('fitSelect'),
  panARange: $('panARange'), panAVal: $('panAVal'),
  panBRange: $('panBRange'), panBVal: $('panBVal'),
  offsetRange: $('offsetRange'), offsetInput: $('offsetInput'), offsetPreviewTime: $('offsetPreviewTime'),
  previewVideo2Button: $('previewVideo2Button'), previewVideo2Icon: $('previewVideo2Icon'),
  previewScrubber: $('previewScrubber'), previewRange: $('previewRange'), previewPosition: $('previewPosition'),
  previewButton: $('previewButton'), previewIcon: $('previewIcon'),
  exportButton: $('exportButton'),
  progressWrap: $('progressWrap'), progress: $('progress'), progressValue: $('progressValue'), progressLabel: $('progressLabel'),
  cancelButton: $('cancelButton'),
  result: $('result'), downloadLink: $('downloadLink'), resultMeta: $('resultMeta'),
  error: $('error'), activeClip: $('activeClip'), timecode: $('timecode'),
  copyFfmpegBtn: $('copyFfmpegBtn')
};

const state = {
  fileA: null, fileB: null,
  urlA: null, urlB: null,
  readyA: false, readyB: false,
  previewing: false, previewingB: false, exporting: false, cancelled: false,
  raf: 0, outputUrl: null,
  fetching: { A: false, B: false },
  lastFetched: { A: '', B: '' }
};

const autoFetchTimers = { A: 0, B: 0 };
const ctx = el.canvas.getContext('2d', { alpha: false });

// Offscreen canvas để tạo gradient alpha mask cho Video 2
const layerCanvas = document.createElement('canvas');
layerCanvas.width = el.canvas.width;
layerCanvas.height = el.canvas.height;
const layerCtx = layerCanvas.getContext('2d');

let audioCtx, sourceA, captureDest, monitorGain;

function fmt(seconds) {
  if (!Number.isFinite(seconds)) return '0:00.0';
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

function fmtClock(seconds) {
  return fmt(seconds).padStart(7, '0');
}

function formatDownloadFilename(ext, date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${mm}${dd}${yyyy}-${hh} ${min} ${ss}.${ext}`;
}

function dimensions(video) {
  return `${video.videoWidth}×${video.videoHeight}`;
}

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = !message;
}

function updateReady() {
  const ready = state.readyA && state.readyB;
  el.settings.classList.toggle('disabled', !ready);
  el.previewScrubber.classList.toggle('disabled', !ready);
  el.previewButton.disabled = !ready || state.exporting;
  el.previewVideo2Button.disabled = !state.readyB || state.exporting;
  el.exportButton.disabled = !ready || state.exporting || !window.MediaRecorder || !el.canvas.captureStream;

  if (ready) {
    el.timecode.style.display = 'block';
    el.activeClip.textContent = 'Đã sẵn sàng tạo hiệu ứng song song';
    drawAt(0);
  }
}

function loadFile(kind, file) {
  if (!file || !file.type.startsWith('video/')) return showError('Vui lòng chọn một file video hợp lệ.');
  showError('');
  const video = kind === 'A' ? el.videoA : el.videoB;
  const oldUrl = kind === 'A' ? state.urlA : state.urlB;
  if (oldUrl) URL.revokeObjectURL(oldUrl);

  const url = URL.createObjectURL(file);
  state[`file${kind}`] = file;
  state[`url${kind}`] = url;
  state[`ready${kind}`] = false;
  video.src = url;
  video.load();

  video.onloadedmetadata = () => {
    state[`ready${kind}`] = true;
    const name = el[`name${kind}`], meta = el[`meta${kind}`], card = el[`card${kind}`];
    name.textContent = file.name;
    meta.textContent = `${fmt(video.duration)} · ${dimensions(video)} · ${(file.size / 1048576).toFixed(1)} MB`;
    card.classList.add('loaded');

    if (kind === 'B') {
      const maxSec = Math.max(0, video.duration || 0).toFixed(1);
      el.offsetRange.max = maxSec;
      el.offsetInput.max = maxSec;
    }
    updateReady();
  };

  video.onerror = () => showError(`Trình duyệt không thể đọc file ${file.name}. Vui lòng thử định dạng MP4, MOV hoặc WebM.`);
}

['A', 'B'].forEach(kind => {
  const input = el[`file${kind}`], card = el[`card${kind}`];
  input.addEventListener('change', () => loadFile(kind, input.files[0]));
  ['dragenter', 'dragover'].forEach(evt => card.addEventListener(evt, e => { e.preventDefault(); card.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(evt => card.addEventListener(evt, e => { e.preventDefault(); card.classList.remove('dragging'); }));
  card.addEventListener('drop', e => loadFile(kind, e.dataTransfer.files[0]));
});

function isTikTokLink(value) {
  try {
    return /(^|\.)tiktok\.com$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

async function fetchTikTokVideo(target, force = false) {
  const urlInput = el[`tiktokUrl${target}`];
  const button = el[`fetchTikTok${target}`];
  const status = el[`fetchStatus${target}`];
  const url = urlInput.value.trim();

  if (!url) return showError('Vui lòng dán link video TikTok.');
  if (!isTikTokLink(url)) return showError('Link TikTok không hợp lệ.');
  if (state.fetching[target] || (!force && state.lastFetched[target] === url)) return;

  state.fetching[target] = true;
  showError('');
  button.disabled = true;
  urlInput.disabled = true;
  status.querySelector('span:last-child').textContent = `Đang tải Video ${target === 'A' ? '1' : '2'}…`;
  status.hidden = false;

  try {
    const response = await fetch('/api/fetch-tiktok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Không thể tải video từ link này.');
    }
    const blob = await response.blob();
    const filename = response.headers.get('X-Video-Filename') || `tiktok-video-${target}.mp4`;
    loadFile(target, new File([blob], filename, { type: blob.type || 'video/mp4' }));
    state.lastFetched[target] = url;
    status.querySelector('span:last-child').textContent = `Video ${target === 'A' ? '1' : '2'} đã tải xong`;
    setTimeout(() => { status.hidden = true; }, 1800);
  } catch (error) {
    status.hidden = true;
    showError(error.message);
  } finally {
    button.disabled = false;
    urlInput.disabled = false;
    state.fetching[target] = false;
  }
}

['A', 'B'].forEach(target => {
  el[`fetchTikTok${target}`].addEventListener('click', () => fetchTikTokVideo(target, true));
  el[`tiktokUrl${target}`].addEventListener('keydown', event => {
    if (event.key === 'Enter') fetchTikTokVideo(target, true);
  });
  el[`tiktokUrl${target}`].addEventListener('input', event => {
    clearTimeout(autoFetchTimers[target]);
    const value = event.currentTarget.value.trim();
    if (isTikTokLink(value) && state.lastFetched[target] !== value) {
      const status = el[`fetchStatus${target}`];
      status.querySelector('span:last-child').textContent = `Phát hiện link TikTok · đang tải Video ${target === 'A' ? '1' : '2'}…`;
      status.hidden = false;
      autoFetchTimers[target] = setTimeout(() => fetchTikTokVideo(target), 650);
    } else if (!state.fetching[target]) {
      el[`fetchStatus${target}`].hidden = true;
    }
  });
});

/**
 * Vẽ một video lên target context với tỉ lệ cover/contain và pan X
 */
function drawVideoTo(targetCtx, video, panXPct, fitMode) {
  const cw = el.canvas.width;
  const ch = el.canvas.height;
  const vw = video.videoWidth || cw;
  const vh = video.videoHeight || ch;

  const scale = fitMode === 'contain'
    ? Math.min(cw / vw, ch / vh)
    : Math.max(cw / vw, ch / vh);

  const w = vw * scale;
  const h = vh * scale;

  // Căn giữa rồi dịch chuyển theo panXPct
  const panOffset = (panXPct / 100) * (cw / 2);
  const x = (cw - w) / 2 + panOffset;
  const y = (ch - h) / 2;

  targetCtx.drawImage(video, x, y, w, h);
}

/**
 * Vẽ khung hình kết hợp của 2 video với gradient mask mờ ở giữa
 */
function drawFrame(time) {
  const cw = el.canvas.width;
  const ch = el.canvas.height;

  // 1. Vẽ nền và Video 1 (bên trái)
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cw, ch);
  drawVideoTo(ctx, el.videoA, Number(el.panARange.value), el.fitSelect.value);

  // 2. Vẽ Video 2 lên layerCanvas và áp dụng Alpha Gradient Mask
  layerCtx.clearRect(0, 0, cw, ch);
  drawVideoTo(layerCtx, el.videoB, Number(el.panBRange.value), el.fitSelect.value);

  const splitPct = Number(el.splitRange.value) / 100;
  const featherPx = Number(el.featherRange.value);
  const splitX = cw * splitPct;

  const x1 = Math.max(0, splitX - featherPx / 2);
  const x2 = Math.min(cw, splitX + featherPx / 2);

  layerCtx.globalCompositeOperation = 'destination-in';
  const grad = layerCtx.createLinearGradient(0, 0, cw, 0);

  if (featherPx <= 0) {
    // Cắt sắc nét (Hard cut)
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(splitX / cw, 'rgba(0,0,0,0)');
    grad.addColorStop(splitX / cw, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
  } else {
    // Chuyển sắc mượt mà (Feather blend)
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    if (x1 > 0) grad.addColorStop(x1 / cw, 'rgba(0,0,0,0)');
    if (x2 < cw) grad.addColorStop(x2 / cw, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
  }

  layerCtx.fillStyle = grad;
  layerCtx.fillRect(0, 0, cw, ch);
  layerCtx.globalCompositeOperation = 'source-over';

  // 3. Đè layer Video 2 lên Canvas chính
  ctx.drawImage(layerCanvas, 0, 0);

  el.timecode.textContent = fmtClock(time);
}

function seek(video, time) {
  return new Promise(resolve => {
    const safe = Math.max(0, Math.min(time, Math.max(0, (video.duration || 1) - 0.03)));
    if (Math.abs(video.currentTime - safe) < 0.03) return resolve();
    const done = () => { video.removeEventListener('seeked', done); resolve(); };
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = safe;
  });
}

async function drawAt(time) {
  if (!state.readyA || !state.readyB) return;
  const offsetB = Number(el.offsetInput.value || 0);
  await Promise.all([
    seek(el.videoA, time),
    seek(el.videoB, offsetB + time)
  ]);
  drawFrame(time);
}

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceA = audioCtx.createMediaElementSource(el.videoA);
  captureDest = audioCtx.createMediaStreamDestination();
  monitorGain = audioCtx.createGain();
  sourceA.connect(captureDest);
  sourceA.connect(monitorGain).connect(audioCtx.destination);
}

async function startPlayback(isExport = false, startAt = 0) {
  ensureAudio();
  await audioCtx.resume();
  monitorGain.gain.value = isExport ? 0 : 1;
  state.cancelled = false;

  const offsetB = Number(el.offsetInput.value || 0);
  el.videoA.currentTime = Math.max(0, startAt);
  el.videoB.currentTime = Math.max(0, offsetB + startAt);

  // Video 2 luôn tắt tiếng
  el.videoB.muted = true;

  await Promise.all([
    el.videoA.play(),
    el.videoB.play().catch(() => {})
  ]);
}

function stopPlayback() {
  el.videoA.pause();
  el.videoB.pause();
  cancelAnimationFrame(state.raf);
}

function renderLoop() {
  const time = el.videoA.currentTime;
  const offsetB = Number(el.offsetInput.value || 0);
  const targetB = offsetB + time;

  // Giữ Video B đồng bộ liên tục với Video A
  if (!el.videoB.paused && Math.abs(el.videoB.currentTime - targetB) > 0.3) {
    el.videoB.currentTime = targetB;
  }
  if (el.videoB.paused && !el.videoB.ended) {
    el.videoB.play().catch(() => {});
  }

  drawFrame(time);
  updatePreviewPosition(time);

  if (time >= el.videoA.duration - 0.02 || el.videoA.ended || state.cancelled) {
    if (state.previewing) finishPreview();
    return;
  }
  state.raf = requestAnimationFrame(renderLoop);
}

function updatePreviewPosition(time) {
  const duration = el.videoA.duration || 0;
  el.previewRange.value = duration ? (time / duration) * 100 : 0;
  el.previewPosition.textContent = fmt(time);
}

async function togglePreview() {
  if (state.previewing) return finishPreview();
  try {
    if (state.previewingB) finishVideo2Preview(false);
    state.previewing = true;
    el.previewIcon.textContent = '■';
    el.previewButton.lastChild.textContent = ' Dừng xem thử';
    const startTime = (Number(el.previewRange.value) / 100) * (el.videoA.duration || 0);
    await startPlayback(false, startTime);
    renderLoop();
  } catch (err) {
    finishPreview();
    showError(`Không thể bắt đầu xem thử: ${err.message}`);
  }
}

function finishPreview() {
  state.previewing = false;
  stopPlayback();
  el.previewIcon.textContent = '▶';
  el.previewButton.lastChild.textContent = ' Xem thử kết hợp';
}

function supportedMime() {
  const choices = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return choices.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

async function exportVideo() {
  if (state.exporting) return;
  finishPreview();
  showError('');

  try {
    ensureAudio();
    const stream = el.canvas.captureStream(30);
    captureDest.stream.getAudioTracks().forEach(track => stream.addTrack(track));

    const mimeType = supportedMime();
    const recorder = new MediaRecorder(stream, mimeType ? {
      mimeType,
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 192_000
    } : undefined);

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(resolve => recorder.onstop = resolve);

    state.exporting = true;
    state.cancelled = false;
    el.exportButton.disabled = true;
    el.previewButton.disabled = true;
    el.result.hidden = true;
    el.progressWrap.hidden = false;

    recorder.start(500);
    await startPlayback(true, 0);

    const tick = () => {
      const p = Math.min(100, (el.videoA.currentTime / el.videoA.duration) * 100 || 0);
      el.progress.value = p;
      el.progressValue.textContent = `${Math.round(p)}%`;
      drawFrame(el.videoA.currentTime);

      if (state.cancelled || el.videoA.ended || el.videoA.currentTime >= el.videoA.duration - 0.02) {
        stopPlayback();
        recorder.stop();
        return;
      }
      state.raf = requestAnimationFrame(tick);
    };
    tick();

    await stopped;

    if (!state.cancelled) {
      const actualType = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunks, { type: actualType });
      if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
      state.outputUrl = URL.createObjectURL(blob);
      const ext = actualType.includes('mp4') ? 'mp4' : 'webm';
      el.downloadLink.href = state.outputUrl;
      el.downloadLink.download = formatDownloadFilename(ext);
      el.downloadLink.textContent = `Tải video (${ext.toUpperCase()})`;
      el.resultMeta.textContent = `${fmt(el.videoA.duration)} · ${(blob.size / 1048576).toFixed(1)} MB · ${ext.toUpperCase()}`;
      el.result.hidden = false;
    }
  } catch (err) {
    showError(`Xuất video thất bại: ${err.message}`);
  } finally {
    state.exporting = false;
    el.progressWrap.hidden = true;
    updateReady();
  }
}

// Lắng nghe các thanh trượt điều chỉnh
el.splitRange.addEventListener('input', () => {
  const val = `${el.splitRange.value}%`;
  el.splitVal.textContent = val;
  el.splitReadout.textContent = val;
  if (!state.previewing) drawFrame(el.videoA.currentTime || 0);
});

el.featherRange.addEventListener('input', () => {
  el.featherVal.textContent = `${el.featherRange.value} px`;
  if (!state.previewing) drawFrame(el.videoA.currentTime || 0);
});

el.panARange.addEventListener('input', () => {
  const v = Number(el.panARange.value);
  el.panAVal.textContent = `${v > 0 ? '+' : ''}${v}%`;
  if (!state.previewing) drawFrame(el.videoA.currentTime || 0);
});

el.panBRange.addEventListener('input', () => {
  const v = Number(el.panBRange.value);
  el.panBVal.textContent = `${v > 0 ? '+' : ''}${v}%`;
  if (!state.previewing) drawFrame(el.videoA.currentTime || 0);
});

function setOffset(sec) {
  const maxSec = el.videoB ? (el.videoB.duration || 100) : 100;
  const safe = Math.max(0, Math.min(Number(sec) || 0, maxSec));
  el.offsetInput.value = safe.toFixed(1);
  el.offsetRange.value = safe.toFixed(1);
  el.offsetPreviewTime.textContent = fmt(safe);
  if (!state.previewing && !state.previewingB) {
    drawAt(el.videoA.currentTime || 0);
  }
}

el.offsetInput.addEventListener('input', () => setOffset(el.offsetInput.value));
el.offsetRange.addEventListener('input', () => setOffset(el.offsetRange.value));

async function toggleVideo2Preview() {
  if (state.previewingB) return finishVideo2Preview();
  if (state.previewing) finishPreview();
  try {
    state.previewingB = true;
    const startAt = Number(el.offsetInput.value || 0);
    await seek(el.videoB, startAt);
    await el.videoB.play();
    el.previewVideo2Icon.textContent = '■';
    el.previewVideo2Button.lastChild.textContent = ' Dừng xem thử Video 2';
    el.activeClip.textContent = 'Đang xem thử Video 2 từ điểm bắt đầu';

    const loop = () => {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
      drawVideoTo(ctx, el.videoB, Number(el.panBRange.value), el.fitSelect.value);
      el.timecode.textContent = fmtClock(el.videoB.currentTime);

      if (!state.previewingB || el.videoB.ended || el.videoB.currentTime >= startAt + 6) {
        return finishVideo2Preview();
      }
      state.raf = requestAnimationFrame(loop);
    };
    loop();
  } catch (error) {
    finishVideo2Preview();
    showError(`Xem thử Video 2 thất bại: ${error.message}`);
  }
}

function finishVideo2Preview(restore = true) {
  state.previewingB = false;
  el.videoB.pause();
  cancelAnimationFrame(state.raf);
  el.previewVideo2Icon.textContent = '▶';
  el.previewVideo2Button.lastChild.textContent = ' Xem thử riêng Video 2 từ giây này';
  if (restore && state.readyA && state.readyB) {
    drawAt(el.videoA.currentTime || 0);
  }
}

el.previewVideo2Button.addEventListener('click', toggleVideo2Preview);

el.fitSelect.addEventListener('change', () => {
  if (!state.previewing) drawFrame(el.videoA.currentTime || 0);
});

// Tua preview
el.previewRange.addEventListener('input', () => {
  if (state.previewing) finishPreview();
  const time = (Number(el.previewRange.value) / 100) * (el.videoA.duration || 0);
  el.previewPosition.textContent = fmt(time);
  drawAt(time);
});

el.previewButton.addEventListener('click', togglePreview);
el.exportButton.addEventListener('click', exportVideo);
el.cancelButton.addEventListener('click', () => {
  state.cancelled = true;
  el.progressLabel.textContent = 'Đang hủy…';
});

// Nút sao chép lệnh FFmpeg
el.copyFfmpegBtn.addEventListener('click', () => {
  const splitPct = Number(el.splitRange.value) / 100;
  const feather = Number(el.featherRange.value) * 1.5; // Scale up to 1080p
  const splitX = Math.round(1080 * splitPct);
  const x1 = Math.round(Math.max(0, splitX - feather / 2));
  const x2 = Math.round(Math.min(1080, splitX + feather / 2));
  const offsetB = Number(el.offsetInput.value || 0);
  const v2Arg = offsetB > 0 ? `-ss ${offsetB.toFixed(2)} -i "video2.mp4"` : `-i "video2.mp4"`;

  const cmd = `ffmpeg -y -i "video1.mp4" ${v2Arg} \\\n` +
    `  -f lavfi -i "color=c=black:s=1080x1920,format=gray,geq=lum='clip((X-${x1})/(${x2}-${x1})*255,0,255)'" \\\n` +
    `  -filter_complex "\\\n` +
    `    [0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]; \\\n` +
    `    [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v1]; \\\n` +
    `    [v0][v1][2:v]maskedmerge[vblended]" \\\n` +
    `  -map "[vblended]" -map 0:a \\\n` +
    `  -c:v libx264 -preset fast -crf 19 -c:a aac -b:a 192k -shortest output_blend.mp4`;

  navigator.clipboard.writeText(cmd).then(() => {
    const originalText = el.copyFfmpegBtn.textContent;
    el.copyFfmpegBtn.textContent = '✅ Đã sao chép lệnh FFmpeg!';
    setTimeout(() => { el.copyFfmpegBtn.textContent = originalText; }, 2000);
  }).catch(() => {
    prompt('Sao chép lệnh FFmpeg:', cmd);
  });
});

window.addEventListener('beforeunload', () => {
  [state.urlA, state.urlB, state.outputUrl].filter(Boolean).forEach(URL.revokeObjectURL);
});

// Khởi tạo nền canvas
ctx.fillStyle = '#252522';
ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
