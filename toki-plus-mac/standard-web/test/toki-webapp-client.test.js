'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TokiWebAppClient } = require('../toki-webapp-client');

test('direct RunningHub login uses the supplied email and password', async () => {
  const logins = [];
  const webApi = {
    loginRunningHub: async (email, password) => {
      logins.push({ email, password });
      return { accessToken: 'direct-token' };
    },
    getRemainingCoins: async (token) => token === 'direct-token' ? 505 : 0,
  };
  const client = new TokiWebAppClient({ email: 'owner@example.com', password: 'secret' }, { webApi });
  assert.equal(await client.getBalance(), 505);
  assert.deepEqual(logins, [{ email: 'owner@example.com', password: 'secret' }]);
  client.clearSecrets();
});

test('Toki mode uses the same public app and default instance as the repo', async () => {
  const calls = [];
  const webApi = {
    getRemainingCoins: async () => 505,
    createWebAppTaskStrict: async (...args) => {
      calls.push(args);
      return 'web-task-1';
    },
  };
  const client = new TokiWebAppClient('TOKI-ACC-test-value', {
    webApi,
    account: { email: 'owner@example.com', password: 'password', accessToken: 'token' },
  });
  const taskId = await client.run('image-url', 'video-url');
  assert.equal(taskId, 'web-task-1');
  assert.equal(calls[0][0], '2120937784407310337');
  assert.equal(calls[0][1], 'image-url');
  assert.equal(calls[0][2], 'video-url');
  assert.equal(calls[0][4], 'default');
});

test('Toki mode calculates spent transition coins', async () => {
  let balance = 505;
  const webApi = {
    getRemainingCoins: async () => balance,
    createWebAppTaskStrict: async () => 'web-task-1',
    queryWebAppTask: async () => ({ done: true, status: 'SUCCESS' }),
    getWebAppOutputUrl: async () => 'https://example.com/output.mp4',
  };
  const client = new TokiWebAppClient('TOKI-ACC-test-value', {
    webApi,
    account: { email: 'owner@example.com', password: 'password', accessToken: 'token' },
  });
  await client.run('image-url', 'video-url');
  balance = 470;
  const result = await client.query('web-task-1');
  assert.equal(result.consumeCoins, 35);
  assert.equal(result.balanceAfter, 470);
});
