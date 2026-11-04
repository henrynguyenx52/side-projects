# Proven implementation and operating notes

All paths below are relative to the repository root. These originals are examples; write new jobs to new directories.

## Original weather-chat artifacts

- Style specification: `remotion/vocabulary-card-2/DESIGN.md`.
- Reusable theme and spring helpers: `remotion/vocabulary-card-2/src/config/design-system.ts`.
- Sample source: `remotion/vocabulary-card-2/src/compositions/WeatherConversation/WeatherSample.tsx`.
- Isolated entry: `remotion/vocabulary-card-2/src/weather-sample-entry.tsx`.
- Reviewed copy: `open-montage/projects/weather-duo-30s/assets/sample/sample-v2.mp4` (13.8 seconds, 414 frames).
- Job and analysis: `open-montage/projects/weather-duo-30s/`.
- Artwork and exact prompt: `open-montage/projects/weather-duo-30s/assets/images/park-sunny-v1.png` and `park-sunny-v1-prompt.md`.
- Original example audio runners: `kokoro/kokoro.js/examples/generate_weather_sample.mjs` and `remotion/vocabulary-card-2/scripts/prepare-weather-sample.mjs`.

The job artifacts may be gitignored. This skill retains a preview, source baseline, prompt pattern and dialogue example so those instructions survive loss of a generated job folder. New artwork should match the new brief; the old park illustration is not a mandatory scene.

## Artwork prompt pattern

Use case: illustration-story. Original illustrated scene for a friendly English-learning video. Use the supplied character image for identities, hair, clothing and body proportions. [Describe the two characters and their action in this scene.] Rounded 2D editorial cartoon design, simple geometric silhouettes, flat saturated colors, subtle two-tone shading, expressive faces and crisp clean edges. [Describe the setting, time and conditions.] Eye-level two-person shot, comfortable space around heads, both faces visible. Landscape 3:2 works well inside the vertical sample's image panel. No text, speech bubbles, logos, watermarks or collage. Render one coherent illustration.

Keep the same identity anchors in later image prompts; use the first selected generated image as an additional consistency reference when available. Generate a changed scene only when needed; native wind/cloud graphics can communicate simple effects while preserving character continuity. Avoid covering eyes or hairlines with those graphics.

## Local runtime checks

Do not mistake a source folder or symlink for a working runtime. Check actual execution and model/dependency availability. In the source environment, `remotion/vocabulary-card-2/node_modules` pointed at `../record-store-promo/node_modules`; restoring the latter restored the existing composition runtime. Do not replace that symlink casually.

Kokoro uses the existing JavaScript implementation:

- Source: `kokoro/kokoro.js/src/kokoro.js`.
- Voice files: `kokoro/kokoro.js/voices/<voice-id>.bin`.
- Dependencies: `@huggingface/transformers` and `phonemizer`, declared in that repo's package manifest.
- Model: `onnx-community/Kokoro-82M-v1.0-ONNX`, q8 CPU.
- Cache: `kokoro/kokoro.js/.cache/`.

If dependencies are absent, install in the owning existing package, using the environment's normal approval/network mechanism. Do not run simultaneous npm installs in the same package. Do not fix unrelated audit findings with force upgrades during video production. A missing model needs network access once; do not substitute another TTS provider silently.

The helper dynamically imports dependencies inside its error handler, so a network error produces a concise message instead of a huge minified phonemizer stack dump. It records measured durations and keeps raw audio. FFmpeg normalization uses `loudnorm=I=-19:TP=-2:LRA=7` at 24kHz; the final AAC mix should still be measured, not assumed safe from settings alone.

The sample used system rounded font fallbacks, avoiding an unrelated Google-font fetch. Preserve that approach or deliberately load an available local/bundled font. Do not promise that a missing font or browser exists.

## Composition and render

The baseline source is weather-specific. Use the adaptation checklist in SKILL.md; register a new component with its actual duration and a new ID. Base `from`/duration values on measured audio windows. Prefer duration calculation from rounded endpoints so adjacent turns neither overlap nor lose a frame:

```tsx
const startFrame = Math.round(turn.start * fps);
const endFrame = Math.round(turn.end * fps);
// Sequence from={startFrame} durationInFrames={endFrame - startFrame}
```

From `remotion/vocabulary-card-2`, for a new entry and composition:

```sh
./node_modules/.bin/remotion studio src/my-chat-entry.tsx --no-open
./node_modules/.bin/remotion render src/my-chat-entry.tsx MyChat ../../open-montage/projects/my-chat/renders/final-v1.mp4 --codec=h264 --crf=18 --concurrency=2
```

Use the installed browser Remotion resolves, or discover an actual executable before setting `--browser-executable`. The original cached headless browser was nested under `open-montage/remotion-composer/node_modules/.remotion/chrome-headless-shell/`; inspect the full path instead of assuming its platform suffix. A port-binding failure in a restricted shell can be a sandbox issue, not evidence that every local port is occupied. Use the normal escalation path when required.

## Verification

- Check duration, frame count, resolution, fps, audio stream and codecs with ffprobe.
- Fully decode: `ffmpeg -v error -i <output.mp4> -f null -`.
- Measure peak/mean: `ffmpeg -i <output.mp4> -af volumedetect -f null -`.
- Extract one representative frame per dialogue turn, and inspect the actual rendered frames. A frame at the middle of the turn is more useful than a bubble's entrance frame.
- All measured speech must end before its turn window; check final-line cutoff and deliberate end hold.
- A reference may show static characters with changing bubbles; do not describe illustrated camera motion as full character animation or lip sync.

The reviewed sample was 1080 × 1920, H.264 at 30fps, 13.803 seconds including container rounding, with stereo 48kHz AAC and a -5dBFS peak. These are historical measurements, not acceptance thresholds for every future render.
