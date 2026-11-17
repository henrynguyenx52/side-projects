"use strict";

let currentTab = "studio";
let currentType = "video";
let referenceImages = [];
let storyReferenceImages = [];
let activePollingTaskId = null;
let activeStoryPollingId = null;
let currentStoryScenes = [];
let activeFocusedSceneIdx = null;

// Toast helper
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerText = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// Navigation Tabs
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    const target = btn.dataset.tab;
    currentTab = target;
    const pane = document.getElementById(`pane-${target}`);
    if (pane) pane.classList.add("active");

    if (target === "story") renderStorySceneRows();
    if (target === "accounts") loadAccounts();
    if (target === "media") loadMedia();
    if (target === "batch") loadTasks();
    if (target === "api") loadSettings();
  });
});

// ==========================================
// PASTE & DRAG-AND-DROP IMAGE HANDLERS
// ==========================================
function processImageFile(file, isStory = false, targetSceneIdx = null) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const b64 = evt.target.result;
    const item = {
      name: file.name || `paste_${Date.now()}.png`,
      b64,
      role: isStory ? "character" : "product",
    };

    if (isStory) {
      const sIdx = targetSceneIdx !== null ? targetSceneIdx : activeFocusedSceneIdx;
      if (sIdx !== null && currentStoryScenes && currentStoryScenes[sIdx]) {
        if (!currentStoryScenes[sIdx].referenceImages) {
          currentStoryScenes[sIdx].referenceImages = [];
        }
        currentStoryScenes[sIdx].referenceImages.push(item);
        renderSceneRefPreviews(sIdx);
        showToast(`📋 Đã thêm ảnh tham chiếu cho Cảnh ${sIdx + 1}: ${item.name}`, "success");
      } else {
        storyReferenceImages.push(item);
        renderStoryRefPreviews();
        showToast(`📋 Đã thêm ảnh tham chiếu chung toàn phim: ${item.name}`, "success");
      }
    } else {
      referenceImages.push(item);
      renderRefPreviews();
      showToast(`📋 Đã thêm ảnh tham chiếu: ${item.name}`, "success");
    }
  };
  reader.readAsDataURL(file);
}

// Global Clipboard Paste (Ctrl+V / Cmd+V)
window.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  let hasImage = false;
  for (const item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) {
        const isStory = currentTab === "story";
        processImageFile(file, isStory);
        hasImage = true;
      }
    }
  }
  if (hasImage) {
    e.preventDefault();
  }
});

// Setup dropzone helpers
function setupDropzone(zoneEl, inputEl, browseLinkEl, isStory = false) {
  if (!zoneEl || !inputEl) return;

  if (browseLinkEl) {
    browseLinkEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      inputEl.click();
    });
  }

  inputEl.addEventListener("click", (e) => e.stopPropagation());

  // Function to set focus state on dropzone without opening file dialog
  const activateZoneFocus = () => {
    if (isStory) {
      activeFocusedSceneIdx = null; // Clear active scene so paste targets global story reference images
      document.querySelectorAll(".story-scene-row").forEach((r) => r.classList.remove("focused"));
    }
    document.querySelectorAll(".paste-dropzone").forEach((z) => z.classList.remove("focused"));
    zoneEl.classList.add("focused");
  };

  // Clicking zone ONLY focuses it for Ctrl+V / Cmd+V
  zoneEl.addEventListener("click", (e) => {
    if (e.target !== browseLinkEl && !browseLinkEl?.contains(e.target) && !e.target.closest(".ref-thumb")) {
      activateZoneFocus();
      zoneEl.focus();
    }
  });

  zoneEl.addEventListener("focus", () => {
    activateZoneFocus();
  });

  inputEl.addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => processImageFile(file, isStory));
    inputEl.value = "";
  });

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    zoneEl.classList.add("dragover");
  });

  zoneEl.addEventListener("dragleave", () => {
    zoneEl.classList.remove("dragover");
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    zoneEl.classList.remove("dragover");
    if (e.dataTransfer?.files) {
      Array.from(e.dataTransfer.files).forEach((file) => processImageFile(file, isStory));
    }
  });
}

// Initialize Dropzones for Studio & Story
setupDropzone(
  document.getElementById("studioPasteZone"),
  document.getElementById("refImageInput"),
  document.getElementById("studioBrowseLink"),
  false
);

setupDropzone(
  document.getElementById("storyPasteZone"),
  document.getElementById("storyRefInput"),
  document.getElementById("storyBrowseLink"),
  true
);

// Render Studio Reference Previews
function renderRefPreviews() {
  const list = document.getElementById("refPreviewList");
  if (!list) return;
  list.innerHTML = "";
  referenceImages.forEach((img, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "ref-thumb";
    thumb.innerHTML = `
      <img src="${img.b64}" alt="${img.name}" />
      <span class="role-badge" title="Bấm để đổi vai trò" onclick="toggleRole(${idx}, false)">${img.role === "character" ? "Nhân vật" : "Sản phẩm"}</span>
      <button type="button" class="remove-btn" onclick="removeRef(${idx})">×</button>
    `;
    list.appendChild(thumb);
  });
}

window.removeRef = function (idx) {
  referenceImages.splice(idx, 1);
  renderRefPreviews();
};

// Render Story Reference Previews
function renderStoryRefPreviews() {
  const list = document.getElementById("storyRefPreviewList");
  if (!list) return;
  list.innerHTML = "";
  storyReferenceImages.forEach((img, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "ref-thumb";
    thumb.innerHTML = `
      <img src="${img.b64}" alt="${img.name}" />
      <span class="role-badge" title="Bấm để đổi vai trò" onclick="toggleRole(${idx}, true)">${img.role === "character" ? "Nhân vật" : "Sản phẩm"}</span>
      <button type="button" class="remove-btn" onclick="removeStoryRef(${idx})">×</button>
    `;
    list.appendChild(thumb);
  });
}

window.removeStoryRef = function (idx) {
  storyReferenceImages.splice(idx, 1);
  renderStoryRefPreviews();
};

window.toggleRole = function (idx, isStory) {
  const arr = isStory ? storyReferenceImages : referenceImages;
  if (arr[idx]) {
    arr[idx].role = arr[idx].role === "character" ? "product" : "character";
    if (isStory) renderStoryRefPreviews();
    else renderRefPreviews();
  }
};

// Check Server Status
async function checkStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    const dot = document.querySelector(".status-dot");
    const text = document.querySelector(".status-text");
    if (data.ok) {
      dot.classList.add("online");
      text.innerText = `Sẵn sàng (${data.accountsLive}/${data.accountsTotal} ních LIVE)`;
      document.getElementById("badgeAccounts").innerText = data.accountsTotal;
      document.getElementById("badgeMedia").innerText = data.mediaTotal;
    }
  } catch (err) {
    const dot = document.querySelector(".status-dot");
    const text = document.querySelector(".status-text");
    dot.classList.remove("online");
    text.innerText = "Mất kết nối máy chủ";
  }
}

// Generate Media
const btnGenerate = document.getElementById("btnGenerate");
const liveProgressBox = document.getElementById("liveProgressBox");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const resultContainer = document.getElementById("resultPreviewContainer");
const resultActions = document.getElementById("resultActions");
const btnDownloadResult = document.getElementById("btnDownloadResult");
const btnCopyUrl = document.getElementById("btnCopyUrl");

btnGenerate.addEventListener("click", async () => {
  const prompt = document.getElementById("promptInput").value.trim();
  if (!prompt) {
    return showToast("Vui lòng nhập mô tả Prompt!", "error");
  }

  const aspectRatio = document.getElementById("aspectRatioSelect").value;
  const duration = document.getElementById("durationSelect").value;
  const quality = document.getElementById("qualitySelect").value;
  const accountId = document.getElementById("accountSelect").value;

  btnGenerate.disabled = true;
  liveProgressBox.classList.remove("hidden");
  resultActions.classList.add("hidden");
  progressBar.style.width = "5%";
  progressPercent.innerText = "5%";
  progressText.innerText = "Đang gửi tác vụ vào hàng đợi...";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        expect: currentType,
        aspectRatio,
        duration,
        quality,
        referenceImages,
        accountId,
      }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    const taskId = data.task.id;
    activePollingTaskId = taskId;
    pollTask(taskId);
  } catch (err) {
    showToast(err.message, "error");
    btnGenerate.disabled = false;
    liveProgressBox.classList.add("hidden");
  }
});

function pollTask(taskId) {
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!data.ok) return;

      const task = data.task;
      progressBar.style.width = `${task.progress}%`;
      progressPercent.innerText = `${task.progress}%`;
      progressText.innerText = task.progressText || "Đang xử lý...";

      if (task.status === "completed") {
        clearInterval(timer);
        btnGenerate.disabled = false;
        showToast("Tạo thành phẩm thành công!", "success");

        // Show Media Result
        if (task.type === "video") {
          resultContainer.innerHTML = `
            <div class="video-player-container">
              <video src="${task.mediaUrl}" controls autoplay loop playsinline preload="auto"></video>
              <div class="video-meta-badge">
                <span>🎬 ${task.duration || "Video"}</span>
                <span>•</span>
                <span>${task.aspectRatio || "9:16"}</span>
                <span>•</span>
                <span>${task.quality || "4K"}</span>
              </div>
            </div>
          `;
        } else {
          resultContainer.innerHTML = `
            <img src="${task.mediaUrl}" alt="Result" style="max-height: 480px; max-width: 100%; object-fit: contain; border-radius: 8px;" />
          `;
        }

        btnDownloadResult.href = task.mediaUrl;
        btnDownloadResult.download = task.fileName || "muse_output";
        resultActions.classList.remove("hidden");

        btnCopyUrl.onclick = () => {
          navigator.clipboard.writeText(window.location.origin + task.mediaUrl);
          showToast("Đã sao chép liên kết vào bộ nhớ tạm!");
        };

        checkStatus();
      } else if (task.status === "failed") {
        clearInterval(timer);
        btnGenerate.disabled = false;
        showToast(`Tạo thất bại: ${task.error}`, "error");
        progressText.innerText = `Lỗi: ${task.error}`;
      }
    } catch (_e) {}
  }, 1500);
}

// Load Accounts
async function loadAccounts() {
  const tbody = document.getElementById("accountsTableBody");
  const select = document.getElementById("accountSelect");

  try {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    const accounts = data.accounts || [];

    // Update Studio dropdown
    select.innerHTML = '<option value="">Tự động chọn tài khoản LIVE</option>';
    accounts.forEach((acc) => {
      const opt = document.createElement("option");
      opt.value = acc.id;
      opt.innerText = `${acc.name} (${acc.status})`;
      select.appendChild(opt);
    });

    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có tài khoản nào. Bấm nút Thêm tài khoản để bắt đầu.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    accounts.forEach((acc) => {
      const tr = document.createElement("tr");
      const badgeClass = acc.status === "LIVE" ? "badge-live" : acc.status === "DIE" ? "badge-die" : "badge-unknown";
      const lastActive = acc.lastActive ? new Date(acc.lastActive).toLocaleTimeString("vi-VN") : "Chưa có";

      tr.innerHTML = `
        <td><strong>${acc.name}</strong></td>
        <td><span class="badge ${badgeClass}">${acc.status}</span></td>
        <td style="font-family: monospace; font-size: 11px;">${acc.profileDir}</td>
        <td>${lastActive}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="loginAccount('${acc.id}')">🔑 Đăng nhập Chrome</button>
          <button class="btn btn-secondary btn-sm" onclick="verifyAccount('${acc.id}')">🔄 Kiểm tra</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAccount('${acc.id}')">🗑️ Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Lỗi tải danh sách: ${err.message}</td></tr>`;
  }
}

// Add Account
document.getElementById("btnOpenAddAccountModal").addEventListener("click", async () => {
  const name = prompt("Nhập tên gợi nhớ cho tài khoản Muse (VD: Ních Muse 1):");
  if (!name) return;

  try {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast("Đã thêm tài khoản mới!");
      loadAccounts();
    }
  } catch (err) {
    showToast(err.message, "error");
  }
});

window.loginAccount = async function (id) {
  try {
    showToast("Đang mở trình duyệt Chrome...");
    const res = await fetch(`/api/accounts/${id}/login`, { method: "POST" });
    const data = await res.json();
    showToast(data.message);
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.verifyAccount = async function (id) {
  try {
    showToast("Đang kiểm tra trạng thái phiên...");
    const res = await fetch(`/api/accounts/${id}/verify`, { method: "POST" });
    const data = await res.json();
    if (data.result && data.result.ok) {
      showToast("Tài khoản LIVE!", "success");
    } else {
      showToast(`Tài khoản chưa sẵn sàng: ${data.result?.reason || "Lỗi"}`, "error");
    }
    loadAccounts();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.deleteAccount = async function (id) {
  if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này và toàn bộ profile dữ liệu?")) return;
  try {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    showToast("Đã xóa tài khoản.");
    loadAccounts();
    checkStatus();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Batch Tasks
async function loadTasks() {
  const tbody = document.getElementById("tasksTableBody");
  try {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    const tasks = data.tasks || [];

    if (tasks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có tác vụ nào</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    tasks.forEach((t) => {
      const tr = document.createElement("tr");
      const time = new Date(t.createdAt).toLocaleTimeString("vi-VN");
      const statusBadge = t.status === "completed" ? "badge-live" : t.status === "failed" ? "badge-die" : "badge-unknown";

      tr.innerHTML = `
        <td>${time}</td>
        <td>${t.type === "video" ? "🎥 Video" : "🖼️ Ảnh"}</td>
        <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.prompt}</td>
        <td><span class="badge ${statusBadge}">${t.status}</span></td>
        <td>
          ${t.mediaUrl ? `<a href="${t.mediaUrl}" target="_blank" class="btn btn-secondary btn-sm">Xem / Tải</a>` : "-"}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Lỗi: ${err.message}</td></tr>`;
  }
}

document.getElementById("btnAddBatch").addEventListener("click", async () => {
  const text = document.getElementById("batchPromptsInput").value.trim();
  if (!text) return showToast("Vui lòng nhập ít nhất 1 dòng kịch bản!", "error");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  showToast(`Đã thêm ${lines.length} tác vụ vào hàng đợi!`);

  for (const line of lines) {
    await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: line, expect: "video" }),
    });
  }

  document.getElementById("batchPromptsInput").value = "";
  loadTasks();
});

// Media Gallery
async function loadMedia() {
  const grid = document.getElementById("mediaGrid");
  try {
    const res = await fetch("/api/media");
    const data = await res.json();
    const media = data.media || [];

    if (media.length === 0) {
      grid.innerHTML = '<p class="text-center col" style="grid-column: 1/-1; padding: 40px; color: var(--text-muted);">Thư viện trống. Hãy tạo video hoặc ảnh mới ở tab Studio.</p>';
      return;
    }

    grid.innerHTML = "";
    media.forEach((item) => {
      const card = document.createElement("div");
      card.className = "media-card";
      const sizeMb = (item.size / (1024 * 1024)).toFixed(2);
      const time = new Date(item.createdAt).toLocaleString("vi-VN");

      card.innerHTML = `
        <div class="media-thumbnail">
          ${
            item.isVideo
              ? `<video src="${item.url}" controls preload="metadata"></video>`
              : `<img src="${item.url}" alt="${item.fileName}" />`
          }
        </div>
        <div class="media-info">
          <div class="media-title" title="${item.fileName}">${item.fileName}</div>
          <div class="media-meta">${sizeMb} MB • ${time}</div>
          <div class="media-actions">
            <a href="${item.url}" download="${item.fileName}" class="btn btn-secondary btn-sm col">⬇️ Tải</a>
            <button class="btn btn-danger btn-sm" onclick="deleteMedia('${item.fileName}')">🗑️</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p class="text-center col" style="grid-column: 1/-1;">Lỗi tải thư viện: ${err.message}</p>`;
  }
}

document.getElementById("btnRefreshMedia").addEventListener("click", loadMedia);

window.deleteMedia = async function (fileName) {
  if (!confirm(`Bạn có chắc muốn xóa file: ${fileName}?`)) return;
  try {
    await fetch(`/api/media/${encodeURIComponent(fileName)}`, { method: "DELETE" });
    showToast("Đã xóa file media.");
    loadMedia();
    checkStatus();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Settings
async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.ok && data.settings) {
      document.getElementById("settingHeadless").checked = Boolean(data.settings.headless);
    }
  } catch (_e) {}
}

document.getElementById("btnSaveSettings").addEventListener("click", async () => {
  const headless = document.getElementById("settingHeadless").checked;
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headless }),
    });
    const data = await res.json();
    if (data.ok) showToast("Đã lưu cài đặt!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ==========================================
// DYNAMIC STORY SCENE ROWS & STORY MAKER
// ==========================================
const btnBreakdownAuto = document.getElementById("btnBreakdownAuto");
const btnAddSceneRowTop = document.getElementById("btnAddSceneRowTop");
const btnAddSceneRowBottom = document.getElementById("btnAddSceneRowBottom");
const storySceneRowsList = document.getElementById("storySceneRowsList");
const storySceneCountBadge = document.getElementById("storySceneCountBadge");
const btnGenerateStory = document.getElementById("btnGenerateStory");
const storyProgressBox = document.getElementById("storyProgressBox");
const storyProgressBar = document.getElementById("storyProgressBar");
const storyProgressText = document.getElementById("storyProgressText");
const storyProgressPercent = document.getElementById("storyProgressPercent");
const storySceneBoard = document.getElementById("storySceneBoard");
const sceneCardsList = document.getElementById("sceneCardsList");
const storyResultContainer = document.getElementById("storyResultContainer");
const storyResultActions = document.getElementById("storyResultActions");
const btnDownloadStory = document.getElementById("btnDownloadStory");
const btnCopyStoryUrl = document.getElementById("btnCopyStoryUrl");

// Initialize default 3 scene rows if empty
if (!currentStoryScenes || currentStoryScenes.length === 0) {
  currentStoryScenes = [
    { title: "Cảnh 1", prompt: "", referenceImages: [] },
    { title: "Cảnh 2", prompt: "", referenceImages: [] },
    { title: "Cảnh 3", prompt: "", referenceImages: [] },
  ];
}

function updateSceneCountBadge() {
  if (!storySceneCountBadge) return;
  const count = currentStoryScenes.length;
  storySceneCountBadge.innerText = `${count} phân cảnh (Dynamic theo prompt)`;
}

function renderStorySceneRows() {
  if (!storySceneRowsList) return;
  storySceneRowsList.innerHTML = "";

  currentStoryScenes.forEach((sc, idx) => {
    if (!sc.referenceImages) sc.referenceImages = [];
    const row = document.createElement("div");
    row.className = `story-scene-row ${activeFocusedSceneIdx === idx ? "focused" : ""}`;
    row.id = `scene_row_${idx}`;
    row.dataset.idx = idx;

    row.innerHTML = `
      <div class="scene-row-header">
        <div class="scene-badge">
          <span class="scene-num">Cảnh ${idx + 1}</span>
          <input type="text" class="scene-title-input" value="${sc.title || `Cảnh ${idx + 1}`}" placeholder="Tên cảnh (ví dụ: Cảnh ${idx + 1})" data-idx="${idx}" />
        </div>
        <div class="scene-meta-tools">
          <span class="scene-dynamic-tag" title="Thời lượng video cảnh này được quyết định linh hoạt theo mô tả hành động trong prompt">⚡ Dynamic (theo prompt)</span>
          <button type="button" class="btn btn-danger btn-sm btn-remove-row" onclick="removeSceneRow(${idx})" title="Xóa cảnh này">🗑️</button>
        </div>
      </div>

      <div class="scene-row-content">
        <textarea rows="3" class="scene-prompt-input" data-idx="${idx}" placeholder="Mô tả chi tiết kịch bản, hành động và góc quay cho Cảnh ${idx + 1} (thời lượng tự động điều chỉnh linh hoạt theo mô tả)...">${sc.prompt || ""}</textarea>
        
        <div class="scene-ref-section">
          <div class="scene-ref-header">
            <span>📎 Ảnh tham chiếu riêng của Cảnh ${idx + 1} (${sc.referenceImages.length}):</span>
            <span class="sub-hint">Bấm khung rồi nhấn <b>Ctrl+V</b> / <b>Cmd+V</b> để dán ảnh</span>
          </div>
          <div class="scene-ref-zone" data-idx="${idx}" tabindex="0">
            <span>➕ Bấm khung để chọn vùng dán (Ctrl+V) riêng cho Cảnh ${idx + 1}</span>
            <button type="button" class="btn-browse-sm scene-browse-btn" data-idx="${idx}">📁 Chọn file</button>
            <input type="file" accept="image/*" multiple style="display: none;" class="scene-file-input" data-idx="${idx}">
          </div>
          <div class="scene-ref-previews" id="sceneRefList_${idx}"></div>
        </div>
      </div>
    `;

    // Events for title, prompt
    const titleInput = row.querySelector(".scene-title-input");
    titleInput.addEventListener("input", (e) => {
      sc.title = e.target.value;
    });

    const promptTextarea = row.querySelector(".scene-prompt-input");
    promptTextarea.addEventListener("input", (e) => {
      sc.prompt = e.target.value;
    });

    const activateSceneFocus = () => {
      document.querySelectorAll(".story-scene-row").forEach((r) => r.classList.remove("focused"));
      document.querySelectorAll(".paste-dropzone").forEach((z) => z.classList.remove("focused"));
      row.classList.add("focused");
      activeFocusedSceneIdx = idx;
    };

    promptTextarea.addEventListener("focus", activateSceneFocus);

    // File Dropzone events for this scene
    const zone = row.querySelector(".scene-ref-zone");
    const fileInput = row.querySelector(".scene-file-input");
    const browseBtn = row.querySelector(".scene-browse-btn");

    if (browseBtn) {
      browseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }

    zone.addEventListener("click", (e) => {
      if (e.target !== browseBtn && !browseBtn?.contains(e.target)) {
        activateSceneFocus();
        zone.focus();
      }
    });

    zone.addEventListener("focus", activateSceneFocus);

    fileInput.addEventListener("click", (e) => e.stopPropagation());
    fileInput.addEventListener("change", (e) => {
      Array.from(e.target.files).forEach((file) => processImageFile(file, true, idx));
      fileInput.value = "";
    });

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      if (e.dataTransfer?.files) {
        Array.from(e.dataTransfer.files).forEach((file) => processImageFile(file, true, idx));
      }
    });

    storySceneRowsList.appendChild(row);
    renderSceneRefPreviews(idx);
  });

  updateSceneCountBadge();
}

function renderSceneRefPreviews(sIdx) {
  const container = document.getElementById(`sceneRefList_${sIdx}`);
  if (!container || !currentStoryScenes[sIdx]) return;
  container.innerHTML = "";
  const refs = currentStoryScenes[sIdx].referenceImages || [];

  const row = document.getElementById(`scene_row_${sIdx}`);
  if (row) {
    const countSpan = row.querySelector(".scene-ref-header span");
    if (countSpan) countSpan.innerText = `📎 Ảnh tham chiếu riêng của Cảnh ${sIdx + 1} (${refs.length}):`;
  }

  refs.forEach((img, imgIdx) => {
    const thumb = document.createElement("div");
    thumb.className = "scene-ref-thumb";
    thumb.innerHTML = `
      <img src="${img.b64}" alt="${img.name}" />
      <button type="button" class="remove-btn" onclick="removeSceneRef(${sIdx}, ${imgIdx})">×</button>
    `;
    container.appendChild(thumb);
  });
}

window.removeSceneRef = function (sIdx, imgIdx) {
  if (currentStoryScenes[sIdx] && currentStoryScenes[sIdx].referenceImages) {
    currentStoryScenes[sIdx].referenceImages.splice(imgIdx, 1);
    renderSceneRefPreviews(sIdx);
  }
};

window.removeSceneRow = function (idx) {
  if (currentStoryScenes.length <= 1) {
    return showToast("Cần giữ lại ít nhất 1 phân cảnh!", "warning");
  }
  currentStoryScenes.splice(idx, 1);
  if (activeFocusedSceneIdx === idx) activeFocusedSceneIdx = null;
  renderStorySceneRows();
  showToast("Đã xóa phân cảnh.");
};

function addSceneRow(defaultData = null) {
  const nextNum = currentStoryScenes.length + 1;
  const newScene = defaultData || {
    title: `Cảnh ${nextNum}`,
    prompt: "",
    referenceImages: [],
  };
  currentStoryScenes.push(newScene);
  activeFocusedSceneIdx = currentStoryScenes.length - 1;
  renderStorySceneRows();

  setTimeout(() => {
    const newRow = document.getElementById(`scene_row_${currentStoryScenes.length - 1}`);
    if (newRow) {
      newRow.scrollIntoView({ behavior: "smooth", block: "center" });
      const ta = newRow.querySelector(".scene-prompt-input");
      if (ta) ta.focus();
    }
  }, 100);
}

if (btnAddSceneRowTop) btnAddSceneRowTop.addEventListener("click", () => addSceneRow());
if (btnAddSceneRowBottom) btnAddSceneRowBottom.addEventListener("click", () => addSceneRow());

// Auto Breakdown from Master Prompt
if (btnBreakdownAuto) {
  btnBreakdownAuto.addEventListener("click", async () => {
    const prompt = document.getElementById("storyPromptInput").value.trim();
    if (!prompt) return showToast("Vui lòng nhập kịch bản vào ô phía trên!", "error");

    btnBreakdownAuto.disabled = true;
    btnBreakdownAuto.innerText = "Đang phân tích kịch bản...";

    try {
      const res = await fetch("/api/story/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      currentStoryScenes = (data.scenes || []).map((s) => ({
        title: s.title || `Cảnh ${s.index}`,
        prompt: s.prompt || "",
        referenceImages: [],
      }));

      renderStorySceneRows();
      showToast(`🪄 Đã tự động tạo ${currentStoryScenes.length} hàng phân cảnh từ kịch bản!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btnBreakdownAuto.disabled = false;
      btnBreakdownAuto.innerText = "🪄 Tự động chia Prompt thành các cảnh";
    }
  });
}

// 2. Start Story Generation
if (btnGenerateStory) {
  btnGenerateStory.addEventListener("click", async () => {
    const masterPrompt = document.getElementById("storyPromptInput").value.trim();

    // Check if at least one scene has content
    const validScenes = currentStoryScenes.filter((s) => s.prompt && s.prompt.trim());
    if (validScenes.length === 0) {
      return showToast("Vui lòng nhập mô tả kịch bản cho ít nhất 1 phân cảnh!", "error");
    }

    const aspectRatio = document.getElementById("storyAspectRatioSelect").value;
    const quality = document.getElementById("storyQualitySelect").value;

    btnGenerateStory.disabled = true;
    storyProgressBox.classList.remove("hidden");
    storySceneBoard.classList.remove("hidden");
    storyResultActions.classList.add("hidden");
    storyProgressBar.style.width = "5%";
    storyProgressPercent.innerText = "5%";
    storyProgressText.innerText = "Đang gửi các phân cảnh vào hàng đợi...";

    try {
      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: masterPrompt || currentStoryScenes[0]?.prompt || "Story Video",
          sceneCount: currentStoryScenes.length,
          targetDuration: "dynamic",
          aspectRatio,
          quality,
          referenceImages: storyReferenceImages,
          scenes: currentStoryScenes,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const storyId = data.story.id;
      activeStoryPollingId = storyId;
      renderSceneCards(data.story.scenes);
      pollStory(storyId);
    } catch (err) {
      showToast(err.message, "error");
      btnGenerateStory.disabled = false;
      storyProgressBox.classList.add("hidden");
    }
  });
}

function renderSceneCards(scenes) {
  sceneCardsList.innerHTML = "";
  scenes.forEach((sc, idx) => {
    const item = document.createElement("div");
    item.className = `scene-card-item ${sc.status || "queued"}`;
    item.id = `sc_card_${sc.id || idx}`;
    const badgeText =
      sc.status === "completed"
        ? `✅ Hoàn tất${sc.duration ? ` (${sc.duration})` : ""}`
        : sc.status === "processing"
        ? "⏳ Đang render..."
        : sc.status === "failed"
        ? "❌ Lỗi"
        : "Chờ";

    item.innerHTML = `
      <span class="scene-card-title">${sc.title || `Cảnh ${idx + 1}`}</span>
      <span class="scene-card-status">${badgeText}</span>
      ${sc.mediaUrl ? `<a href="${sc.mediaUrl}" target="_blank" class="scene-card-preview-btn">Xem clip</a>` : ""}
    `;
    sceneCardsList.appendChild(item);
  });
}

function pollStory(storyId) {
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`/api/story/${storyId}`);
      const data = await res.json();
      if (!data.ok || !data.story) return;

      const story = data.story;
      storyProgressBar.style.width = `${story.progress}%`;
      storyProgressPercent.innerText = `${story.progress}%`;
      storyProgressText.innerText = story.progressText || "Đang xử lý...";

      // Update scene status badges
      if (story.scenes) {
        story.scenes.forEach((sc, idx) => {
          const card = document.getElementById(`sc_card_${sc.id || idx}`);
          if (card) {
            card.className = `scene-card-item ${sc.status}`;
            const statusEl = card.querySelector(".scene-card-status");
            if (statusEl) {
              statusEl.innerText =
                sc.status === "completed"
                  ? `✅ Hoàn tất${sc.duration ? ` (${sc.duration})` : ""}`
                  : sc.status === "processing"
                  ? `⏳ ${sc.progressText || "Đang render..."}`
                  : sc.status === "failed"
                  ? "❌ Lỗi"
                  : "Chờ";
            }
            if (sc.mediaUrl && !card.querySelector(".scene-card-preview-btn")) {
              const a = document.createElement("a");
              a.href = sc.mediaUrl;
              a.target = "_blank";
              a.className = "scene-card-preview-btn";
              a.innerText = "Xem clip";
              card.appendChild(a);
            }
          }
        });
      }

      if (story.status === "completed") {
        clearInterval(timer);
        btnGenerateStory.disabled = false;
        showToast("🎬 Hoàn tất tạo toàn bộ phim Story Video!", "success");

        // Display stitched final video
        storyResultContainer.innerHTML = `
          <div class="video-player-container">
            <video src="${story.finalVideoUrl}" controls autoplay loop playsinline preload="auto"></video>
            <div class="video-meta-badge">
              <span>🎬 Full Story: ${story.targetDuration}</span>
              <span>•</span>
              <span>${story.scenes.length} cảnh ghép FFMPEG</span>
              <span>•</span>
              <span>${story.aspectRatio}</span>
              <span>•</span>
              <span>${story.quality}</span>
            </div>
          </div>
        `;

        btnDownloadStory.href = story.finalVideoUrl;
        btnDownloadStory.download = story.finalVideoUrl.split("/").pop();
        storyResultActions.classList.remove("hidden");

        btnCopyStoryUrl.onclick = () => {
          navigator.clipboard.writeText(window.location.origin + story.finalVideoUrl);
          showToast("Đã sao chép link video vào bộ nhớ tạm!");
        };

        checkStatus();
      } else if (story.status === "failed") {
        clearInterval(timer);
        btnGenerateStory.disabled = false;
        showToast(`Tạo story thất bại: ${story.error}`, "error");
        storyProgressText.innerText = `Lỗi: ${story.error}`;
      }
    } catch (_e) {}
  }, 2000);
}

// Init
checkStatus();
loadAccounts();
renderStorySceneRows();
setInterval(checkStatus, 10000);
