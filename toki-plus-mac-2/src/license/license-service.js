'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getHardwareId } = require('./hardware');

const KEY_SECRET_SALT = 'TOKI_PLUS_SECURE_KEYGEN_SALT_2026_@v26';

function computeKeyChecksum(payload) {
  return crypto.createHmac('sha256', KEY_SECRET_SALT)
    .update(payload.toUpperCase().trim())
    .digest('hex')
    .slice(0, 4)
    .toUpperCase();
}

/**
 * Generate a new license key
 * Formats supported:
 *  - HW locked: TOKI-HW-XXXX-XXXX-XXXX-30DAY-YYYY or MOTIONTOKI-HW-XXXX-XXXX-30DAY-YYYY
 *  - Any machine: TOKI-ANY-XXXX-XXXX-XXXX-30DAY-YYYY or MOTIONTOKI-ANY-XXXX-30DAY-YYYY     
 */
function generateLicenseKey({ customer = 'Khách hàng', machineId = '', days = 30, plan = 'AI Plus VIP', prefix = 'TOKI' }) {
  const daysNum = parseInt(days, 10);
  const durationTag = (daysNum === 0) ? 'LIFETIME' : `${daysNum}DAY`;
  const keyPrefix = (prefix || 'TOKI').toUpperCase();

  let key = '';
  const mid = (machineId && machineId.trim() !== '' && machineId.trim().toUpperCase() !== 'ANY')
    ? machineId.trim().toUpperCase()
    : '';

  if (mid) {
    const cleanMid = mid.replace(/^(HW-|MOTIONTOKI-|TOKI-)/i, '');       
    const chunks = cleanMid.split('-').filter(Boolean);
    const midPart = chunks.slice(0, 3).join('-');
    const payload = `HW-${midPart}-${durationTag}`;
    const sig = computeKeyChecksum(payload);
    key = `${keyPrefix}-${payload}-${sig}`;
  } else {
    const rnd = crypto.randomBytes(6).toString('hex').toUpperCase();
    const c1 = rnd.slice(0, 4);
    const c2 = rnd.slice(4, 8);
    const c3 = rnd.slice(8, 12);
    const payload = `ANY-${c1}-${c2}-${c3}-${durationTag}`;
    const sig = computeKeyChecksum(payload);
    key = `${keyPrefix}-${payload}-${sig}`;
  }

  const now = Date.now();
  const expiresAt = daysNum === 0 ? 0 : now + daysNum * 24 * 60 * 60 * 1000;

  return {
    key,
    customer,
    machineId: mid || 'ANY (Mọi máy)',
    plan,
    expiresAt,
    days: daysNum === 0 ? 'Vĩnh viễn' : `${daysNum} ngày`
  };
}

/**
 * Verify a license key
 * @param {string} keyString
 * @param {string} [currentMachineId]
 * @param {Object} [storedLicenseData]
 */
function verifyLicenseKey(keyString, currentMachineId = null, storedLicenseData = null) {
  if (!keyString || typeof keyString !== 'string') {
    return { valid: false, error: 'Mã License Key không được để trống!' };
  }

  const trimmed = keyString.trim();
  const upperKey = trimmed.toUpperCase();

  // Duration match: -30DAY- or -LIFETIME- or at end
  const durationMatch = upperKey.match(/(?:-|^)(\d+DAY|LIFETIME)(?:-|$)/i);
  if (!durationMatch) {
    return { valid: false, error: 'Định dạng License Key không hợp lệ! (Ví dụ: TOKI-HW-EC3B-36CE-AD8C-30DAY-xxxx hoặc TOKI-ANY-xxxx-yyyy-zzzz-30DAY-xxxx)' };
  }

  const durationStr = durationMatch[1];
  const days = durationStr === 'LIFETIME' ? 0 : parseInt(durationStr.replace('DAY', ''), 10);

  // Strip prefix (Motion Toki / TOKI- prefix)  
  const cleanKey = upperKey.replace(/^(MOTIONTOKI-|MOTION-TOKI-|TOKI-)/i, '');       
  const lastDashIdx = cleanKey.lastIndexOf('-');
  const possibleSig = (lastDashIdx !== -1) ? cleanKey.slice(lastDashIdx + 1) : '';

  if (possibleSig.length === 4) {
    const payload = cleanKey.slice(0, lastDashIdx);
    const expectedSig = computeKeyChecksum(payload);
    if (possibleSig !== expectedSig) {
      return { valid: false, error: 'Mã License Key không hợp lệ hoặc đã bị chỉnh sửa (Mã xác thực không đúng)!' };
    }
  } else {
    return { valid: false, error: 'Mã License Key thiếu mã xác thực hợp lệ!' };
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
  } else if (!upperKey.includes('ANY') && !upperKey.includes('ALL') && !upperKey.includes('AUTO')) {
    return { valid: false, error: 'Mã License Key không đúng cấu trúc HW-... hoặc ANY-...' };
  }

  // Kiểm tra thời hạn nếu đã lưu kích hoạt từ trước
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
      plan: storedLicenseData.plan || 'AI Plus VIP',
      expiresAt: exp,
      daysLeft,
      days
    };
  }

  // Key mới kiểm tra lần đầu
  const exp = days === 0 ? 0 : now + days * 24 * 60 * 60 * 1000;
  const daysLeft = days === 0 ? 'Vĩnh viễn' : `${days} ngày`;
  return {
    valid: true,
    customer: 'Khách hàng',
    machineId: upperKey.includes('HW-') ? (currentMachineId || getHardwareId()) : 'ANY',
    plan: 'AI Plus VIP',
    expiresAt: exp,
    daysLeft,
    days
  };
}

module.exports = {
  generateLicenseKey,
  verifyLicenseKey,
  computeKeyChecksum,
  getHardwareId
};
