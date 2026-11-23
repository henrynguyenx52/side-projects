import test from 'node:test';
import assert from 'node:assert/strict';
import { expandCommand, parsePort, parseSshCommand, safeName, shellQuote, validateRemoteBase } from '../src/remote.js';

test('shellQuote protects apostrophes', () => {
  assert.equal(shellQuote("a'b"), `'a'"'"'b'`);
});

test('safeName strips path traversal and unsafe characters', () => {
  assert.equal(safeName('../../ảnh mẫu 01.png'), 'ảnh_mẫu_01.png');
});

test('expandCommand expands supported placeholders only', () => {
  const result = expandCommand('run {runner} --in {input_dir} --images {images} --x {unknown}', {
    inputDir: '/tmp/in', outputDir: '/tmp/out', images: ['/tmp/in/a.png'], videos: [], prompt: '', runner: '/tmp/run.py',
  });
  assert.equal(result, "run '/tmp/run.py' --in '/tmp/in' --images '/tmp/in/a.png' --x {unknown}");
});

test('remote base and port validation', () => {
  assert.equal(validateRemoteBase('/home/user/jobs/'), '/home/user/jobs');
  assert.equal(parsePort('2222'), 2222);
  assert.throws(() => validateRemoteBase('relative/jobs'));
  assert.throws(() => validateRemoteBase('/tmp/jobs;touch-bad'));
  assert.throws(() => parsePort('70000'));
});

test('parses cloud SSH command and ignores local forwarding', () => {
  assert.deepEqual(
    parseSshCommand('ssh -p 11117 root@157.211.174.147 -L 8080:localhost:8080'),
    { host: '157.211.174.147', port: 11117, username: 'root', identityFile: '' },
  );
});

test('parses identity file and quoted paths', () => {
  assert.deepEqual(
    parseSshCommand('ssh -i "~/.ssh/cloud key" ubuntu@gpu.example.com -p 2222'),
    { host: 'gpu.example.com', port: 2222, username: 'ubuntu', identityFile: '~/.ssh/cloud key' },
  );
});
