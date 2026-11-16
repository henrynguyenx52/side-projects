const fs = require('fs');
const path = require('path');
const store = require('../data/store');

const VERSION_FILE = path.join(__dirname, '..', '..', 'version.json');

function getLocalVersionInfo() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch (e) {}

  return {
    version: '26.7.1',
    name: 'TOKI PLUS - AI Dance & Motion Studio',
    releaseDate: '2026-09-13',
    githubRepo: 'trandangnhat19021999-oss/Toki-Plus',
    downloadUrl: 'https://github.com/trandangnhat19021999-oss/Toki-Plus/releases/latest',
    changelog: 'Phiên bản TOKI PLUS ổn định'
  };
}

/**
 * So sánh 2 chuỗi version semver (ví dụ '26.8.0' vs '26.7.0')
 * Trả về:
 *  1: v1 > v2
 * -1: v1 < v2
 *  0: v1 == v2
 */
function compareSemver(v1, v2) {
  const clean = v => (v || '').replace(/^[^\d]*/, '').trim();
  const p1 = clean(v1).split('.').map(n => parseInt(n, 10) || 0);
  const p2 = clean(v2).split('.').map(n => parseInt(n, 10) || 0);

  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Kiểm tra cập nhật từ GitHub
 * @param {string} [customRepo] - Tùy chọn repo dạng 'owner/repo'
 */
async function checkForUpdate(customRepo) {
  const localInfo = getLocalVersionInfo();
  const settings = store.getSettings();

  // Ưu tiên: customRepo > settings.githubRepo > localInfo.githubRepo
  const repo = (customRepo || settings.githubRepo || localInfo.githubRepo || '').trim();

  if (!repo || !repo.includes('/')) {
    return {
      ok: false,
      error: 'Chưa cấu hình đường dẫn GitHub Repository (ví dụ: your-username/toki-plus)',
      currentVersion: localInfo.version
    };
  }

  const cleanRepo = repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');

  let remoteData = null;
  let fetchError = null;

  // Cách 1: Tải version.json raw từ nhánh main (nhanh, không bị rate-limit GitHub API)
  const rawUrl = `https://raw.githubusercontent.com/${cleanRepo}/main/version.json?_t=${Date.now()}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TOKI-PLUS-Updater' }
    });
    clearTimeout(timer);

    if (res.ok) {
      remoteData = await res.json();
    }
  } catch (err) {
    fetchError = err;
  }

  // Cách 2: Nếu raw không được, kiểm tra qua GitHub Releases API
  if (!remoteData || !remoteData.version) {
    const apiUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TOKI-PLUS-Updater',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const release = await res.json();
        const tagVer = (release.tag_name || release.name || '').replace(/^[^\d]*/, '').trim();
        const zipAsset = (release.assets || []).find(a => a.name.endsWith('.zip'));

        remoteData = {
          version: tagVer,
          title: release.name || `Bản phát hành ${release.tag_name}`,
          releaseDate: (release.published_at || '').slice(0, 10),
          downloadUrl: (zipAsset && zipAsset.browser_download_url) || release.html_url || `https://github.com/${cleanRepo}/releases/latest`,
          changelog: release.body || 'Không có mô tả chi tiết.'
        };
      }
    } catch (err) {
      if (!fetchError) fetchError = err;
    }
  }

  if (!remoteData || !remoteData.version) {
    return {
      ok: false,
      error: `Không thể kiểm tra cập nhật từ GitHub (${cleanRepo}): ${fetchError ? fetchError.message : 'Không tìm thấy dữ liệu'}`,
      currentVersion: localInfo.version,
      repo: cleanRepo
    };
  }

  const hasUpdate = compareSemver(remoteData.version, localInfo.version) > 0;

  return {
    ok: true,
    hasUpdate,
    currentVersion: localInfo.version,
    latestVersion: remoteData.version,
    title: remoteData.title || `Bản cập nhật v${remoteData.version}`,
    releaseDate: remoteData.releaseDate || '',
    downloadUrl: remoteData.downloadUrl || `https://github.com/${cleanRepo}/releases/latest`,
    changelog: remoteData.changelog || '',
    isMandatory: Boolean(remoteData.isMandatory),
    repo: cleanRepo
  };
}

module.exports = {
  getLocalVersionInfo,
  compareSemver,
  checkForUpdate
};
