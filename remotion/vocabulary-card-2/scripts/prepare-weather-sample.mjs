import {readFile, copyFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const assets = fileURLToPath(new URL('../../../open-montage/projects/weather-duo-30s/assets/sample/', import.meta.url));
const images = fileURLToPath(new URL('../../../open-montage/projects/weather-duo-30s/assets/images/', import.meta.url));
const target = fileURLToPath(new URL('../public/weather-duo/sample/', import.meta.url));
await mkdir(target, {recursive:true});
const {turns} = JSON.parse(await readFile(`${assets}/voice-timings.json`, 'utf8'));
for (const turn of turns) {
  execFileSync('ffmpeg', ['-y','-hide_banner','-loglevel','error','-i',`${assets}/${turn.id}.wav`,'-af','loudnorm=I=-19:TP=-2:LRA=7','-ar','24000',`${target}/${turn.id}.wav`]);
}
await copyFile(`${images}/park-sunny-v1.png`, `${target}/park-sunny-v1.png`);
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','anoisesrc=color=pink:amplitude=0.018:duration=13.8:sample_rate=24000','-af','lowpass=f=1100,highpass=f=150,afade=t=in:d=0.8,afade=t=out:st=12.8:d=1',`${target}/park-breeze.wav`]);
console.log('Prepared sample media with matched dialogue loudness:', target);
