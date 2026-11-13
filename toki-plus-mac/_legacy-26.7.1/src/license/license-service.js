const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getHardwareId } = require('./hardware');
const { getDataDir } = require('../data/paths');

const LICENSE_FILE = path.join(getDataDir(), 'license.json');
const PUBLIC_KEY_FILE = path.join(__dirname, 'public_key.pem');
const ADMIN_PRIVATE_KEY_FILE = path.join(__dirname, 'admin_private_key.pem');

// Ensure data folder exists
const dataDir = getDataDir();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getPublicKey() {
  if (fs.existsSync(PUBLIC_KEY_FILE)) {
    return fs.readFileSync(PUBLIC_KEY_FILE, 'utf8');
  }
  throw new Error('Public key not found!');
}

function getAdminPrivateKey() {
  if (fs.existsSync(ADMIN_PRIVATE_KEY_FILE)) {
    return fs.readFileSync(ADMIN_PRIVATE_KEY_FILE, 'utf8');
  }
  throw new Error('Admin private key not found! Only the admin can generate license keys.');
}

const KEY_SECRET_SALT = 'TOKI_PLUS_SECURE_KEYGEN_SALT_2026_@v26';

function computeKeyChecksum(payload) {
  return crypto.createHmac('sha256', KEY_SECRET_SALT)
    .update(payload.toUpperCase().trim())
    .digest('hex')
    .slice(0, 4)
    .toUpperCase();
}

function isLegacyIssuedKey(keyString) {
  const upper = (keyString || '').trim().toUpperCase();
  // 1. Kiểm tra trong data/issued_keys.json nếu có
  try {
    const issuedFile = path.join(__dirname, '..', '..', 'data', 'issued_keys.json');
    if (fs.existsSync(issuedFile)) {
      const list = JSON.parse(fs.readFileSync(issuedFile, 'utf8'));
      if (Array.isArray(list) && list.some(item => (item.key || '').toUpperCase() === upper)) {
        return true;
      }
    }
  } catch (e) {}

  // 2. Kiểm tra trong saved_keys.json
  try {
    const saved = getSavedKeys();
    if (Array.isArray(saved) && saved.some(item => (item.key || '').toUpperCase() === upper)) {
      return true;
    }
  } catch (e) {}

  return false;
}

/**
 * Generate a new license key (Admin only)
 * Format ngắn gọn có checksum bảo mật: TOKI-HW-EC3B-36CE-AD8C-30DAY-K7A9 hoặc TOKI-ANY-xxxx-yyyy-zzzz-30DAY-A1B2
 * @param {Object} options
 * @param {string} options.customer - Customer name/note
 * @param {string} [options.machineId] - If provided, locked to this machine. If 'ANY' or empty, works anywhere.
 * @param {number} options.days - Number of days valid (0 for lifetime)
 * @param {string} [options.plan='TOKI PLUS VIP'] - Plan tier
 */
function generateLicenseKey({ customer = 'Khách hàng', machineId = '', days = 30, plan = 'TOKI PLUS VIP' }) {
  const daysNum = parseInt(days, 10);
  const durationTag = (daysNum === 0) ? 'LIFETIME' : `${daysNum}DAY`;

  let key = '';
  const mid = (machineId && machineId.trim() !== '' && machineId.trim().toUpperCase() !== 'ANY')
    ? machineId.trim().toUpperCase()
    : '';

  if (mid) {
    const cleanMid = mid.replace(/^HW-/, '');
    const chunks = cleanMid.split('-').filter(Boolean);
    // Lấy 3 block đầu (ví dụ: EC3B-36CE-AD8C)
    const midPart = chunks.slice(0, 3).join('-');
    const payload = `HW-${midPart}-${durationTag}`;
    const sig = computeKeyChecksum(payload);
    key = `TOKI-${payload}-${sig}`;
  } else {
    // Tạo 3 block ngẫu nhiên độc nhất
    const rnd = crypto.randomBytes(6).toString('hex').toUpperCase();
    const c1 = rnd.slice(0, 4);
    const c2 = rnd.slice(4, 8);
    const c3 = rnd.slice(8, 12);
    const payload = `ANY-${c1}-${c2}-${c3}-${durationTag}`;
    const sig = computeKeyChecksum(payload);
    key = `TOKI-${payload}-${sig}`;
  }

  const createdAt = Date.now();
  const expiresAt = (daysNum === 0) ? 0 : createdAt + daysNum * 24 * 60 * 60 * 1000;

  return {
    key: key,
    customer,
    machineId: mid || 'ANY (Mọi máy)',
    plan,
    expiresAt,
    days: daysNum === 0 ? 'Lifetime (Vĩnh viễn)' : `${daysNum} ngày`
  };
}

/**
 * Verify a license key (Hỗ trợ định dạng có Checksum, định dạng cũ Ed25519, và key legacy đã cấp)
 * @param {string} keyString
 * @param {string} [currentMachineId]
 * @param {Object} [storedLicenseData]
 */
function verifyLicenseKey(keyString, currentMachineId = null, storedLicenseData = null) {
  if (!keyString || typeof keyString !== 'string') {
    return { valid: false, error: 'Chưa nhập License Key!' };
  }

  const trimmed = keyString.trim();

  // 1. Kiểm tra định dạng cũ có dấu chấm (Ed25519)
  if (trimmed.includes('.')) {
    const clean = trimmed.replace(/^(TOKI|TK|DK)-/i, '');
    const parts = clean.split('.');
    if (parts.length === 2) {
      try {
        const [payloadB64, sigB64] = parts;
        const pubPem = getPublicKey();
        const publicKey = crypto.createPublicKey(pubPem);
        const isValidSignature = crypto.verify(
          null,
          Buffer.from(payloadB64, 'utf8'),
          publicKey,
          Buffer.from(sigB64, 'base64url')
        );

        if (isValidSignature) {
          const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
          const payload = JSON.parse(payloadJson);
          const now = Date.now();
          if (payload.exp !== 0 && payload.exp < now) {
            const expiredDate = new Date(payload.exp).toLocaleString('vi-VN');
            return { valid: false, error: `License đã hết hạn vào ngày ${expiredDate}!`, payload };
          }
          const machine = (currentMachineId || getHardwareId()).toUpperCase();
          if (payload.mid && payload.mid !== 'ANY' && payload.mid !== machine) {
            return {
              valid: false,
              error: `License này được cấp cho máy khác (${payload.mid}), máy hiện tại là (${machine})!`,
              payload
            };
          }
          const daysLeft = payload.exp === 0 ? 'Vĩnh viễn' : Math.max(0, Math.ceil((payload.exp - now) / (1000 * 60 * 60 * 24)));
          return {
            valid: true,
            customer: payload.sub,
            machineId: payload.mid,
            plan: payload.plan,
            expiresAt: payload.exp,
            daysLeft,
            payload
          };
        }
      } catch (e) { }
    }
  }

  // 2. Định dạng ngắn gọn: TOKI-HW-... hoặc TOKI-ANY-...
  const upperKey = trimmed.toUpperCase();
  const durationMatch = upperKey.match(/(?:-|^)(\d+DAY|LIFETIME)(?:-|$)/i);
  if (!durationMatch) {
    return { valid: false, error: 'Định dạng License Key không hợp lệ! (Ví dụ đúng: TOKI-HW-EC3B-36CE-AD8C-30DAY-xxxx)' };
  }

  const durationStr = durationMatch[1];
  const days = durationStr === 'LIFETIME' ? 0 : parseInt(durationStr.replace('DAY', ''), 10);

  // Kiểm tra Checksum bảo mật chống tự chế key
  const cleanKey = upperKey.replace(/^TOKI-/, '');
  const lastDashIdx = cleanKey.lastIndexOf('-');
  const possibleSig = (lastDashIdx !== -1) ? cleanKey.slice(lastDashIdx + 1) : '';
  const isChecksumKey = possibleSig.length === 4 && !possibleSig.includes('DAY') && possibleSig !== 'TIME';

  if (isChecksumKey) {
    const payload = cleanKey.slice(0, lastDashIdx);
    const expectedSig = computeKeyChecksum(payload);
    if (possibleSig !== expectedSig) {
      return { valid: false, error: 'Mã License Key không hợp lệ hoặc đã bị chỉnh sửa (Mã xác thực không đúng)!' };
    }
  } else {
    // Key không có Checksum (Legacy): Chỉ chấp nhận nếu đã lưu hợp lệ hoặc đã nằm trong danh sách đã cấp của Admin
    const isAlreadySaved = storedLicenseData && (
      (storedLicenseData.licenseKey && storedLicenseData.licenseKey.trim().toUpperCase() === upperKey) ||
      (storedLicenseData.info && storedLicenseData.info.key && storedLicenseData.info.key.trim().toUpperCase() === upperKey)
    );
    const isIssued = isLegacyIssuedKey(upperKey);

    if (!isAlreadySaved && !isIssued) {
      return {
        valid: false,
        error: 'Mã License Key không hợp lệ! Vui lòng liên hệ Admin để nhận License Key chính hãng có mã xác thực.'
      };
    }
  }

  // Kiểm tra khóa theo phần cứng
  if (upperKey.includes('HW-')) {
    const hwMatch = upperKey.match(/HW-([A-Z0-9]+(?:-[A-Z0-9]+)*?)(?:-\d+DAY|-LIFETIME)/i);
    const keyHw = hwMatch ? hwMatch[1] : '';
    const currentMachine = (currentMachineId || getHardwareId()).toUpperCase();
    const currentClean = currentMachine.replace(/^HW-/, '');

    if (keyHw && !currentClean.includes(keyHw) && !currentMachine.includes(keyHw)) {
      return {
        valid: false,
        error: `License này được cấp cho máy khác (${keyHw}), máy hiện tại là (${currentMachine})!`
      };
    }
  } else if (!upperKey.includes('ANY') && !upperKey.includes('ALL')) {
    return { valid: false, error: 'Mã License Key không đúng cấu trúc TOKI-HW-... hoặc TOKI-ANY-...' };
  }

  // Kiểm tra thời hạn
  const now = Date.now();
  if (storedLicenseData && storedLicenseData.expiresAt !== undefined) {
    const exp = storedLicenseData.expiresAt;
    if (exp !== 0 && now > exp) {
      const expiredDate = new Date(exp).toLocaleString('vi-VN');
      return { valid: false, error: `License đã hết hạn vào ngày ${expiredDate}!` };
    }
    const daysLeft = exp === 0 ? 'Vĩnh viễn' : Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
    return {
      valid: true,
      customer: storedLicenseData.customer || 'Khách hàng',
      machineId: storedLicenseData.machineId || (upperKey.includes('HW-') ? (currentMachineId || getHardwareId()) : 'ANY'),
      plan: storedLicenseData.plan || 'TOKI PLUS VIP',
      expiresAt: exp,
      daysLeft,
      days
    };
  }

  // Key mới chưa lưu
  const exp = days === 0 ? 0 : now + days * 24 * 60 * 60 * 1000;
  const daysLeft = days === 0 ? 'Vĩnh viễn' : `${days} ngày`;
  return {
    valid: true,
    customer: 'Khách hàng',
    machineId: upperKey.includes('HW-') ? (currentMachineId || getHardwareId()) : 'ANY',
    plan: 'TOKI PLUS VIP',
    expiresAt: exp,
    daysLeft,
    days
  };
}

const SAVED_KEYS_FILE = path.join(getDataDir(), 'saved_keys.json');

function getSavedKeys() {
  if (!fs.existsSync(SAVED_KEYS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SAVED_KEYS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveKeyToList(keyString, note = '') {
  const result = verifyLicenseKey(keyString);
  const list = getSavedKeys();
  const trimmed = keyString.trim();
  const existingIdx = list.findIndex(item => item.key === trimmed);
  const entry = {
    key: trimmed,
    note: note || result.customer || 'Key bản quyền',
    plan: result.plan || 'TOKI PLUS',
    expiresAt: result.expiresAt || 0,
    valid: result.valid,
    savedAt: Date.now()
  };
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...entry };
  } else {
    list.unshift(entry);
  }
  fs.writeFileSync(SAVED_KEYS_FILE, JSON.stringify(list, null, 2), 'utf8');
  return list;
}

function deleteSavedKey(keyString) {
  const trimmed = keyString.trim();
  const list = getSavedKeys().filter(item => item.key !== trimmed);
  fs.writeFileSync(SAVED_KEYS_FILE, JSON.stringify(list, null, 2), 'utf8');
  return list;
}

/**
 * Remove active license (Logout/Deactivate)
 */
function removeActiveLicense() {
  if (fs.existsSync(LICENSE_FILE)) {
    fs.unlinkSync(LICENSE_FILE);
  }
  return { ok: true, message: 'Đã đăng xuất bản quyền thành công' };
}

/**
 * Save active license to file
 */
function saveActiveLicense(keyString) {
  const result = verifyLicenseKey(keyString);
  if (!result.valid) {
    throw new Error(result.error);
  }
  const now = Date.now();
  const days = result.days !== undefined ? result.days : 30;
  let expiresAt = 0;
  if (result.payload && result.payload.exp !== undefined) {
    expiresAt = result.payload.exp;
  } else {
    expiresAt = days === 0 ? 0 : now + days * 24 * 60 * 60 * 1000;
  }

  const data = {
    licenseKey: keyString.trim(),
    activatedAt: now,
    expiresAt: expiresAt,
    customer: result.customer || 'Khách hàng',
    machineId: result.machineId || 'ANY',
    plan: result.plan || 'TOKI PLUS VIP',
    info: {
      ...result,
      expiresAt: expiresAt,
      daysLeft: expiresAt === 0 ? 'Vĩnh viễn' : Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)))
    }
  };
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2), 'utf8');

  // Tự động lưu vào danh sách key đã dùng trên máy
  try {
    saveKeyToList(keyString, data.customer);
  } catch (e) { }

  return data.info;
}

/**
 * Get active license status
 */
function getActiveLicenseStatus() {
  if (!fs.existsSync(LICENSE_FILE)) {
    return { activated: false, error: 'Chưa kích hoạt bản quyền' };
  }
  try {
    const raw = fs.readFileSync(LICENSE_FILE, 'utf8');
    const data = JSON.parse(raw);
    const verification = verifyLicenseKey(data.licenseKey, null, data);
    if (!verification.valid) {
      return { activated: false, error: verification.error, info: verification.payload || data };
    }
    return {
      activated: true,
      key: data.licenseKey,
      ...verification
    };
  } catch (e) {
    return { activated: false, error: 'File bản quyền bị lỗi hoặc không đọc được' };
  }
}

module.exports = {
  generateLicenseKey,
  verifyLicenseKey,
  saveActiveLicense,
  getActiveLicenseStatus,
  removeActiveLicense,
  getSavedKeys,
  saveKeyToList,
  deleteSavedKey,
  getHardwareId
};
