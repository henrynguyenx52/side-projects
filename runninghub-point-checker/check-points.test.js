'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { csvCell, parseAccounts, parseArgs, parseCsvLine, runPool } = require('./check-points');

test('parses CSV and pipe account inputs', () => {
  assert.deepEqual(parseCsvLine('a,"p,ass"'), ['a', 'p,ass']);
  assert.deepEqual(parseAccounts('username,password\na@b.com,pass\na@b.com,pass\nc@d.com|word'), [
    { username: 'a@b.com', password: 'pass', apiKey: '' },
    { username: 'c@d.com', password: 'word', apiKey: '' }
  ]);
  assert.deepEqual(parseAccounts('username,api_key\nacc-1,25722fe682b8478f9c5efd3c5a7f2452'), [
    { username: 'acc-1', password: '', apiKey: '25722fe682b8478f9c5efd3c5a7f2452' }
  ]);
  assert.equal(csvCell('p,ass'), '"p,ass"');
});

test('defaults to five concurrent accounts', () => {
  const options = parseArgs([]);
  assert.equal(options.concurrency, 5);
  assert.throws(() => parseArgs(['--concurrency', '11']), /1 đến 10/);
});

test('checks all accounts and records failures without passwords', async () => {
  const active = 0;
  void active;
  const results = await runPool([
    { username: 'good@example.com', password: 'secret' },
    { username: 'bad@example.com', password: 'secret' }
  ], 10, async ({ username }) => {
    if (username.startsWith('bad')) throw new Error('invalid login');
    return 42;
  });
  assert.equal(results[0].points, 42);
  assert.deepEqual(results[1], { ok: false, username: 'bad@example.com', error: 'invalid login' });
});
