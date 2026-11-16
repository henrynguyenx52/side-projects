#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MIN_POINTS = 1;

function usage() {
  return [
    'Lọc tài khoản TOKI-ACC còn point trên RunningHub.',
    '',
    'Cách dùng:',
    '  node tools/filter-accounts-by-points.js accounts.txt',
    '  cat accounts.txt | node tools/filter-accounts-by-points.js --min-points 100',
    '',
    'Tuỳ chọn:',
    '  -m, --min-points <n>    Giữ account có point >= n (mặc định: 1)',
    '  -c, --concurrency <n>   Số account kiểm tra cùng lúc (mặc định: 4, tối đa: 10)',
    '  -o, --output <file>     File kết quả (mặc định: accounts-with-points.txt)',
    '      --errors <file>     Ghi chi tiết account lỗi dạng JSON',
    '  -h, --help              Hiện hướng dẫn',
    '',
    'File kết quả giữ nguyên mã TOKI-ACC, dạng TOKI-ACC-...|point để import lại vào app.'
  ].join('\n');
}

function readInteger(raw, flag, { min, max }) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${flag} phải là số nguyên từ ${min} đến ${max}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    files: [],
    minPoints: DEFAULT_MIN_POINTS,
    concurrency: DEFAULT_CONCURRENCY,
    output: 'accounts-with-points.txt',
    errors: '',
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '-m' || arg === '--min-points') {
      options.minPoints = readInteger(argv[++index], '--min-points', { min: 0, max: Number.MAX_SAFE_INTEGER });
    } else if (arg === '-c' || arg === '--concurrency') {
      options.concurrency = readInteger(argv[++index], '--concurrency', { min: 1, max: 10 });
    } else if (arg === '-o' || arg === '--output') {
      options.output = argv[++index];
      if (!options.output) throw new Error('--output cần đường dẫn file');
    } else if (arg === '--errors') {
      options.errors = argv[++index];
      if (!options.errors) throw new Error('--errors cần đường dẫn file');
    } else if (arg.startsWith('-')) {
      throw new Error(`Tuỳ chọn không hỗ trợ: ${arg}`);
    } else {
      options.files.push(arg);
    }
  }
  return options;
}

function extractAccountCodes(text) {
  const matches = String(text || '').match(/TOKI-ACC-[A-Za-z0-9_-]+/g) || [];
  return [...new Set(matches)];
}

function safeMessage(error) {
  return String(error?.message || error || 'Lỗi không xác định')
    .replace(/eyJ[A-Za-z0-9_.-]+/g, '[TOKEN]')
    .slice(0, 500);
}

async function resolveAccount(code, cipher) {
  let account = cipher.decryptAccount(code);
  if (!account && typeof cipher.decryptAccountAsync === 'function') {
    account = await cipher.decryptAccountAsync(code);
  }
  if (!account?.email) throw new Error('Mã TOKI-ACC không hợp lệ hoặc không tồn tại');
  return account;
}

async function checkAccount(code, { cipher, webApi }) {
  const account = await resolveAccount(code, cipher);
  let token = String(account.accessToken || '').trim();
  let source = token ? 'embedded-token' : 'login';

  if (token) {
    try {
      const points = await webApi.getRemainingCoins(token);
      if (!Number.isFinite(points) || points < 0) throw new Error('Server trả về point không hợp lệ');
      return { code, email: account.email, points, source };
    } catch (tokenError) {
      if (!account.password || account.password === 'TOKEN_AUTH') throw tokenError;
      source = 'login-after-token';
    }
  }

  if (!account.password || account.password === 'TOKEN_AUTH') {
    throw new Error('Account không có token hợp lệ hoặc password để đăng nhập lại');
  }

  const session = await webApi.loginRunningHub(account.email, account.password);
  token = String(session?.accessToken || '').trim();
  if (!token) throw new Error('Đăng nhập thành công nhưng không nhận được access token');
  const points = await webApi.getRemainingCoins(token);
  if (!Number.isFinite(points) || points < 0) throw new Error('Server trả về point không hợp lệ');
  return { code, email: account.email, points, source };
}

async function mapWithConcurrency(items, concurrency, mapper, onProgress = () => {}) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
      completed += 1;
      onProgress(completed, items.length, results[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function filterAccounts(codes, options) {
  const checked = await mapWithConcurrency(
    codes,
    options.concurrency,
    async (code) => {
      try {
        return { ok: true, ...(await checkAccount(code, options)) };
      } catch (error) {
        return { ok: false, code, error: safeMessage(error) };
      }
    },
    options.onProgress
  );

  const valid = checked
    .filter((result) => result.ok && result.points >= options.minPoints)
    .sort((left, right) => right.points - left.points);
  const empty = checked.filter((result) => result.ok && result.points < options.minPoints);
  const errors = checked.filter((result) => !result.ok);
  return { checked, valid, empty, errors };
}

async function readInput(files, stdin) {
  const chunks = [];
  for (const file of files) chunks.push(await fs.readFile(file, 'utf8'));
  if (!files.length || !stdin.isTTY) {
    const stdinChunks = [];
    for await (const chunk of stdin) stdinChunks.push(chunk);
    chunks.push(Buffer.concat(stdinChunks).toString('utf8'));
  }
  return chunks.join('\n');
}

async function main(argv = process.argv.slice(2), io = process) {
  const options = parseArgs(argv);
  if (options.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }

  const input = await readInput(options.files, io.stdin);
  const codes = extractAccountCodes(input);
  if (!codes.length) throw new Error('Không tìm thấy mã TOKI-ACC nào trong input');

  const cipher = require('../src/accounts/account-cipher');
  const webApi = require('../src/runninghub/web-api');
  io.stdout.write(`Đang kiểm tra ${codes.length} account (min ${options.minPoints} point)...\n`);

  const result = await filterAccounts(codes, {
    ...options,
    cipher,
    webApi,
    onProgress(done, total, item) {
      const status = item.ok ? `${item.points} point` : `lỗi: ${item.error}`;
      io.stdout.write(`[${done}/${total}] ${item.code.slice(0, 18)}... ${status}\n`);
    }
  });

  const output = `${result.valid.map((item) => `${item.code}|${item.points}`).join('\n')}${result.valid.length ? '\n' : ''}`;
  await fs.mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
  await fs.writeFile(options.output, output, { mode: 0o600 });

  if (options.errors) {
    await fs.mkdir(path.dirname(path.resolve(options.errors)), { recursive: true });
    await fs.writeFile(options.errors, `${JSON.stringify(result.errors, null, 2)}\n`, { mode: 0o600 });
  }

  io.stdout.write(
    `Xong: ${result.valid.length} còn point, ${result.empty.length} dưới ngưỡng, ${result.errors.length} lỗi.\n` +
    `Kết quả: ${path.resolve(options.output)}\n`
  );
  return result.errors.length ? 2 : 0;
}

module.exports = {
  checkAccount,
  extractAccountCodes,
  filterAccounts,
  mapWithConcurrency,
  parseArgs,
  safeMessage
};

if (require.main === module) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((error) => {
      console.error(`Lỗi: ${safeMessage(error)}`);
      process.exitCode = 1;
    });
}
