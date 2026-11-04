import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

function parseArgs(argv) {
  const options = {};
  for (let i=0;i<argv.length;i++) {
    const key=argv[i];
    if(key==='--validate-only') options.validateOnly=true;
    else if(['--repo','--plan','--out'].includes(key) && argv[i+1] && !argv[i+1].startsWith('--')) options[key.slice(2)]=argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${key}`);
  }
  if(!options.repo || !options.plan || !options.out) throw new Error('Usage: node synthesize-dialogue.mjs --repo ROOT --plan PLAN.json --out NEW_DIRECTORY [--validate-only]');
  return options;
}

function validate(plan) {
  if(!Number.isFinite(plan.duration) || plan.duration<=0) throw new Error('duration must be positive seconds');
  if(!Number.isInteger(plan.fps) || plan.fps<=0) throw new Error('fps must be a positive integer');
  if(!Number.isFinite(plan.speed) || plan.speed<0.5 || plan.speed>1.5) throw new Error('speed must be between 0.5 and 1.5');
  if(!Array.isArray(plan.speakers) || plan.speakers.length!==2) throw new Error('Provide exactly two speakers');
  const speakers=new Map();
  for(const s of plan.speakers) {
    if(!s || typeof s.id!=='string' || !/^[a-z0-9][a-z0-9-]*$/.test(s.id) || speakers.has(s.id) || typeof s.name!=='string' || !s.name.trim() || typeof s.voice!=='string' || !/^[ab][fm]_[a-z]+$/.test(s.voice)) throw new Error('Each speaker needs a unique safe id, name and English Kokoro voice ID');
    speakers.set(s.id,s);
  }
  if(new Set(plan.speakers.map(s=>s.voice)).size!==2) throw new Error('Choose two distinct voices');
  if(!Array.isArray(plan.turns) || !plan.turns.length) throw new Error('Provide at least one turn');
  let end=0;
  const ids=new Set();
  for(const t of plan.turns) {
    if(!t || typeof t.id!=='string' || !/^[a-z0-9][a-z0-9-]*$/.test(t.id) || ids.has(t.id)) throw new Error('Turn IDs must be unique and file-safe');
    if(!speakers.has(t.speaker) || typeof t.text!=='string' || !t.text.trim()) throw new Error(`Unknown speaker or empty text: ${t.id}`);
    if(!Number.isFinite(t.start) || !Number.isFinite(t.end) || t.start<end || t.end<=t.start || t.end>plan.duration) throw new Error(`Invalid, overlapping or out-of-range time window: ${t.id}`);
    if(Math.round(t.end*plan.fps)<=Math.round(t.start*plan.fps)) throw new Error(`Turn is shorter than one frame: ${t.id}`);
    ids.add(t.id); end=t.end;
  }
  return speakers;
}

async function main() {
  const options=parseArgs(process.argv.slice(2));
  const repo=resolve(options.repo), output=resolve(options.out);
  const plan=JSON.parse(await readFile(resolve(options.plan),'utf8'));
  const speakers=validate(plan);
  if(options.validateOnly) {
    console.log(`Valid: ${plan.turns.length} turns, ${plan.duration}s, ${Math.round(plan.duration*plan.fps)} frames, voices ${plan.speakers.map(s=>s.voice).join(' / ')}`);
    return;
  }
  try {await access(output);} catch(error) {if(error.code!=='ENOENT') throw error;}
  // Require a fresh output directory, preserving prior versions and partial runs.
  try {await mkdir(output,{recursive:false});} catch(error) {if(error.code==='EEXIST') throw new Error(`Output already exists; choose a new version directory: ${output}`); throw error;}
  const kokoro=join(repo,'kokoro','kokoro.js');
  execFileSync('ffmpeg',['-version'],{stdio:'ignore'});
  const {env}=await import(pathToFileURL(join(kokoro,'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
  env.cacheDir=join(kokoro,'.cache');
  const {KokoroTTS}=await import(pathToFileURL(join(kokoro,'src/kokoro.js')).href);
  const unknown=plan.speakers.find(s=>!Object.hasOwn((new KokoroTTS(null,null)).voices,s.voice));
  if(unknown) throw new Error(`Voice is absent from this Kokoro version: ${unknown.voice}`);
  console.log('Loading Kokoro-82M ONNX q8 on CPU');
  const tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'cpu'});
  const raw=join(output,'raw'); await mkdir(raw);
  const measured=[];
  for(const turn of plan.turns) {
    const speaker=speakers.get(turn.speaker);
    console.log(`${turn.id} (${speaker.voice}): ${turn.text}`);
    const audio=await tts.generate(turn.text,{voice:speaker.voice,speed:plan.speed});
    const rawPath=join(raw,`${turn.id}.wav`);
    await audio.save(rawPath);
    const audioDuration=audio.audio.length/audio.sampling_rate;
    if(!Number.isFinite(audioDuration) || audioDuration<=0) throw new Error(`No audio generated: ${turn.id}`);
    if(audioDuration>turn.end-turn.start-0.08) throw new Error(`${turn.id} needs ${audioDuration.toFixed(3)}s plus an 80ms guard, but its window is ${(turn.end-turn.start).toFixed(3)}s. Shorten the line or revise the plan; raw audio retained.`);
    const audioPath=join(output,`${turn.id}.wav`);
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',rawPath,'-af','loudnorm=I=-19:TP=-2:LRA=7','-ar','24000',audioPath]);
    measured.push({...turn,voice:speaker.voice,audioDuration,startFrame:Math.round(turn.start*plan.fps),endFrame:Math.round(turn.end*plan.fps),audioFile:`${turn.id}.wav`});
  }
  await writeFile(join(output,'voice-timings.json'),JSON.stringify({...plan,model:'onnx-community/Kokoro-82M-v1.0-ONNX',dtype:'q8',normalization:'loudnorm=I=-19:TP=-2:LRA=7',turns:measured},null,2));
  console.log(`Saved ${measured.length} normalized dialogue files and measured timings to ${output}`);
}

main().catch(error=>{console.error(`Dialogue generation failed: ${error.message}`);if(error.cause?.message)console.error(error.cause.message);process.exitCode=1;});
