import path from 'node:path';
import fs from 'node:fs/promises';
import { KokoroTTS } from './kokoro.js/src/kokoro.js';
import { phonemize } from './kokoro.js/src/phonemize.js';
import { env } from './kokoro.js/node_modules/@huggingface/transformers/dist/transformers.node.mjs';

const ROOT_DIR = path.resolve(import.meta.dirname);
const SAMPLES_DIR = path.join(ROOT_DIR, 'kokoro_voice_samples');
const OTHER_LANG_DIR = path.join(SAMPLES_DIR, 'other_languages');

env.cacheDir = path.join(ROOT_DIR, 'kokoro.js', '.cache');

const sampleText = "Hello! This is a test sample of Kokoro TTS. I hope you find my voice clear, natural, and pleasant to listen to.";

const voices = [
  // US Female
  { id: "af_heart", lang: "a", dir: SAMPLES_DIR },
  { id: "af_bella", lang: "a", dir: SAMPLES_DIR },
  { id: "af_nicole", lang: "a", dir: SAMPLES_DIR },
  { id: "af_sarah", lang: "a", dir: SAMPLES_DIR },
  { id: "af_sky", lang: "a", dir: SAMPLES_DIR },
  { id: "af_alloy", lang: "a", dir: SAMPLES_DIR },
  { id: "af_aoede", lang: "a", dir: SAMPLES_DIR },
  { id: "af_jessica", lang: "a", dir: SAMPLES_DIR },
  { id: "af_kore", lang: "a", dir: SAMPLES_DIR },
  { id: "af_nova", lang: "a", dir: SAMPLES_DIR },
  { id: "af_river", lang: "a", dir: SAMPLES_DIR },

  // US Male
  { id: "am_adam", lang: "a", dir: SAMPLES_DIR },
  { id: "am_michael", lang: "a", dir: SAMPLES_DIR },
  { id: "am_echo", lang: "a", dir: SAMPLES_DIR },
  { id: "am_eric", lang: "a", dir: SAMPLES_DIR },
  { id: "am_fenrir", lang: "a", dir: SAMPLES_DIR },
  { id: "am_liam", lang: "a", dir: SAMPLES_DIR },
  { id: "am_onyx", lang: "a", dir: SAMPLES_DIR },
  { id: "am_puck", lang: "a", dir: SAMPLES_DIR },
  { id: "am_santa", lang: "a", dir: SAMPLES_DIR },

  // UK Female
  { id: "bf_emma", lang: "b", dir: SAMPLES_DIR },
  { id: "bf_isabella", lang: "b", dir: SAMPLES_DIR },
  { id: "bf_alice", lang: "b", dir: SAMPLES_DIR },
  { id: "bf_lily", lang: "b", dir: SAMPLES_DIR },

  // UK Male
  { id: "bm_george", lang: "b", dir: SAMPLES_DIR },
  { id: "bm_lewis", lang: "b", dir: SAMPLES_DIR },
  { id: "bm_daniel", lang: "b", dir: SAMPLES_DIR },
  { id: "bm_fable", lang: "b", dir: SAMPLES_DIR },

  // Other languages
  { id: "ef_dora", lang: "a", dir: OTHER_LANG_DIR },
  { id: "em_alex", lang: "a", dir: OTHER_LANG_DIR },
  { id: "em_santa", lang: "a", dir: OTHER_LANG_DIR },
  { id: "ff_siwis", lang: "a", dir: OTHER_LANG_DIR },
  { id: "hf_alpha", lang: "a", dir: OTHER_LANG_DIR },
  { id: "hf_beta", lang: "a", dir: OTHER_LANG_DIR },
  { id: "hm_omega", lang: "a", dir: OTHER_LANG_DIR },
  { id: "hm_psi", lang: "a", dir: OTHER_LANG_DIR },
  { id: "if_sara", lang: "a", dir: OTHER_LANG_DIR },
  { id: "im_nicola", lang: "a", dir: OTHER_LANG_DIR },
  { id: "jf_alpha", lang: "a", dir: OTHER_LANG_DIR },
  { id: "jf_gongitsune", lang: "a", dir: OTHER_LANG_DIR },
  { id: "jf_nezumi", lang: "a", dir: OTHER_LANG_DIR },
  { id: "jf_tebukuro", lang: "a", dir: OTHER_LANG_DIR },
  { id: "jm_kumo", lang: "a", dir: OTHER_LANG_DIR },
  { id: "pf_dora", lang: "a", dir: OTHER_LANG_DIR },
  { id: "pm_alex", lang: "a", dir: OTHER_LANG_DIR },
  { id: "pm_santa", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zf_xiaobei", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zf_xiaoni", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zf_xiaoxiao", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zf_xiaoyi", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zm_yunjian", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zm_yunxi", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zm_yunxia", lang: "a", dir: OTHER_LANG_DIR },
  { id: "zm_yunyang", lang: "a", dir: OTHER_LANG_DIR },
];

async function main() {
  await fs.mkdir(SAMPLES_DIR, { recursive: true });
  await fs.mkdir(OTHER_LANG_DIR, { recursive: true });

  console.log("Loading Kokoro-82M ONNX model...");
  const t0Model = Date.now();
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
    device: 'cpu'
  });
  console.log(`Model loaded in ${((Date.now() - t0Model) / 1000).toFixed(2)}s.`);

  console.log("Pre-phonemizing sample text for 'a' (US) and 'b' (UK)...");
  const phonemesA = await phonemize(sampleText, 'a');
  const phonemesB = await phonemize(sampleText, 'b');

  const tokensA = tts.tokenizer(phonemesA, { truncation: true });
  const tokensB = tts.tokenizer(phonemesB, { truncation: true });

  const total = voices.length;
  console.log(`Starting generation for all ${total} voices...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < total; i++) {
    const { id, lang, dir } = voices[i];
    const outFile = path.join(dir, `${id}.wav`);
    const inputIds = lang === 'a' ? tokensA.input_ids : tokensB.input_ids;

    const t0 = Date.now();
    try {
      const audio = await tts.generate_from_ids(inputIds, { voice: id, speed: 1 });
      await audio.save(outFile);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      successCount++;
      console.log(`[${i + 1}/${total}] Generated ${path.relative(SAMPLES_DIR, outFile)} in ${elapsed}s`);
    } catch (err) {
      failCount++;
      console.error(`[${i + 1}/${total}] FAILED ${id}: ${err.message}`);
    }
  }

  console.log("\n=================================");
  console.log(`Generation complete! Success: ${successCount}, Failed: ${failCount}`);
  console.log(`Samples saved to: ${SAMPLES_DIR}`);
  console.log("=================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

