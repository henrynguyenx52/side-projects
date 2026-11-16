const fs = require('fs');
const path = require('path');

let resolvedDataDir = null;

/**
 * Lấy thư mục lưu trữ dữ liệu người dùng (license, accounts, jobs, settings).
 * - Trên máy khách (bản đóng gói Desktop .exe): Lưu tại Windows AppData (%APPDATA%/TOKI-PLUS/data)
 *   để khách cập nhật bao nhiêu lần cũng KHÔNG BAO GIỜ bị mất bản quyền hay tài khoản AI.
 * - Trên máy Admin (phát triển local): Lưu tại thư mục project /data.
 */
function getDataDir() {
  if (resolvedDataDir) return resolvedDataDir;

  // 1. Kiểm tra nếu đang chạy trong Electron Desktop App của khách
  if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
    const appData = process.env.APPDATA || (process.platform === 'darwin'
      ? path.join(process.env.HOME, 'Library', 'Application Support')
      : path.join(process.env.HOME, '.config'));

    const persistentDir = path.join(appData, 'TOKI-PLUS', 'data');
    if (!fs.existsSync(persistentDir)) {
      fs.mkdirSync(persistentDir, { recursive: true });
    }

    // Tự động tìm kiếm và khôi phục dữ liệu từ bản cũ sang AppData
    migrateFromLegacy(persistentDir);

    resolvedDataDir = persistentDir;
    return resolvedDataDir;
  }

  // 2. Môi trường phát triển của Admin
  const devDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(devDir)) {
    fs.mkdirSync(devDir, { recursive: true });
  }
  resolvedDataDir = devDir;
  return resolvedDataDir;
}

function migrateFromLegacy(persistentDir) {
  try {
    const candidateDirs = [];

    // 1. Thư mục data cạnh file .exe (Bản đóng gói cũ của khách)
    if (process.resourcesPath) {
      const exeDir = path.resolve(process.resourcesPath, '..');
      candidateDirs.push(path.join(exeDir, 'data'));

      // 2. Các thư mục cạnh thư mục exe hiện tại (ví dụ: bản cũ nằm cùng ổ đĩa hoặc cùng thư mục cha)
      try {
        const parentDir = path.resolve(exeDir, '..');
        if (fs.existsSync(parentDir)) {
          for (const item of fs.readdirSync(parentDir)) {
            const full = path.join(parentDir, item);
            if (full !== exeDir) {
              candidateDirs.push(path.join(full, 'data'));
              candidateDirs.push(path.join(full, 'resources', 'app', 'data'));
            }
          }
        }
      } catch (e) {}
    }

    // 3. Các thư mục thông dụng của người dùng (Desktop, Downloads)
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    if (userProfile) {
      const commonPlaces = [
        path.join(userProfile, 'Desktop'),
        path.join(userProfile, 'Downloads')
      ];
      for (const place of commonPlaces) {
        try {
          if (fs.existsSync(place)) {
            for (const item of fs.readdirSync(place)) {
              if (/toki/i.test(item)) {
                const full = path.join(place, item);
                candidateDirs.push(path.join(full, 'data'));
                candidateDirs.push(path.join(full, 'resources', 'app', 'data'));
              }
            }
          }
        } catch (e) {}
      }
    }

    // Quét các thư mục tiềm năng, khôi phục dữ liệu nếu tìm thấy file cũ
    for (const legacyDir of candidateDirs) {
      try {
        if (!fs.existsSync(legacyDir)) continue;
        const files = fs.readdirSync(legacyDir);
        for (const file of files) {
          const src = path.join(legacyDir, file);
          const dest = path.join(persistentDir, file);
          if (fs.existsSync(src) && fs.statSync(src).isFile()) {
            const stat = fs.statSync(src);
            // Chỉ migrate nếu file nguồn có dữ liệu và file đích chưa có
            if (stat.size > 10 && (!fs.existsSync(dest) || fs.statSync(dest).size <= 10)) {
              const content = fs.readFileSync(src, 'utf8').trim();
              if (content !== '[]' && content !== '{}') {
                fs.copyFileSync(src, dest);
                console.log(`[AutoMigration] Đã tự động khôi phục ${file} từ ${legacyDir} sang AppData.`);
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[AutoMigration] Lỗi tổng quát:', err.message);
  }
}

module.exports = { getDataDir };
