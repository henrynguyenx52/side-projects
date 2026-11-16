#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const readline = require('readline');
const zlib = require('zlib');

const ACCOUNT_PREFIX = 'TOKI-ACC-';
const MASTER_SECRET = crypto
  .createHash('sha256')
  .update('MOTION_TOKI_EXCLUSIVE_VIP_CIPHER_2026@#!')
  .digest();

function unpackCompactJwt(raw) {
  if (!raw || raw.length < 55) return null;

  let offset = 0;
  const payload = {
    sub: raw.readBigUInt64BE(offset).toString(),
    epoch: 0,
    exp: 0,
    created: 0,
    username: '',
    userRegion: ''
  };
  offset += 8;
  payload.epoch = Number(raw.readBigUInt64BE(offset));
  offset += 8;
  payload.exp = raw.readUInt32BE(offset);
  offset += 4;
  payload.created = Number(raw.readBigUInt64BE(offset));
  offset += 8;
  payload.username = raw.subarray(offset, offset + 16).toString('hex');
  offset += 16;
  payload.userRegion = raw.readUInt8(offset++) === 0 ? 'zh_CN' : 'en_US';

  const header = Buffer.from(JSON.stringify({ alg: 'HS512' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = raw.subarray(offset).toString('base64url');
  return `${header}.${body}.${signature}`;
}

function parsePlaintext(text) {
  const parts = text.split('|');
  if (parts.length < 2) throw new Error('Payload không chứa email và password');

  return {
    email: parts.shift(),
    password: parts.shift(),
    accessToken: parts.shift() || '',
    refreshToken: parts.join('|')
  };
}

function decryptCtr(packed) {
  if (packed.length <= 8) return null;

  const iv = packed.subarray(0, 4);
  const suppliedHmac = packed.subarray(4, 8);
  const ciphertext = packed.subarray(8);
  const expectedHmac = crypto
    .createHmac('sha256', MASTER_SECRET)
    .update(Buffer.concat([iv, ciphertext]))
    .digest()
    .subarray(0, 4);

  if (!crypto.timingSafeEqual(suppliedHmac, expectedHmac)) return null;

  const key = crypto
    .createHash('sha256')
    .update(Buffer.concat([MASTER_SECRET, iv]))
    .digest();
  const decipher = crypto.createDecipheriv('aes-256-ctr', key, Buffer.alloc(16));
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  if (plain[0] !== 0x03 || plain.length < 48) {
    throw new Error('CTR payload có version hoặc độ dài không hợp lệ');
  }

  let offset = 1;
  const emailLength = plain[offset++];
  if (offset + emailLength + 1 > plain.length) throw new Error('Email bị cắt ngắn');
  const email = plain.subarray(offset, offset + emailLength).toString('utf8');
  offset += emailLength;

  const passwordLength = plain[offset++];
  if (offset + passwordLength > plain.length) throw new Error('Password bị cắt ngắn');
  const password = plain.subarray(offset, offset + passwordLength).toString('utf8');
  offset += passwordLength;

  const accessToken = unpackCompactJwt(plain.subarray(offset));
  if (!accessToken) throw new Error('JWT nén không hợp lệ');
  return { email, password, accessToken, refreshToken: '' };
}

function decryptGcm(packed) {
  if (packed.length < 29) throw new Error('GCM payload quá ngắn');

  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_SECRET, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  let inflated = null;
  try {
    inflated = zlib.inflateRawSync(decrypted);
  } catch (_) {
    // Some formats compress only the bytes following the version marker.
  }

  if (inflated && inflated[0] === 0x02 && inflated.length >= 6) {
    let offset = 1;
    const emailLength = inflated[offset++];
    const email = inflated.subarray(offset, offset + emailLength).toString('utf8');
    offset += emailLength;
    const passwordLength = inflated[offset++];
    const password = inflated.subarray(offset, offset + passwordLength).toString('utf8');
    offset += passwordLength;
    const payloadLength = inflated.readUInt16BE(offset);
    offset += 2;
    const jwtPayload = inflated.subarray(offset, offset + payloadLength);
    offset += payloadLength;
    const jwtSignature = inflated.subarray(offset);
    const header = Buffer.from(JSON.stringify({ alg: 'HS512' })).toString('base64url');
    const accessToken = `${header}.${jwtPayload.toString('base64url')}.${jwtSignature.toString('base64url')}`;
    return { email, password, accessToken, refreshToken: '' };
  }

  let plaintext;
  if (decrypted[0] === 0x00) {
    plaintext = zlib.inflateRawSync(decrypted.subarray(1)).toString('utf8');
  } else if (inflated) {
    plaintext = inflated.toString('utf8');
  } else {
    plaintext = decrypted.toString('utf8');
  }
  return parsePlaintext(plaintext);
}

function decryptTokiAccount(input) {
  const rawInput = String(input || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\$/, '');
  const extractedCode = rawInput.match(/TOKI-ACC-[A-Za-z0-9_-]+/);
  const code = extractedCode ? extractedCode[0] : rawInput;

  if (!code.startsWith(ACCOUNT_PREFIX)) {
    throw new Error(`Mã phải bắt đầu bằng ${ACCOUNT_PREFIX}`);
  }

  const encoded = code.slice(ACCOUNT_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error('Payload không phải base64url hợp lệ');
  }

  const packed = Buffer.from(encoded, 'base64url');
  return decryptCtr(packed) || decryptGcm(packed);
}

function decryptAndPrint(input) {
  try {
    console.log(JSON.stringify(decryptTokiAccount(input), null, 2));
    return true;
  } catch (error) {
    console.error(`Không giải mã được: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length) {
    let ok = true;
    for (const input of args) ok = decryptAndPrint(input) && ok;
    if (!ok) process.exitCode = 1;
    return;
  }

  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const input = Buffer.concat(chunks).toString('utf8');
    const codes = input.match(/TOKI-ACC-[A-Za-z0-9_-]+/g) || [input.trim()];
    let ok = true;
    for (const code of codes.filter(Boolean)) ok = decryptAndPrint(code) && ok;
    if (!ok || !codes.some(Boolean)) process.exitCode = 1;
    return;
  }

  console.log('TOKI Account Decryptor');
  console.log('Dán từng mã TOKI-ACC-... rồi nhấn Enter. Gõ exit để thoát.');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\nTOKI-ACC> '
  });

  rl.prompt();
  rl.on('line', (line) => {
    const input = line.trim();
    if (/^(exit|quit|q)$/i.test(input)) {
      rl.close();
      return;
    }
    if (input) decryptAndPrint(input);
    rl.prompt();
  });
}

module.exports = { decryptTokiAccount };

if (require.main === module) main();
