const $ = (id) => document.getElementById(id);
const el = {
  fileA: $('fileA'), fileB: $('fileB'), cardA: $('cardA'), cardB: $('cardB'),
  nameA: $('nameA'), nameB: $('nameB'), metaA: $('metaA'), metaB: $('metaB'),
  videoA: $('videoA'), videoB: $('videoB'), canvas: $('canvas'),
  settings: $('settings'), cutRange: $('cutRange'), cutTime: $('cutTime'), durationText: $('durationText'),
  segmentA: $('segmentA'), segmentB: $('segmentB'), offset: $('offsetInput'), fit: $('fitSelect'),
  preview: $('previewButton'), previewIcon: $('previewIcon'), export: $('exportButton'), active: $('activeClip'),
  timecode: $('timecode'), progressWrap: $('progressWrap'), progress: $('progress'), progressValue: $('progressValue'),
  progressLabel: $('progressLabel'), cancel: $('cancelButton'), result: $('result'), download: $('downloadLink'),
  resultMeta: $('resultMeta'), error: $('error'),
  tiktokUrlA: $('tiktokUrlA'), tiktokUrlB: $('tiktokUrlB'),
  fetchTikTokA: $('fetchTikTokA'), fetchTikTokB: $('fetchTikTokB'),
  fetchStatusA: $('fetchStatusA'), fetchStatusB: $('fetchStatusB'),
  offsetRange: $('offsetRange'), offsetPreviewTime: $('offsetPreviewTime'),
  previewVideo2: $('previewVideo2Button'), previewVideo2Icon: $('previewVideo2Icon'),
  previewScrubber: $('previewScrubber'), previewRange: $('previewRange'), previewPosition: $('previewPosition')
};

const state = { fileA: null, fileB: null, urlA: null, urlB: null, readyA: false, readyB: false, previewing: false, previewingB: false, exporting: false, cancelled: false, raf: 0, outputUrl: null, fetching: { A: false, B: false }, lastFetched: { A: '', B: '' } };
const autoFetchTimers = { A: 0, B: 0 };
const ctx = el.canvas.getContext('2d', { alpha: false });
let audioCtx, sourceA, captureDest, monitorGain;

function fmt(seconds) {
  if (!Number.isFinite(seconds)) return '0:00.0';
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}
function fmtClock(seconds) { return fmt(seconds).padStart(7, '0'); }
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
function dimensions(video) { return `${video.videoWidth}×${video.videoHeight}`; }
function cutSeconds() { return (Number(el.cutRange.value) / 100) * (el.videoA.duration || 0); }
function showError(message) { el.error.textContent = message; el.error.hidden = !message; }

function updateRange() {
  const pct = Number(el.cutRange.value);
  const cut = cutSeconds();
  el.cutRange.style.background = `linear-gradient(90deg,var(--blue) 0 ${pct}%,#dad7ce ${pct}%)`;
  el.segmentA.style.width = `${pct}%`;
  el.segmentB.style.width = `${100 - pct}%`;
  el.cutTime.textContent = fmt(cut);
  el.durationText.textContent = `of ${fmt(el.videoA.duration || 0)}`;
  if (state.readyA && state.readyB && !state.previewing && !state.exporting) drawAt(Math.min(cut, el.videoA.duration || 0));
}

function updateReady() {
  const ready = state.readyA && state.readyB;
  el.settings.classList.toggle('disabled', !ready);
  el.previewScrubber.classList.toggle('disabled', !ready);
  el.preview.disabled = !ready || state.exporting;
  el.previewVideo2.disabled = !state.readyB || state.exporting;
  el.export.disabled = !ready || state.exporting || !window.MediaRecorder || !el.canvas.captureStream;
  if (ready) {
    el.timecode.style.display = 'block';
    updateRange();
    drawAt(0);
  }
}

function loadFile(kind, file) {
  if (!file || !file.type.startsWith('video/')) return showError('Please choose a video file.');
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
    el.offset.max = Math.max(0, el.videoB.duration || 0).toFixed(1);
    el.offsetRange.max = el.offset.max;
    updateReady();
  };
  video.onerror = () => showError(`This browser could not read ${file.name}. Try an MP4, MOV, or WebM file.`);
}

['A','B'].forEach(kind => {
  const input = el[`file${kind}`], card = el[`card${kind}`];
  input.addEventListener('change', () => loadFile(kind, input.files[0]));
  ['dragenter','dragover'].forEach(evt => card.addEventListener(evt, e => { e.preventDefault(); card.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(evt => card.addEventListener(evt, e => { e.preventDefault(); card.classList.remove('dragging'); }));
  card.addEventListener('drop', e => loadFile(kind, e.dataTransfer.files[0]));
});

function isTikTokLink(value) {
  try { return /(^|\.)tiktok\.com$/i.test(new URL(value).hostname); }
  catch { return false; }
}

async function fetchTikTokVideo(target, force = false) {
  const urlInput = el[`tiktokUrl${target}`];
  const button = el[`fetchTikTok${target}`];
  const status = el[`fetchStatus${target}`];
  const url = urlInput.value.trim();
  if (!url) return showError('Paste a TikTok video link first.');
  if (!isTikTokLink(url)) return showError('Enter a valid TikTok video link.');
  if (state.fetching[target] || (!force && state.lastFetched[target] === url)) return;
  state.fetching[target] = true;
  showError('');
  button.disabled = true;
  urlInput.disabled = true;
  status.querySelector('span:last-child').textContent = `Fetching video ${target === 'A' ? '1' : '2'}…`;
  status.hidden = false;
  try {
    const response = await fetch('/api/fetch-tiktok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'The video could not be fetched.');
    }
    const blob = await response.blob();
    const filename = response.headers.get('X-Video-Filename') || 'tiktok-video.mp4';
    loadFile(target, new File([blob], filename, { type: blob.type || 'video/mp4' }));
    state.lastFetched[target] = url;
    status.querySelector('span:last-child').textContent = `Video ${target === 'A' ? '1' : '2'} loaded`;
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
      status.querySelector('span:last-child').textContent = `TikTok link detected · fetching video ${target === 'A' ? '1' : '2'}…`;
      status.hidden = false;
      autoFetchTimers[target] = setTimeout(() => fetchTikTokVideo(target), 650);
    } else if (!state.fetching[target]) {
      el[`fetchStatus${target}`].hidden = true;
    }
  });
});

function drawVideo(video) {
  const cw = el.canvas.width, ch = el.canvas.height;
  const vw = video.videoWidth || cw, vh = video.videoHeight || ch;
  const scale = el.fit.value === 'contain' ? Math.min(cw / vw, ch / vh) : Math.max(cw / vw, ch / vh);
  const w = vw * scale, h = vh * scale;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(video, (cw - w) / 2, (ch - h) / 2, w, h);
}
function drawFrame(time) {
  const cut = cutSeconds();
  const useB = time >= cut;
  drawVideo(useB ? el.videoB : el.videoA);
  el.active.textContent = useB ? 'Video 2 · picture' : 'Video 1 · picture + sound';
  el.timecode.textContent = fmtClock(time);
}
function seek(video, time) {
  return new Promise(resolve => {
    const safe = Math.max(0, Math.min(time, Math.max(0, video.duration - .03)));
    if (Math.abs(video.currentTime - safe) < .03) return resolve();
    const done = () => { video.removeEventListener('seeked', done); resolve(); };
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = safe;
  });
}
async function drawAt(time) {
  const cut = cutSeconds();
  if (time < cut) await seek(el.videoA, time);
  else await seek(el.videoB, Number(el.offset.value || 0) + time - cut);
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
  el.videoA.currentTime = Math.max(0, startAt);
  el.videoB.currentTime = Math.max(0, Number(el.offset.value || 0) + Math.max(0, startAt - cutSeconds()));
  el.videoB.pause();
  await el.videoA.play();
}
function stopPlayback() {
  el.videoA.pause(); el.videoB.pause();
  cancelAnimationFrame(state.raf);
}
function renderLoop() {
  const time = el.videoA.currentTime;
  syncSecondVideo(time);
  drawFrame(time);
  updatePreviewPosition(time);
  if (time >= el.videoA.duration - .02 || el.videoA.ended || state.cancelled) {
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
function syncSecondVideo(time) {
  const shouldPlay = time >= cutSeconds() && !el.videoA.paused;
  if (shouldPlay && el.videoB.paused && !el.videoB.ended) el.videoB.play().catch(() => {});
  if (!shouldPlay && !el.videoB.paused) el.videoB.pause();
}
async function togglePreview() {
  if (state.previewing) return finishPreview();
  try {
    if (state.previewingB) finishVideo2Preview(false);
    state.previewing = true;
    el.previewIcon.textContent = '■';
    el.preview.lastChild.textContent = ' Stop';
    await startPlayback(false, (Number(el.previewRange.value) / 100) * (el.videoA.duration || 0));
    renderLoop();
  } catch (err) { finishPreview(); showError(`Preview could not start: ${err.message}`); }
}
function finishPreview() {
  state.previewing = false; stopPlayback();
  el.previewIcon.textContent = '▶';
  el.preview.lastChild.textContent = ' Preview';
}

async function toggleVideo2Preview() {
  if (state.previewingB) return finishVideo2Preview();
  finishPreview();
  try {
    state.previewingB = true;
    const startAt = Number(el.offset.value || 0);
    await seek(el.videoB, startAt);
    await el.videoB.play();
    el.previewVideo2Icon.textContent = '■';
    el.active.textContent = 'Previewing video 2 starting point';
    const loop = () => {
      drawVideo(el.videoB);
      el.timecode.textContent = fmtClock(el.videoB.currentTime);
      if (!state.previewingB || el.videoB.ended || el.videoB.currentTime >= startAt + 5) return finishVideo2Preview();
      state.raf = requestAnimationFrame(loop);
    };
    loop();
  } catch (error) {
    finishVideo2Preview();
    showError(`Video 2 preview could not start: ${error.message}`);
  }
}
function finishVideo2Preview(restore = true) {
  state.previewingB = false;
  el.videoB.pause();
  cancelAnimationFrame(state.raf);
  el.previewVideo2Icon.textContent = '▶';
  if (restore && state.readyA && state.readyB) drawAt(cutSeconds());
}

function supportedMime() {
  const choices = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return choices.find(type => MediaRecorder.isTypeSupported(type)) || '';
}
async function exportVideo() {
  if (state.exporting) return;
  finishPreview(); showError('');
  try {
    ensureAudio();
    const stream = el.canvas.captureStream(30);
    captureDest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const mimeType = supportedMime();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(resolve => recorder.onstop = resolve);
    state.exporting = true; state.cancelled = false;
    el.export.disabled = true; el.preview.disabled = true; el.result.hidden = true; el.progressWrap.hidden = false;
    recorder.start(500);
    await startPlayback(true, 0);
    const tick = () => {
      const p = Math.min(100, (el.videoA.currentTime / el.videoA.duration) * 100 || 0);
      el.progress.value = p; el.progressValue.textContent = `${Math.round(p)}%`;
      syncSecondVideo(el.videoA.currentTime);
      drawFrame(el.videoA.currentTime);
      if (state.cancelled || el.videoA.ended || el.videoA.currentTime >= el.videoA.duration - .02) {
        stopPlayback(); recorder.stop(); return;
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
      el.download.href = state.outputUrl;
      el.download.download = formatDownloadFilename(ext);
      el.download.textContent = `Download ${ext.toUpperCase()}`;
      el.resultMeta.textContent = `${fmt(el.videoA.duration)} · ${(blob.size / 1048576).toFixed(1)} MB · ${ext.toUpperCase()}`;
      el.result.hidden = false;
    }
  } catch (err) { showError(`Export failed: ${err.message}`); }
  finally {
    state.exporting = false; el.progressWrap.hidden = true; updateReady();
  }
}

el.cutRange.addEventListener('input', updateRange);
el.offset.addEventListener('input', () => {
  el.offsetRange.value = el.offset.value;
  el.offsetPreviewTime.textContent = fmt(Number(el.offset.value || 0));
  drawAt(cutSeconds());
});
el.offsetRange.addEventListener('input', () => {
  el.offset.value = el.offsetRange.value;
  el.offsetPreviewTime.textContent = fmt(Number(el.offsetRange.value || 0));
  drawAt(cutSeconds());
});
el.previewRange.addEventListener('input', () => {
  if (state.previewing) finishPreview();
  const time = (Number(el.previewRange.value) / 100) * (el.videoA.duration || 0);
  el.previewPosition.textContent = fmt(time);
  drawAt(time);
});
el.fit.addEventListener('change', () => drawAt(state.previewing ? el.videoA.currentTime : 0));
el.preview.addEventListener('click', togglePreview);
el.previewVideo2.addEventListener('click', toggleVideo2Preview);
el.export.addEventListener('click', exportVideo);
el.cancel.addEventListener('click', () => { state.cancelled = true; el.progressLabel.textContent = 'Cancelling…'; });
window.addEventListener('beforeunload', () => [state.urlA,state.urlB,state.outputUrl].filter(Boolean).forEach(URL.revokeObjectURL));

ctx.fillStyle = '#252522'; ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
