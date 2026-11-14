'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { downloadResultVideo, readJobsSnapshot, writeJobsSnapshot } = require('../server');

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
