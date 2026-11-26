const form = document.querySelector('#runner-form');
const modelPreset = document.querySelector('#model-preset');
const testButton = document.querySelector('#test-ssh');
const sshResult = document.querySelector('#ssh-result');
const consoleBox = document.querySelector('#console');
const statusDot = document.querySelector('#status-dot');
const statusLabel = document.querySelector('#status-label');
const progressBar = document.querySelector('#progress-bar');
const jobId = document.querySelector('#job-id');
const outputList = document.querySelector('#output-list');
const outputCount = document.querySelector('#output-count');
const runButton = form.querySelector('.run-button');
let eventSource;
const seenLogs = new Set();
const presetCommands = {
  rvm: 'if [ -x /venv/main/bin/python ]; then PYTHON=/venv/main/bin/python; else PYTHON=python3; fi; if command -v uv >/dev/null; then uv pip install --python "$PYTHON" av pims tqdm pillow; else "$PYTHON" -m pip install --quiet av pims tqdm pillow; fi && "$PYTHON" {runner} --inputs {videos} --output-dir {output_dir}',
  scail2_install: 'if [ -x /venv/main/bin/python ]; then PYTHON=/venv/main/bin/python; else PYTHON=python3; fi; "$PYTHON" {runner} --comfyui /workspace/ComfyUI --workflow {workflow} --output-dir {output_dir}',
  scail2_run: 'if [ -x /venv/main/bin/python ]; then PYTHON=/venv/main/bin/python; else PYTHON=python3; fi; "$PYTHON" {runner} --comfyui /workspace/ComfyUI --workflow {workflow} --image {images} --video {videos} --output-dir {output_dir}',
  custom: 'python /opt/model/run.py --images {images} --videos {videos} --prompt {prompt} --output {output_dir}',
};
presetCommands.scail2_full = presetCommands.scail2_run;
presetCommands.scail2_run_20s = presetCommands.scail2_run;
presetCommands.scail2_full_install = presetCommands.scail2_install + ' --install-only';

const statusMeta = {
  queued: ['Đang xếp hàng', 5], connecting: ['Đang kết nối', 12], preparing: ['Kiểm tra GPU', 20], uploading: ['Đang upload', 30],
  running: ['Model đang chạy', 55], downloading: ['Đang tải kết quả', 85], completed: ['Hoàn tất', 100], failed: ['Thất bại', 100],
};

modelPreset.addEventListener('change', () => {
  form.elements.command.value = presetCommands[modelPreset.value];
  document.querySelector('.prompt-field').classList.toggle('hidden', modelPreset.value !== 'custom');
  const note = document.querySelector('#preset-note');
  note.classList.toggle('hidden', modelPreset.value === 'custom');
  const notes = {
    scail2_run: ['SCAIL2 v4.6 · tối đa 15 giây', 'Chọn đúng 1 ảnh và 1 video. App tự giới hạn 450 frame, chạy workflow low-memory và tải MP4 về local.'],
    scail2_run_20s: ['SCAIL2 Low Memory · 20 giây', 'Chọn đúng 1 ảnh và 1 video. Render FP8 với giới hạn 704 px, rồi upscale MP4 lên 1080×1920.'],
    scail2_full: ['SCAIL2 v4.6 · máy khỏe', 'Chọn đúng 1 ảnh và 1 video. Chạy FP16, xuất 1080×1920 trong ComfyUI và tự tải MP4 về máy.'],
    scail2_full_install: ['SCAIL2 Fast 15s · chỉ cài FP16', 'Cài ComfyUI, custom nodes, SageAttention và model FP16. Không cần ảnh hoặc video.'],
    scail2_install: ['SCAIL2 v4.6 installer', 'Chỉ cài ComfyUI, custom nodes, SageAttention và toàn bộ model; không cần chọn input.'],
    rvm: ['RVM test flow', 'Xuất preview nền xanh, foreground và alpha matte cho mỗi video.'],
  };
  const [title, description] = notes[modelPreset.value] || ['', ''];
  note.querySelector('strong').textContent = title;
  note.querySelector('span').textContent = description;
});

for (const input of form.querySelectorAll('.dropzone input')) {
  const zone = input.closest('.dropzone');
  input.addEventListener('change', () => renderSelected(input));
  for (const event of ['dragenter', 'dragover']) zone.addEventListener(event, () => zone.classList.add('drag'));
  for (const event of ['dragleave', 'drop']) zone.addEventListener(event, () => zone.classList.remove('drag'));
}

function renderSelected(input) {
  const list = input.closest('.dropzone').querySelector('.file-list');
  list.innerHTML = [...input.files].map((file) => `<span>${escapeHtml(file.name)} · ${formatBytes(file.size)}</span>`).join('');
}

document.querySelectorAll('[data-token]').forEach((button) => button.addEventListener('click', () => {
  const command = form.elements.command;
  const start = command.selectionStart;
  command.setRangeText(button.dataset.token, start, command.selectionEnd, 'end');
  command.focus();
}));

function authPayload() {
  return { sshCommand: form.elements.sshCommand.value };
}

testButton.addEventListener('click', async () => {
  testButton.disabled = true;
  testButton.textContent = 'Đang test…';
  sshResult.className = 'inline-message hidden';
  try {
    const response = await fetch('/api/ssh/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authPayload()) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    sshResult.textContent = data.message;
    sshResult.className = 'inline-message';
  } catch (error) {
    sshResult.textContent = error.message || 'Không thể kết nối';
    sshResult.className = 'inline-message error';
  } finally {
    testButton.disabled = false;
    testButton.textContent = 'Test SSH';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const images = form.elements.images.files.length;
  const videos = form.elements.videos.files.length;
  const installOnly = ['scail2_install', 'scail2_full_install'].includes(modelPreset.value);
  if (!images && !videos && !installOnly) return showFormError('Chọn ít nhất một ảnh hoặc video reference.');
  if (modelPreset.value === 'rvm' && !videos) return showFormError('RVM cần ít nhất một video reference.');
  const scail2Run = ['scail2_run', 'scail2_run_20s', 'scail2_full'].includes(modelPreset.value);
  if (scail2Run && images !== 1) return showFormError('Run SCAIL2 cần đúng 1 ảnh reference.');
  if (scail2Run && videos !== 1) return showFormError('Run SCAIL2 cần đúng 1 video driving.');

  runButton.disabled = true;
  runButton.querySelector('span').textContent = 'Đang tạo job…';
  resetConsole();
  try {
    const data = new FormData(form);
    if (modelPreset.value === 'scail2_full_install') {
      data.delete('images');
      data.delete('videos');
    }
    const response = await fetch('/api/jobs', { method: 'POST', body: data });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    followJob(payload.job);
  } catch (error) {
    appendLog({ time: new Date().toISOString(), stream: 'stderr', message: error.message });
    setStatus({ status: 'failed', error: error.message, outputs: [] });
    runButton.disabled = false;
    runButton.querySelector('span').textContent = 'Run on cloud GPU';
  }
});

function followJob(job) {
  eventSource?.close();
  jobId.textContent = job.id.toUpperCase();
  setStatus(job);
  eventSource = new EventSource(`/api/jobs/${job.id}/events`);
  eventSource.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'log') appendLog(message.entry);
    if (message.type === 'status') {
      setStatus(message.job);
      if (['completed', 'failed'].includes(message.job.status)) {
        eventSource.close();
        runButton.disabled = false;
        runButton.querySelector('span').textContent = 'Run another job';
      }
    }
  };
}

function setStatus(job) {
  const [label, progress] = statusMeta[job.status] || [job.status, 0];
  statusLabel.textContent = label;
  progressBar.style.width = `${progress}%`;
  statusDot.className = `status-dot ${job.status === 'failed' ? 'error' : job.status === 'completed' ? 'done' : 'active'}`;
  for (const entry of job.logs || []) appendLog(entry);
  if (job.outputs) renderOutputs(job.id, job.outputs);
}

function appendLog(entry) {
  const logKey = `${entry.time}|${entry.stream}|${entry.message}`;
  if (seenLogs.has(logKey)) return;
  seenLogs.add(logKey);
  consoleBox.querySelector('.empty-console')?.remove();
  const line = document.createElement('p');
  line.className = entry.stream;
  const time = new Date(entry.time).toLocaleTimeString('vi-VN', { hour12: false });
  line.innerHTML = `<span class="timestamp">${time}</span>${escapeHtml(entry.message)}`;
  consoleBox.append(line);
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function renderOutputs(id, outputs) {
  outputCount.textContent = `${outputs.length} files`;
  if (!outputs.length) { outputList.innerHTML = '<p>Chưa có kết quả.</p>'; return; }
  outputList.innerHTML = outputs.map((file) => `<a class="output-file" href="/api/jobs/${encodeURIComponent(id)}/files/${file.name.split('/').map(encodeURIComponent).join('/')}"><span>${escapeHtml(file.name)}</span><span>${formatBytes(file.size)} ↓</span></a>`).join('');
}

function resetConsole() {
  seenLogs.clear();
  consoleBox.innerHTML = '<p class="empty-console">Đang khởi tạo job…</p>';
  outputList.innerHTML = '<p>Chưa có kết quả.</p>';
  outputCount.textContent = '0 files';
}

function showFormError(message) {
  sshResult.textContent = message;
  sshResult.className = 'inline-message error';
  sshResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
