import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLineReader,
  expandCommand,
  parseAigcProgressLine,
  parsePort,
  parseSshCommand,
  safeName,
  shellQuote,
  validateRemoteBase,
} from '../src/remote.js';

test('shellQuote protects apostrophes', () => {
  assert.equal(shellQuote("a'b"), `'a'"'"'b'`);
});

test('safeName strips path traversal and unsafe characters', () => {
  assert.equal(safeName('../../ảnh mẫu 01.png'), 'ảnh_mẫu_01.png');
});

test('expandCommand expands supported placeholders only', () => {
  const result = expandCommand('run {runner} --workflow {workflow} --in {input_dir} --images {images} --x {unknown}', {
    inputDir: '/tmp/in', outputDir: '/tmp/out', images: ['/tmp/in/a.png'], videos: [], prompt: '', runner: '/tmp/run.py', workflow: '/tmp/flow.json',
  });
  assert.equal(result, "run '/tmp/run.py' --workflow '/tmp/flow.json' --in '/tmp/in' --images '/tmp/in/a.png' --x {unknown}");
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

test('parseAigcProgressLine parses valid progress markers and rejects normal logs', () => {
  assert.deepEqual(
    parseAigcProgressLine('@@PROGRESS {"percent": 42, "stage": "Chunk 2/4 · Step 1/3", "eta_seconds": 85}'),
    { percent: 42, stage: 'Chunk 2/4 · Step 1/3', etaSeconds: 85 },
  );
  assert.equal(parseAigcProgressLine('Normal stdout log'), null);
  assert.equal(parseAigcProgressLine('@@PROGRESS {bad json'), null);
});

test('createLineReader handles partial chunks and trailing flush', () => {
  const lines = [];
  const reader = createLineReader((line) => lines.push(line));
  reader.push('first\nsec');
  reader.push('ond\r\nthird');
  assert.deepEqual(lines, ['first', 'second']);
  reader.flush();
  assert.deepEqual(lines, ['first', 'second', 'third']);
});
