'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { downloadResultVideo, handle, readJobsSnapshot, writeJobsSnapshot } = require('../server');

function invokeHandle(method, url) {
  return new Promise((resolve, reject) => {
    const response = {
      status: 0,
      headers: null,
      writeHead(status, headers) {
        this.status = status;
        this.headers = headers;
      },
      end(body) {
        try {
          resolve({ status: this.status, headers: this.headers, body: JSON.parse(String(body || '{}')) });
        } catch (error) {
          reject(error);
        }
      },
    };
    Promise.resolve(handle({ method, url, headers: { host: 'localhost' } }, response)).catch(reject);
  });
}

test('config endpoint exposes all eight selectable models', async () => {
  const response = await invokeHandle('GET', '/api/config');
  assert.equal(response.status, 200);
  assert.equal(response.body.models.length, 8);
  assert.equal(response.body.defaultModelId, 'runninghub-wan21-60fps-standard');
  assert.deepEqual(
    response.body.models.map((model) => model.id),
    [
      'runninghub-wan21-30fps-front-back-standard',
      'runninghub-wan21-30fps-front-back-aiplus',
      'runninghub-standard',
      'runninghub-aiplus',
      'runninghub-wan21-30fps-standard',
      'runninghub-wan21-30fps-aiplus',
      'runninghub-wan21-60fps-standard',
      'runninghub-wan21-60fps-pro',
    ],
  );
});

test('downloadResultVideo stores a remote response atomically', async () => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'standard-web-test-'));
  const target = path.join(directory, 'result.mp4');
  try {
    await downloadResultVideo('data:video/mp4;base64,AAECAwQ=', target);
    assert.deepEqual(await fsp.readFile(target), Buffer.from([0, 1, 2, 3, 4]));
    await assert.rejects(fsp.stat(`${target}.part`));
  } finally {
    await fsp.rm(directory, { recursive: true, force: true });
  }
});

test('job snapshots survive a write and reload', async () => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'standard-web-jobs-test-'));
  const records = [{ id: 'job-1', state: 'completed', outputFile: 'job-1.mp4' }];
  try {
    await writeJobsSnapshot(directory, records);
    assert.deepEqual(await readJobsSnapshot(directory), records);
    const stat = await fsp.stat(path.join(directory, 'jobs.json'));
    assert.equal(stat.mode & 0o777, 0o600);
  } finally {
    await fsp.rm(directory, { recursive: true, force: true });
  }
});
