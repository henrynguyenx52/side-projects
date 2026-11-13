'use strict';

const $ = (selector) => document.querySelector(selector);
const email = $('#email');
const password = $('#password');
const imageFile = $('#imageFile');
const videoFile = $('#videoFile');
const runButton = $('#runButton');
const checkAccount = $('#checkAccount');
const progressPanel = $('#progressPanel');
const stageOrder = ['checking', 'uploading-image', 'uploading-video', 'submitting', 'processing', 'completed'];
let activeJobId = null;

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

function setFile(input, zoneSelector, nameSelector) {
  const file = input.files[0];
  $(zoneSelector).classList.toggle('has-file', Boolean(file));
  $(nameSelector).textContent = file ? file.name : input === imageFile ? 'Chọn ảnh' : 'Chọn video';
}

function setAccountMessage(message, type = '') {
  const el = $('#accountResult');
  el.textContent = message;
  el.className = `inline-result ${type}`;
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
    $('#resultVideo').src = result.url;
    $('#downloadLink').href = result.url;
    $('#resultMeta').textContent = result.consumeCoins
      ? `Task ${job.taskId} · đã dùng ${result.consumeCoins} coins`
      : `Task ${job.taskId}`;
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
    setAccountMessage(`Kết nối thành công · Free/transition balance: ${result.balance} coins`, 'success');
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

imageFile.addEventListener('change', () => setFile(imageFile, '#imageZone', '#imageName'));
videoFile.addEventListener('change', () => setFile(videoFile, '#videoZone', '#videoName'));
loadConfig().catch((error) => {
  $('#workflowId').textContent = 'Không tải được cấu hình';
  $('#errorBox').textContent = error.message;
  $('#errorBox').classList.remove('hidden');
  progressPanel.classList.remove('hidden');
});
