#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--validate-only') args.validateOnly = true;
    else if (token.startsWith('--')) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) fail(`Missing value for ${token}`);
      args[token.slice(2)] = value;
      i += 1;
    } else fail(`Unexpected argument: ${token}`);
  }
  return args;
}

function duration(file) {
  const output = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], {encoding: 'utf8'}).trim();
  const seconds = Number(output);
  if (!Number.isFinite(seconds)) fail(`Could not measure ${file}`);
  return seconds;
}

const args = parseArgs(process.argv.slice(2));
for (const key of ['plan', 'input', 'audio-dir', 'speaker', 'output']) {
  if (!args[key]) fail(`Required option --${key} was not provided`);
}

for (const file of [args.plan, args.input]) {
  if (!fs.existsSync(file)) fail(`File does not exist: ${file}`);
}
if (!fs.existsSync(args['audio-dir'])) fail(`Audio directory does not exist: ${args['audio-dir']}`);

const plan = JSON.parse(fs.readFileSync(args.plan, 'utf8'));
const cues = (plan.cues ?? []).filter((cue) => cue.speaker === args.speaker);
if (cues.length === 0) fail(`No cues found for speaker ${args.speaker}`);

const measured = cues.map((cue) => {
  if (!cue.id || !Number.isFinite(cue.start) || !Number.isFinite(cue.end)) {
    fail(`Cue for ${args.speaker} is missing id/start/end`);
  }
  const file = path.join(args['audio-dir'], `${cue.id}.wav`);
  if (!fs.existsSync(file)) fail(`Missing replacement audio: ${file}`);
  const audioDuration = duration(file);
  const windowDuration = cue.end - cue.start;
  return {...cue, file, audioDuration, windowDuration, overflow: audioDuration - windowDuration};
});

const overflowing = measured.filter((cue) => cue.overflow > 0.15);
if (overflowing.length) {
  for (const cue of overflowing) {
    console.error(`${cue.id}: audio ${cue.audioDuration.toFixed(3)}s exceeds window ${cue.windowDuration.toFixed(3)}s`);
  }
  fail('Replacement audio overflows one or more cue windows');
}

console.log(JSON.stringify({
  speaker: args.speaker,
  cueCount: measured.length,
  input: path.resolve(args.input),
  audioDirectory: path.resolve(args['audio-dir']),
  longestMarginSeconds: Math.max(...measured.map((cue) => cue.overflow)),
  validation: 'passed',
}, null, 2));

if (args.validateOnly) process.exit(0);
if (fs.existsSync(args.output)) fail(`Refusing to overwrite existing output: ${args.output}`);
fs.mkdirSync(path.dirname(path.resolve(args.output)), {recursive: true});

const ffmpegArgs = ['-hide_banner', '-y', '-i', args.input];
for (const cue of measured) ffmpegArgs.push('-i', cue.file);

let base = '[0:a]';
const filters = [];
measured.forEach((cue, index) => {
  const next = `[base${index}]`;
  filters.push(`${base}volume=0:enable='between(t,${cue.start},${cue.end})'${next}`);
  base = next;
});

const mixInputs = [base];
measured.forEach((cue, index) => {
  const delayed = `[voice${index}]`;
  const delayMs = Math.round(cue.start * 1000);
  filters.push(`[${index + 1}:a]adelay=${delayMs}|${delayMs}${delayed}`);
  mixInputs.push(delayed);
});

const episodeDuration = Number(plan.duration) || duration(args.input);
filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:normalize=0,atrim=0:${episodeDuration},aresample=48000,pan=stereo|c0=c0|c1=c1[aout]`);

ffmpegArgs.push(
  '-filter_complex', filters.join(';'),
  '-map', '0:v:0', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-shortest', args.output,
);

execFileSync('ffmpeg', ffmpegArgs, {stdio: 'inherit'});
console.log(`Created ${path.resolve(args.output)}`);

