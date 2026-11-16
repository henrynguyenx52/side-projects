const { execSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

let cachedHardwareId = null;

function getHardwareId() {
  if (cachedHardwareId) return cachedHardwareId;

  let raw = '';
  // 1. Thử qua WMIC (các bản Windows cũ)
  try {
    const uuid = execSync('wmic csproduct get uuid', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .replace(/UUID/i, '').trim();
    if (uuid && uuid.length > 5) raw += uuid;
  } catch (e) {}

  // 2. Thử qua PowerShell Get-CimInstance (Windows 11 mới nhất)
  if (!raw) {
    try {
      const psOut = execSync('powershell -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (psOut && psOut.length > 5) raw += psOut;
    } catch (e) {}
  }

  // 3. Fallback / Augmentation: Lấy danh sách MAC card mạng vật lý
  // Bỏ qua các card mạng ảo/VPN (Hamachi, OpenVPN, Tailscale, vEthernet...) để tránh đổi mã máy khi bật VPN
  const macs = [];
  let networkInterfaces = {};
  try {
    networkInterfaces = os.networkInterfaces() || {};
  } catch (e) {
    // Some sandboxed environments block networkInterfaces(); continue with other signals.
  }
  for (const name of Object.keys(networkInterfaces)) {
    if (/virtual|vmware|vbox|hamachi|tap|vpn|tailscale|wireguard|zerotier|warp|vethernet/i.test(name)) {
      continue;
    }
    for (const net of networkInterfaces[name] || []) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        macs.push(net.mac);
      }
    }
  }

  // Nếu tất cả card mạng đều bị lọc thì fallback lấy mọi card
  if (macs.length === 0) {
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name] || []) {
        if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
          macs.push(net.mac);
        }
      }
    }
  }

  // macOS: IOPlatformUUID when WMIC/PowerShell are unavailable
  if (!raw && process.platform === 'darwin') {
    try {
      const ioreg = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk -F'\"' '/IOPlatformUUID/{print $4}'", {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      if (ioreg && ioreg.length > 5) raw += ioreg;
    } catch (e) {}
  }

  raw += '|' + macs.sort().join('|') + '|' + os.hostname() + '|' + (os.cpus()[0]?.model || 'unknown-cpu');

  // Create a clean formatted hardware ID: HW-XXXX-XXXX-XXXX-XXXX
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  cachedHardwareId = `HW-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
  return cachedHardwareId;
}

module.exports = { getHardwareId };
