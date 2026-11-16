'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  extractAccountCodes,
  filterAccounts,
  parseArgs,
  safeMessage
} = require('./filter-accounts-by-points');

test('extractAccountCodes extracts and deduplicates TOKI codes', () => {
  assert.deepEqual(
    extractAccountCodes('TOKI-ACC-one|5\ntext TOKI-ACC-two\nTOKI-ACC-one'),
    ['TOKI-ACC-one', 'TOKI-ACC-two']
  );
});

test('parseArgs validates threshold and concurrency', () => {
  assert.deepEqual(parseArgs(['-m', '50', '-c', '2', '-o', 'out.txt', 'in.txt']), {
    files: ['in.txt'],
    minPoints: 50,
    concurrency: 2,
    output: 'out.txt',
    errors: '',
    help: false
  });
  assert.throws(() => parseArgs(['--concurrency', '11']), /từ 1 đến 10/);
});

test('filterAccounts checks embedded tokens, retries login, and filters by points', async () => {
  const accounts = {
    'TOKI-ACC-rich': { email: 'rich@example.com', password: 'secret', accessToken: 'good-token' },
    'TOKI-ACC-retry': { email: 'retry@example.com', password: 'secret', accessToken: 'expired-token' },
    'TOKI-ACC-empty': { email: 'empty@example.com', password: 'secret', accessToken: '' }
  };
  const cipher = { decryptAccount: (code) => accounts[code] || null };
  const webApi = {
    async loginRunningHub(email) { return { accessToken: `login:${email}` }; },
    async getRemainingCoins(token) {
      if (token === 'expired-token') throw new Error('expired');
      if (token === 'good-token') return 120;
      if (token.includes('retry@')) return 75;
      return 0;
    }
  };

  const result = await filterAccounts(Object.keys(accounts), {
    cipher,
    webApi,
    concurrency: 2,
    minPoints: 1
  });

  assert.deepEqual(result.valid.map(({ code, points }) => [code, points]), [
    ['TOKI-ACC-rich', 120],
    ['TOKI-ACC-retry', 75]
  ]);
  assert.equal(result.empty.length, 1);
  assert.equal(result.errors.length, 0);
});

test('safeMessage removes JWT-like secrets', () => {
  assert.equal(safeMessage(new Error('bad eyJabc.def.ghi')), 'bad [TOKEN]');
});
