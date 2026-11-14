#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const https = require('https');
const path = require('path');

const API_HOST = 'www.runninghub.ai';

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(value);
      value = '';
    } else value += char;
  }
  cells.push(value);
  return cells;
}

function parseAccounts(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let columns = ['username', 'password'];
  if (lines[0] && /^username\s*,/i.test(lines[0])) {
    columns = parseCsvLine(lines.shift()).map((column) => column.trim().toLowerCase());
  }
  const accounts = lines.map((line, index) => {
    const cells = line.includes(',') ? parseCsvLine(line) : line.split('|');
    const row = Object.fromEntries(columns.map((column, cellIndex) => [column, String(cells[cellIndex] || '').trim()]));
    const username = row.username;
    const password = row.password || '';
    const apiKey = row.api_key || row.apikey || '';
    if (!username || (!password && !apiKey)) throw new Error(`Dòng ${index + 1} thiếu username hoặc credential`);
    if (apiKey && !/^[0-9a-fA-F]{32}$/.test(apiKey)) throw new Error(`Dòng ${index + 1} có API key không hợp lệ`);
    return { username, password, apiKey: apiKey.toLowerCase() };
  });
  const seen = new Set();
  return accounts.filter(({ username }) => {
    const key = username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function requestJson(route, headers, body, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const request = https.request({
      hostname: API_HOST,
      port: 443,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(raw) });
        } catch (_) {
          reject(new Error(`Server trả dữ liệu không hợp lệ (HTTP ${response.statusCode})`));
        }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('Request timeout')));
    request.on('error', reject);
    request.end(payload);
  });
}

async function getPoints(account) {
  if (account.apiKey) {
    const status = await requestJson('/uc/openapi/accountStatus', {
      Authorization: `Bearer ${account.apiKey}`
    }, { apikey: account.apiKey });
    if (status.data?.code !== 0) {
      throw new Error(status.data?.msg || `Không lấy được thông tin account (HTTP ${status.status})`);
    }
    const points = Number(status.data?.data?.remainCoins ?? status.data?.data?.remainPoint);
    if (!Number.isFinite(points) || points < 0) throw new Error('Point trả về không hợp lệ');
    return points;
  }

  const login = await requestJson('/uc/abroad/pwdLogin', {}, {
    email: account.username,
    password: crypto.createHash('md5').update(account.password).digest('hex')
  });
  if (login.data?.code !== 0 || !login.data?.data?.access_token) {
    throw new Error(login.data?.msg || `Đăng nhập thất bại (HTTP ${login.status})`);
  }

  const summary = await requestJson('/uc/point/summary', {
    Authorization: `Bearer ${login.data.data.access_token}`
  }, {});
  if (summary.data?.code !== 0) {
    throw new Error(summary.data?.msg || `Không lấy được point (HTTP ${summary.status})`);
  }
  const points = Number(
    summary.data?.data?.transitionCoinRemained ??
    summary.data?.data?.pointsRemain ??
    summary.data?.data?.balancePoint
  );
  if (!Number.isFinite(points) || points < 0) throw new Error('Point trả về không hợp lệ');
  return points;
}

async function runPool(accounts, concurrency, checker, onProgress = () => {}) {
  const results = new Array(accounts.length);
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (cursor < accounts.length) {
      const index = cursor++;
      const account = accounts[index];
      try {
        results[index] = { ok: true, ...account, points: await checker(account) };
      } catch (error) {
        results[index] = { ok: false, username: account.username, error: String(error?.message || error).slice(0, 300) };
      }
      completed += 1;
      onProgress(completed, accounts.length, results[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, accounts.length) }, worker));
  return results;
}

function parseArgs(argv) {
  const options = {
    input: 'accounts.csv',
    output: 'accounts-with-points.csv',
    errors: 'account-errors.csv',
    concurrency: 5,
    minPoints: 1
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') options.input = argv[++index];
    else if (arg === '--output') options.output = argv[++index];
    else if (arg === '--errors') options.errors = argv[++index];
    else if (arg === '--concurrency') options.concurrency = Number(argv[++index]);
    else if (arg === '--min-points') options.minPoints = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Tham số không hỗ trợ: ${arg}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 10) {
    throw new Error('--concurrency phải từ 1 đến 10');
  }
  if (!Number.isFinite(options.minPoints) || options.minPoints < 0) {
    throw new Error('--min-points phải >= 0');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('npm start -- --input accounts.csv --concurrency 10 --min-points 1');
    return;
  }
  const accounts = parseAccounts(await fs.readFile(options.input, 'utf8'));
  console.log(`Kiểm tra ${accounts.length} account, mỗi lượt tối đa ${options.concurrency} account...`);
  const results = await runPool(accounts, options.concurrency, getPoints, (done, total, result) => {
    console.log(`[${done}/${total}] ${result.username}: ${result.ok ? `${result.points} point` : `LỖI - ${result.error}`}`);
  });
  const valid = results.filter((item) => item.ok && item.points >= options.minPoints).sort((a, b) => b.points - a.points);
  const empty = results.filter((item) => item.ok && item.points < options.minPoints);
  const errors = results.filter((item) => !item.ok);

  const output = [
    'username,password,api_key,points',
    ...valid.map((item) => [item.username, item.password || '', item.apiKey || '', item.points].map(csvCell).join(','))
  ].join('\n') + '\n';
  const errorOutput = ['username,error', ...errors.map((item) => [item.username, item.error].map(csvCell).join(','))].join('\n') + '\n';
  await fs.writeFile(options.output, output, { mode: 0o600 });
  await fs.writeFile(options.errors, errorOutput, { mode: 0o600 });
  console.log(`Xong: ${valid.length} còn point, ${empty.length} hết/dưới ngưỡng, ${errors.length} lỗi.`);
  console.log(`Kết quả: ${path.resolve(options.output)}`);
  if (errors.length) process.exitCode = 2;
}

module.exports = { csvCell, getPoints, parseAccounts, parseArgs, parseCsvLine, runPool };

if (require.main === module) {
  main().catch((error) => {
    console.error(`Lỗi: ${error.message}`);
    process.exitCode = 1;
  });
}
