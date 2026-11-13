'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RunningHubClient } = require('../runninghub-client');

function response(body, ok = true, status = 200) {
  return { ok, status, text: async () => JSON.stringify(body) };
}

test('getBalance unwraps RunningHub response', async () => {
  const calls = [];
  const client = new RunningHubClient('secret', {
    fetch: async (url, options) => {
      calls.push({ url, options });
      return response({ code: 0, data: { remainCoins: 123 } });
    },
  });
  assert.equal(await client.getBalance(), 123);
  assert.equal(calls[0].options.headers.authorization, 'Bearer secret');
});

test('runStandard sends only the four expected Standard nodes', async () => {
  let sent;
  const client = new RunningHubClient('secret', {
    fetch: async (_url, options) => {
      sent = JSON.parse(options.body);
      return response({ code: 0, data: { taskId: 'task-1' } });
    },
  });
  const taskId = await client.runStandard({
    workflowId: '2120921661394825218',
    image: 'image.png',
    video: 'motion.mp4',
    prompt: 'positive',
    negativePrompt: 'negative',
  });
  assert.equal(taskId, 'task-1');
  assert.deepEqual(sent.nodeInfoList.map((node) => node.nodeId), ['30', '33', '3', '4']);
  assert.equal(sent.instanceType, 'default');
});

test('query selects video output and reports coin use', async () => {
  const client = new RunningHubClient('secret', {
    fetch: async () => response({
      code: 0,
      data: {
        status: 'SUCCESS',
        outputs: [{ fileUrl: 'https://example.com/result.mp4' }],
        usage: { consumeCoins: 31 },
      },
    }),
  });
  assert.deepEqual(await client.query('task-1'), {
    done: true,
    status: 'SUCCESS',
    url: 'https://example.com/result.mp4',
    outputs: ['https://example.com/result.mp4'],
    consumeCoins: 31,
  });
});
