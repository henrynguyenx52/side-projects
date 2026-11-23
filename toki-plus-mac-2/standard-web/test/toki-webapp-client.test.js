'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TokiWebAppClient, buildExtraInputs, buildMotionRequest } = require('../toki-webapp-client');
const { MODEL_PRESETS } = require('../config');

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

test('Henry Motion uses the configured app and default instance', async () => {
  const calls = [];
  const webApi = {
    getRemainingCoins: async () => 505,
    createMotionTaskStrict: async (...args) => {
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
  assert.equal(calls[0][0].endpoint, '/openapi/v2/run/ai-app/2113512034955812865');
  assert.equal(calls[0][0].body.nodeInfoList[0].fieldValue, 'image-url');
  assert.equal(calls[0][0].body.nodeInfoList[1].fieldValue, 'video-url');
  assert.equal(calls[0][0].body.instanceType, 'default');
});

test('Henry Motion Plus uses the same app with plus instance', async () => {
  const calls = [];
  const webApi = {
    getRemainingCoins: async () => 505,
    createMotionTaskStrict: async (...args) => {
      calls.push(args);
      return 'web-task-plus';
    },
  };
  const client = new TokiWebAppClient('TOKI-ACC-test-value', {
    webApi,
    account: { email: 'owner@example.com', password: 'password', accessToken: 'token' },
  });
  assert.equal(await client.run('image-url', 'video-url', 'plus'), 'web-task-plus');
  assert.equal(calls[0][0].endpoint, '/openapi/v2/run/ai-app/2113512034955812865');
  assert.equal(calls[0][0].body.instanceType, 'plus');
});

test('all selectable models resolve to the expected workflow or app', () => {
  assert.deepEqual(
    Object.values(MODEL_PRESETS).map((model) => ({
      id: model.id,
      target: model.appId || model.workflowId,
      instanceType: model.instanceType,
    })),
    [
      { id: 'runninghub-wan21-30fps-front-back-standard', target: '2112427207607308290', instanceType: 'default' },
      { id: 'runninghub-wan21-30fps-front-back-aiplus', target: '2112427207607308290', instanceType: 'plus' },
      { id: 'runninghub-standard', target: '2122161294304813058', instanceType: 'default' },
      { id: 'runninghub-aiplus', target: '2122161294304813058', instanceType: 'plus' },
      { id: 'runninghub-wan21-30fps-standard', target: '2103740581160030210', instanceType: 'default' },
      { id: 'runninghub-wan21-30fps-aiplus', target: '2103740581160030210', instanceType: 'plus' },
      { id: 'runninghub-wan21-60fps-standard', target: '2113512034955812865', instanceType: 'default' },
      { id: 'runninghub-wan21-60fps-pro', target: '2113512034955812865', instanceType: 'plus' },
    ],
  );
});

test('30 FPS models include the upscale node', () => {
  const inputs = buildExtraInputs(MODEL_PRESETS['runninghub-wan21-30fps-standard'], '');
  assert.deepEqual(inputs, [
    { nodeId: '308', fieldName: 'upscale_method', fieldValue: 'bicubic' },
  ]);
});

test('workflow models call the workflow endpoint', () => {
  const request = buildMotionRequest(
    MODEL_PRESETS['runninghub-wan21-30fps-front-back-standard'],
    'image-url',
    'back-image-url',
    'video-url',
  );
  assert.equal(request.endpoint, '/openapi/v2/run/workflow/2112427207607308290');
  assert.ok(request.body.nodeInfoList.some((input) => input.nodeId === '492' && input.fieldName === 'text'));
});

test('workflow submission posts to the workflow route', async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ code: 0, data: { taskId: 'workflow-task' } }), { status: 200 });
  };
  const webApi = { getRemainingCoins: async () => 505 };
  const client = new TokiWebAppClient('TOKI-ACC-test-value', {
    fetch,
    webApi,
    account: { email: 'owner@example.com', password: 'password', accessToken: 'token' },
  });

  assert.equal(
    await client.run(
      'image-url',
      'video-url',
      'runninghub-wan21-30fps-front-back-standard',
      'back-image-url',
    ),
    'workflow-task',
  );
  assert.equal(calls[0].url, 'https://www.runninghub.ai/openapi/v2/run/workflow/2112427207607308290');
  assert.equal(JSON.parse(calls[0].options.body).nodeInfoList[0].fieldValue, 'image-url');
});

test('Toki 2.1 models use the exported app', () => {
  for (const modelId of ['runninghub-standard', 'runninghub-aiplus']) {
    const request = buildMotionRequest(
      MODEL_PRESETS[modelId],
      'image-url',
      '',
      'video-url',
    );
    assert.equal(request.endpoint, '/openapi/v2/run/ai-app/2122161294304813058');
  }
});

test('app models call the AI App endpoint without workflow prompt nodes', () => {
  const request = buildMotionRequest(
    MODEL_PRESETS['runninghub-wan21-60fps-standard'],
    'image-url',
    '',
    'video-url',
  );
  assert.equal(request.endpoint, '/openapi/v2/run/ai-app/2113512034955812865');
  assert.deepEqual(request.body.nodeInfoList, [
    { nodeId: '30', fieldName: 'image', fieldValue: 'image-url' },
    { nodeId: '33', fieldName: 'video', fieldValue: 'video-url' },
  ]);
});

test('app submission posts to the AI App route', async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ code: 0, data: { taskId: 'app-task' } }), { status: 200 });
  };
  const webApi = { getRemainingCoins: async () => 505 };
  const client = new TokiWebAppClient('TOKI-ACC-test-value', {
    fetch,
    webApi,
    account: { email: 'owner@example.com', password: 'password', accessToken: 'token' },
  });

  assert.equal(await client.run('image-url', 'video-url'), 'app-task');
  assert.equal(calls[0].url, 'https://www.runninghub.ai/openapi/v2/run/ai-app/2113512034955812865');
});

test('front and back models require and send the back image nodes', () => {
  const model = MODEL_PRESETS['runninghub-wan21-30fps-front-back-aiplus'];
  assert.throws(() => buildExtraInputs(model, ''), /cần ảnh mặt sau/);
  const inputs = buildExtraInputs(model, 'back.png');
  assert.ok(inputs.some((input) => input.nodeId === '492' && input.fieldName === 'text'));
  assert.ok(inputs.some((input) => input.nodeId === '426' && input.fieldValue === 'back.png'));
  assert.ok(inputs.some((input) => input.nodeId === '454' && input.fieldValue === true));
});

test('selected model controls target id, instance type, and extra inputs', async () => {
  const calls = [];
  const webApi = {
    getRemainingCoins: async () => 505,
    createMotionTaskStrict: async (...args) => {
      calls.push(args);
      return 'front-back-task';
    },
  };
  const client = new TokiWebAppClient('TOKI-ACC-test-value', {
    webApi,
    account: { email: 'owner@example.com', password: 'password', accessToken: 'token' },
  });
  const taskId = await client.run(
    'front.png',
    'motion.mp4',
    'runninghub-wan21-30fps-front-back-aiplus',
    'back.png',
  );
  assert.equal(taskId, 'front-back-task');
  assert.equal(calls[0][0].endpoint, '/openapi/v2/run/workflow/2112427207607308290');
  assert.equal(calls[0][0].body.instanceType, 'plus');
  assert.ok(calls[0][0].body.nodeInfoList.some((input) => input.nodeId === '426' && input.fieldValue === 'back.png'));
});

test('Henry Motion calculates spent transition coins', async () => {
  let balance = 505;
  const webApi = {
    getRemainingCoins: async () => balance,
    createMotionTaskStrict: async () => 'web-task-1',
    queryMotionTaskStrict: async () => ({
      done: true,
      status: 'SUCCESS',
      url: 'https://example.com/output.mp4',
      outputs: ['https://example.com/output.mp4'],
    }),
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
