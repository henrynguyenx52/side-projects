#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

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

function timestamp(seconds, srt = false) {
  const totalMs = Math.max(0, Math.round(Number(seconds) * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  if (srt) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function wrap(text, width = 48) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

const args = parseArgs(process.argv.slice(2));
for (const key of ['job', 'video', 'config', 'out']) if (!args[key]) fail(`Required option --${key} was not provided`);

const planFile = path.join(args.job, 'episode-plan.json');
for (const file of [planFile, args.video, args.config]) if (!fs.existsSync(file)) fail(`File does not exist: ${file}`);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const config = JSON.parse(fs.readFileSync(args.config, 'utf8'));

if (!config.title) fail('Config requires title');
if (config.title.length > (config.titleLimit ?? 100)) fail(`Title is too long: ${config.title.length} characters`);

const chapters = (plan.scenes ?? []).map((scene, index) => {
  const id = String(scene.id);
  const name = config.chapterNames?.[id] ?? config.chapterNames?.[`scene-${id.padStart(2, '0')}`] ?? scene.name ?? `Scene ${id}`;
  return `${timestamp(index === 0 ? 0 : scene.start)} ${name}`;
});

const bullets = (config.learnBullets ?? []).map((item) => `• ${item}`).join('\n');
const steps = (config.studySteps ?? []).map((item, index) => `${index + 1}. ${item}`).join('\n');
const description = [
  config.descriptionLead,
  bullets && `In this episode, you'll learn:\n${bullets}`,
  steps && `How to study:\n${steps}`,
  chapters.length && `Chapters:\n${chapters.join('\n')}`,
  [config.level && `Level: ${config.level}`, config.language && `Language: ${config.language}`].filter(Boolean).join(' | '),
  config.playlistSuggestion,
  config.descriptionClosing,
  (config.hashtags ?? []).join(' '),
].filter(Boolean).join('\n\n');

if (description.length > (config.descriptionLimit ?? 5000)) fail(`Description is too long: ${description.length} characters`);

const speakerLabels = config.speakerLabels ?? {};
function readOptionalJson(candidates) {
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  return file ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

const lessonDeck = readOptionalJson([
  config.lessonDeck && path.resolve(args.job, config.lessonDeck),
  path.join(args.job, 'artifacts', 'lesson-decks-v3.json'),
  path.join(args.job, 'lesson-deck.json'),
].filter(Boolean));
const lessonTiming = readOptionalJson([
  config.lessonTiming && path.resolve(args.job, config.lessonTiming),
  path.join(args.job, 'lesson-deck-timings-v3.json'),
  path.join(args.job, 'lesson-deck-timings.json'),
].filter(Boolean));

function expandLessonCue(cue) {
  const lesson = lessonDeck?.lessons?.find((item) => String(item.scene) === String(cue.scene));
  const timing = lessonTiming?.lessons?.find((item) => String(item.scene) === String(cue.scene));
  if (!lesson || !timing) return null;
  const expanded = [];
  if (lesson.intro && timing.intro) {
    expanded.push({start: cue.start + timing.intro.start, end: cue.start + timing.intro.end, text: lesson.intro});
  }
  for (const cardTiming of timing.cards ?? []) {
    const card = lesson.cards?.[cardTiming.index];
    if (!card) continue;
    const start = cue.start + cardTiming.start;
    const end = cue.start + cardTiming.end;
    if (Number.isFinite(cardTiming.expressionEnd)) {
      expanded.push({start, end: cue.start + cardTiming.expressionEnd, text: card.expression});
      expanded.push({start: cue.start + cardTiming.expressionEnd, end, text: card.meaning});
    } else {
      expanded.push({start, end, text: `${card.expression}\n${card.meaning}`});
    }
  }
  return expanded.length ? expanded : null;
}

const subtitleCues = [];
for (const cue of plan.cues ?? []) {
  if (!cue.text || !Number.isFinite(cue.start) || !Number.isFinite(cue.end)) continue;
  if (cue.speaker === 'lesson') {
    const expanded = expandLessonCue(cue);
    if (expanded) {
      subtitleCues.push(...expanded);
      continue;
    }
  }
  subtitleCues.push({
    start: cue.start,
    end: cue.end,
    text: `${speakerLabels[cue.speaker] ? `${speakerLabels[cue.speaker]}: ` : ''}${cue.text}`,
  });
}
subtitleCues.sort((a, b) => a.start - b.start);

const srt = subtitleCues.map((cue, index) => [
  index + 1,
  `${timestamp(cue.start, true)} --> ${timestamp(cue.end, true)}`,
  wrap(cue.text),
  '',
].join('\n')).join('\n');

const summary = {
  titleCharacters: config.title.length,
  descriptionCharacters: description.length,
  chapters: chapters.length,
  captionCues: subtitleCues.length,
  video: path.resolve(args.video),
  output: path.resolve(args.out),
  validation: 'passed',
};
console.log(JSON.stringify(summary, null, 2));
if (args.validateOnly) process.exit(0);
if (fs.existsSync(args.out)) fail(`Refusing to overwrite existing output directory: ${args.out}`);

fs.mkdirSync(args.out, {recursive: true});
const videoName = config.uploadVideoName ?? path.basename(args.video);
fs.copyFileSync(args.video, path.join(args.out, videoName));
fs.writeFileSync(path.join(args.out, 'title.txt'), `${config.title}\n`);
fs.writeFileSync(path.join(args.out, 'description.txt'), `${description}\n`);
fs.writeFileSync(path.join(args.out, 'tags.txt'), `${(config.tags ?? []).join(', ')}\n`);
fs.writeFileSync(path.join(args.out, 'chapters.txt'), `${chapters.join('\n')}\n`);
fs.writeFileSync(path.join(args.out, 'captions-en.srt'), srt);
fs.writeFileSync(path.join(args.out, 'pinned-comment.txt'), `${config.pinnedComment ?? ''}\n`);
fs.writeFileSync(path.join(args.out, 'upload-settings.md'), '# Upload settings\n\n- Visibility: Unlisted for review\n- Audience: Confirm with user\n- Language: English\n- Captions: Upload captions-en.srt\n- Thumbnail: Add approved custom thumbnail\n- Playlist: Confirm with user\n- Altered/synthetic disclosure: Review current YouTube guidance and confirm\n');
fs.writeFileSync(path.join(args.out, 'upload-checklist.md'), '# Upload checklist\n\n- [ ] HD processing complete\n- [ ] Title and description reviewed\n- [ ] Thumbnail legible at small size\n- [ ] Captions synchronized\n- [ ] Chapters recognized\n- [ ] Audience and disclosure confirmed\n- [ ] End screen and playlist set\n- [ ] Desktop and mobile playback reviewed\n');
fs.writeFileSync(path.join(args.out, 'metadata.json'), `${JSON.stringify({...config, chapters, validation: summary}, null, 2)}\n`);
console.log(`Created ${path.resolve(args.out)}`);

