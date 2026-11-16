#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { encryptAccount } = require('../src/accounts/account-cipher');

function extractObject(source) {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Không tìm thấy object email trong file nguồn');
  return JSON.parse(source.slice(start, end + 1));
}

function buildCodes(source, password) {
  if (!password) throw new Error('Thiếu password. Hãy đặt biến môi trường ACCOUNT_PASSWORD');
  const emailMap = extractObject(source);
  const emails = [...new Set(Object.values(emailMap).map((value) => String(value).trim()).filter(Boolean))];
  const invalid = emails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (invalid.length) throw new Error(`Có ${invalid.length} email không hợp lệ`);
  return emails.map((email) => encryptAccount({ email, password }));
}

function main() {
  const [, , inputFile, outputFile = 'accounts.txt'] = process.argv;
  if (!inputFile) {
    throw new Error('Cách dùng: node tools/build-account-codes.js <email-map.txt> [accounts.txt]');
  }
  const source = fs.readFileSync(inputFile, 'utf8');
  const codes = buildCodes(source, process.env.ACCOUNT_PASSWORD);
  const target = path.resolve(outputFile);
  fs.writeFileSync(target, `${codes.join('\n')}\n`, { mode: 0o600 });
  console.log(`Đã tạo ${codes.length} mã TOKI-ACC tại ${target}`);
}

module.exports = { buildCodes, extractObject };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Lỗi: ${error.message}`);
    process.exitCode = 1;
  }
}
