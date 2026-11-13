'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { EventEmitter } = require('events');
const { verifyLicenseKey, getHardwareId } = require('./license-service');

// Cấu hình URL mặc định để kiểm tra danh sách thu hồi key từ xa
const DEFAULT_REVOCATION_URL = 'https://gist.githubusercontent.com/trandangnhat19031999-oss/20ff0380b98a24136afce8064691c822/raw/revoked_keys.json';

class LicenseGuard extends EventEmitter {
  constructor(options = {}) {
    super();
    this.storage = options.storage || null;
    this.client = options.client || null;
    this.receipts = options.receipts || null;
    this.deviceFingerprint = options.deviceFingerprint || getHardwareId();
    this.machineName = options.machineName || os.hostname();
    this.appVersion = options.appVersion || '1.0.0';
    this.os = options.os || process.platform;
    this._log = options.log || (() => {});
    this._emit = options.emit || (() => {});

    // Resolve license file path
    this.licenseFilePath = null;
    if (this.storage && this.storage.filePath) {
      const dir = path.dirname(this.storage.filePath);
      this.licenseFilePath = path.join(dir, 'license.json');
    } else if (typeof process !== 'undefined' && process.env.APPDATA) {
      const tokiDir = path.join(process.env.APPDATA, 'Motion Toki');
      this.licenseFilePath = path.join(tokiDir, 'license.json');
    }

    this._state = {
      state: 'none',
      key: null,
      licenseKeyMasked: '',
      plan: 'AI Plus VIP',
      customer: '',
      machineId: this.deviceFingerprint,
      machineName: this.machineName,
      deviceFingerprint: this.deviceFingerprint,
      expiresAt: 0,
      planExpiresAt: 0,
      daysLeft: 0,
      seats: 1,
      ok: true
    };

    this._token = null;
    this._remoteCheckTimer = null;
  }

  _broadcastState() {
    this.emit('license:state', this._state);
    if (typeof this._emit === 'function') {
      try {
        this._emit('license:state', this._state);
        if (this._state.state === 'none' || this._state.state === 'plan_expired' || !this._state.ok) {
          this._emit('license:blocked', this._state);
        }
      } catch (err) {
        this._log('warn', 'Failed to emit license:state to eventBus: ' + (err && err.message));
      }
    }
  }

  _readStoredLicense() {
    try {
      if (this.licenseFilePath && fs.existsSync(this.licenseFilePath)) {
        const raw = fs.readFileSync(this.licenseFilePath, 'utf8');
        return JSON.parse(raw);
      }
      // Check legacy paths if upgrading from old version (Motion Toki) for the first time
      if (typeof process !== 'undefined' && process.env.APPDATA) {
        const legacyPaths = [
          path.join(process.env.APPDATA, 'Motion Toki', 'license.json'),
          path.join(process.env.APPDATA, 'DogKi', 'license.json'),
          path.join(process.env.APPDATA, 'motionforge', 'license.json'),
          path.join(process.env.APPDATA, 'motionforge', 'license.bin'),
          path.join(process.env.APPDATA, 'Toki-Plus', 'data', 'license.json'),
          path.join(process.env.APPDATA, 'TOKI-PLUS', 'data', 'license.json'),
          path.join(process.env.APPDATA, 'Toki-Plus', 'data', 'saved_keys.json'),
          path.join(process.env.APPDATA, 'TOKI-PLUS', 'data', 'saved_keys.json'),
          path.join(process.env.APPDATA, 'toki-plus-studio', 'license.json'),
          path.join(process.env.APPDATA, 'toki-studio', 'license.json')
        ];
        for (const lp of legacyPaths) {
          if (fs.existsSync(lp)) {
            const raw = fs.readFileSync(lp, 'utf8');
            const data = JSON.parse(raw);
            if (data && data.licenseKey) {
              // Auto-migrate to Motion Toki seamlessly
              this._saveStoredLicense(data);
              return data;
            } else if (Array.isArray(data) && data.length > 0 && data[0] && (data[0].key || data[0].licenseKey)) {
              const k = data[0].key || data[0].licenseKey;
              const migData = {
                licenseKey: k,
                activatedAt: data[0].savedAt || Date.now(),
                expiresAt: data[0].expiresAt || 0,
                planExpiresAt: data[0].expiresAt || 0,
                customer: data[0].note || 'Khách hàng',
                machineId: this.deviceFingerprint,
                plan: data[0].plan || 'AI Plus VIP',
                days: 30
              };
              this._saveStoredLicense(migData);
              return migData;
            }
          }
        }
      }
    } catch (err) {
      this._log('warn', 'Failed reading license file: ' + (err && err.message));
    }
    return null;
  }

  _saveStoredLicense(data) {
    try {
      if (this.licenseFilePath) {
        const dir = path.dirname(this.licenseFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.licenseFilePath, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (err) {
      this._log('error', 'Failed saving license file: ' + (err && err.message));
    }
  }

  _removeStoredLicense() {
    const pathsToClean = [this.licenseFilePath];
    if (typeof process !== 'undefined' && process.env.APPDATA) {
      pathsToClean.push(
        path.join(process.env.APPDATA, 'Motion Toki', 'license.json'),
        path.join(process.env.APPDATA, 'Motion Toki', 'license.json'),
        path.join(process.env.APPDATA, 'Toki-Plus', 'data', 'license.json'),
        path.join(process.env.APPDATA, 'motionforge', 'license.json')
      );
    }
    for (const p of pathsToClean) {
      try {
        if (p && fs.existsSync(p)) fs.unlinkSync(p);
      } catch (err) {}
    }
  }

  /**
   * Lấy URL danh sách đen thu hồi key từ cấu hình
   */
  _getRemoteRevocationUrl() {
    try {
      // 1. Kiểm tra cấu hình trong AppData của người dùng
      if (typeof process !== 'undefined' && process.env.APPDATA) {
        const userCfgPath = path.join(process.env.APPDATA, 'Motion Toki', 'license_sync.json');
        if (fs.existsSync(userCfgPath)) {
          const cfg = JSON.parse(fs.readFileSync(userCfgPath, 'utf8'));
          if (cfg && cfg.revocationUrl && typeof cfg.revocationUrl === 'string' && cfg.revocationUrl.trim().startsWith('http')) {
            return cfg.revocationUrl.trim();
          }
        }
      }
    } catch (e) {}

    try {
      // 2. Kiểm tra cấu hình trong thư mục ứng dụng
      const appCfgPath = path.join(__dirname, '..', '..', '..', 'revocation_config.json');
      if (fs.existsSync(appCfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(appCfgPath, 'utf8'));
        if (cfg && cfg.revocationUrl && typeof cfg.revocationUrl === 'string' && cfg.revocationUrl.trim().startsWith('http')) {
          return cfg.revocationUrl.trim();
        }
      }
    } catch (e) {}

    return DEFAULT_REVOCATION_URL;
  }

  /**
   * Kiểm tra tức thì trên máy cục bộ xem key có bị thu hồi hay không (tốc độ < 0.1ms).
   * @param {string} [keyToCheck]
   * @returns {boolean}
   */
  _isKeyRevokedLocally(keyToCheck) {
    const key = (keyToCheck || (this._state && this._state.key) || '').trim().toUpperCase();
    if (!key) return false;

    const candidatePaths = [
      path.join(process.cwd(), 'data', 'revoked_keys.json'),
      path.join(__dirname, '..', '..', '..', '..', 'data', 'revoked_keys.json'),
      path.join(__dirname, '..', '..', '..', 'data', 'revoked_keys.json'),
      path.join(path.dirname(process.execPath), 'data', 'revoked_keys.json')
    ];

    if (typeof process !== 'undefined' && process.env.APPDATA) {
      candidatePaths.push(
        path.join(process.env.APPDATA, 'Motion Toki', 'revoked_keys.json'),
        path.join(process.env.APPDATA, 'Motion Toki', 'revoked_signal.json')
      );
    }

    for (const p of candidatePaths) {
      try {
        if (p && fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const data = JSON.parse(raw);
          if (data && data.revokedKey && String(data.revokedKey).trim().toUpperCase() === key) {
            return true;
          }
          let list = [];
          if (Array.isArray(data)) list = data;
          else if (data && Array.isArray(data.revokedKeys)) list = data.revokedKeys;
          else if (data && Array.isArray(data.revoked_keys)) list = data.revoked_keys;
          else if (data && Array.isArray(data.keys)) list = data.keys;

          for (const item of list) {
            const k = (typeof item === 'string' ? item : (item && item.key) || '').trim().toUpperCase();
            if (k && k === key) return true;
          }
        }
      } catch (e) {}
    }

    // Nếu app đang trong trạng thái active mà file license.json trên ổ đĩa đã bị xóa -> xem như đã bị thu hồi
    if (this._state && this._state.state === 'active' && this.licenseFilePath) {
      try {
        if (!fs.existsSync(this.licenseFilePath)) {
          return true;
        }
      } catch (e) {}
    }

    return false;
  }

  /**
   * Tải danh sách các key bị thu hồi từ xa qua GitHub API / Server nội bộ / Gist raw
   * @param {string} remoteUrl
   * @param {number} timeoutMs
   * @returns {Promise<string[]>}
   */
  _fetchRemoteRevokedKeys(remoteUrl, timeoutMs = 4000) {
    return new Promise((resolve) => {
      // 1. Thử server nội bộ http://127.0.0.1:3333/api/public-blacklist trước tiên (phản hồi trong 1ms)
      const tryLocalServer = () => {
        try {
          const reqLocal = http.get('http://127.0.0.1:3333/api/public-blacklist', { timeout: 600 }, (res) => {
            if (res.statusCode === 200) {
              let body = '';
              res.on('data', chunk => body += chunk);
              res.on('end', () => {
                try {
                  const parsed = JSON.parse(body);
                  const list = parsed && parsed.revokedKeys ? parsed.revokedKeys : [];
                  if (Array.isArray(list) && list.length > 0) {
                    return resolve(list.map(k => String(k).trim().toUpperCase()));
                  }
                } catch(e) {}
                fetchRemote();
              });
            } else {
              fetchRemote();
            }
          });
          reqLocal.on('error', () => fetchRemote());
          reqLocal.on('timeout', () => { reqLocal.destroy(); fetchRemote(); });
        } catch(e) {
          fetchRemote();
        }
      };

      // 2. Thử GitHub API (api.github.com/gists/:id) - KHÔNG BỊ FASTLY CACHE 5 PHÚT!
      const fetchRemote = () => {
        if (!remoteUrl || typeof remoteUrl !== 'string' || !remoteUrl.startsWith('http')) {
          return resolve([]);
        }

        const gistMatch = remoteUrl.match(/([a-f0-9]{32})/i);
        if (gistMatch && gistMatch[1]) {
          const gistId = gistMatch[1];
          const apiUrl = `https://api.github.com/gists/${gistId}`;
          try {
            const apiReq = https.get(apiUrl, {
              headers: {
                'User-Agent': 'MotionToki-LicenseValidator/1.0',
                'Accept': 'application/vnd.github+json'
              },
              timeout: timeoutMs
            }, (res) => {
              if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.files) {
                      for (const fileName of Object.keys(parsed.files)) {
                        const fileObj = parsed.files[fileName];
                        if (fileObj && fileObj.content) {
                          const json = JSON.parse(fileObj.content);
                          const list = Array.isArray(json) ? json : (json.revokedKeys || json.revoked_keys || json.keys || []);
                          if (Array.isArray(list) && list.length > 0) {
                            return resolve(list.map(k => String(k).trim().toUpperCase()));
                          }
                        }
                      }
                    }
                  } catch (e) {}
                  fetchRaw();
                });
              } else {
                fetchRaw();
              }
            });
            apiReq.on('error', () => fetchRaw());
            apiReq.on('timeout', () => { apiReq.destroy(); fetchRaw(); });
            return;
          } catch (e) {
            fetchRaw();
          }
        } else {
          fetchRaw();
        }
      };

      // 3. Fallback tải raw URL với tham số chống cache
      const fetchRaw = () => {
        let rawUrl = remoteUrl;
        if (rawUrl.includes('gist.githubusercontent.com') && rawUrl.includes('/raw/')) {
          rawUrl = rawUrl.replace(/\/raw\/[a-f0-9]{40}\//i, '/raw/');
        }
        rawUrl += (rawUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();

        try {
          const client = rawUrl.startsWith('https') ? https : http;
          const req = client.get(rawUrl, {
            headers: {
              'User-Agent': 'MotionToki-LicenseValidator/1.0',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            timeout: timeoutMs
          }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return this._fetchRemoteRevokedKeys(res.headers.location, timeoutMs).then(resolve);
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return resolve([]);
            }
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                let list = [];
                if (Array.isArray(parsed)) list = parsed;
                else if (parsed && Array.isArray(parsed.revokedKeys)) list = parsed.revokedKeys;
                else if (parsed && Array.isArray(parsed.revoked_keys)) list = parsed.revoked_keys;
                else if (parsed && Array.isArray(parsed.keys)) list = parsed.keys;

                const result = list.map(item => {
                  if (typeof item === 'string') return item.trim().toUpperCase();
                  if (item && item.key) return String(item.key).trim().toUpperCase();
                  return '';
                }).filter(Boolean);
                resolve(result);
              } catch (err) {
                resolve([]);
              }
            });
          });
          req.on('error', () => resolve([]));
          req.on('timeout', () => { req.destroy(); resolve([]); });
        } catch(err) {
          resolve([]);
        }
      };

      tryLocalServer();
    });
  }

  /**
   * Kiểm tra key xem có bị thu hồi hay không (cả cục bộ lẫn từ xa).
   * @param {string} [keyToCheck]
   * @returns {Promise<boolean>}
   */
  async _checkRevocationOnline(keyToCheck) {
    const key = (keyToCheck || (this._state && this._state.key) || '').trim().toUpperCase();
    if (!key) return false;

    // 1. Kiểm tra tức thì cục bộ
    if (this._isKeyRevokedLocally(key)) {
      this._applyRevocation(key);
      return true;
    }

    // 2. Kiểm tra từ xa
    const remoteUrl = this._getRemoteRevocationUrl();
    if (!remoteUrl || !remoteUrl.startsWith('http')) return false;

    try {
      const revokedList = await this._fetchRemoteRevokedKeys(remoteUrl, 4500);
      if (Array.isArray(revokedList) && revokedList.length > 0) {
        const isRevoked = revokedList.includes(key);
        if (isRevoked) {
          this._applyRevocation(key);
          return true;
        }
      }
    } catch (err) {
      this._log('warn', 'Lỗi khi kiểm tra thu hồi key từ xa: ' + (err && err.message));
    }
    return false;
  }

  _applyRevocation(key) {
    this._log('warn', `[BẢN QUYỀN] Key ${key} nằm trong danh sách THU HỒI! Đang tiến hành khóa và xóa bản quyền.`);
    this._removeStoredLicense();
    this._state = {
      state: 'none',
      key: null,
      licenseKeyMasked: '',
      plan: 'AI Plus VIP',
      customer: '',
      machineId: this.deviceFingerprint,
      machineName: this.machineName,
      deviceFingerprint: this.deviceFingerprint,
      expiresAt: 0,
      planExpiresAt: 0,
      daysLeft: 0,
      seats: 0,
      error: 'Mã License này đã bị thu hồi hoặc hủy kích hoạt bởi Quản trị viên!',
      ok: false
    };
    this._token = null;
    this._broadcastState();
  }

  async start() {
    this._log('info', 'LicenseGuard started with local validator & remote revocation sync.');
    let stored = this._readStoredLicense();

    if (stored && stored.licenseKey) {
      // Kiểm tra ngay xem key có bị thu hồi cục bộ hay không
      if (this._isKeyRevokedLocally(stored.licenseKey)) {
        this._applyRevocation(stored.licenseKey);
        return;
      }

      const v = verifyLicenseKey(stored.licenseKey, this.deviceFingerprint, stored);
      if (v.valid) {
        const exp = stored.planExpiresAt || stored.expiresAt || 0;
        const now = Date.now();
        const daysLeft = (exp === 0) ? 'Vĩnh viễn' : `${Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)))} ngày`;
        this._state = {
          state: 'active',
          key: stored.licenseKey,
          licenseKeyMasked: stored.licenseKey,
          plan: stored.plan || 'AI Plus VIP',
          customer: stored.customer || 'Khách hàng',
          machineId: stored.machineId || this.deviceFingerprint,
          machineName: this.machineName,
          deviceFingerprint: this.deviceFingerprint,
          expiresAt: exp,
          planExpiresAt: exp,
          daysLeft: daysLeft,
          seats: 1,
          ok: true
        };
        this._token = { licenseKey: stored.licenseKey };
        this._broadcastState();

        // 1. Kiểm tra từ xa và tự động đồng bộ trạng thái kích hoạt lên Cloud ngay sau khi khởi động app
        setTimeout(() => {
          this._checkRevocationOnline(stored.licenseKey).catch(() => {});
          const activeStart = stored.firstActivatedAt || stored.activatedAt || (exp > 0 ? (exp - 30 * 86400000) : Date.now());
          this._reportActivationOnline(stored.licenseKey, activeStart, exp);
        }, 500);

        // 2. Định kỳ kiểm tra từ xa mỗi 4 giây khi app đang mở
        if (this._remoteCheckTimer) clearInterval(this._remoteCheckTimer);
        this._remoteCheckTimer = setInterval(() => {
          if (this._state && this._state.state === 'active' && this._state.key) {
            this._checkRevocationOnline(this._state.key).catch(() => {});
          }
        }, 4 * 1000);

        return;
      } else if (v.error && v.error.includes('hết hạn')) {
        const exp = stored.planExpiresAt || stored.expiresAt || 0;
        this._state = {
          state: 'plan_expired',
          key: stored.licenseKey,
          licenseKeyMasked: stored.licenseKey,
          plan: stored.plan || 'AI Plus VIP',
          customer: stored.customer || 'Khách hàng',
          machineId: stored.machineId || this.deviceFingerprint,
          machineName: this.machineName,
          deviceFingerprint: this.deviceFingerprint,
          expiresAt: exp,
          planExpiresAt: exp,
          daysLeft: 0,
          error: v.error,
          ok: false
        };
        this._broadcastState();
        return;
      }
    }

    this._state = {
      state: 'none',
      key: null,
      licenseKeyMasked: '',
      plan: 'AI Plus VIP',
      customer: '',
      machineId: this.deviceFingerprint,
      machineName: this.machineName,
      deviceFingerprint: this.deviceFingerprint,
      expiresAt: 0,
      planExpiresAt: 0,
      daysLeft: 0,
      seats: 1,
      ok: true
    };
    this._broadcastState();
  }

  stop() {
    if (this._remoteCheckTimer) {
      clearInterval(this._remoteCheckTimer);
      this._remoteCheckTimer = null;
    }
    this._log('info', 'LicenseGuard stopped.');
  }

  getState() {
    if (this._state && this._state.state === 'active') {
      const key = this._state.key;
      // Kiểm tra tức thì cục bộ trước khi trả về state
      if (key && this._isKeyRevokedLocally(key)) {
        this._applyRevocation(key);
        return { ...this._state };
      }

      const now = Date.now();
      if (key && (!this._lastOnlineCheck || (now - this._lastOnlineCheck > 3000))) {
        this._lastOnlineCheck = now;
        this._checkRevocationOnline(key).catch(() => {});
      }
      const exp = this._state.planExpiresAt || this._state.expiresAt || 0;
      if (exp > 0) {
        if (now > exp) {
          this._state.state = 'plan_expired';
          this._state.daysLeft = 0;
          this._state.planExpiresAt = exp;
          this._state.expiresAt = exp;
          this._broadcastState();
        } else {
          const remainingDays = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
          this._state.daysLeft = `${remainingDays} ngày`;
          this._state.planExpiresAt = exp;
          this._state.expiresAt = exp;
        }
      } else {
        this._state.daysLeft = 'Vĩnh viễn';
        this._state.planExpiresAt = 0;
        this._state.expiresAt = 0;
      }
    }
    return { ...this._state };
  }



  _reportActivationOnline(trimmedKey, startTime, expiresAt) {
    const postData = JSON.stringify({
      key: trimmedKey,
      machineId: this.deviceFingerprint,
      machineName: this.machineName
    });

    // 1. Thử local server nếu chạy trên máy Admin
    try {
      const http = require('http');
      const reqBind = http.request('http://127.0.0.1:3333/api/bind-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 1200
      });
      reqBind.on('error', () => {});
      reqBind.write(postData);
      reqBind.end();
    } catch(e) {}

    // 2. Đồng bộ trực tiếp lên GitHub Gist toàn cầu để Admin ở xa nhận được ngay lập tức!
    try {
      const https = require('https');
      const gistId = '20ff0380b98a24136afce8064691c822';
      const pat = 'YOUR_GITHUB_PAT_HERE';
      
      const reqGet = https.get(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'User-Agent': 'MotionToki-LicenseValidator/1.0',
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json'
        },
        timeout: 4500
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            let actMap = {};
            if (data.files && data.files['activated_devices.json'] && data.files['activated_devices.json'].content) {
              const parsed = JSON.parse(data.files['activated_devices.json'].content);
              actMap = parsed.activations || {};
            }

            const upperKey = trimmedKey.toUpperCase();
            actMap[upperKey] = {
              key: upperKey,
              boundHardwareId: this.deviceFingerprint,
              boundMachineName: this.machineName || require('os').hostname(),
              firstActivatedAt: startTime,
              activatedAt: startTime,
              expiresAt: expiresAt,
              plan: 'AI Plus VIP',
              updatedAt: new Date().toISOString()
            };

            const patchPayload = JSON.stringify({
              files: {
                'activated_devices.json': {
                  content: JSON.stringify({
                    updatedAt: new Date().toISOString(),
                    activations: actMap
                  }, null, 2)
                }
              }
            });

            const reqPatch = https.request({
              hostname: 'api.github.com',
              path: `/gists/${gistId}`,
              method: 'PATCH',
              headers: {
                'User-Agent': 'MotionToki-LicenseValidator/1.0',
                'Authorization': `Bearer ${pat}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json',
                'Content-Length': Buffer.byteLength(patchPayload)
              },
              timeout: 6000
            });
            reqPatch.on('error', () => {});
            reqPatch.write(patchPayload);
            reqPatch.end();
          } catch(err) {}
        });
      });
      reqGet.on('error', () => {});
    } catch(err) {}
  }

  _fetchRemoteActivations() {
    return new Promise((resolve) => {
      const http = require('http');
      const https = require('https');
      const reqLocal = http.get('http://127.0.0.1:3333/api/activated-devices', { timeout: 800 }, (res) => {
        if (res.statusCode === 200) {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => {
            try {
              const j = JSON.parse(b);
              if (j && j.activations) return resolve(j.activations);
            } catch(e) {}
            fetchGist();
          });
        } else {
          fetchGist();
        }
      });
      reqLocal.on('error', () => fetchGist());
      reqLocal.on('timeout', () => { reqLocal.destroy(); fetchGist(); });

      const fetchGist = () => {
        const gistUrl = 'https://api.github.com/gists/20ff0380b98a24136afce8064691c822';
        const reqGist = https.get(gistUrl, {
          headers: { 'User-Agent': 'MotionToki-LicenseValidator/1.0', 'Accept': 'application/vnd.github+json' },
          timeout: 3500
        }, (res) => {
          if (res.statusCode === 200) {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
              try {
                const j = JSON.parse(b);
                if (j && j.files && j.files['activated_devices.json'] && j.files['activated_devices.json'].content) {
                  const act = JSON.parse(j.files['activated_devices.json'].content);
                  return resolve(act.activations || {});
                }
              } catch(e) {}
              fetchRaw();
            });
          } else {
            fetchRaw();
          }
        });
        reqGist.on('error', () => fetchRaw());
        reqGist.on('timeout', () => { reqGist.destroy(); fetchRaw(); });
      };

      const fetchRaw = () => {
        const rawUrl = 'https://gist.githubusercontent.com/trandangnhat19021999-oss/20ff0380b98a24136afce8064691c822/raw/activated_devices.json?_t=' + Date.now();
        const reqRaw = https.get(rawUrl, {
          headers: { 'User-Agent': 'MotionToki-LicenseValidator/1.0', 'Cache-Control': 'no-cache' },
          timeout: 3500
        }, (res) => {
          if (res.statusCode === 200) {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
              try {
                const j = JSON.parse(b);
                return resolve(j.activations || {});
              } catch(e) {}
              resolve({});
            });
          } else {
            resolve({});
          }
        });
        reqRaw.on('error', () => resolve({}));
        reqRaw.on('timeout', () => { reqRaw.destroy(); resolve({}); });
      };
    });
  }

  async activate(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return {
        ok: false,
        error: { code: 'EMPTY_KEY', message: 'Vui lòng nhập License Key!' }
      };
    }

    const trimmedKey = licenseKey.trim();

    // 1. Kiểm tra tính hợp lệ cơ bản của cấu trúc key
    const verification = verifyLicenseKey(trimmedKey, this.deviceFingerprint);
    if (!verification.valid) {
      return {
        ok: false,
        error: { code: 'INVALID_KEY', message: verification.error }
      };
    }

    // 2. Kiểm tra tức thì cục bộ xem key có bị thu hồi hay không
    if (this._isKeyRevokedLocally(trimmedKey)) {
      return {
        ok: false,
        error: {
          code: 'REVOKED_KEY',
          message: 'Mã License này đã bị thu hồi hoặc hủy kích hoạt bởi Quản trị viên!'
        }
      };
    }

    // 3. Kiểm tra trực tuyến xem key này đã bị thu hồi trước đó chưa
    try {
      const remoteUrl = this._getRemoteRevocationUrl();
      if (remoteUrl && remoteUrl.startsWith('http')) {
        const revokedList = await this._fetchRemoteRevokedKeys(remoteUrl, 3500);
        if (Array.isArray(revokedList) && revokedList.includes(trimmedKey.toUpperCase())) {
          return {
            ok: false,
            error: {
              code: 'REVOKED_KEY',
              message: 'Mã License này đã bị thu hồi hoặc hủy kích hoạt bởi Quản trị viên!'
            }
          };
        }
      }
    } catch (e) {}

    const now = Date.now();
    const days = verification.days !== undefined ? verification.days : 30;

    // KIỂM TRA KHÓA MÁY VÀ BẢO LƯU THỜI HẠN GỐC TỪ LẦN KÍCH HOẠT ĐẦU TIÊN
    let startTime = now;
    try {
      const actMap = await this._fetchRemoteActivations();
      const upperKey = trimmedKey.toUpperCase();
      if (actMap && actMap[upperKey]) {
        const rec = actMap[upperKey];
        const boundHw = (rec.boundHardwareId || '').trim().toUpperCase();
        const myHw = (this.deviceFingerprint || '').trim().toUpperCase();

        // 1. Nếu key đang bị khóa cứng ở một máy tính khác -> Chặn kích hoạt
        const isUnbound = Boolean(rec.unboundAt && (!rec.activatedAt || new Date(rec.unboundAt) >= new Date(rec.activatedAt)));
        if (!isUnbound && boundHw && boundHw !== myHw) {
          const cleanBound = boundHw.replace(/^HW-/, '');
          const cleanMy = myHw.replace(/^HW-/, '');
          if (!cleanBound.includes(cleanMy) && !cleanMy.includes(cleanBound) && !cleanBound.includes(cleanMy.slice(0, 8))) {
            return {
              ok: false,
              error: {
                code: 'HARDWARE_MISMATCH',
                message: `License Key này đã được kích hoạt trên một máy tính khác (${boundHw})! Mỗi bản quyền chỉ dùng trên 1 thiết bị. Vui lòng liên hệ Admin để đổi máy.`
              }
            };
          }
        }

        // 2. BẢO LƯU THỜI GIAN GỐC: Nếu key đã từng kích hoạt ở máy trước -> Giữ nguyên ngày bắt đầu đầu tiên!
        if (rec.firstActivatedAt) {
          const origTime = Number(rec.firstActivatedAt) || new Date(rec.firstActivatedAt).getTime();
          if (!isNaN(origTime) && origTime > 0) {
            startTime = origTime;
          }
        }
      }
    } catch(e) {}

    const totalMs = days * 24 * 60 * 60 * 1000;
    const expiresAt = (days === 0) ? 0 : (startTime + totalMs);

    // Kiểm tra nếu key đã hết hạn theo thời gian gốc
    if (expiresAt > 0 && now > expiresAt) {
      return {
        ok: false,
        error: {
          code: 'KEY_EXPIRED',
          message: `License Key này đã hết hạn sử dụng vào ngày ${new Date(expiresAt).toLocaleString('vi-VN')}!`
        }
      };
    }

    const msLeft = (days === 0) ? 0 : Math.max(0, expiresAt - now);
    const daysLeftNum = (days === 0) ? 0 : Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    const daysLeft = (days === 0) ? 'Vĩnh viễn' : `${daysLeftNum} ngày`;

    // Khóa máy này vào hệ thống (cả local server lẫn GitHub Gist toàn cầu)
    this._reportActivationOnline(trimmedKey, startTime, expiresAt);

    const licenseData = {
      licenseKey: trimmedKey,
      activatedAt: startTime,
      firstActivatedAt: startTime,
      expiresAt: expiresAt,
      planExpiresAt: expiresAt,
      customer: verification.customer || 'Khách hàng',
      machineId: verification.machineId || this.deviceFingerprint,
      plan: verification.plan || 'AI Plus VIP',
      days: days,
      daysLeft: daysLeft
    };

    this._saveStoredLicense(licenseData);

    this._state = {
      state: 'active',
      key: trimmedKey,
      licenseKeyMasked: trimmedKey,
      plan: licenseData.plan,
      customer: licenseData.customer,
      machineId: licenseData.machineId,
      machineName: this.machineName,
      deviceFingerprint: this.deviceFingerprint,
      expiresAt: expiresAt,
      planExpiresAt: expiresAt,
      daysLeft: daysLeft,
      seats: 1,
      ok: true
    };
    this._token = { licenseKey: trimmedKey, planExpiresAt: expiresAt };

    this._broadcastState();

    // Thiết lập timer kiểm tra định kỳ mỗi 4 giây
    if (this._remoteCheckTimer) clearInterval(this._remoteCheckTimer);
    this._remoteCheckTimer = setInterval(() => {
      if (this._state && this._state.state === 'active' && this._state.key) {
        this._checkRevocationOnline(this._state.key).catch(() => {});
      }
    }, 4 * 1000);

    return {
      ok: true,
      state: 'active',
      info: this._state
    };
  }

  async deactivate() {
    if (this._remoteCheckTimer) {
      clearInterval(this._remoteCheckTimer);
      this._remoteCheckTimer = null;
    }
    this._removeStoredLicense();
    this._state = {
      state: 'none',
      key: null,
      plan: 'AI Plus VIP',
      customer: '',
      machineId: this.deviceFingerprint,
      machineName: this.machineName,
      deviceFingerprint: this.deviceFingerprint,
      expiresAt: 0,
      daysLeft: 0,
      seats: 1,
      ok: true
    };
    this._token = null;
    this._broadcastState();
    return { ok: true, message: 'Đã hủy kích hoạt bản quyền trên máy này.' };
  }

  canAcquireSlot() {
    if (this._state && this._state.key && this._isKeyRevokedLocally(this._state.key)) {
      this._applyRevocation(this._state.key);
      return { allowed: false, reason: 'License đã bị thu hồi bởi Quản trị viên!' };
    }
    if (this._state.state !== 'active') {
      return { allowed: false, reason: 'License không hoạt động hoặc đã bị thu hồi!' };
    }
    return { allowed: true };
  }

  recordUsage(jobId, reason) {
    return { ok: true };
  }

  async getDiagnosticBlob() {
    const hw = this.deviceFingerprint || getHardwareId();
    return {
      appName: 'Motion Toki',
      appVersion: this.appVersion,
      os: this.os,
      machineName: this.machineName,
      deviceFingerprint: hw,
      hardwareId: hw,
      state: this._state.state,
      plan: this._state.plan,
      daysLeft: this._state.daysLeft,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { LicenseGuard };
