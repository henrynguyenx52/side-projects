'use strict';

const $ = (selector) => document.querySelector(selector);
const email = $('#email');
const password = $('#password');
const imageFile = $('#imageFile');
const videoFile = $('#videoFile');
const runButton = $('#runButton');
const checkAccount = $('#checkAccount');
const progressPanel = $('#progressPanel');
const instanceInputs = document.querySelectorAll('input[name="instanceType"]');
const stageOrder = ['checking', 'uploading-image', 'uploading-video', 'submitting', 'processing', 'downloading', 'cleaning', 'completed'];
let activeJobId = null;
let jobsLoading = false;
let jobsRefreshTimer = null;
const previewUrls = { image: null, video: null };

async function request(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function loadConfig() {
  const config = await request('/api/config');
  $('#workflowId').textContent = config.appId;
}

function setFile(input, zoneSelector, nameSelector, kind) {
  const file = input.files[0];
  const zone = $(zoneSelector);
  zone.classList.toggle('has-file', Boolean(file));
  $(nameSelector).textContent = file ? file.name : input === imageFile ? 'Nhấn hoặc kéo thả ảnh vào đây' : 'Nhấn hoặc kéo thả video vào đây';
  const preview = $(`#${kind}Preview`);
  const icon = $(`#${kind}Icon`);
  if (previewUrls[kind]) URL.revokeObjectURL(previewUrls[kind]);
  previewUrls[kind] = file ? URL.createObjectURL(file) : null;
  preview.classList.toggle('hidden', !file);
  icon.classList.toggle('hidden', Boolean(file));
  if (file) preview.src = previewUrls[kind];
}

function enableDrop(zoneSelector, input, nameSelector, kind) {
  const zone = $(zoneSelector);
  for (const eventName of ['dragenter', 'dragover']) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add('dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove('dragging');
    });
  }
  zone.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setFile(input, zoneSelector, nameSelector, kind);
  });
}

function setAccountMessage(message, type = '') {
  const el = $('#accountResult');
  el.textContent = message;
  el.className = `inline-result ${type}`;
}

function showPoints(value) {
  const points = Number(value);
  if (!Number.isFinite(points)) return;
  $('#pointsValue').textContent = points.toLocaleString('vi-VN');
  $('#pointsBadge').classList.remove('hidden');
}

function selectedInstanceType() {
  return document.querySelector('input[name="instanceType"]:checked')?.value === 'plus' ? 'plus' : 'default';
}

function updateInstanceUi() {
  const isPlus = selectedInstanceType() === 'plus';
  $('#modePill').textContent = isPlus ? 'PLUS' : 'STANDARD';
  $('#modePill').classList.toggle('plus', isPlus);
  $('#instanceLabel').textContent = isPlus ? 'Plus · plus' : 'Standard · default';
  $('#costHint').textContent = isPlus
    ? 'Plus · tài nguyên mạnh hơn, có thể tốn nhiều point hơn'
    : 'Standard · RunningHub tính theo thời gian render';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(timestamp));
}

function renderJobs(jobs) {
  const list = Array.isArray(jobs) ? jobs : [];
  $('#jobsTotal').textContent = list.length;
  $('#jobsRunning').textContent = list.filter((job) => job.state === 'running' || job.state === 'queued').length;
  $('#jobsCompleted').textContent = list.filter((job) => job.state === 'completed').length;
  $('#jobsFailed').textContent = list.filter((job) => job.state === 'failed').length;
  $('#jobsEmpty').classList.toggle('hidden', list.length > 0);
  $('#jobsList').innerHTML = list.map((job) => {
    const resultLink = job.state === 'completed' && job.result?.url
      ? `<a class="job-result" href="${escapeHtml(job.result.url)}" target="_blank" rel="noreferrer">Mở video ↗</a>`
      : '<span></span>';
    return `<article class="job-row">
      <div class="job-main"><strong>${escapeHtml(job.taskId || job.id)}</strong><small>${job.instanceType === 'plus' ? 'PLUS' : 'STANDARD'} · ${formatTime(job.createdAt)}</small></div>
      <div class="job-message" title="${escapeHtml(job.error || job.message)}">${escapeHtml(job.error || job.message)}</div>
      <span class="job-state ${escapeHtml(job.state)}">${escapeHtml(job.state).toUpperCase()}</span>
      ${resultLink}
    </article>`;
  }).join('');
}

async function loadJobs() {
  if (jobsLoading) return;
  jobsLoading = true;
  $('#refreshJobs').disabled = true;
  try {
    const { jobs } = await request('/api/jobs');
    $('#jobsLoading').classList.add('hidden');
    renderJobs(jobs);
  } catch (error) {
    $('#jobsLoading').textContent = `Không tải được Jobs: ${error.message}`;
    $('#jobsLoading').classList.remove('hidden');
  } finally {
    jobsLoading = false;
    $('#refreshJobs').disabled = false;
  }
}

function switchPage(page) {
  const target = page === 'jobs' ? 'jobs' : 'motion';
  $('#pageMotion').classList.toggle('hidden', target !== 'motion');
  $('#pageJobs').classList.toggle('hidden', target !== 'jobs');
  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === target);
  });
  if (jobsRefreshTimer) {
    clearInterval(jobsRefreshTimer);
    jobsRefreshTimer = null;
  }
  if (target === 'jobs') {
    void loadJobs();
    jobsRefreshTimer = setInterval(() => void loadJobs(), 5000);
  }
}

function updateProgress(job) {
  progressPanel.classList.remove('hidden');
  $('#progressMessage').textContent = job.message;
  $('#progressState').textContent = job.state.toUpperCase();
  const index = Math.max(0, stageOrder.indexOf(job.stage));
  $('#progressBar').style.width = `${Math.max(4, ((index + 1) / stageOrder.length) * 100)}%`;
  document.querySelectorAll('#steps li').forEach((step) => {
    const stepIndex = stageOrder.indexOf(step.dataset.stage);
    step.classList.toggle('done', stepIndex < index || job.state === 'completed');
    step.classList.toggle('active', stepIndex === index && job.state !== 'completed');
  });

  if (job.state === 'failed') {
    $('#errorBox').textContent = job.error || 'Task thất bại.';
    $('#errorBox').classList.remove('hidden');
    runButton.disabled = false;
    runButton.textContent = 'Chạy lại';
  }
  if (job.state === 'completed') {
    const result = job.result;
    showPoints(result.balanceAfter);
    $('#resultVideo').src = result.url;
    $('#downloadLink').href = result.url;
    const cleanStatus = result.cleaned ? 'đã xóa watermark' : 'không xóa được watermark';
    const modeLabel = job.instanceType === 'plus' ? 'Plus' : 'Standard';
    $('#resultMeta').textContent = result.consumeCoins
      ? `${modeLabel} · Task ${job.taskId} · đã dùng ${result.consumeCoins} coins · ${cleanStatus}`
      : `${modeLabel} · Task ${job.taskId} · ${cleanStatus}`;
    $('#resultBox').classList.remove('hidden');
    runButton.disabled = false;
    runButton.textContent = 'Chạy video mới';
  }
}

async function pollJob() {
  while (activeJobId) {
    const { job } = await request(`/api/jobs/${activeJobId}`);
    updateProgress(job);
    if (job.state === 'failed' || job.state === 'completed') {
      activeJobId = null;
      if (!$('#pageJobs').classList.contains('hidden')) void loadJobs();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
}

async function upload(kind, file) {
  const payload = await request(`/api/upload/${kind}`, {
    method: 'POST',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name),
    },
    body: file,
  });
  return payload.upload.id;
}

checkAccount.addEventListener('click', async () => {
  if (!email.value.trim() || !password.value) return setAccountMessage('Ní chưa nhập đủ email và mật khẩu.', 'error');
  checkAccount.disabled = true;
  setAccountMessage('Đang kiểm tra…');
  try {
    const result = await request('/api/check-account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    });
    showPoints(result.balance);
    setAccountMessage('Kết nối thành công · Đã cập nhật point mới nhất.', 'success');
  } catch (error) {
    setAccountMessage(error.message, 'error');
  } finally {
    checkAccount.disabled = false;
  }
});

runButton.addEventListener('click', async () => {
  const image = imageFile.files[0];
  const video = videoFile.files[0];
  if (!email.value.trim() || !password.value) return setAccountMessage('Ní cần nhập đủ email và mật khẩu trước.', 'error');
  if (!image || !video) return alert('Vui lòng chọn đủ ảnh nhân vật và video chuyển động.');

  runButton.disabled = true;
  runButton.textContent = 'Đang upload…';
  $('#errorBox').classList.add('hidden');
  $('#resultBox').classList.add('hidden');
  progressPanel.classList.remove('hidden');
  $('#progressMessage').textContent = 'Đang đưa file vào backend local…';
  $('#progressState').textContent = 'UPLOADING';
  $('#progressBar').style.width = '3%';

  try {
    const [imageUploadId, videoUploadId] = await Promise.all([
      upload('image', image),
      upload('video', video),
    ]);
    const { job } = await request('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
        instanceType: selectedInstanceType(),
        imageUploadId,
        videoUploadId,
      }),
    });
    activeJobId = job.id;
    updateProgress(job);
    runButton.textContent = 'Đang chạy…';
    await pollJob();
  } catch (error) {
    $('#errorBox').textContent = error.message;
    $('#errorBox').classList.remove('hidden');
    runButton.disabled = false;
    runButton.textContent = 'Chạy lại';
  }
});

imageFile.addEventListener('change', () => setFile(imageFile, '#imageZone', '#imageName', 'image'));
videoFile.addEventListener('change', () => setFile(videoFile, '#videoZone', '#videoName', 'video'));
enableDrop('#imageZone', imageFile, '#imageName', 'image');
enableDrop('#videoZone', videoFile, '#videoName', 'video');
instanceInputs.forEach((input) => input.addEventListener('change', updateInstanceUi));
updateInstanceUi();
document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
  item.addEventListener('click', () => switchPage(item.dataset.page));
});
$('#refreshJobs').addEventListener('click', () => void loadJobs());
window.addEventListener('hashchange', () => switchPage(location.hash.slice(1)));
switchPage(location.hash.slice(1));
loadConfig().catch((error) => {
  $('#workflowId').textContent = 'Không tải được cấu hình';
  $('#errorBox').textContent = error.message;
  $('#errorBox').classList.remove('hidden');
  progressPanel.classList.remove('hidden');
});
