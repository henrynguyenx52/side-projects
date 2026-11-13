'use strict';

/**
 * activate-smoke.js — End-to-end smoke test of the LicenseGuard.activate
 * pipeline against the deployed Cloudflare Worker.
 *
 * Validates the fix for "Server trả token không hợp lệ" — server returns
 * `token` as a JSON string (per token.ts buildToken contract), and the guard
 * now parses it before signature verification.
 *
 * Usage:
 *   node src/license/__test__/activate-smoke.js <license-key>
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const { LicenseStorage } = require('../license-storage');
const { LicenseClient }  = require('../license-client');
const { ReceiptStore }   = require('../receipt-store');
const { LicenseGuard }   = require('../license-guard-loader');
const { getDeviceFingerprint } = require('../device-fingerprint');
const licenseKeyAddon    = require('../../native/license-key');

const LICENSE_SERVER_URL =
  process.env.LICENSE_SERVER_URL ||
  'https://license-server.mqbf38.workers.dev';

async function main() {
  const licenseKey = (process.argv[2] || '').trim();
  if (!licenseKey) {
    process.stderr.write('Usage: node activate-smoke.js <license-key>\n');
    process.exit(1);
  }

  // Use a temp dir so the smoke test does not pollute the real userData.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibeforge-smoke-'));
  process.stdout.write(`[smoke] Using tmpDir: ${tmpDir}\n`);

  const deviceFingerprint = await getDeviceFingerprint();
  process.stdout.write(`[smoke] Device fingerprint: ${deviceFingerprint.slice(0, 8)}...\n`);

  const storage = new LicenseStorage({
    filePath: path.join(tmpDir, 'license.bin'),
    platform: process.platform,
  });

  let guardRef = null;
  const receipts = new ReceiptStore({
    filePath: path.join(tmpDir, 'receipts.jsonl'),
    signingKeyDeriver: () => {
      const tok = guardRef && guardRef._token;
      if (!tok) throw new Error('no token');
      return crypto.createHash('sha256')
        .update(tok.licenseKey + ':' + deviceFingerprint)
        .digest();
    },
  });

  const client = new LicenseClient({
    baseUrl: LICENSE_SERVER_URL,
    deviceFingerprint,
    appVersion: '1.0.0',
    os: process.platform,
    log: (level, msg, meta) =>
      process.stdout.write(`[client:${level}] ${msg} ${meta ? JSON.stringify(meta) : ''}\n`),
  });

  const guard = new LicenseGuard({
    storage,
    client,
    receipts,
    deviceFingerprint,
    isOnline: () => true,
    publicKey: licenseKeyAddon.getPublicKey(),
    machineName: os.hostname(),
    appVersion: '1.0.0',
    os: process.platform,
    log: (level, msg, meta) =>
      process.stdout.write(`[guard:${level}] ${msg} ${meta ? JSON.stringify(meta) : ''}\n`),
  });
  guardRef = guard;

  process.stdout.write(`[smoke] Activating with key ${licenseKey.slice(0, 5)}...${licenseKey.slice(-5)}\n`);
  const res = await guard.activate(licenseKey);
  process.stdout.write(`[smoke] Result: ${JSON.stringify(res, null, 2)}\n`);

  if (res.ok) {
    process.stdout.write(`[smoke] State: ${guard.getState().state}\n`);
    const canAcquire = guard.canAcquireSlot();
    process.stdout.write(`[smoke] canAcquireSlot: ${JSON.stringify(canAcquire)}\n`);
    process.stdout.write('[smoke] PASS — token verified, state active\n');
    process.exit(0);
  } else {
    process.stdout.write(`[smoke] FAIL — ${res.error.code}: ${res.error.message}\n`);
    process.exit(2);
  }
}

main().catch((err) => {
  process.stderr.write(`[smoke] threw: ${err && err.stack}\n`);
  process.exit(1);
});
