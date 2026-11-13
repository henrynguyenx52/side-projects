'use strict';

/**
 * license-key — JS wrapper over the native Ed25519 public-key addon.
 *
 * Exposes `getPublicKey()` returning a 32-byte Buffer.
 *
 * NATIVE BINARY LOOKUP (dual-path):
 *
 *   1. Dev path — `bindings('license-key')` walks up from this file looking
 *      for `build/Release/license-key.node`. Works after running
 *      `npm run rebuild` (or `npm run rebuild:native`) inside the workspace.
 *
 *   2. Packaged path — In production Electron builds the addon ships under
 *      `process.resourcesPath/native/license-key.node` (see the
 *      `extraResources` rule in `package.json > build`). The `bindings()`
 *      lookup fails inside an asar because there is no `build/Release` tree
 *      under `app.asar`, so we fall through to a direct `require(absPath)`
 *      against `resourcesPath`.
 *
 *   3. Fallback — When neither path resolves we return an all-zero 32-byte
 *      Buffer and log a clear warning. The fallback lets the rest of the
 *      client boot (e.g. LicenseStorage, DeviceFingerprint) so devs are not
 *      blocked, but `LicenseGuard.verify()` will fail every signature with
 *      the placeholder key — that's intended.
 *
 * Anyone shipping a real build MUST:
 *   1. Run task 5.1 (`license-server` keygen --write) to produce
 *      `client-public-key.txt` at the workspace root.
 *   2. Run `node src/native/license-key/tools/embed-public-key.js` so the
 *      real bytes get baked into `license-key.cc`.
 *   3. Run `npm run rebuild` (electron-rebuild) to compile against Electron.
 *      Or use the convenience script `npm run build:license-key` which
 *      runs embed + rebuild:native in sequence.
 */

const path = require('path');

const PUBLIC_KEY_SIZE = 32;

let nativeModule = null;
let loadError = null;
let loadedFrom = null; // 'bindings' | 'resources' | null

// --- Path 1: dev / workspace via `bindings` -------------------------------
try {
  // `bindings` walks up from this file to find `build/Release/license-key.node`.
  // We pass __dirname so the search starts at this folder (not process.cwd()).
  const bindings = require('bindings');
  nativeModule = bindings({
    bindings: 'license-key',
    module_root: __dirname,
  });
  loadedFrom = 'bindings';
} catch (err) {
  loadError = err;
}

// --- Path 2: packaged Electron via `process.resourcesPath` ---------------
if (!nativeModule && typeof process !== 'undefined' && process.resourcesPath) {
  const resourcePath = path.join(
    process.resourcesPath,
    'native',
    'license-key.node'
  );
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    nativeModule = require(resourcePath);
    loadedFrom = 'resources';
    loadError = null;
  } catch (err) {
    // keep the original bindings() error if both fail; surface this one if
    // bindings was never tried (shouldn't happen, defensive).
    if (!loadError) loadError = err;
  }
}

function fallbackGetPublicKey() {
  // Mac / missing native: load hex public key shipped beside this module.
  try {
    const fs = require('fs');
    const keyPath = path.join(__dirname, 'client-public-key.txt');
    if (fs.existsSync(keyPath)) {
      const hex = fs.readFileSync(keyPath, 'utf8').trim().replace(/\s+/g, '');
      if (/^[0-9a-fA-F]{64}$/.test(hex)) {
        return Buffer.from(hex, 'hex');
      }
    }
  } catch (_err) {
    // fall through to zero placeholder
  }
  return Buffer.alloc(PUBLIC_KEY_SIZE, 0);
}

/**
 * @returns {Buffer} 32-byte Ed25519 public key.
 */
function getPublicKey() {
  if (nativeModule && typeof nativeModule.getPublicKey === 'function') {
    return nativeModule.getPublicKey();
  }
  return fallbackGetPublicKey();
}

// One-shot startup diagnostics — print clear, actionable warnings when the
// native binding is missing or when the embedded bytes are still the
// placeholder (all zeros). Suppress in test environments via env var.
(function emitStartupDiagnostics() {
  if (process.env.LICENSE_KEY_QUIET === '1') return;

  if (!nativeModule) {
    // eslint-disable-next-line no-console
    console.warn(
      '[license-key] native module not loaded — running in dev fallback mode.\n' +
      '              Tried bindings() then process.resourcesPath/native/license-key.node.\n' +
      '              Run `npm run rebuild` (dev) or ensure extraResources ships the .node (prod).\n' +
      '              Underlying error: ' + (loadError && loadError.message)
    );
    return;
  }

  try {
    const key = nativeModule.getPublicKey();
    // Detect placeholder: 32 bytes all zero.
    if (Buffer.isBuffer(key) && key.length === PUBLIC_KEY_SIZE) {
      let allZero = true;
      for (let i = 0; i < key.length; i += 1) {
        if (key[i] !== 0) { allZero = false; break; }
      }
      if (allZero) {
        // eslint-disable-next-line no-console
        console.warn(
          '[license-key] embedded public key is the all-zero PLACEHOLDER.\n' +
          '              Run task 5.1 (license-server keygen --write) then\n' +
          '              `node src/native/license-key/tools/embed-public-key.js`\n' +
          '              followed by `npm run rebuild` (or `npm run build:license-key`).'
        );
      }
    }
  } catch (_err) {
    // best-effort diagnostic; never throw from the wrapper module load
  }
})();

module.exports = {
  getPublicKey,
  PUBLIC_KEY_SIZE,
  /** @internal — for tests/diagnostics only. */
  _isNativeLoaded: () => nativeModule !== null,
  /** @internal — exposes which lookup path resolved the addon. */
  _loadedFrom: () => loadedFrom,
};
