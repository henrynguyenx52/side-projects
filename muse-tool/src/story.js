"use strict";

const fs = require("fs");
const path = require("path");
const { execFile, execFileSync } = require("child_process");
const { MEDIA_DIR } = require("./config");

const CINEMATIC_STYLES = {
  hollywood_35mm: {
    name: "Classic Hollywood 35mm",
    description: "Arri Alexa, warm 35mm film grain, anamorphic lens flare, cinematic depth of field, dramatic three-point lighting",
    promptTag: "shot on 35mm film, Arri Alexa Mini LF, warm Kodak 5219 film grain, anamorphic lens flare, shallow depth of field, cinematic volumetric three-point lighting, movie masterpiece, 8k cinematic composition",
  },
  film_noir: {
    name: "Film Noir Mystery",
    description: "High contrast monochrome / sepia, deep harsh shadows, Venetian blind rim lighting, smoky atmospheric haze",
    promptTag: "classic film noir cinematography, high-contrast chiaroscuro lighting, deep shadows, Venetian blind silhouette patterns, dense smoky haze, 1940s vintage cinema mystery, moody atmospheric contrast",
  },
  sci_fi_cyberpunk: {
    name: "Cyberpunk Sci-Fi",
    description: "Neon cyan and magenta accents, wet asphalt reflections, horizontal blue streaks, atmospheric rain",
    promptTag: "Blade Runner sci-fi cinematic style, vivid neon cyan and magenta illumination, wet pavement reflections, anamorphic blue horizontal lens flares, dense misty rain, futuristic dystopian cinematic depth",
  },
  wes_anderson: {
    name: "Wes Anderson Symmetrical",
    description: "Strict symmetrical wide framing, pastel color palette, meticulous pastel art direction, whimsical vintage aesthetic",
    promptTag: "Wes Anderson aesthetic, perfect strict symmetrical one-point perspective framing, vibrant pastel color palette, meticulous whimsical set design, retro vintage 16mm Kodak film stock, quirky storybook cinema",
  },
  christopher_nolan: {
    name: "IMAX 70mm Epic",
    description: "Ultra-crisp IMAX 70mm resolution, deep moody earth and steel tones, grand architectural scale, natural practical lighting",
    promptTag: "Christopher Nolan IMAX 70mm cinematography, pristine ultra-crisp resolution, muted earth and steel color grading, grand architectural scale, practical natural lighting, intense cinematic atmosphere, shot on Panavision 70mm",
  },
  vintage_70s: {
    name: "Vintage 1970s Panavision",
    description: "Kodak warm vintage saturation, soft bloom highlights, natural film grain, authentic 70s cinema",
    promptTag: "1970s Panavision cinema, authentic vintage Kodak 5247 warm color saturation, soft glowing highlight bloom, organic vintage film grain, nostalgic 1970s film aesthetic",
  },
  makoto_shinkai: {
    name: "Cinematic Anime (Shinkai)",
    description: "Luminous skies, golden volumetric god rays, hyper-detailed painterly scenery, emotional cinematic lighting",
    promptTag: "Makoto Shinkai cinematic anime masterpiece, hyper-detailed cloudscapes, golden volumetric sun god rays, crystal clear sparkling water reflections, painterly anime film lighting, breathtaking emotional cinema",
  },
  dark_fantasy: {
    name: "Dark Fantasy Gothic",
    description: "Gritty desaturated tones, mist and embers, dramatic chiaroscuro lighting, dark medieval cinematic mood",
    promptTag: "dark fantasy cinematic epic, desaturated gritty muted tones, swirling atmospheric fog and glowing embers, dramatic chiaroscuro lighting, dark gothic mood, cinematic medieval masterpiece",
  },
  golden_hour: {
    name: "Golden Hour Romance",
    description: "Warm amber rim lighting, glowing lens bokeh, cinematic sun flare, soft atmospheric glow",
    promptTag: "golden hour cinematic lighting, warm amber backlight, soft creamy bokeh, glowing sun flare, romantic ethereal atmosphere, cinematic slow tracking shot, 35mm warmth",
  },
  custom: {
    name: "Tùy chỉnh (Custom)",
    description: "Nhập phong cách điện ảnh riêng của bạn",
    promptTag: "",
  },
};

const CINEMATIC_VOICES = {
  natural_dialogue: {
    name: "Tự động theo nhân vật (Nam/Nữ thông minh - Khuyên dùng)",
    description: "Khớp giọng chuẩn xác theo nhân vật đang thoại trong từng cảnh (Nam giọng nam, Nữ giọng nữ)",
    promptTag: "natural on-screen character dialogue matching character gender (authentic expressive male voice for male character, authentic expressive female voice for female character)",
  },
  female_warm: {
    name: "Nữ trầm ấm, truyền cảm (Warm Female Narrator)",
    description: "Giọng nữ studio chuyên nghiệp, ấm áp, nhịp điệu kể chuyện truyền cảm",
    promptTag: "warm, soothing, elegant female narrator voice, clear professional Vietnamese pronunciation, emotional storytelling cadence",
  },
  female_gentle: {
    name: "Nữ nhẹ nhàng, trong trẻo (Gentle Female Voice)",
    description: "Giọng nữ trẻ dịu dàng, trong trẻo, thân mật và thanh bình",
    promptTag: "soft, gentle, youthful female voice, peaceful intimate cadence, crystal clear pronunciation",
  },
  male_cinematic: {
    name: "Nam trầm ấm điện ảnh (Deep Cinematic Male Voice)",
    description: "Giọng nam trầm, đĩnh đạc, phong cách phim tài liệu điện ảnh",
    promptTag: "deep resonant cinematic male narrator voice, mature, movie trailer documentary tone, slow dramatic cadence",
  },
  male_inspirational: {
    name: "Nam truyền cảm hứng (Inspirational Male Voice)",
    description: "Giọng nam rõ ràng, đầy tự tin và truyền cảm hứng",
    promptTag: "confident, articulate, inspiring male speaker voice, uplifting storytelling tone",
  },
  ambient_sfx_only: {
    name: "Không lời thoại (Chỉ âm thanh tự nhiên & Nhạc nền)",
    description: "Không có giọng đọc, chỉ tập trung âm thanh môi trường và nhạc nền",
    promptTag: "strictly no spoken dialogue, no narration, purely atmospheric environmental audio and cinematic background music",
  },
};

/**
 * Extracts the very last frame of a video file as a high quality PNG image using ffmpeg.
 */
function extractLastFrame(videoPath, outputFramePath) {
  return new Promise((resolve, reject) => {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return reject(new Error("Video path không tồn tại để trích xuất frame"));
    }

    const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    // Attempt 1: Fast seek to 0.1s before end (-sseof -0.1)
    execFile(
      ffmpegBin,
      ["-y", "-sseof", "-0.1", "-i", videoPath, "-update", "1", "-q:v", "2", outputFramePath],
      (err) => {
        if (!err && fs.existsSync(outputFramePath) && fs.statSync(outputFramePath).size > 100) {
          return resolve(outputFramePath);
        }

        // Attempt 2 Fallback: Probe exact duration and extract frame at duration - 0.2s
        const dur = probeVideoDuration(videoPath);
        const targetSs = Math.max(0, dur - 0.2);
        execFile(
          ffmpegBin,
          ["-y", "-ss", String(targetSs), "-i", videoPath, "-vframes", "1", "-q:v", "2", outputFramePath],
          (fallbackErr) => {
            if (fallbackErr || !fs.existsSync(outputFramePath) || fs.statSync(outputFramePath).size < 100) {
              return reject(
                new Error(`Không thể trích xuất khung hình cuối: ${fallbackErr?.message || err?.message}`)
              );
            }
            resolve(outputFramePath);
          }
        );
      }
    );
  });
}

function buildCinematicScenePrompt({
  scene = {},
  sceneIndex = 0,
  totalScenes = 1,
  styleKey = "hollywood_35mm",
  customStyle = "",
  voiceKey = "female_warm",
  duration = "10s",
  hasLastFrame = false,
  globalReferenceImages = [],
  aspectRatio = "16:9",
  quality = "2K",
  commonPromptHead = "",
  commonPromptTail = "",
  commonPrompt = "",
}) {
  const blocks = [];
  const targetSec = parseInt(String(scene.duration || duration || "10s").replace(/[^\d]/g, ""), 10) || 10;

  // Header tag
  blocks.push(
    `[SCENE ${sceneIndex + 1} OF ${totalScenes}]:`
  );

  // 0. Common Prompt Đầu (Header / Prefix at the very top of each scene prompt)
  const cleanHead = String(commonPromptHead || scene.commonPromptHead || "").trim();
  if (cleanHead) {
    if (cleanHead.startsWith("[")) {
      blocks.push(cleanHead);
    } else {
      blocks.push(`[COMMON PROMPT - ĐẦU]:\n${cleanHead}`);
    }
  }

  // 1. Target Duration
  blocks.push(
    `[DURATION INSTRUCTION]:\n` +
    `Exact video duration: ${targetSec}s.`
  );

  // 2. Character Consistency Lock
  blocks.push(
    `[CHARACTER IDENTITY & CONTINUITY LOCK]:\n` +
    `Maintain strict visual consistency of the character identity, facial features, hair, and wardrobe according to the global reference images.`
  );

  // 3. Global references (characters, environment, product) for the whole video
  const characterRefs = (Array.isArray(globalReferenceImages) ? globalReferenceImages : []).filter(
    (img) => img && (img.role === "character" || !img.role)
  );
  if (characterRefs.length > 0) {
    blocks.push(
      `[GLOBAL CHARACTER & IDENTITY LOCK - WHOLE VIDEO]:\n` +
      `Strictly preserve the exact face, identity, hair, costume, and physical proportions of the attached global character reference images across this entire scene.`
    );
  }

  const envOrStyleRefs = (Array.isArray(globalReferenceImages) ? globalReferenceImages : []).filter(
    (img) => img && (img.role === "style" || img.role === "product")
  );
  if (envOrStyleRefs.length > 0) {
    blocks.push(
      `[GLOBAL AESTHETIC & ASSET LOCK]:\n` +
      `Strictly maintain the visual style, palette, and key object details from the attached global reference images.`
    );
  }

  // 4. Voiceover & Audio Consistency Lock
  const effectiveVoiceKey = voiceKey || "natural_dialogue";
  const voiceObj = CINEMATIC_VOICES[effectiveVoiceKey] || CINEMATIC_VOICES.natural_dialogue;
  const voiceTag = voiceObj.promptTag;

  // Detect speaker from scene text and narration
  const scenePromptText = String(scene.prompt || "").trim();
  const sceneNarration = scene.narration ? String(scene.narration).trim() : "";
  const combinedText = `${scenePromptText} ${sceneNarration}`.toLowerCase();

  const maleQuoteMatch = /(?:chàng trai|người đàn ông|anh ấy|\banh\b)\s*[^,;:.!?\n]*?\s*(?:cất lời|cất giọng|nói|lên tiếng|thì thầm|hào hứng|bảo)[:\s]+["“']/i.test(combinedText);
  const femaleQuoteMatch = /(?:cô gái|người phụ nữ|cô ấy|\bem\b)\s*[^,;:.!?\n]*?\s*(?:cất lời|cất giọng|nói|lên tiếng|thì thầm|hào hứng|bảo)[:\s]+["“']/i.test(combinedText);

  const isMaleSpeaker = maleQuoteMatch || (/(?:chàng trai cất|anh cất|anh nói|anh hào hứng nói)/i.test(combinedText) && !femaleQuoteMatch);
  const isFemaleSpeaker = femaleQuoteMatch || (/(?:cô gái cất|cô cất|cô nói|em nói|cô gái thì thầm)/i.test(combinedText) && !maleQuoteMatch);

  if (effectiveVoiceKey === "ambient_sfx_only") {
    blocks.push(
      `[AUDIO & VOICE DIRECTION - NO SPOKEN DIALOGUE]:\n` +
      `STRICTLY NO SPOKEN WORDS, NO DIALOGUE, NO NARRATION.\n` +
      `Audio must consist only of natural environmental sound effects (foley) and subtle cinematic soundtrack matching the film mood.`
    );
  } else if (effectiveVoiceKey === "natural_dialogue" || isMaleSpeaker || isFemaleSpeaker) {
    let genderDirective = "";
    if (isMaleSpeaker && !isFemaleSpeaker) {
      genderDirective = `MANDATORY SPEAKER: The character speaking dialogue in this scene is MALE (chàng trai). You MUST use a natural, warm, expressive young MALE voice matching the on-screen actor. STRICTLY DO NOT USE A FEMALE VOICE for this male character!`;
    } else if (isFemaleSpeaker && !isMaleSpeaker) {
      genderDirective = `MANDATORY SPEAKER: The character speaking dialogue in this scene is FEMALE (cô gái). You MUST use a natural, clear, gentle young FEMALE voice matching the on-screen actress. STRICTLY DO NOT USE A MALE VOICE for this female character!`;
    } else {
      genderDirective = `CHARACTER GENDER MATCHING: Dialogue must strictly match the gender of the character speaking on screen (Male actor speaks with authentic male voice, female actress speaks with authentic female voice).`;
    }

    blocks.push(
      `[AUDIO & DIALOGUE GENDER LOCK]:\n` +
      `${genderDirective}\n` +
      `NATURAL VOCAL CADENCE: Deliver lines with genuine emotion and clear Vietnamese pronunciation.\n` +
      `STRICT REALISM: AVOID awkward artificial laughing sounds, uncanny robotic giggles, or unnatural breath gasps. Convey joy, happiness, and affection through a warm, smiling vocal tone and clean speech delivery.`
    );
  } else {
    blocks.push(
      `[AUDIO & VOICE CONTINUITY LOCK]:\n` +
      `Voice Profile: ${voiceTag}.\n` +
      `Maintain consistent vocal timbre, natural pronunciation, and clear emotional cadence across scenes.`
    );
  }

  // 5. The core scene prompt (contains all script, camera angles, and action directly from user prompt)
  if (scenePromptText) {
    blocks.push(`[CINEMATIC SCENE SCRIPT & CHOREOGRAPHY]:\n${scenePromptText}`);
  }

  // 6. Spoken dialogue / narration (if specified separately and not already in prompt)
  if (sceneNarration && !scenePromptText.includes(sceneNarration)) {
    blocks.push(
      `[SPOKEN DIALOGUE / NARRATION]:\n` +
      `Spoken line: "${sceneNarration}"\n` +
      `Deliver naturally during the middle shot (around 03.5s - 06.5s). The speech MUST FINISH COMPLETELY before 07.5s, leaving the final 2.5 - 3.0 seconds completely silent of speech for natural breathing room, background atmosphere, and character visual reaction. Strictly never cut off speech mid-word or mid-sentence. Do NOT render subtitles or captions on screen.`
    );
  }

  // 7. Specifications
  const specs = [];
  specs.push(`duration: ${targetSec}s`);
  if (targetSec <= 5) specs.push(`single ${targetSec}-second short clip`, `exact duration ${targetSec}s`);
  if (aspectRatio) specs.push(`aspect ratio ${aspectRatio}`);
  if (quality) specs.push(`resolution ${quality}`);
  blocks.push(`[TECHNICAL SPECS]: ${specs.join(", ")}`);

  // 8. Common Prompt Cuối (Footer / Suffix at the very bottom of each scene prompt)
  const cleanTail = String(commonPromptTail || commonPrompt || scene.commonPromptTail || scene.commonPrompt || "").trim();
  if (cleanTail) {
    if (cleanTail.startsWith("[")) {
      blocks.push(cleanTail);
    } else {
      blocks.push(`[COMMON PROMPT - CUỐI]:\n${cleanTail}`);
    }
  }

  return blocks.join("\n\n");
}

/**
 * Intelligent breakdown of a film script or synopsis into cinematic scenes
 * with camera angles, narration lines, and continuity suggestions.
 */
/**
 * Auto-detect scene duration from prompt text
 * Supports: "Thời lượng: 10 giây", "Thời lượng: 8 giây", "Duration: 10s", etc.
 */
function detectDurationFromText(text) {
  if (!text) return null;
  const m1 = text.match(/(?:thời lượng|duration|thời gian)[:\s—–-]*(\d+)\s*(?:giây|s|sec|seconds)?\b/i);
  if (m1 && m1[1]) {
    const sec = parseInt(m1[1], 10);
    if (sec > 0 && sec <= 60) return `${sec}s`;
  }
  const head = text.split(/\r?\n/).slice(0, 4).join(" ");
  const m2 = head.match(/\b(\d+)\s*(?:giây|seconds|second)\b/i);
  if (m2 && m2[1]) {
    const sec = parseInt(m2[1], 10);
    if (sec > 0 && sec <= 60) return `${sec}s`;
  }
  const m3 = head.match(/\b(20|15|12|10|9|8|7|6|5|4|3)\s*s\b/i);
  if (m3 && m3[1]) {
    return `${m3[1]}s`;
  }
  return null;
}

/**
 * Video-Shotcraft Cinematic Script Breakdown Engine
 *
 * Deploys the principles from video-shotcraft (promo-energy-arc.md, aesthetic-rules.md, camera cards):
 * 1. Pacing & Breathing (R1/R3): Default 10s per scene.
 * 2. Dialogue Timing (C1/S1): Short, poetic lines (10-15 words) that finish before 7.5s, avoiding speech cutoffs.
 * 3. Camera Grammar:
 *    - Act 1 (Opening): Spotlight hero / crane-rise establishing shot
 *    - Act 2 (Progression): Orbit tracking shot / lateral glide following character movement
 *    - Act 3 (Climax / Resolution): Ascending crane pullback / emotional close-up with lingering hold
 */
function breakdownCinematicScript(masterScript, requestedCount = null) {
  const clean = String(masterScript || "").trim();
  if (!clean) return [];

  // Parse requestedCount if provided
  let targetCount = requestedCount && requestedCount !== "auto"
    ? Math.max(1, Math.min(12, parseInt(requestedCount, 10)))
    : null;

  // 1. Parse user input into individual scene text chunks
  let rawSceneBlocks = [];

  // Check for explicit scene markers: "Cảnh <số>", "Scene <số>", or "Shot <số>"
  // Delimiters support ":", ".", "-", em-dash "—", en-dash "–", or space.
  const hasSceneMarker = /(?:^|\r?\n)(?:cảnh|scene)\s*\d+[:.\s—–-]/i.test(clean);
  const hasShotMarker = /(?:^|\r?\n)shot\s*\d+[:.\s—–-]/i.test(clean);

  if (hasSceneMarker) {
    // If top-level "Cảnh" or "Scene" is present, split strictly by Cảnh/Scene so sub-shots stay intact
    const sceneMarkerRegex = /(?:^|\r?\n)(?=(?:cảnh|scene)\s*\d+[:.\s—–-])/i;
    const parts = clean.split(sceneMarkerRegex).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      rawSceneBlocks = parts;
    }
  } else if (hasShotMarker) {
    // If no Cảnh/Scene, but "Shot <số>" is present, split by Shot
    const shotMarkerRegex = /(?:^|\r?\n)(?=shot\s*\d+[:.\s—–-])/i;
    const parts = clean.split(shotMarkerRegex).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      rawSceneBlocks = parts;
    }
  } else {
    // If NO "Cảnh", "Scene", or "Shot" found, fallback only when requested or single scene
    if (targetCount) {
      const sentences = clean
        .split(/\r?\n+|[.!?]+(?:\s+|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);
      rawSceneBlocks = [];
      const perScene = Math.max(1, Math.ceil(sentences.length / targetCount));
      for (let i = 0; i < targetCount; i++) {
        const slice = sentences.slice(i * perScene, (i + 1) * perScene);
        rawSceneBlocks.push(slice.join(". ") || clean);
      }
    } else {
      // Treat the entire input as 1 single scene
      rawSceneBlocks = [clean];
    }
  }

  const N = rawSceneBlocks.length;
  const scenes = [];

  for (let idx = 0; idx < N; idx++) {
    const raw = rawSceneBlocks[idx];
    const isFirst = idx === 0;
    const isLast = idx === N - 1;

    // Auto-detect duration from prompt text (e.g. "Thời lượng: 10 giây" -> "10s", "8s")
    const detectedDuration = detectDurationFromText(raw) || "10s";

    // Extract title for display in UI
    let title = `Cảnh ${idx + 1}`;
    const titleMatch = raw.match(/^(?:cảnh|scene|shot)\s*\d+[:.\s—–-]*([^\n]+)/i);
    if (titleMatch && titleMatch[1] && titleMatch[1].length < 60 && !titleMatch[1].includes("[")) {
      title = `Cảnh ${idx + 1}: ${titleMatch[1].trim()}`;
    } else {
      title = isFirst
        ? `Cảnh 1: Mở màn`
        : isLast
        ? `Cảnh ${idx + 1}: Kết thúc`
        : `Cảnh ${idx + 1}: Tiếp diễn`;
    }

    // Keep EXACT raw prompt from input, absolutely no text added or removed!
    const prompt = raw.trim();

    // Detect optional narration if user wrote "Thoại: ..." or "Narration: ...", without modifying prompt
    let narration = "";
    const narrMatch = raw.match(/(?:thoại|lời thoại|narration|dialogue|voiceover|voice)[:\s]+["“']?([^"”\n\r]+)["”']?/i);
    if (narrMatch) {
      narration = narrMatch[1].trim();
    }

    scenes.push({
      index: idx + 1,
      title,
      prompt,
      narration: narration || "",
      camera: "",
      duration: detectedDuration,
      referenceImages: [],
    });
  }

  return scenes;
}

function buildScenePrompt(scene = {}, options = {}) {
  const blocks = [];
  const characterNames = (Array.isArray(options.referenceImages) ? options.referenceImages : [])
    .filter((img) => img && img.role === "character" && img.name)
    .map((img) => img.name);

  if (options.culturalDirection) {
    blocks.push(`CULTURAL AUTHENTICITY LOCK: ${options.culturalDirection}`);
  }
  blocks.push(String(scene.prompt || "").trim());
  if (characterNames.length > 0) {
    blocks.push(
      `CHARACTER REFERENCE LOCK: Use the attached reference images for ${characterNames.join(", ")}. ` +
      "Preserve their identity, face, hairstyle, costume, colors, and proportions exactly whenever they appear."
    );
  }
  if (scene.continuity) blocks.push(`CONTINUITY: ${scene.continuity}`);
  if (scene.narration) {
    blocks.push(
      `DIALOGUE / NARRATION TIMING CONTEXT: ${scene.narration} ` +
      "Match the character action and emotional timing to this line. Do not render captions or on-screen text."
    );
  }
  if (options.storyTitle) blocks.push(`STORY CONTEXT: ${options.storyTitle}`);

  return blocks.join("\n\n");
}

function probeVideoDuration(filePath) {
  try {
    const ffprobeBin = fs.existsSync("/opt/homebrew/bin/ffprobe")
      ? "/opt/homebrew/bin/ffprobe"
      : "ffprobe";
    const output = execFileSync(
      ffprobeBin,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", filePath],
      { encoding: "utf-8", timeout: 10000 }
    );
    const duration = Number.parseFloat(output.trim());
    return Number.isFinite(duration) ? duration : 0;
  } catch (_e) {
    return 0;
  }
}

function isUsableVideoFile(filePath, minimumBytes = 100000, expectedDurationSec = 0) {
  try {
    const basicChecksPass = Boolean(
      filePath &&
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile() &&
      fs.statSync(filePath).size >= minimumBytes
    );
    if (!basicChecksPass) return false;
    const actualDuration = probeVideoDuration(filePath);
    if (actualDuration <= 0) return false;
    if (expectedDurationSec > 0) {
      return Math.abs(actualDuration - expectedDurationSec) <= 0.75;
    }
    return true;
  } catch (_e) {
    return false;
  }
}

function isUsableImageFile(filePath, minimumBytes = 5000) {
  try {
    return Boolean(
      filePath &&
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile() &&
      fs.statSync(filePath).size >= minimumBytes
    );
  } catch (_e) {
    return false;
  }
}

/**
 * Intelligently breaks down a story prompt into sequential, coherent scene prompts.
 * The number of scenes is dynamically derived from the prompt structure (sentences, numbered points, or length).
 */
function breakdownStory(masterPrompt, requestedCount = null) {
  const cleanPrompt = String(masterPrompt || "").trim();
  if (!cleanPrompt) return [];

  // 1. Detect explicit scene splitting: "Cảnh <số>", "Scene <số>", or "Shot <số>"
  const lines = cleanPrompt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const numberedLines = lines.filter((l) => /^(?:cảnh|scene|shot)\s*\d+[:.\s—–-]/i.test(l));

  if (numberedLines.length >= 2) {
    return numberedLines.map((line, idx) => {
      const p = line.replace(/^(?:cảnh|scene|shot)\s*\d+[:.\s—–-]+/i, "").trim();
      return {
        index: idx + 1,
        title: `Cảnh ${idx + 1}`,
        prompt: p || line,
        referenceImages: [],
      };
    });
  }

  // 2. Check if prompt is split by inline scene markers: "Cảnh <số>", "Scene <số>", or "Shot <số>"
  const splitRegex = /(?:cảnh|scene|shot)\s*\d+[:.\s—–-]+/i;
  const parts = cleanPrompt.split(splitRegex).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map((p, idx) => ({
      index: idx + 1,
      title: `Cảnh ${idx + 1}`,
      prompt: p,
      referenceImages: [],
    }));
  }

  // 3. Otherwise, split by sentences or paragraphs in prompt
  const sentences = cleanPrompt
    .split(/\n\n+|[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length >= 2) {
    return sentences.map((sent, idx) => ({
      index: idx + 1,
      title: `Cảnh ${idx + 1}`,
      prompt: sent,
      referenceImages: [],
    }));
  }

  // 4. Default fallback: create sequential scenes without arbitrary role labels
  let count = requestedCount ? Number(requestedCount) : 3;
  count = Math.max(1, Math.min(10, count));

  const scenes = [];
  for (let i = 0; i < count; i++) {
    scenes.push({
      index: i + 1,
      title: `Cảnh ${i + 1}`,
      prompt: i === 0 ? cleanPrompt : "",
      referenceImages: [],
    });
  }

  return scenes;
}

/**
 * Stitches multiple MP4 video files into one seamless video using ffmpeg.
 */
/**
 * Stitches multiple MP4 video files into one seamless video using ffmpeg.
 * Supports smooth cinematic transitions (dissolve / crossfade, fadeblack, or cut)
 * and eliminates duplicate head frames to prevent stuttering/pauses at scene junctions.
 */
function stitchVideos(videoPaths, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    if (!videoPaths || videoPaths.length === 0) {
      return reject(new Error("Không có video nào để ghép."));
    }
    if (videoPaths.length === 1) {
      fs.copyFileSync(videoPaths[0], outputPath);
      return resolve(outputPath);
    }

    const {
      transition = "dissolve", // "dissolve", "fade", "fadeblack", "cut"
      transitionDuration = 0.35,
      skipHeadFramesSec = 0.08, // skip duplicate static hold on Scene 2+
    } = options;

    const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    const n = videoPaths.length;
    const durations = videoPaths.map((p) => probeVideoDuration(p) || 5.0);

    // If transition is dissolve, fade, or fadeblack, use xfade + acrossfade
    if (transition === "dissolve" || transition === "fade" || transition === "fadeblack") {
      const xfadeTrans =
        transition === "fadeblack"
          ? "fadeblack"
          : transition === "fade"
          ? "fade"
          : "dissolve";
      const d = Math.min(transitionDuration, 0.5);

      const inputs = [];
      videoPaths.forEach((p, idx) => {
        if (idx === 0 || skipHeadFramesSec <= 0) {
          inputs.push("-i", p);
        } else {
          inputs.push("-ss", String(skipHeadFramesSec), "-i", p);
        }
      });

      const effectiveDurations = durations.map((dur, idx) => {
        return idx === 0 ? dur : Math.max(0.5, dur - (skipHeadFramesSec > 0 ? skipHeadFramesSec : 0));
      });

      let vFilter = "";
      let aFilter = "";
      let currentOffset = 0;
      let lastV = "0:v";
      let lastA = "0:a";

      for (let i = 1; i < n; i++) {
        const prevDur = effectiveDurations[i - 1];
        if (i === 1) {
          currentOffset = prevDur - d;
        } else {
          currentOffset = currentOffset + prevDur - d;
        }
        const nextV = i === n - 1 ? "v" : `v0${i}`;
        const nextA = i === n - 1 ? "a" : `a0${i}`;

        vFilter += `[${lastV}][${i}:v]xfade=transition=${xfadeTrans}:duration=${d}:offset=${currentOffset.toFixed(3)}[${nextV}];`;
        aFilter += `[${lastA}][${i}:a]acrossfade=d=${d}[${nextA}];`;

        lastV = nextV;
        lastA = nextA;
      }

      const fullFilter = `${vFilter}${aFilter}`.replace(/;$/, "");
      const args = [
        "-y",
        ...inputs,
        "-filter_complex",
        fullFilter,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        outputPath,
      ];

      execFile(ffmpegBin, args, (err) => {
        if (!err && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          return resolve(outputPath);
        }
        console.warn(`[stitchVideos] xfade transition error, falling back to concat:`, err?.message);
        fallbackConcat();
      });
      return;
    }

    // Default or "cut" mode: concatenate with PTS normalization & optional head trim
    fallbackConcat();

    function fallbackConcat() {
      const tmpListFile = path.join(
        path.dirname(outputPath),
        `concat_list_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`
      );

      const listContent = videoPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join("\n");
      fs.writeFileSync(tmpListFile, listContent, "utf-8");

      execFile(
        ffmpegBin,
        [
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          tmpListFile,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          outputPath,
        ],
        (err) => {
          try { fs.unlinkSync(tmpListFile); } catch (_e) { }
          if (err || !fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
            return reject(new Error(`Lỗi ghép video FFMPEG: ${err?.message || "Output trống"}`));
          }
          resolve(outputPath);
        }
      );
    }
  });
}

/**
 * Trims a video file to an exact target duration (in seconds) using ffmpeg.
 */
function trimVideo(inputPath, durationSec, outputPath = null) {
  return new Promise((resolve) => {
    if (!inputPath || !fs.existsSync(inputPath)) {
      return resolve(inputPath);
    }
    const dur = Number(durationSec);
    if (!dur || dur <= 0) {
      return resolve(inputPath);
    }

    const actualDur = probeVideoDuration(inputPath);
    // "Exact duration" must actually be exact. Only skip a rewrite when the
    // container duration is already within one frame at 24fps.
    if (actualDur > 0 && Math.abs(actualDur - dur) <= (1 / 24)) {
      return resolve(inputPath);
    }
    if (actualDur > 0 && actualDur < dur) {
      return resolve(inputPath);
    }

    const out =
      outputPath ||
      path.join(
        path.dirname(inputPath),
        `trim_${Date.now()}_${path.basename(inputPath)}`
      );

    const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    // Re-encode with safe audio fade out at the end if trimming is required
    const fadeOutStart = Math.max(0, dur - 0.3);
    execFile(
      ffmpegBin,
      [
        "-y",
        "-ss",
        "0",
        "-t",
        String(dur),
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-af",
        `afade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.3`,
        "-c:a",
        "aac",
        "-avoid_negative_ts",
        "make_zero",
        out,
      ],
      (err) => {
        if (!err && fs.existsSync(out) && fs.statSync(out).size > 1000) {
          if (!outputPath) {
            try {
              fs.unlinkSync(inputPath);
              fs.renameSync(out, inputPath);
              return resolve(inputPath);
            } catch (_e) {
              return resolve(out);
            }
          }
          return resolve(out);
        }
        resolve(inputPath);
      }
    );
  });
}

function getTargetResolution(quality = "2K", aspectRatio = "16:9") {
  const q = String(quality || "").trim().toUpperCase();
  const landscape = String(aspectRatio || "16:9").trim() !== "9:16";
  const dimensions = {
    "1080P": [1920, 1080],
    "FULL HD": [1920, 1080],
    "2K": [2560, 1440],
    "4K": [3840, 2160],
  }[q];
  if (!dimensions) return null;
  return landscape ? dimensions : [dimensions[1], dimensions[0]];
}

/**
 * Makes the downloaded file match the requested delivery resolution. Muse may
 * ignore resolution wording in a prompt, so enforce the output dimensions
 * locally instead of reporting a quality that the file does not have.
 */
function ensureVideoResolution(inputPath, quality = "2K", aspectRatio = "16:9") {
  return new Promise((resolve) => {
    if (!inputPath || !fs.existsSync(inputPath)) return resolve(inputPath);
    const target = getTargetResolution(quality, aspectRatio);
    if (!target) return resolve(inputPath);

    const [width, height] = target;
    const out = path.join(path.dirname(inputPath), `resolution_${Date.now()}_${path.basename(inputPath)}`);
    const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    execFile(
      ffmpegBin,
      [
        "-y", "-i", inputPath,
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "copy", "-movflags", "+faststart", out,
      ],
      (err) => {
        if (!err && fs.existsSync(out) && fs.statSync(out).size > 1000) {
          try {
            fs.unlinkSync(inputPath);
            fs.renameSync(out, inputPath);
          } catch (_e) {
            return resolve(out);
          }
        } else {
          try { if (fs.existsSync(out)) fs.unlinkSync(out); } catch (_e) {}
        }
        resolve(inputPath);
      }
    );
  });
}

module.exports = {
  buildScenePrompt,
  detectDurationFromText,
  isUsableVideoFile,
  isUsableImageFile,
  probeVideoDuration,
  breakdownStory,
  stitchVideos,
  trimVideo,
  ensureVideoResolution,
  CINEMATIC_STYLES,
  CINEMATIC_VOICES,
  extractLastFrame,
  buildCinematicScenePrompt,
  breakdownCinematicScript,
};

