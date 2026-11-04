import {KokoroTTS} from '../src/kokoro.js';
import {env} from '@huggingface/transformers';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const out = fileURLToPath(new URL('../../../open-montage/projects/weather-duo-30s/assets/sample/', import.meta.url));
env.cacheDir = fileURLToPath(new URL('../.cache/', import.meta.url));
await mkdir(out, {recursive: true});
const turns = [
  {id:'01-alex', speaker:'Alex', voice:'am_adam', text:"It's such a sunny day!", start:0.55, end:3.2},
  {id:'02-mia', speaker:'Mia', voice:'af_heart', text:'It is! But that wind feels cold.', start:3.2, end:6.8},
  {id:'03-alex', speaker:'Alex', voice:'am_adam', text:"Do you think it'll rain?", start:6.8, end:9.8},
  {id:'04-mia', speaker:'Mia', voice:'af_heart', text:'Maybe. Look at those dark clouds.', start:9.8, end:13.8},
];
console.log('Loading local Kokoro-82M ONNX q8 on CPU');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {dtype:'q8', device:'cpu'});
for (const turn of turns) {
  console.log(`Synthesizing ${turn.id}: ${turn.text}`);
  const audio = await tts.generate(turn.text, {voice:turn.voice, speed:0.94});
  await audio.save(`${out}/${turn.id}.wav`);
  turn.audioDuration = audio.audio.length / audio.sampling_rate;
  if (turn.audioDuration > turn.end - turn.start - 0.08) {
    throw new Error(`Speech exceeds its window: ${turn.id} (${turn.audioDuration}s)`);
  }
  console.log(`${turn.id}: ${turn.audioDuration.toFixed(3)}s`);
}
await writeFile(`${out}/voice-timings.json`, JSON.stringify({model:'onnx-community/Kokoro-82M-v1.0-ONNX',dtype:'q8',speed:0.94,duration:13.8,turns},null,2));
console.log('Sample voices saved:', out);
