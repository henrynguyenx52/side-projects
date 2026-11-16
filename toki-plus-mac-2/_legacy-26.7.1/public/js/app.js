// ══════════════════════════════════════════════════════
// TOKI MOTION STUDIO - CLIENT JAVASCRIPT
// ══════════════════════════════════════════════════════

let currentTab = 'dashboard';
let hardwareId = '';
let isActivated = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Uploaded assets state
let uploadedImages = []; // { name, filename, path, url }
let uploadedVideos = []; // { name, filename, path, url }
let pairings = [];       // { image, video, prompt }

let allJobs = [];
let jobFilter = 'all';
let cachedAccounts = [];

// Chi phí Coins ước tính cho từng gói workflow RunningHub
const WORKFLOW_COIN_RATES = {
  'runninghub-standard': {
    coins: 200,
    label: 'Standard 24GB',
    badge: 'Standard 24GB',
    desc: '~200 Coins / video'
  },
  'runninghub-aiplus': {
    coins: 400,
    label: 'VIP 48GB',
    badge: 'TOKI VIP (48GB)',
    desc: '~400 Coins / video'
  }
};

function getTotalAvailableCoins() {
  return (cachedAccounts || [])
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
}

function updateCostEstimate() {
  const modelSelect = document.getElementById('batchModelSelect');
  if (!modelSelect) return;
  const modelId = modelSelect.value || 'runninghub-standard';
  const rateInfo = WORKFLOW_COIN_RATES[modelId] || { coins: 200, label: 'Standard 24GB', badge: 'Standard 24GB', desc: '~200 Coins / video' };

  const perVideoCoins = rateInfo.coins;
  const count = pairings.length;
  const totalCoins = count * perVideoCoins;
  const availableCoins = getTotalAvailableCoins();

  // Elements
  const elBadge = document.getElementById('costBadgeModel');
  const elPerVideo = document.getElementById('costPerVideoVal');
  const elCount = document.getElementById('costVideoCountVal');
  const elTotal = document.getElementById('costTotalEstimateVal');
  const elAvailable = document.getElementById('costAvailableCoinsVal');
  const elAlert = document.getElementById('costAlertBox');
  const btnStart = document.getElementById('btnStartBatch');

  if (elBadge) elBadge.textContent = rateInfo.badge;
  if (elPerVideo) elPerVideo.textContent = `~${perVideoCoins.toLocaleString('vi-VN')} Coins / video`;
  if (elCount) elCount.textContent = `${count} video (cặp ghép)`;
  if (elTotal) elTotal.textContent = count > 0 ? `~${totalCoins.toLocaleString('vi-VN')} Coins` : '0 Coins';
  if (elAvailable) elAvailable.textContent = `${availableCoins.toLocaleString('vi-VN')} Coins`;

  // Warning or success alert
  const activeAccounts = (cachedAccounts || []).filter(a => a.status === 'active');
  if (elAlert) {
    if (activeAccounts.length === 0) {
      elAlert.className = 'cost-alert-box cost-alert-danger';
      elAlert.style.display = 'block';
      elAlert.innerHTML = `❌ <strong>Chưa có tài khoản AI:</strong> Bạn chưa thêm API Key Toki Plus nào. Vui lòng vào tab "Tài Khoản AI" để thêm tài khoản trước.`;
    } else if (count > 0 && availableCoins < perVideoCoins) {
      elAlert.className = 'cost-alert-box cost-alert-danger';
      elAlert.style.display = 'block';
      elAlert.innerHTML = `❌ <strong>Không đủ số dư Coins:</strong> Cần tối thiểu <strong>~${perVideoCoins.toLocaleString('vi-VN')} Coins</strong> cho 1 video, tài khoản chỉ còn <strong>${availableCoins.toLocaleString('vi-VN')} Coins</strong>. Vui lòng nạp thêm Coins vào tài khoản Toki Plus!`;
    } else if (count > 0 && availableCoins < totalCoins) {
      const missing = totalCoins - availableCoins;
      const canMake = Math.floor(availableCoins / perVideoCoins);
      elAlert.className = 'cost-alert-box cost-alert-warning';
      elAlert.style.display = 'block';
      elAlert.innerHTML = `⚠️ <strong>Cảnh báo số dư:</strong> Cần khoảng <strong>~${totalCoins.toLocaleString('vi-VN')} Coins</strong> cho ${count} video, tài khoản hiện có <strong>${availableCoins.toLocaleString('vi-VN')} Coins</strong> (Thiếu ~${missing.toLocaleString('vi-VN')} Coins, chỉ đủ render khoảng ${canMake} video). Hãy nạp thêm Coins để tránh dừng giữa chừng!`;
    } else if (count > 0 && availableCoins >= totalCoins) {
      elAlert.className = 'cost-alert-box cost-alert-success';
      elAlert.style.display = 'block';
      elAlert.innerHTML = `✔ <strong>Đủ số dư Coins:</strong> Tài khoản có ${availableCoins.toLocaleString('vi-VN')} Coins, đủ chạy ${count} video (dự kiến còn lại ~${(availableCoins - totalCoins).toLocaleString('vi-VN')} Coins).`;
    } else {
      elAlert.style.display = 'none';
    }
  }

  // Update button text
  if (btnStart) {
    if (count === 0) {
      btnStart.textContent = '🚀 BẮT ĐẦU TẠO VIDEO';
    } else {
      btnStart.textContent = `🚀 BẮT ĐẦU TẠO ${count} VIDEO (~${totalCoins.toLocaleString('vi-VN')} COINS)`;
    }
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  setupBulkTextarea();
  await checkLicenseStatus();
  await loadAccounts();
  await loadSettings();
  await loadJobs();
  setupSSE();
  updateCostEstimate();

  // Ticker đồng hồ thời gian thực và cập nhật số giây đã trôi qua của các job
  updateJobsCurrentClock();
  setInterval(() => {
    updateJobsCurrentClock();
    const jobsPage = document.getElementById('page-jobs');
    if (jobsPage && jobsPage.classList.contains('active')) {
      const hasActive = allJobs.some(j => j.status === 'running' || j.status === 'pending');
      if (hasActive) {
        renderJobsList();
      }
    }
  }, 1000);
});

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.page').forEach(page => {
    page.classList.toggle('active', page.id === `page-${tabId}`);
  });

  if (tabId === 'dashboard') updateDashboardMetrics();
  if (tabId === 'jobs') loadJobs();
  if (tabId === 'accounts') loadAccounts();
  if (tabId === 'telegram') loadTelegramData();
  if (tabId === 'settings') checkCacheInfo();
}

// ══════════════════════════════════════════════════════
// 1. LICENSE & ACTIVATION & REALTIME COUNTDOWN
// ══════════════════════════════════════════════════════
let currentActiveKey = '';
let countdownInterval = null;

function padZero(num) {
  return String(num).padStart(2, '0');
}

function startCountdown(expiresAt, planName) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  const grid = document.getElementById('countdownGrid');
  const lifetimeBox = document.getElementById('cdLifetime');
  const expiredBox = document.getElementById('cdExpired');
  const badge = document.getElementById('licenseBadge');
  const badgeText = document.getElementById('licenseBadgeText');
  const licDaysVal = document.getElementById('licDaysVal');

  if (!expiresAt || expiresAt === 0) {
    // Vĩnh viễn
    if (grid) grid.style.display = 'none';
    if (expiredBox) expiredBox.style.display = 'none';
    if (lifetimeBox) lifetimeBox.style.display = 'block';
    if (badgeText) badgeText.textContent = `Bản quyền: ${planName || 'TOKI PLUS'} (Vĩnh viễn)`;
    if (licDaysVal) licDaysVal.textContent = 'Vĩnh viễn (Không giới hạn)';
    return;
  }

  if (lifetimeBox) lifetimeBox.style.display = 'none';

  function update() {
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
      if (grid) grid.style.display = 'none';
      if (expiredBox) expiredBox.style.display = 'block';
      if (badge) badge.className = 'badge-license badge-inactive';
      if (badgeText) badgeText.textContent = 'Bản quyền: Đã hết hạn!';
      if (licDaysVal) licDaysVal.textContent = 'Đã hết hạn';
      clearInterval(countdownInterval);
      return;
    }

    if (grid) grid.style.display = 'grid';
    if (expiredBox) expiredBox.style.display = 'none';

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const elDays = document.getElementById('cdDays');
    const elHours = document.getElementById('cdHours');
    const elMins = document.getElementById('cdMins');
    const elSecs = document.getElementById('cdSecs');

    if (elDays) elDays.textContent = padZero(d);
    if (elHours) elHours.textContent = padZero(h);
    if (elMins) elMins.textContent = padZero(m);
    if (elSecs) elSecs.textContent = padZero(s);

    if (badgeText) {
      badgeText.textContent = `Bản quyền: ${planName || 'TOKI PLUS'} (${d}n ${padZero(h)}h ${padZero(m)}m ${padZero(s)}s)`;
    }
    if (licDaysVal) {
      licDaysVal.textContent = `${d} Ngày ${padZero(h)} Giờ ${padZero(m)} Phút ${padZero(s)} Giây`;
    }
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

async function loadSavedKeys() {
  try {
    const res = await fetch('/api/license/saved-keys');
    const data = await res.json();
    const keys = data.keys || [];

    // 1. Modal list
    const modalSection = document.getElementById('modalSavedKeysSection');
    const modalList = document.getElementById('modalSavedKeysList');
    if (modalSection && modalList) {
      if (keys.length > 0) {
        modalSection.style.display = 'block';
        modalList.innerHTML = keys.map(k => `
          <div class="saved-key-item" style="padding: 8px 10px;">
            <div class="saved-key-info">
              <span class="saved-key-title" style="font-size: 12px;">
                ${k.note || 'Key'} <span class="badge" style="font-size: 10px; background: rgba(59,130,246,0.2); color: #60a5fa;">${k.plan || 'VIP'}</span>
              </span>
              <span class="saved-key-meta" style="font-size: 10px;">${k.key.slice(0, 24)}...</span>
            </div>
            <div class="saved-key-actions">
              <button type="button" class="btn btn-primary btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="useSavedKey('${k.key}')">Dùng</button>
              <button type="button" class="btn btn-secondary btn-sm" style="padding: 4px 6px; font-size: 11px;" onclick="deleteSavedKey('${k.key}')">✕</button>
            </div>
          </div>
        `).join('');
      } else {
        modalSection.style.display = 'none';
      }
    }

    // 2. Page license list
    const pageList = document.getElementById('pageSavedKeysList');
    if (pageList) {
      if (keys.length === 0) {
        pageList.innerHTML = '<div style="text-align: center; color: var(--text-dim); font-size: 12px; padding: 16px;">Chưa có key nào được lưu trên máy</div>';
      } else {
        pageList.innerHTML = keys.map(k => {
          const isCurrent = k.key === currentActiveKey;
          return `
            <div class="saved-key-item" style="${isCurrent ? 'border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.08);' : ''}">
              <div class="saved-key-info">
                <span class="saved-key-title">
                  ${k.note || 'Khách hàng'}
                  <span class="badge" style="background: rgba(59,130,246,0.2); color: #60a5fa; font-size: 10px;">${k.plan || 'VIP'}</span>
                  ${isCurrent ? '<span style="color: var(--green); font-size: 11px; font-weight: 700;">● Đang kích hoạt</span>' : ''}
                </span>
                <span class="saved-key-meta">${k.key}</span>
              </div>
              <div class="saved-key-actions">
                ${!isCurrent ? `
                  <button type="button" class="btn btn-primary btn-sm" onclick="useSavedKey('${k.key}')">
                    🔑 Sử Dụng Key Này
                  </button>
                ` : ''}
                <button type="button" class="btn btn-secondary btn-sm" onclick="copyText('${k.key}', 'Đã sao chép License Key!')">
                  Sao Chép
                </button>
                ${!isCurrent ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="deleteSavedKey('${k.key}')" title="Xóa khỏi danh sách">
                    ✕
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Lỗi tải danh sách saved keys:', err);
  }
}

async function useSavedKey(key) {
  document.getElementById('activationKeyInput').value = key;
  await activateLicense();
}

async function deleteSavedKey(key) {
  if (!confirm('Bạn có chắc muốn xóa Key này khỏi danh sách đã lưu?')) return;
  try {
    await fetch('/api/license/saved-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    await loadSavedKeys();
  } catch (e) {
    alert('Lỗi xóa key: ' + e.message);
  }
}

async function logoutLicense() {
  if (!confirm('Bạn có chắc chắn muốn ĐĂNG XUẤT Key bản quyền hiện tại để nhập hoặc đổi sang Key khác?')) {
    return;
  }
  try {
    const res = await fetch('/api/license/logout', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      alert('Đã đăng xuất Key thành công! Bạn có thể nhập Key mới hoặc chọn từ danh sách đã lưu.');
      await checkLicenseStatus();
      openActivationModal();
    } else {
      alert('Lỗi: ' + data.error);
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ: ' + err.message);
  }
}

function copyCurrentKey() {
  if (!currentActiveKey) return alert('Không tìm thấy key');
  navigator.clipboard.writeText(currentActiveKey);
  alert('Đã sao chép License Key vào clipboard!');
}

function copyText(text, msg) {
  navigator.clipboard.writeText(text);
  alert(msg || 'Đã sao chép!');
}

async function checkLicenseStatus() {
  try {
    const res = await fetch('/api/license/status');
    const data = await res.json();
    hardwareId = data.currentHardwareId || '';
    document.getElementById('currentHwId').textContent = hardwareId;

    const badge = document.getElementById('licenseBadge');
    const badgeText = document.getElementById('licenseBadgeText');
    const statLic = document.getElementById('statLicense');
    const btnHeaderLogout = document.getElementById('btnHeaderLogoutKey');
    const btnPageLogout = document.getElementById('btnPageLogoutKey');

    // Show/hide admin keygen tab based on whether admin private key exists
    const adminTab = document.querySelector('[data-tab="admin-keygen"]');
    if (adminTab) {
      adminTab.style.display = data.isAdmin ? 'flex' : 'none';
    }

    if (data.activated) {
      isActivated = true;
      currentActiveKey = data.key || '';
      badge.className = 'badge-license badge-active';
      statLic.textContent = `Đã kích hoạt`;
      statLic.style.color = 'var(--green)';

      if (btnHeaderLogout) btnHeaderLogout.style.display = 'inline-flex';
      if (btnPageLogout) btnPageLogout.style.display = 'inline-flex';

      // Populate License Page
      document.getElementById('licStatusVal').textContent = 'Đang hoạt động';
      document.getElementById('licCustomerVal').textContent = data.customer || 'Người dùng';
      document.getElementById('licPlanVal').textContent = data.plan || 'TOKI PLUS';
      document.getElementById('licMidVal').textContent = data.machineId || 'Mọi máy';

      const elMasked = document.getElementById('licKeyMasked');
      if (elMasked) {
        elMasked.textContent = currentActiveKey ? (currentActiveKey.slice(0, 16) + '...' + currentActiveKey.slice(-10)) : '—';
        elMasked.title = currentActiveKey;
      }

      // Start realtime countdown timer down to seconds
      startCountdown(data.expiresAt, data.plan);

      document.getElementById('activationModal').style.display = 'none';
    } else {
      isActivated = false;
      currentActiveKey = '';
      if (countdownInterval) clearInterval(countdownInterval);

      badge.className = 'badge-license badge-inactive';
      badgeText.textContent = 'Chưa kích hoạt bản quyền';
      statLic.textContent = 'Chưa kích hoạt';
      statLic.style.color = 'var(--red)';

      if (btnHeaderLogout) btnHeaderLogout.style.display = 'none';
      if (btnPageLogout) btnPageLogout.style.display = 'none';

      document.getElementById('licStatusVal').textContent = 'Chưa kích hoạt';
      document.getElementById('licCustomerVal').textContent = '—';
      document.getElementById('licPlanVal').textContent = '—';
      document.getElementById('licDaysVal').textContent = '—';
      document.getElementById('licMidVal').textContent = hardwareId;

      const grid = document.getElementById('countdownGrid');
      const lifetimeBox = document.getElementById('cdLifetime');
      const expiredBox = document.getElementById('cdExpired');
      if (grid) grid.style.display = 'grid';
      if (lifetimeBox) lifetimeBox.style.display = 'none';
      if (expiredBox) expiredBox.style.display = 'none';
      const elDays = document.getElementById('cdDays');
      const elHours = document.getElementById('cdHours');
      const elMins = document.getElementById('cdMins');
      const elSecs = document.getElementById('cdSecs');
      if (elDays) elDays.textContent = '00';
      if (elHours) elHours.textContent = '00';
      if (elMins) elMins.textContent = '00';
      if (elSecs) elSecs.textContent = '00';

      // Show activation modal
      document.getElementById('activationModal').style.display = 'flex';
    }

    // Always refresh saved keys list
    await loadSavedKeys();
  } catch (err) {
    console.error('Lỗi kiểm tra license:', err);
  }
}

function openActivationModal() {
  document.getElementById('activationModal').style.display = 'flex';
  loadSavedKeys();
}

function copyHardwareId() {
  navigator.clipboard.writeText(hardwareId);
  alert('Đã sao chép Mã Máy (Hardware ID): ' + hardwareId);
}

async function activateLicense() {
  const key = document.getElementById('activationKeyInput').value.trim();
  const errBox = document.getElementById('activationError');
  errBox.style.display = 'none';

  if (!key) {
    errBox.textContent = 'Vui lòng nhập License Key!';
    errBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    if (!data.ok) {
      errBox.textContent = data.error || 'Mã kích hoạt không hợp lệ!';
      errBox.style.display = 'block';
      return;
    }

    alert('Kích hoạt bản quyền thành công!');
    await checkLicenseStatus();
  } catch (err) {
    errBox.textContent = 'Lỗi kết nối máy chủ: ' + err.message;
    errBox.style.display = 'block';
  }
}

// ══════════════════════════════════════════════════════
// 2. ADMIN KEYGEN (TẠO KEY CHO KHÁCH)
// ══════════════════════════════════════════════════════
let selectedKeygenCount = 1;
let lastGeneratedBatch = null;

function pasteCurrentMachine() {
  document.getElementById('keygenMachineId').value = hardwareId;
}

function updateKeygenCountUI(num) {
  selectedKeygenCount = num;
  const inputEl = document.getElementById('keygenCountInput');
  if (inputEl) inputEl.value = num;

  const badgeEl = document.getElementById('keygenCountBadge');
  if (badgeEl) badgeEl.textContent = `${num} Key`;

  const btnGen = document.getElementById('btnGenerateKey');
  if (btnGen) {
    btnGen.innerHTML = num > 1 ? `⚡ TẠO ${num} MÃ BẢN QUYỀN` : '⚡ TẠO 1 MÃ BẢN QUYỀN';
  }

  // Update pill active states
  document.querySelectorAll('.btn-count-pill').forEach(pill => {
    const pCount = parseInt(pill.getAttribute('data-count'), 10);
    if (pCount === num) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function selectKeygenCount(num) {
  updateKeygenCountUI(num);
}

function onKeygenCountInput(val) {
  let num = parseInt(val, 10);
  if (isNaN(num) || num < 1) num = 1;
  if (num > 100) num = 100;
  updateKeygenCountUI(num);
}

async function generateKeyForCustomer() {
  const customer = document.getElementById('keygenCustomer').value.trim() || 'Khách hàng';
  const machineId = document.getElementById('keygenMachineId').value.trim();
  const days = document.getElementById('keygenDays').value;
  const plan = document.getElementById('keygenPlan').value;
  const count = selectedKeygenCount || 1;

  const btnGen = document.getElementById('btnGenerateKey');
  const originalText = btnGen ? btnGen.innerHTML : '';
  if (btnGen) {
    btnGen.disabled = true;
    btnGen.innerHTML = `⏳ Đang tạo ${count} mã key...`;
  }

  try {
    const res = await fetch('/api/admin/generate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, machineId, days, plan, count })
    });
    const data = await res.json();
    if (!data.ok) {
      alert('Lỗi tạo key: ' + data.error);
      return;
    }

    const keys = data.keys || (data.data ? [data.data.key] : []);
    const outputEl = document.getElementById('generatedKeyOutput');
    const badgeEl = document.getElementById('keygenResultBadge');
    const btnDownload = document.getElementById('btnDownloadGeneratedKey');
    const btnCopy = document.getElementById('btnCopyGeneratedKey');
    const descEl = document.getElementById('keygenResultDesc');

    lastGeneratedBatch = {
      keys,
      customer,
      days,
      plan,
      machineId,
      createdAt: new Date()
    };

    if (keys.length > 1) {
      outputEl.value = keys.join('\n');
      if (badgeEl) {
        badgeEl.textContent = `Đã tạo ${keys.length} key`;
        badgeEl.style.display = 'inline-block';
      }
      if (descEl) {
        descEl.textContent = `Đã sinh thành công ${keys.length} mã bản quyền riêng biệt (${days === '0' ? 'Vĩnh viễn' : days + ' ngày'}). Mỗi key 1 dòng, sẵn sàng copy hoặc tải file.`;
      }
      if (btnDownload) btnDownload.style.display = 'inline-flex';
      if (btnCopy) btnCopy.textContent = `📋 Sao Chép Tất Cả (${keys.length} Key)`;
      alert(`Đã tạo thành công ${keys.length} mã bản quyền cho: ${customer}`);
    } else {
      outputEl.value = keys[0] || (data.data && data.data.key) || '';
      if (badgeEl) {
        badgeEl.textContent = '1 key';
        badgeEl.style.display = 'inline-block';
      }
      if (descEl) {
        descEl.textContent = 'Mã bản quyền dạng ngắn gọn định danh theo máy (hoặc dùng cho mọi máy). Khách hàng chỉ cần copy dán vào app là kích hoạt ngay.';
      }
      if (btnDownload) btnDownload.style.display = 'none';
      if (btnCopy) btnCopy.textContent = '📋 Sao Chép Key';
      alert('Đã tạo xong mã bản quyền cho: ' + customer);
    }
  } catch (err) {
    alert('Lỗi: ' + err.message);
  } finally {
    if (btnGen) {
      btnGen.disabled = false;
      btnGen.innerHTML = originalText;
    }
  }
}

function copyGeneratedKey() {
  const key = document.getElementById('generatedKeyOutput').value.trim();
  if (!key) {
    alert('Chưa có mã key nào để sao chép!');
    return;
  }
  navigator.clipboard.writeText(key);
  const count = (lastGeneratedBatch && lastGeneratedBatch.keys) ? lastGeneratedBatch.keys.length : 1;
  if (count > 1) {
    alert(`Đã sao chép toàn bộ ${count} License Key vào Clipboard!`);
  } else {
    alert('Đã sao chép License Key vào Clipboard!');
  }
}

function downloadGeneratedKeysTxt() {
  if (!lastGeneratedBatch || !lastGeneratedBatch.keys || lastGeneratedBatch.keys.length === 0) {
    const currentVal = document.getElementById('generatedKeyOutput').value.trim();
    if (!currentVal) {
      alert('Chưa có danh sách key để tải về!');
      return;
    }
  }

  const keys = lastGeneratedBatch ? lastGeneratedBatch.keys : document.getElementById('generatedKeyOutput').value.trim().split('\n');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `toki_keys_${keys.length}_${dateStr}.txt`;

  let content = `TOKI PLUS - DANH SÁCH ${keys.length} LICENSE KEY\n`;
  content += `Thời gian tạo: ${now.toLocaleString('vi-VN')}\n`;
  if (lastGeneratedBatch) {
    content += `Khách hàng/Ghi chú: ${lastGeneratedBatch.customer}\n`;
    content += `Gói cước: ${lastGeneratedBatch.plan}\n`;
    content += `Thời hạn: ${lastGeneratedBatch.days === '0' ? 'Vĩnh viễn' : lastGeneratedBatch.days + ' ngày'}\n`;
    content += `Mã máy: ${lastGeneratedBatch.machineId || 'ANY (Mọi máy)'}\n`;
  }
  content += `--------------------------------------------------------\n\n`;
  content += keys.join('\n') + '\n';

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════
// 3. FILE UPLOADS & PAIRING
// ══════════════════════════════════════════════════════
async function handleImageUpload(files) {
  if (!files || files.length === 0) return;
  const formData = new FormData();
  for (const f of files) formData.append('files', f);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok && data.files) {
      uploadedImages.push(...data.files);
      renderUploadedChips();
      autoPair1to1();
    }
  } catch (e) {
    alert('Lỗi upload ảnh: ' + e.message);
  }
}

async function handleVideoUpload(files) {
  if (!files || files.length === 0) return;
  const formData = new FormData();
  for (const f of files) formData.append('files', f);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok && data.files) {
      uploadedVideos.push(...data.files);
      renderUploadedChips();
      autoPair1to1();
    }
  } catch (e) {
    alert('Lỗi upload video: ' + e.message);
  }
}

function renderUploadedChips() {
  const imgList = document.getElementById('listImages');
  imgList.innerHTML = uploadedImages.map((img, idx) => `
    <div class="file-chip">
      <span class="file-chip-name" title="${img.name}">${img.name}</span>
      <span class="file-chip-del" onclick="removeImage(${idx})">✕</span>
    </div>
  `).join('');

  const vidList = document.getElementById('listVideos');
  vidList.innerHTML = uploadedVideos.map((vid, idx) => `
    <div class="file-chip">
      <span class="file-chip-name" title="${vid.name}">${vid.name}</span>
      <span class="file-chip-del" onclick="removeVideo(${idx})">✕</span>
    </div>
  `).join('');
}

function removeImage(idx) {
  uploadedImages.splice(idx, 1);
  renderUploadedChips();
  autoPair1to1();
}

function removeVideo(idx) {
  uploadedVideos.splice(idx, 1);
  renderUploadedChips();
  autoPair1to1();
}

function autoPair1to1() {
  pairings = [];
  const min = Math.min(uploadedImages.length, uploadedVideos.length);
  for (let i = 0; i < min; i++) {
    pairings.push({
      image: uploadedImages[i],
      video: uploadedVideos[i],
      prompt: ''
    });
  }
  renderPairings();
}

function pairOneVideoToAll() {
  if (uploadedVideos.length === 0) {
    alert('Vui lòng tải lên ít nhất 1 video nhảy mẫu!');
    return;
  }
  if (uploadedImages.length === 0) {
    alert('Vui lòng tải lên ảnh nhân vật!');
    return;
  }
  const video = uploadedVideos[0];
  pairings = uploadedImages.map(img => ({
    image: img,
    video: video,
    prompt: ''
  }));
  renderPairings();
}

function clearAllMotion() {
  uploadedImages = [];
  uploadedVideos = [];
  pairings = [];
  renderUploadedChips();
  renderPairings();
}

function renderPairings() {
  const container = document.getElementById('pairingsContainer');
  document.getElementById('pairingCount').textContent = pairings.length;

  if (pairings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-dim);">
        Chưa có cặp ghép nào. Hãy tải lên ảnh và video ở trên để tạo cặp!
      </div>
    `;
    return;
  }

  container.innerHTML = pairings.map((p, idx) => `
    <div class="pairing-row">
      <img src="${p.image.url}" class="pair-thumb" alt="image" onerror="this.src='/uploads/${p.image.filename}'">
      <span class="pair-arrow">➔</span>
      <video src="${p.video.url}" class="pair-thumb" muted onmouseover="this.play()" onmouseout="this.pause()"></video>
      <div class="pair-info">
        <div class="pair-name">${p.image.name} ✕ ${p.video.name}</div>
        <div class="pair-sub">Cặp #${idx + 1} • Nhấp để tinh chỉnh prompt</div>
      </div>
      <div class="pair-actions">
        <button class="btn btn-secondary btn-sm" onclick="duplicatePair(${idx})" title="Nhân bản">Nhân bản</button>
        <button class="btn btn-danger btn-sm" onclick="removePair(${idx})" title="Xóa">✕</button>
      </div>
    </div>
  `).join('');

  updateCostEstimate();
}

function duplicatePair(idx) {
  pairings.splice(idx + 1, 0, { ...pairings[idx] });
  renderPairings();
}

function removePair(idx) {
  pairings.splice(idx, 1);
  renderPairings();
}

// ══════════════════════════════════════════════════════
// 4. SUBMIT BATCH JOBS
// ══════════════════════════════════════════════════════
async function startBatchJobs() {
  if (pairings.length === 0) {
    alert('Chưa có cặp ảnh & video nào để tạo! Hãy tải file lên trước.');
    return;
  }

  const model = document.getElementById('batchModelSelect').value;
  const rateInfo = WORKFLOW_COIN_RATES[model] || { coins: 400, label: 'VIP 48GB', badge: 'TOKI VIP (48GB)' };
  const perVideoCoins = rateInfo.coins;
  const count = pairings.length;
  const totalCoinsNeeded = count * perVideoCoins;
  const availableCoins = getTotalAvailableCoins();
  const activeAccounts = (cachedAccounts || []).filter(a => a.status === 'active');

  // 1. Kiểm tra tài khoản AI
  if (activeAccounts.length === 0) {
    alert('❌ Chưa có tài khoản Toki Plus nào hoạt động!\n\nVui lòng vào mục "Tài Khoản AI" để thêm API Key trước khi bắt đầu tạo video.');
    switchTab('accounts');
    return;
  }

  // 2. Kiểm tra nếu số dư không đủ dù chỉ cho 1 video
  if (availableCoins < perVideoCoins) {
    alert(
      `❌ SỐ DƯ COINS KHÔNG ĐỦ ĐỂ CHẠY!\n\n` +
      `• Gói đã chọn: ${rateInfo.badge || rateInfo.label}\n` +
      `• Chi phí tối thiểu: ~${perVideoCoins.toLocaleString('vi-VN')} Coins / 1 video\n` +
      `• Số dư hiện tại của bạn: ${availableCoins.toLocaleString('vi-VN')} Coins\n\n` +
      `Vui lòng nạp thêm Coins vào tài khoản Toki Plus hoặc kiểm tra lại số dư trong tab "Tài Khoản AI" trước khi tạo!`
    );
    return;
  }

  // 3. Kiểm tra nếu số dư ít hơn tổng số video muốn tạo
  if (availableCoins < totalCoinsNeeded) {
    const missingCoins = totalCoinsNeeded - availableCoins;
    const canMakeCount = Math.floor(availableCoins / perVideoCoins);
    const confirmRun = confirm(
      `⚠️ CẢNH BÁO: SỐ DƯ COINS CÓ THỂ KHÔNG ĐỦ!\n\n` +
      `• Số video muốn tạo: ${count} video\n` +
      `• Ước tính chi phí cần: ~${totalCoinsNeeded.toLocaleString('vi-VN')} Coins\n` +
      `• Số dư hiện có: ${availableCoins.toLocaleString('vi-VN')} Coins\n` +
      `• Còn thiếu khoảng: ~${missingCoins.toLocaleString('vi-VN')} Coins\n` +
      `• Số dư hiện tại chỉ đủ render khoảng ${canMakeCount} video.\n\n` +
      `Nếu tiếp tục chạy, các video sau có thể bị báo lỗi hoặc tạm dừng giữa chừng do hết Coins.\n\n` +
      `Bạn có chắc chắn vẫn muốn tiếp tục đưa ${count} video vào hàng đợi không?`
    );
    if (!confirmRun) return;
  }

  const globalPrompt = document.getElementById('batchGlobalPrompt').value.trim();

  const payload = {
    workflowId: model,
    prompt: globalPrompt,
    pairings: pairings.map(p => ({
      imagePath: p.image.path,
      videoPath: p.video.path,
      imageName: p.image.name,
      videoName: p.video.name,
      prompt: p.prompt || globalPrompt,
      workflowId: model
    }))
  };

  const selectedThreads = parseInt(document.getElementById('batchThreadSelect').value, 10) || 2;
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadCount: selectedThreads })
    });
  } catch (e) { }

  try {
    const res = await fetch('/api/jobs/create-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      alert('Lỗi tạo tác vụ: ' + (data.error || 'Vui lòng kiểm tra lại tài khoản AI'));
      return;
    }

    alert(`Đã đưa ${data.count} video vào hàng đợi thành công!`);
    switchTab('jobs');
  } catch (err) {
    alert('Lỗi: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════
// 5. JOBS & REAL-TIME PROGRESS (SSE)
// ══════════════════════════════════════════════════════
async function loadJobs() {
  try {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    if (data.ok) {
      allJobs = data.jobs || [];
      renderJobsList();
      updateDashboardMetrics();
    }
  } catch (e) {
    console.error('Lỗi tải jobs:', e);
  }
}

function filterJobs(type, element) {
  jobFilter = type;
  document.querySelectorAll('.jobs-filter-bar .chip').forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');
  renderJobsList();
}

function formatJobClock(ts) {
  if (!ts) return '--:--:--';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatJobDuration(totalSec) {
  if (!totalSec || totalSec < 0) totalSec = 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}p ${s}s`;
  if (m > 0) return `${m}p ${s}s`;
  return `${s}s`;
}

function updateJobsCurrentClock() {
  const el = document.getElementById('jobsCurrentClock');
  if (el) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `🕒 Giờ hiện tại: ${hh}:${mm}:${ss}`;
  }
}

function renderJobsList() {
  const container = document.getElementById('jobsContainer');
  let filtered = allJobs;
  if (jobFilter === 'running') filtered = allJobs.filter(j => j.status === 'running' || j.status === 'pending');
  else if (jobFilter === 'completed') filtered = allJobs.filter(j => j.status === 'completed');
  else if (jobFilter === 'failed') filtered = allJobs.filter(j => j.status === 'failed');

  // Update counter chips
  document.getElementById('countAll').textContent = allJobs.length;
  document.getElementById('countRunning').textContent = allJobs.filter(j => j.status === 'running' || j.status === 'pending').length;
  document.getElementById('countCompleted').textContent = allJobs.filter(j => j.status === 'completed').length;
  document.getElementById('countFailed').textContent = allJobs.filter(j => j.status === 'failed').length;

  const runningCount = allJobs.filter(j => j.status === 'running').length;
  const runningBadge = document.getElementById('runningCountBadge');
  if (runningCount > 0) {
    runningBadge.style.display = 'inline-block';
    runningBadge.textContent = runningCount;
  } else {
    runningBadge.style.display = 'none';
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px; color: var(--text-dim);">
        Không có tác vụ nào trong danh mục này.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(job => {
    const isCompleted = job.status === 'completed';
    const isFailed = job.status === 'failed';
    const isRunning = job.status === 'running';

    let tagClass = 'status-pending';
    let tagText = 'Chờ xử lý';
    if (isRunning) { tagClass = 'status-running'; tagText = 'Đang render'; }
    else if (isCompleted) { tagClass = 'status-completed'; tagText = 'Hoàn thành'; }
    else if (isFailed) { tagClass = 'status-failed'; tagText = 'Thất bại'; }

    // Cost display
    let costDisplay = '';
    const isStandard = job.workflowId === 'runninghub-standard';
    const estCoins = isStandard ? 200 : 400;

    if (isCompleted) {
      const coins = job.consumeCoins !== undefined && job.consumeCoins !== null ? job.consumeCoins : estCoins;
      costDisplay = `<span class="job-cost-badge job-cost-completed" title="Số Coins tiêu thụ thực tế">🪙 ${coins} Coins</span>`;
    } else if (isRunning) {
      costDisplay = `<span class="job-cost-badge" title="Chi phí ước tính">🪙 Dự tính: ~${estCoins} Coins</span>`;
    } else {
      costDisplay = `<span class="job-cost-badge" style="background: rgba(255,255,255,0.06); color: var(--text-dim); border-color: rgba(255,255,255,0.1);" title="Chi phí ước tính">🪙 Dự tính: ~${estCoins} Coins</span>`;
    }

    // Time calculations
    const startTime = job.startedAt || job.createdAt;
    const startStr = startTime ? formatJobClock(startTime) : '---';

    let timeMetaHtml = '';
    if (isRunning) {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      timeMetaHtml = `
        <div class="job-meta-row">
          <span class="job-meta-item">🕒 <strong>Bắt đầu:</strong> ${startStr}</span>
          <span style="color: var(--border);">•</span>
          <span class="job-meta-item job-running-timer">⏳ <strong>Đang tạo:</strong> ${formatJobDuration(elapsedSec)}</span>
        </div>
      `;
    } else if (isCompleted) {
      const durationSec = job.taskCostTime || (job.completedAt && startTime ? Math.round((job.completedAt - startTime) / 1000) : 0);
      const finishStr = job.completedAt ? formatJobClock(job.completedAt) : '';
      timeMetaHtml = `
        <div class="job-meta-row">
          <span class="job-meta-item">🕒 <strong>Bắt đầu:</strong> ${startStr}</span>
          ${finishStr ? `<span style="color: var(--border);">•</span><span class="job-meta-item">✅ <strong>Xong lúc:</strong> ${finishStr}</span>` : ''}
          ${durationSec > 0 ? `<span style="color: var(--border);">•</span><span class="job-meta-item" style="color: var(--green); font-weight: 600;">⏱️ <strong>Tổng thời gian:</strong> ${formatJobDuration(durationSec)}</span>` : ''}
        </div>
      `;
    } else if (isFailed) {
      const failStr = job.completedAt ? formatJobClock(job.completedAt) : '';
      timeMetaHtml = `
        <div class="job-meta-row">
          <span class="job-meta-item">🕒 <strong>Bắt đầu:</strong> ${startStr}</span>
          ${failStr ? `<span style="color: var(--border);">•</span><span class="job-meta-item" style="color: var(--red);">❌ <strong>Thất bại lúc:</strong> ${failStr}</span>` : ''}
        </div>
      `;
    } else {
      // Pending in queue
      const waitSec = Math.max(0, Math.floor((Date.now() - (job.createdAt || Date.now())) / 1000));
      timeMetaHtml = `
        <div class="job-meta-row">
          <span class="job-meta-item">🕒 <strong>Tạo lúc:</strong> ${formatJobClock(job.createdAt)}</span>
          <span style="color: var(--border);">•</span>
          <span class="job-meta-item" style="color: var(--amber);">⏳ <strong>Chờ trong hàng đợi:</strong> ${formatJobDuration(waitSec)}</span>
        </div>
      `;
    }

    return `
      <div class="job-card">
        <div class="job-detail">
          <div class="job-header">
            <div class="job-title">${job.imageName} ➔ ${job.videoName}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${costDisplay}
              <span class="job-status-tag ${tagClass}">${tagText}</span>
            </div>
          </div>

          ${timeMetaHtml}

          <div class="progress-container">
            <div class="progress-fill" style="width: ${job.progress || 0}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span class="job-phase" title="${escapeHtml(job.error || '')}">
              ${escapeHtml(job.phase || '')} 
              ${job.error ? `<span style="color: #f87171; word-break: break-word;">(${escapeHtml(job.error.length > 120 ? job.error.substring(0, 120) + '...' : job.error)})</span>` : ''}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); flex-shrink: 0;">${job.progress || 0}%</span>
          </div>
        </div>

        <div style="display: flex; gap: 6px; align-items: center;">
          ${job.status === 'failed' ? `
            <button class="btn btn-primary btn-sm" onclick="retryJob('${job.id}', this)" title="Chạy lại tác vụ này">
              🔄 Thử lại
            </button>
          ` : ''}
          ${(job.status === 'running' || job.status === 'pending') ? `
            <button class="btn btn-danger btn-sm" onclick="cancelJob('${job.id}')" title="Hủy tác vụ này">
              ⏹ Hủy
            </button>
          ` : ''}
          ${(job.status === 'completed' || job.resultUrl) ? `
            <button class="btn btn-primary btn-sm" onclick="previewJobVideo('${job.id}')" title="Xem video kết quả">
              ▶ Xem Video
            </button>
            ${job.outputPath ? `
              <button class="btn btn-secondary btn-sm" onclick="openJobFile('${job.id}')" title="Mở file video trong máy tính (Windows Explorer)">
                📂 Mở file
              </button>
            ` : ''}
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="deleteJob('${job.id}')" title="Xóa">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function previewJobVideo(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  // Ưu tiên phát từ file cục bộ đã tải về máy tính (nhanh hơn, không lo hết hạn link)
  let videoSrc = '';
  if (job.outputPath) {
    const filename = job.outputPath.split(/[\\/]/).pop();
    videoSrc = `/Video/${encodeURIComponent(filename)}`;
  } else if (job.resultUrl) {
    videoSrc = job.resultUrl;
  }

  if (videoSrc) {
    previewVideo(videoSrc, job.imageName || 'Xem Video', job.resultUrl);
  }
}

async function openJobFile(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job || !job.outputPath) return;
  try {
    await fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: job.outputPath })
    });
  } catch (e) {
    console.error('Lỗi khi mở file video:', e);
  }
}

function previewVideo(url, title, fallbackUrl = '') {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('videoModalPlayer');
  document.getElementById('videoModalTitle').textContent = title || 'Xem Kết Quả';
  player.onerror = () => {
    if (fallbackUrl && player.src !== fallbackUrl) {
      console.warn('[VideoPlayer] Local file không load được, đang chuyển sang link CDN:', fallbackUrl);
      player.src = fallbackUrl;
    }
  };
  player.src = url;
  modal.style.display = 'flex';
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('videoModalPlayer');
  player.pause();
  player.onerror = null;
  player.src = '';
  modal.style.display = 'none';
}

async function retryJob(id, btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang thử lại...';
  }
  try {
    const res = await fetch(`/api/jobs/${id}/retry`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      alert('Không thể thử lại tác vụ: ' + (data.error || `Lỗi máy chủ (${res.status})`));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔄 Thử lại';
      }
      return;
    }
    loadJobs();
  } catch (e) {
    console.error('Lỗi khi thử lại job:', e);
    alert('Lỗi kết nối khi thử lại tác vụ: ' + e.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔄 Thử lại';
    }
  }
}

async function cancelJob(id) {
  if (!confirm('Bạn có chắc chắn muốn hủy tác vụ này không?')) return;
  try {
    await fetch(`/api/jobs/${id}/cancel`, { method: 'POST' });
    loadJobs();
  } catch (e) {
    console.error('Lỗi khi hủy job:', e);
  }
}

async function deleteJob(id) {
  await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
  loadJobs();
}

async function clearCompletedJobs() {
  await fetch('/api/jobs/clear-finished', { method: 'POST' });
  loadJobs();
}

function openOutputsFolder() {
  fetch('/api/open-folder', { method: 'POST' });
}

function setupSSE() {
  const evtSource = new EventSource('/api/jobs/events');
  evtSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'job_update') {
        const job = msg.data;
        const idx = allJobs.findIndex(j => j.id === job.id);
        if (idx !== -1) {
          allJobs[idx] = job;
        } else {
          allJobs.unshift(job);
        }
        renderJobsList();
        updateDashboardMetrics();
      }
    } catch (e) { }
  };
}

// ══════════════════════════════════════════════════════
// 6. ACCOUNTS (RUNNINGHUB KEYS)
// ══════════════════════════════════════════════════════
async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (data.ok) {
      renderAccountsTable(data.accounts || []);
    }
  } catch (e) { }
}

function renderAccountsTable(accounts) {
  cachedAccounts = accounts || [];
  const tbody = document.getElementById('accountsTableBody');
  document.getElementById('statAccounts').textContent = accounts.length;
  updateCostEstimate();
  updateDashboardMetrics();

  if (accounts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-dim);">
          Chưa có tài khoản nào. Hãy bấm "+ Thêm 1 Tài Khoản" để kết nối Tài Khoản AI Toki Plus.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = accounts.map(acc => {
    const maskedKey = acc.apiKey.slice(0, 8) + '••••••••' + acc.apiKey.slice(-4);
    const lastCheck = acc.lastChecked ? new Date(acc.lastChecked).toLocaleTimeString('vi-VN') : 'Chưa';

    return `
      <tr>
        <td style="font-weight: 600; color: #fff;">${acc.name}</td>
        <td style="font-family: monospace; color: var(--text-muted);">${maskedKey}</td>
        <td style="font-weight: 700; color: var(--cyan);">${acc.balance || 0} Coins</td>
        <td>
          <span style="color: ${acc.status === 'active' ? 'var(--green)' : 'var(--red)'}; font-weight: 600;">
            ● ${acc.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
          </span>
        </td>
        <td style="color: var(--text-dim); font-size: 12px;">${lastCheck}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="checkAccountBalance('${acc.id}')">Kiểm tra số dư</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAccount('${acc.id}')">Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

function showAddAccountModal() {
  document.getElementById('addAccountModal').style.display = 'flex';
}

function closeAddAccountModal() {
  document.getElementById('addAccountModal').style.display = 'none';
}

async function submitAddAccount() {
  const name = document.getElementById('newAccName').value.trim();
  const apiKey = document.getElementById('newAccKey').value.trim();

  if (!apiKey) {
    alert('Vui lòng nhập API Key!');
    return;
  }

  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, apiKey })
    });
    const data = await res.json();
    if (!data.ok) {
      alert('Lỗi: ' + data.error);
      return;
    }

    closeAddAccountModal();
    document.getElementById('newAccName').value = '';
    document.getElementById('newAccKey').value = '';
    loadAccounts();
  } catch (err) {
    alert('Lỗi: ' + err.message);
  }
}

async function checkAccountBalance(id) {
  try {
    const res = await fetch(`/api/accounts/${id}/check`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      alert(`Số dư hiện tại: ${data.account.balance} Coins (Carrots)`);
      loadAccounts();
    } else {
      alert('Lỗi: ' + data.error);
    }
  } catch (e) {
    alert('Lỗi kiểm tra số dư: ' + e.message);
  }
}

async function deleteAccount(id) {
  if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
  await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
  loadAccounts();
}

function setupBulkTextarea() {
  const textarea = document.getElementById('bulkAccTextarea');
  if (!textarea) return;

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.stopPropagation();
      if (!e.ctrlKey) {
        // Phím Enter hoặc Shift+Enter: Xuống dòng chuẩn xác tuyệt đối 100%
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const val = this.value;
        this.value = val.substring(0, start) + '\n' + val.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
        updateBulkLineCount();
      } else {
        // Phím Ctrl + Enter: Tự động bấm nút thêm hàng loạt
        e.preventDefault();
        submitBulkAccounts();
      }
    }
  });
}

function showAddBulkModal() {
  const modal = document.getElementById('bulkAccountModal');
  modal.style.display = 'flex';
  document.getElementById('bulkErrorBox').style.display = 'none';
  const textarea = document.getElementById('bulkAccTextarea');
  updateBulkLineCount();
  setTimeout(() => {
    textarea.focus();
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);
  }, 100);
}

function closeBulkAccountModal() {
  document.getElementById('bulkAccountModal').style.display = 'none';
}

async function pasteFromClipboard() {
  const textarea = document.getElementById('bulkAccTextarea');
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      alert('Bộ nhớ tạm (clipboard) của bạn đang trống!');
      return;
    }
    if (textarea.value.trim()) {
      textarea.value = textarea.value.trim() + '\n' + text.trim();
    } else {
      textarea.value = text.trim();
    }
    updateBulkLineCount();
    textarea.focus();
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);
  } catch (err) {
    textarea.focus();
    alert('Vui lòng nhấn tổ hợp phím Ctrl + V để dán danh sách vào ô!');
  }
}

function clearBulkTextarea() {
  const textarea = document.getElementById('bulkAccTextarea');
  textarea.value = '';
  updateBulkLineCount();
  textarea.focus();
}

function updateBulkLineCount() {
  const text = document.getElementById('bulkAccTextarea').value;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const countEl = document.getElementById('bulkLineCount');
  if (countEl) {
    countEl.textContent = `${lines.length} dòng hợp lệ`;
  }
}

async function submitBulkAccounts() {
  const text = document.getElementById('bulkAccTextarea').value;
  const errBox = document.getElementById('bulkErrorBox');
  const btn = document.getElementById('btnSubmitBulk');
  errBox.style.display = 'none';

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    errBox.textContent = 'Vui lòng dán danh sách tài khoản (mỗi dòng 1 tài khoản)!';
    errBox.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Đang thêm & kiểm tra...';

  try {
    const res = await fetch('/api/accounts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: text })
    });
    const data = await res.json();
    btn.disabled = false;
    btn.textContent = '⚡ Thêm Hàng Loạt & Kiểm Tra Số Dư';

    if (!data.ok) {
      errBox.textContent = data.error || 'Có lỗi xảy ra!';
      errBox.style.display = 'block';
      return;
    }

    alert(data.message || `Đã thêm thành công ${data.addedCount} tài khoản!`);
    closeBulkAccountModal();
    document.getElementById('bulkAccTextarea').value = '';
    updateBulkLineCount();
    loadAccounts();
    // Tự động kiểm tra cập nhật lại số dư sau 3 giây
    setTimeout(loadAccounts, 3000);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '⚡ Thêm Hàng Loạt & Kiểm Tra Số Dư';
    errBox.textContent = 'Lỗi kết nối máy chủ: ' + err.message;
    errBox.style.display = 'block';
  }
}

async function checkAllAccountsBalance() {
  const originalAccounts = await fetch('/api/accounts').then(r => r.json());
  if (!originalAccounts.accounts || originalAccounts.accounts.length === 0) {
    alert('Chưa có tài khoản nào để kiểm tra!');
    return;
  }

  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '🔄 Đang kiểm tra...';
  }

  try {
    const res = await fetch('/api/accounts/check-all', { method: 'POST' });
    const data = await res.json();
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Kiểm Tra Tất Cả';
    }
    if (data.ok) {
      loadAccounts();
      alert('Đã hoàn tất kiểm tra số dư toàn bộ tài khoản!');
    } else {
      alert('Lỗi: ' + data.error);
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Kiểm Tra Tất Cả';
    }
    alert('Lỗi kiểm tra số dư: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════
// 7. SETTINGS
// ══════════════════════════════════════════════════════
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.ok && data.settings) {
      document.getElementById('settingOutputDir').value = data.settings.outputDir || '';
      document.getElementById('settingThreadCount').value = data.settings.threadCount || 2;
      document.getElementById('batchThreadSelect').value = data.settings.threadCount || 2;
      const mSel = document.getElementById('batchModelSelect');
      if (mSel && data.settings.defaultModel) {
        mSel.value = data.settings.defaultModel;
        updateCostEstimate();
      }
      const ghInput = document.getElementById('settingGithubRepo');
      if (ghInput) ghInput.value = data.settings.githubRepo || 'trandangnhat19021999-oss/Toki-Plus';
    }
  } catch (e) { }
}

async function onBatchThreadChange(val) {
  const count = parseInt(val, 10) || 2;
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadCount: count })
    });
    const settingInput = document.getElementById('settingThreadCount');
    if (settingInput) settingInput.value = count;
  } catch (e) { }
}

async function saveAppSettings() {
  const outputDir = document.getElementById('settingOutputDir').value.trim();
  const threadCount = parseInt(document.getElementById('settingThreadCount').value, 10) || 2;
  const ghInput = document.getElementById('settingGithubRepo');
  const githubRepo = ghInput ? ghInput.value.trim() : 'trandangnhat19021999-oss/Toki-Plus';

  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputDir, threadCount, githubRepo })
    });
    alert('Đã lưu cấu hình cài đặt!');
    loadSettings();
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
}

function updateDashboardMetrics() {
  const completed = allJobs.filter(j => j.status === 'completed').length;
  const running = allJobs.filter(j => j.status === 'running' || j.status === 'pending').length;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statRunning').textContent = running;
  const totalCoins = getTotalAvailableCoins();
  const elStatCoins = document.getElementById('statTotalCoins');
  if (elStatCoins) elStatCoins.textContent = totalCoins.toLocaleString('vi-VN');
}

// ══════════════════════════════════════════════════════
// 8. TELEGRAM BOT & COMMERCIAL MANAGEMENT
// ══════════════════════════════════════════════════════
let allTgUsers = [];
let allTgOrders = [];
let allTgGiftcodes = [];

function switchTgSubtab(subtabId) {
  document.querySelectorAll('.tg-subtab-btn').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });
  const activeBtn = document.getElementById(`tgTabBtn-${subtabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('btn-secondary');
    activeBtn.classList.add('btn-primary');
  }

  document.querySelectorAll('.tg-subtab-content').forEach(content => {
    content.style.display = 'none';
  });
  const activeContent = document.getElementById(`tgSubtab-${subtabId}`);
  if (activeContent) {
    activeContent.style.display = 'block';
  }

  if (subtabId === 'packages') {
    if (allTgPackages && allTgPackages.length > 0) {
      renderTgPackagesTable(allTgPackages);
    } else {
      fetch('/api/packages').then(r => r.json()).then(d => {
        allTgPackages = d.packages || [];
        renderTgPackagesTable(allTgPackages);
      }).catch(console.error);
    }
  }
}

async function loadTelegramData() {
  try {
    // 1. Trạng thái Bot & KPI
    const resStatus = await fetch('/api/telegram/status');
    const dataStatus = await resStatus.json();

    const elStatStatus = document.getElementById('statTgStatus');
    const elStatUsers = document.getElementById('statTgUsers');
    const elStatRevenue = document.getElementById('statTgRevenue');
    const elStatPending = document.getElementById('statTgPendingOrders');

    if (dataStatus.active && dataStatus.botInfo && dataStatus.botInfo.username) {
      elStatStatus.innerHTML = `<span style="color: #10b981;">🟢 Online:</span> <a href="https://t.me/${dataStatus.botInfo.username}" target="_blank" style="color: #38bdf8; text-decoration: none;">@${dataStatus.botInfo.username}</a>`;
    } else if (dataStatus.active) {
      elStatStatus.innerHTML = `<span style="color: #10b981;">🟢 Đang chạy</span>`;
    } else {
      elStatStatus.innerHTML = `<span style="color: #ef4444;">⚪ Chưa kích hoạt</span>`;
    }

    if (dataStatus.settings) {
      const s = dataStatus.settings;
      if (document.getElementById('tgInputToken') && s.telegramBotToken) {
        document.getElementById('tgInputToken').value = s.telegramBotToken;
      }
      if (document.getElementById('tgInputAdminId') && s.adminTelegramId) {
        document.getElementById('tgInputAdminId').value = s.adminTelegramId;
      }
      if (document.getElementById('tgInputFreeCredits') && s.initialFreeCredits !== undefined) {
        document.getElementById('tgInputFreeCredits').value = s.initialFreeCredits;
      }
      if (document.getElementById('tgSelectBank') && s.bankCode) {
        document.getElementById('tgSelectBank').value = s.bankCode;
      }
      if (document.getElementById('tgInputAccountNo') && s.bankAccountNo) {
        document.getElementById('tgInputAccountNo').value = s.bankAccountNo;
      }
      if (document.getElementById('tgInputAccountName') && s.bankAccountName) {
        document.getElementById('tgInputAccountName').value = s.bankAccountName;
      }
      if (document.getElementById('tgInputSepayToken') && s.sepayApiToken) {
        document.getElementById('tgInputSepayToken').value = s.sepayApiToken;
      }

      const defaultWelcome = `✨ <b>Chào mừng bạn đến với TOKI AI MOTION STUDIO!</b> 🎬\n\n` +
        `Hệ thống AI chuyển hóa hình ảnh chân dung thành video nhảy và chuyển động mượt mà đỉnh cao.\n\n` +
        `🎁 <b>Số dư ví của bạn:</b> <code>{credits}</code> lượt tạo video\n` +
        `📊 <b>Tổng video đã tạo:</b> <code>{totalCreated}</code>\n\n` +
        `🚀 <b>CÁCH TẠO VIDEO NHANH:</b>\n` +
        `1️⃣ Gửi <b>1 tấm ảnh</b> nhân vật/chân dung\n` +
        `2️⃣ Gửi <b>1 video mẫu</b> điệu nhảy hoặc cử động\n` +
        `3️⃣ Chọn chế độ và nhận ngay video thành phẩm!\n\n` +
        `<i>Bấm các nút bên dưới để thao tác nhanh:</i>`;

      const defaultGuide = `📖 <b>HƯỚNG DẪN TẠO VIDEO ĐẸP NHẤT:</b>\n\n` +
        `📸 <b>Ảnh nhân vật:</b>\n` +
        `• Chọn ảnh chụp rõ mặt, dáng đứng thẳng hoặc nửa thân rõ nét.\n` +
        `• Tránh ảnh quá tối hoặc bị che khuất cơ thể.\n\n` +
        `💃 <b>Video mẫu động tác:</b>\n` +
        `• Chọn video mẫu vũ đạo/chuyển động quay toàn thân rõ nét.\n` +
        `• Độ dài lý tưởng từ 5 đến 30 giây.\n\n` +
        `⚡ <b>Quy định tính lượt:</b>\n` +
        `• <b>Video từ 1s - 15s:</b> Tính <b>1 lượt</b>.\n` +
        `• <b>Video từ 15s - 30s:</b> Tính <b>2 lượt</b>.\n\n` +
        `👉 <i>Bây giờ bạn hãy gửi 1 tấm ảnh hoặc 1 video vào đây để bắt đầu nhé!</i>`;

      if (document.getElementById('tgInputWelcomeText')) {
        document.getElementById('tgInputWelcomeText').value = s.botWelcomeText || defaultWelcome;
      }
      if (document.getElementById('tgInputGuideText')) {
        document.getElementById('tgInputGuideText').value = s.botGuideText || defaultGuide;
      }
    }

    // 2. Tải danh sách khách hàng
    const resUsers = await fetch('/api/users');
    const dataUsers = await resUsers.json();
    allTgUsers = dataUsers.users || [];
    renderTgUsersTable(allTgUsers);
    if (elStatUsers) elStatUsers.textContent = allTgUsers.length;

    // 3. Tải danh sách đơn hàng
    const resOrders = await fetch('/api/orders');
    const dataOrders = await resOrders.json();
    allTgOrders = dataOrders.orders || [];
    renderTgOrdersTable(allTgOrders);

    const paidOrders = allTgOrders.filter(o => o.status === 'paid');
    const totalRev = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const pendingCount = allTgOrders.filter(o => o.status === 'pending').length;

    if (elStatRevenue) elStatRevenue.textContent = totalRev.toLocaleString('vi-VN') + 'đ';
    if (elStatPending) elStatPending.textContent = pendingCount;

    // 4. Tải danh sách mã nạp
    const resCodes = await fetch('/api/giftcodes');
    const dataCodes = await resCodes.json();
    allTgGiftcodes = dataCodes.giftcodes || [];
    renderTgGiftcodesTable(allTgGiftcodes);

    // 5. Tải bảng giá các gói nạp
    const resPkgs = await fetch('/api/packages');
    const dataPkgs = await resPkgs.json();
    allTgPackages = dataPkgs.packages || [];
    renderTgPackagesTable(allTgPackages);

  } catch (err) {
    console.error('Lỗi khi tải dữ liệu Telegram:', err);
  }
}

function renderTgUsersTable(users) {
  const tbody = document.getElementById('tgUsersTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">Chưa có khách hàng nào bắt đầu chat với Bot.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const name = u.fullName || u.username || 'Khách vãng lai';
    const tgLink = u.username ? `<a href="https://t.me/${u.username}" target="_blank" style="color: #38bdf8; text-decoration: none;">@${u.username}</a>` : '';
    const paidText = (u.totalPaid || 0).toLocaleString('vi-VN') + 'đ';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px;">
          <div style="font-weight: 600; color: #fff;">${escapeHtml(name)}</div>
          ${tgLink ? `<div style="font-size: 11px;">${tgLink}</div>` : ''}
        </td>
        <td style="padding: 10px; font-family: monospace; color: var(--text-muted);">${u.id}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 13px;">
            ${u.credits || 0} lượt
          </span>
        </td>
        <td style="padding: 10px; text-align: center; font-weight: 600; color: var(--green);">${u.totalCreated || 0}</td>
        <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--amber);">${paidText}</td>
        <td style="padding: 10px; text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="adjustUserCredits('${u.id}', 'add')" title="Cộng lượt" style="padding: 3px 8px; font-size: 11px;">+ Lượt</button>
            <button class="btn btn-secondary btn-sm" onclick="adjustUserCredits('${u.id}', 'deduct')" title="Trừ lượt" style="padding: 3px 8px; font-size: 11px;">- Lượt</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterTgUsers() {
  const query = (document.getElementById('searchTgUser').value || '').trim().toLowerCase();
  if (!query) {
    renderTgUsersTable(allTgUsers);
    return;
  }
  const filtered = allTgUsers.filter(u => {
    const name = (u.fullName || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const id = String(u.id);
    return name.includes(query) || username.includes(query) || id.includes(query);
  });
  renderTgUsersTable(filtered);
}

function renderTgOrdersTable(orders) {
  const tbody = document.getElementById('tgOrdersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-dim);">Chưa có đơn nạp tiền nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const isPaid = o.status === 'paid';
    const statusBadge = isPaid
      ? `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700;">ĐÃ THANH TOÁN</span>`
      : `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700;">CHỜ DUYỆT</span>`;

    const timeStr = new Date(o.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const actionBtn = isPaid
      ? `<span style="color: var(--text-dim); font-size: 11px;">Hoàn tất</span>`
      : `<button class="btn btn-primary btn-sm" onclick="confirmOrder('${o.orderCode}')" style="padding: 3px 8px; font-size: 11px;">✓ Duyệt Nạp</button>`;

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px; font-weight: 700; color: #38bdf8; font-family: monospace;">${o.orderCode}</td>
        <td style="padding: 10px;">
          <div style="font-weight: 600; color: #fff;">${escapeHtml(o.userFullName || 'User ' + o.userId)}</div>
          <div style="font-size: 11px; color: var(--text-dim); font-family: monospace;">ID: ${o.userId}</div>
        </td>
        <td style="padding: 10px; font-weight: 700; color: var(--green);">${(o.amount || 0).toLocaleString('vi-VN')}đ</td>
        <td style="padding: 10px; text-align: center; font-weight: 700; color: #38bdf8;">+${o.credits} lượt</td>
        <td style="padding: 10px; text-align: center;">${statusBadge}</td>
        <td style="padding: 10px; color: var(--text-muted); font-size: 12px;">${timeStr}</td>
        <td style="padding: 10px; text-align: center;">${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function renderTgGiftcodesTable(codes) {
  const tbody = document.getElementById('tgGiftcodesTableBody');
  if (!tbody) return;

  if (codes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-dim);">Chưa có mã nạp nào được tạo.</td></tr>`;
    return;
  }

  tbody.innerHTML = codes.map(c => {
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px; font-weight: 700; color: #c084fc; font-family: monospace;">${c.code}</td>
        <td style="padding: 8px; text-align: center; font-weight: 700; color: #38bdf8;">+${c.credits} lượt</td>
        <td style="padding: 8px; text-align: center; color: var(--text-muted);">${c.usedCount || 0} / ${c.maxUses || 1}</td>
        <td style="padding: 8px; color: var(--text-dim); font-size: 12px;">${escapeHtml(c.note || '-')}</td>
        <td style="padding: 8px; text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="copyGiftcode('${c.code}')" style="padding: 2px 6px; font-size: 11px;">📋 Copy</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function saveTelegramSettings(silent = false) {
  const telegramBotToken = (document.getElementById('tgInputToken').value || '').trim();
  const adminTelegramId = (document.getElementById('tgInputAdminId').value || '').trim();
  const initialFreeCredits = parseInt(document.getElementById('tgInputFreeCredits').value, 10) || 2;
  const bankCode = document.getElementById('tgSelectBank').value;
  const bankAccountNo = (document.getElementById('tgInputAccountNo').value || '').trim();
  const bankAccountName = (document.getElementById('tgInputAccountName').value || '').trim().toUpperCase();
  const sepayApiToken = (document.getElementById('tgInputSepayToken').value || '').trim();

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramBotToken,
        adminTelegramId,
        initialFreeCredits,
        bankCode,
        bankAccountNo,
        bankAccountName,
        sepayApiToken
      })
    });

    const data = await res.json();
    if (data.ok) {
      const statusEl = document.getElementById('tgConfigSaveStatus');
      if (statusEl) {
        statusEl.style.display = 'inline';
        statusEl.innerText = '✅ Đã lưu cấu hình (' + bankCode + ')';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3500);
      }
      if (!silent) {
        alert('✅ Đã lưu cấu hình Bot Telegram & Ngân Hàng (' + bankCode + ') thành công!');
      }
    } else {
      if (!silent) alert('❌ Lỗi: ' + (data.error || 'Không lưu được'));
    }
  } catch (err) {
    if (!silent) alert('❌ Lỗi kết nối: ' + err.message);
  }
}

async function restartTelegramBot() {
  try {
    const res = await fetch('/api/telegram/restart', { method: 'POST' });
    const data = await res.json();
    if (data.ok && data.active) {
      alert('✅ Đã khởi động lại Telegram Bot thành công!');
    } else {
      alert('⚠️ Bot chưa khởi động được. Hãy kiểm tra lại Bot Token trong phần cấu hình.');
    }
    loadTelegramData();
  } catch (err) {
    alert('❌ Lỗi: ' + err.message);
  }
}

async function adjustUserCredits(userId, action) {
  const actionName = action === 'add' ? 'CỘNG' : 'TRỪ';
  const amountStr = prompt(`Nhập số lượt muốn ${actionName} cho User ID: ${userId}:`, '10');
  if (!amountStr) return;

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) return alert('Số lượt phải là số nguyên dương!');

  try {
    const res = await fetch(`/api/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, action })
    });
    const data = await res.json();
    if (data.ok) {
      alert(`✅ Đã ${actionName.toLowerCase()} ${amount} lượt cho user ${userId}!`);
      loadTelegramData();
    }
  } catch (err) {
    alert('❌ Lỗi: ' + err.message);
  }
}

async function confirmOrder(orderCode) {
  if (!confirm(`Xác nhận đã nhận được tiền và duyệt nạp cho đơn hàng ${orderCode}?`)) return;

  try {
    const res = await fetch(`/api/orders/${orderCode}/confirm`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      alert(`✅ Đã duyệt nạp thành công cho đơn ${orderCode}! Hệ thống đã tự động gửi thông báo cho khách qua Telegram.`);
      loadTelegramData();
    } else {
      alert('❌ Lỗi: ' + (data.error || 'Không thể duyệt'));
    }
  } catch (err) {
    alert('❌ Lỗi: ' + err.message);
  }
}

async function submitCreateGiftcode() {
  const code = (document.getElementById('giftcodeInputCode').value || '').trim();
  const credits = parseInt(document.getElementById('giftcodeInputCredits').value, 10) || 10;
  const maxUses = parseInt(document.getElementById('giftcodeInputMaxUses').value, 10) || 1;
  const note = (document.getElementById('giftcodeInputNote').value || '').trim();

  try {
    const res = await fetch('/api/giftcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, credits, maxUses, note })
    });
    const data = await res.json();
    if (data.ok) {
      alert(`🎁 Đã tạo mã Giftcode: ${data.giftcode.code} (+${credits} lượt)`);
      document.getElementById('giftcodeInputCode').value = '';
      loadTelegramData();
    }
  } catch (err) {
    alert('❌ Lỗi: ' + err.message);
  }
}

function copyGiftcode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert(`📋 Đã copy mã: ${code}\nKhách hàng chỉ cần gửi lệnh /code ${code} vào Bot để nhận lượt!`);
  });
}

// --- QUẢN LÝ BẢNG GIÁ GÓI NẠP (PACKAGES) ---
let allTgPackages = [];

function renderTgPackagesTable(packages) {
  const tbody = document.getElementById('tgPackagesTableBody');
  if (!tbody) return;

  if (!packages || packages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-dim);">Chưa có gói nào. Bấm "+ Thêm Gói Mới" bên trên để tạo.</td></tr>`;
    return;
  }

  tbody.innerHTML = packages.map((p, idx) => {
    return `
      <tr style="border-bottom: 1px solid var(--border);" data-pkg-idx="${idx}">
        <td style="padding: 8px;">
          <input type="text" class="form-input pkg-id" value="${escapeHtml(p.id)}" style="font-family: monospace; font-size: 12px;">
        </td>
        <td style="padding: 8px;">
          <input type="text" class="form-input pkg-name" value="${escapeHtml(p.name)}" placeholder="Tên hiển thị gói">
        </td>
        <td style="padding: 8px;">
          <input type="number" class="form-input pkg-price" value="${p.price}" step="1000" min="1000" style="font-weight: 700; color: var(--green);">
        </td>
        <td style="padding: 8px; text-align: center;">
          <input type="number" class="form-input pkg-credits" value="${p.credits}" min="1" style="text-align: center; font-weight: 700; color: #38bdf8;">
        </td>
        <td style="padding: 8px; text-align: center;">
          <input type="checkbox" class="pkg-popular" ${p.popular ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;">
        </td>
        <td style="padding: 8px; text-align: center;">
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="deletePackageRow(${idx})" style="padding: 3px 8px; font-size: 11px;">✕ Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

function addNewPackageRow() {
  const newId = 'pkg_' + Date.now().toString(36).slice(-4);
  allTgPackages.push({
    id: newId,
    name: 'Gói Mới',
    price: 50000,
    credits: 20,
    popular: false
  });
  renderTgPackagesTable(allTgPackages);
}

function deletePackageRow(idx) {
  if (!confirm('Bạn có chắc muốn xóa gói này?')) return;
  allTgPackages.splice(idx, 1);
  renderTgPackagesTable(allTgPackages);
}

async function saveAllPackages() {
  const rows = document.querySelectorAll('#tgPackagesTableBody tr[data-pkg-idx]');
  const packagesToSave = [];

  rows.forEach(row => {
    const id = (row.querySelector('.pkg-id').value || '').trim();
    const name = (row.querySelector('.pkg-name').value || '').trim();
    const price = parseInt(row.querySelector('.pkg-price').value, 10) || 0;
    const credits = parseInt(row.querySelector('.pkg-credits').value, 10) || 1;
    const popular = row.querySelector('.pkg-popular').checked;

    if (id && name && price > 0) {
      packagesToSave.push({ id, name, price, credits, popular });
    }
  });

  if (packagesToSave.length === 0) {
    return alert('Cần có ít nhất 1 gói hợp lệ (có tên và giá tiền)!');
  }

  try {
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packages: packagesToSave })
    });
    const data = await res.json();
    if (data.ok) {
      alert('🎉 Đã lưu bảng giá thành công! Khách hàng trên Telegram sẽ thấy ngay giá mới.');
      allTgPackages = data.packages;
      renderTgPackagesTable(allTgPackages);
    } else {
      alert('❌ Lỗi: ' + (data.error || 'Không thể lưu'));
    }
  } catch (err) {
    alert('❌ Lỗi kết nối: ' + err.message);
  }
}

// --- QUẢN LÝ LỜI CHÀO & HƯỚNG DẪN (BOT TEXTS) ---
function resetDefaultWelcomeText() {
  const defaultWelcome = `✨ <b>Chào mừng bạn đến với TOKI AI MOTION STUDIO!</b> 🎬\n\n` +
    `Hệ thống AI chuyển hóa hình ảnh chân dung thành video nhảy và chuyển động mượt mà đỉnh cao.\n\n` +
    `🎁 <b>Số dư ví của bạn:</b> <code>{credits}</code> lượt tạo video\n` +
    `📊 <b>Tổng video đã tạo:</b> <code>{totalCreated}</code>\n\n` +
    `🚀 <b>CÁCH TẠO VIDEO NHANH:</b>\n` +
    `1️⃣ Gửi <b>1 tấm ảnh</b> nhân vật/chân dung\n` +
    `2️⃣ Gửi <b>1 video mẫu</b> điệu nhảy hoặc cử động\n` +
    `3️⃣ Chọn chế độ và nhận ngay video thành phẩm!\n\n` +
    `<i>Bấm các nút bên dưới để thao tác nhanh:</i>`;
  document.getElementById('tgInputWelcomeText').value = defaultWelcome;
}

function resetDefaultGuideText() {
  const defaultGuide = `📖 <b>HƯỚNG DẪN TẠO VIDEO ĐẸP NHẤT:</b>\n\n` +
    `📸 <b>Ảnh nhân vật:</b>\n` +
    `• Chọn ảnh chụp rõ mặt, dáng đứng thẳng hoặc nửa thân rõ nét.\n` +
    `• Tránh ảnh quá tối hoặc bị che khuất cơ thể.\n\n` +
    `💃 <b>Video mẫu động tác:</b>\n` +
    `• Chọn video mẫu vũ đạo/chuyển động quay toàn thân rõ nét.\n` +
    `• Độ dài lý tưởng từ 5 đến 15 giây.\n\n` +
    `⚡ <b>Chế độ:</b>\n` +
    `• <b>Tiêu chuẩn (1 lượt):</b> Phù hợp video thông thường, xử lý nhanh.\n` +
    `• <b>Nâng cao (2 lượt):</b> Giữ nguyên nét khuôn mặt, khớp chuyển động chuẩn xác.\n\n` +
    `👉 <i>Bây giờ bạn hãy gửi 1 tấm ảnh hoặc 1 video vào đây để bắt đầu nhé!</i>`;
  document.getElementById('tgInputGuideText').value = defaultGuide;
}

async function saveBotTexts() {
  const botWelcomeText = (document.getElementById('tgInputWelcomeText').value || '').trim();
  const botGuideText = (document.getElementById('tgInputGuideText').value || '').trim();

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botWelcomeText, botGuideText })
    });
    const data = await res.json();
    if (data.ok) {
      alert('🎉 Đã lưu nội dung Lời Chào và Hướng Dẫn thành công!\nKhách gõ /start hoặc bấm Hướng Dẫn trên Telegram sẽ thấy ngay nội dung mới.');
    } else {
      alert('❌ Lỗi: ' + (data.error || 'Không thể lưu'));
    }
  } catch (err) {
    alert('❌ Lỗi kết nối: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════
// 8. AUTO-UPDATE NOTIFICATION & GITHUB RELEASE
// ══════════════════════════════════════════════════════
let latestUpdateInfo = null;

async function checkAppUpdate(isManual = false) {
  const resultBox = document.getElementById('settingsUpdateResult');
  const ghInput = document.getElementById('settingGithubRepo');
  const customRepo = ghInput ? ghInput.value.trim() : '';

  if (isManual && resultBox) {
    resultBox.style.display = 'block';
    resultBox.style.background = 'rgba(56, 189, 248, 0.1)';
    resultBox.style.color = '#38bdf8';
    resultBox.style.border = '1px solid rgba(56, 189, 248, 0.3)';
    resultBox.textContent = '⏳ Đang kiểm tra bản phát hành mới trên GitHub...';
  }

  let data = null;
  let errorMsg = null;

  try {
    const url = customRepo ? `/api/update/check?repo=${encodeURIComponent(customRepo)}` : '/api/update/check';
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      data = await res.json();
    } else if (!res.ok) {
      errorMsg = `HTTP ${res.status}`;
    }
  } catch (err) {
    errorMsg = err.message;
  }

  // Dự phòng an toàn: Nếu server nội bộ chưa nạp kịp hoặc trả về lỗi, gọi thẳng GitHub API công khai
  if (!data || !data.ok) {
    try {
      const repo = (customRepo || 'trandangnhat19021999-oss/Toki-Plus').replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
      const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (ghRes.ok) {
        const release = await ghRes.json();
        const tagVer = (release.tag_name || release.name || '').replace(/^[^\d]*/, '').trim();
        const curVer = '26.7.1';
        const zipAsset = (release.assets || []).find(a => a.name && a.name.endsWith('.zip'));

        const cmpSemver = (v1, v2) => {
          const p1 = (v1 || '').replace(/^[^\d]*/, '').split('.').map(Number);
          const p2 = (v2 || '').replace(/^[^\d]*/, '').split('.').map(Number);
          for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            if ((p1[i] || 0) > (p2[i] || 0)) return 1;
            if ((p1[i] || 0) < (p2[i] || 0)) return -1;
          }
          return 0;
        };

        data = {
          ok: true,
          hasUpdate: cmpSemver(tagVer, curVer) > 0,
          currentVersion: curVer,
          latestVersion: tagVer,
          title: release.name || `Bản cập nhật v${tagVer}`,
          releaseDate: (release.published_at || '').slice(0, 10),
          downloadUrl: (zipAsset && zipAsset.browser_download_url) || release.html_url || `https://github.com/${repo}/releases/latest`,
          changelog: release.body || 'Bản phát hành mới trên GitHub.',
          repo: repo
        };
      }
    } catch (fallbackErr) {
      console.warn('Fallback GitHub check failed:', fallbackErr);
    }
  }

  try {
    if (!data || !data.ok) {
      if (isManual && resultBox) {
        resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
        resultBox.style.color = '#f87171';
        resultBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        resultBox.textContent = `❌ ${data && data.error ? data.error : (errorMsg ? 'Lỗi kết nối: ' + errorMsg : 'Không thể kết nối đến GitHub để kiểm tra')}`;
      }
      return;
    }

    latestUpdateInfo = data;

    // Cập nhật text phiên bản hiện tại ở Cài Đặt
    const curVerEl = document.getElementById('settingsCurrentVersion');
    if (curVerEl) curVerEl.textContent = `Phiên bản: v${data.currentVersion}`;

    if (data.hasUpdate) {
      // Hiện badge trên thanh tiêu đề
      const headerBadge = document.getElementById('headerNewUpdateBadge');
      if (headerBadge) {
        headerBadge.style.display = 'inline-flex';
        headerBadge.textContent = `🚀 Bản mới: v${data.latestVersion}`;
      }

      // Hiện banner thông báo trên cùng
      const banner = document.getElementById('updateBanner');
      const bannerVer = document.getElementById('updateBannerVersion');
      const bannerDesc = document.getElementById('updateBannerDesc');
      if (banner && bannerVer) {
        bannerVer.textContent = `v${data.latestVersion}`;
        if (bannerDesc && data.title) {
          bannerDesc.textContent = `${data.title} • Cập nhật để tối ưu kết nối và tính năng mới nhất.`;
        }
        banner.style.display = 'flex';
      }

      // Tự động bung bảng Pop-up chi tiết cho khách lần đầu phát hiện bản mới
      const lastNotified = localStorage.getItem('toki_notified_update_version');
      if (lastNotified !== data.latestVersion) {
        localStorage.setItem('toki_notified_update_version', data.latestVersion);
        showUpdateModal();
      }

      if (isManual) {
        if (resultBox) {
          resultBox.style.background = 'rgba(34, 197, 94, 0.1)';
          resultBox.style.color = '#4ade80';
          resultBox.style.border = '1px solid rgba(34, 197, 94, 0.3)';
          resultBox.innerHTML = `🎉 <strong>Đã có phiên bản mới: v${data.latestVersion}!</strong> <a href="javascript:void(0)" onclick="showUpdateModal()" style="color: #38bdf8; text-decoration: underline; margin-left: 8px;">Xem chi tiết & Tải về</a>`;
        }
        showUpdateModal();
      }
    } else {
      if (isManual && resultBox) {
        resultBox.style.background = 'rgba(34, 197, 94, 0.1)';
        resultBox.style.color = '#4ade80';
        resultBox.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        resultBox.textContent = `✅ Bạn đang sử dụng phiên bản mới nhất (v${data.currentVersion}).`;
      }
    }
  } catch (err) {
    if (isManual && resultBox) {
      resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
      resultBox.style.color = '#f87171';
      resultBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      resultBox.textContent = `❌ Lỗi kiểm tra cập nhật: ${err.message}`;
    }
  }
}

function showUpdateModal() {
  if (!latestUpdateInfo) {
    checkAppUpdate(true);
    return;
  }

  const curVer = document.getElementById('updateModalCurrentVer');
  const latVer = document.getElementById('updateModalLatestVer');
  const dateEl = document.getElementById('updateModalDate');
  const changelogEl = document.getElementById('updateModalChangelog');
  const subTitle = document.getElementById('updateModalSubtitle');

  if (curVer) curVer.textContent = `v${latestUpdateInfo.currentVersion || '---'}`;
  if (latVer) latVer.textContent = `v${latestUpdateInfo.latestVersion || '---'}`;
  if (dateEl) dateEl.textContent = latestUpdateInfo.releaseDate || 'Vừa phát hành';
  if (changelogEl) changelogEl.textContent = latestUpdateInfo.changelog || 'Không có mô tả chi tiết.';
  if (subTitle && latestUpdateInfo.title) subTitle.textContent = latestUpdateInfo.title;

  const modal = document.getElementById('updateModal');
  if (modal) modal.style.display = 'flex';
}

function closeUpdateModal() {
  const modal = document.getElementById('updateModal');
  if (modal) modal.style.display = 'none';
}

function dismissUpdateBanner() {
  const banner = document.getElementById('updateBanner');
  if (banner) banner.style.display = 'none';
}

async function downloadUpdatePackage() {
  const url = latestUpdateInfo?.downloadUrl;
  if (!url) {
    alert('Không tìm thấy đường link tải về!');
    return;
  }

  try {
    await fetch('/api/update/open-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  } catch (e) {
    window.open(url, '_blank');
  }
}

async function openLatestReleaseGithub() {
  const ghInput = document.getElementById('settingGithubRepo');
  const repo = (ghInput ? ghInput.value.trim() : '') || 'trandangnhat19021999-oss/Toki-Plus';
  const url = `https://github.com/${repo}/releases/latest`;

  try {
    await fetch('/api/update/open-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  } catch (e) {
    window.open(url, '_blank');
  }
}

// Tự động kiểm tra bản cập nhật mới sau khi mở app 3 giây, và lặp lại mỗi 30 phút
setTimeout(() => {
  checkAppUpdate(false);
}, 3000);

setInterval(() => {
  checkAppUpdate(false);
}, 30 * 60 * 1000);

// ══════════════════════════════════════════════════════
// 9. CACHE & UPLOADS MANAGEMENT
// ══════════════════════════════════════════════════════
async function checkCacheInfo() {
  const badge = document.getElementById('cacheSizeBadge');
  const resBox = document.getElementById('cacheCleanResult');
  if (badge) badge.textContent = '⏳ Đang tính...';

  try {
    const res = await fetch('/api/cache-info');
    const data = await res.json();
    if (data.ok) {
      if (badge) badge.textContent = `${data.sizeMb} MB (${data.count} file)`;
      if (resBox) {
        resBox.style.display = 'block';
        resBox.textContent = `Hiện có ${data.count} file tạm trong thư mục uploads/ (Tổng dung lượng: ${data.sizeMb} MB).`;
      }
    }
  } catch (e) {
    if (badge) badge.textContent = 'Lỗi kiểm tra';
  }
}

async function triggerCleanCache() {
  if (!confirm('Bạn có chắc chắn muốn dọn dẹp các file ảnh/video tạm đã tải lên để giải phóng ổ đĩa?\n\nLưu ý: Các video thành phẩm đã xuất trong thư mục Video sẽ được giữ an toàn 100%.')) {
    return;
  }

  const badge = document.getElementById('cacheSizeBadge');
  const resBox = document.getElementById('cacheCleanResult');
  if (badge) badge.textContent = '⏳ Đang dọn...';

  try {
    const res = await fetch('/api/clean-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: 0 })
    });
    const data = await res.json();
    if (data.ok) {
      alert(`🎉 Đã dọn dẹp thành công!\nĐã xóa: ${data.removedCount} file tạm.\nGiải phóng: ${data.freedMb} MB ổ cứng.`);
      await checkCacheInfo();
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể dọn dẹp'));
    }
  } catch (err) {
    alert('Lỗi kết nối: ' + err.message);
  }
}



