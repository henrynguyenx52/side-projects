---
name: duolingo-conversation-video-16x9
description: Create landscape 16:9 illustrated English dialogue videos with full-screen ChatGPT artwork, two local Kokoro voices, and white on-screen speech popups with seamlessly joined curved tails. Use for the approved landscape weather-chat format. Keep the separate 9:16 skill unchanged.
---

# Duolingo conversation video — 16:9

Create a new conversation using the approved full-screen landscape weather-chat treatment. All repository paths are relative to this file's directory. This skill is separate from the vertical skill in `skill.md` and `.agents/skills/duolingo-conversation-video/`; do not overwrite or redesign those to implement landscape work.

## Defaults and reference

- Landscape **1920 × 1080**, **16:9**, 30 fps. Default duration 30 seconds, exactly 900 frames; honor other requested lengths.
- Two people having an original English conversation, no narrator unless requested. Roughly 55–65 words for 30 seconds, adjusted after measuring the actual speech.
- Local Kokoro `am_adam` and `af_heart`, speed `0.94`, as starting voices. Keep each character's voice consistent; honor requested changes.
- Rounded, colorful, Duolingo-inspired illustrated characters and scenery. Artwork fills the entire frame; speech bubbles appear directly over the scene.
- Approved visual reference: `open-montage/projects/weather-duo-30s/assets/sample/sample-16x9-curved-popup-v2.mp4`. It is a **13.8-second sample**, not the completed 30-second conversation.
- Working source: `remotion/vocabulary-card-2/src/compositions/WeatherConversation/WeatherSample.tsx`. Reuse **`LandscapeScreen` and `ScreenPopup`**, not the portrait `Dialogue` layout or the earlier landscape sidebar design.
- Existing registration: `WeatherConversationLandscape` in `remotion/vocabulary-card-2/src/weather-sample-entry.tsx`.

## Layout to preserve

1. Fill the canvas with the illustrated scene. Use a native 16:9 image where practical; otherwise crop a larger source with `objectFit: 'cover'` and inspect both faces, hair and gestures after cropping. Never stretch the image.
2. Keep both faces visible above the bubble area. Use gentle frame-driven reframing; the approved sample slowly scales from `1` to `1.025`.
3. Display one active white rounded bubble near the bottom, positioned on the active speaker's side. Large bold dark text is centered inside it. The reference uses no sidebar, title card, progress bar, speaker badge, or separate subtitle strip.
4. At 1920 × 1080, the approved bubble is 1080px wide, 80px from the left or right edge and 60px above the bottom. Text uses a rounded bold font at 76px, 90px line height, approximately 50px horizontal padding, and a `#222222` outline 7px thick. Adapt width and line breaks for longer dialogue without obscuring faces or clipping text.
5. The pointer is a **curved asymmetric speech-bubble tail**, not a triangle. It points toward the corresponding speaker and joins the bubble smoothly. **Draw the bubble and tail as one closed SVG path.** Do not layer a separate tail over a bordered rectangle: that caused protruding stroke ends and a visible seam in the earlier render.

## Continuous bubble outline

The following geometry produced the approved result at 1080px bubble width. Its coordinates are local to the bubble, not the video frame. Negative Y values extend the curved tail above the body. Keep the complete path in one SVG with `overflow: 'visible'`.

```tsx
const bubbleHeight = lines.length * 90 + 78;
const tail = speakerSide === 'left'
  ? 'H478 C520 0 520 -45 507 -86 C552 -66 570 0 620 0'
  : 'H448 C480 0 482 -58 533 -86 C518 -25 534 0 578 0';
const outline = `M38 0 ${tail} H1042 Q1080 0 1080 38
  V${bubbleHeight - 38} Q1080 ${bubbleHeight} 1042 ${bubbleHeight}
  H38 Q0 ${bubbleHeight} 0 ${bubbleHeight - 38}
  V38 Q0 0 38 0 Z`;
```

Render this as `<path d={outline} fill="white" stroke="#222222" strokeWidth={7} strokeLinejoin="round" />`, with a subtle drop shadow if desired. Place text in a separate positioned layer above the SVG, inside the bubble body's padded bounds. Use the same calculated body height for both layers. There must be no horizontal border crossing through the tail, no protruding ends at its base, and no overlap with the text.

Store explicit display lines per turn or measure wrapping for the selected font. Join the lines to verify they reproduce the spoken text. The original component hardcodes line breaks for two Mia audio filenames; **replace that mapping for new dialogue**, and replace the `Alex` name test with the new speaker-to-side mapping. Reposition the tail when the scene's character positions change.

## Dialogue, voices and assets

1. Read applicable source-repository instructions. If a new reference video is supplied, analyze it using the existing OpenMontage workflow and inspect its actual frames. Follow its pipeline and approval policy when using it, preserving approvals already granted in the session.
2. Create a unique job directory under `open-montage/projects/<job>/`. Write original dialogue with a familiar situation, short turns and a natural ending. Give every turn a unique safe ID, speaker ID, text, start/end window, and display lines.
3. Use the available imagegen skill and ChatGPT's built-in image-generation tool for necessary artwork. Preserve character identities, hair, clothing and proportions from supplied references. One image can cover several related turns; generate more when action, scenery or conditions materially change. Draw no text, bubbles, logos or watermarks in generated images.
4. Synthesize each turn with the existing Kokoro JavaScript source at `kokoro/kokoro.js/src/kokoro.js`, its voice files, and model `onnx-community/Kokoro-82M-v1.0-ONNX` (q8, CPU). Cache the model locally in `kokoro/kokoro.js/.cache/`. Measure each utterance and retain raw audio.
5. Normalize dialogue with FFmpeg `loudnorm=I=-19:TP=-2:LRA=7` at 24kHz. Verify the final mix rather than assuming normalization proves it safe. Use quiet setting-appropriate ambience if useful; no music is required.
6. Copy finalized images and normalized audio into a new `remotion/vocabulary-card-2/public/<job>/` directory and use `staticFile()` references. Keep generated images and their exact prompts in the job workspace as well.

### Image prompt pattern

“Original landscape 16:9 illustration for a friendly English conversation video. Use the supplied reference for both characters' identities, hair and clothing. [Describe characters, actions and setting.] Duolingo-inspired rounded 2D editorial cartoon, expressive faces, simple geometric silhouettes, saturated colors, subtle two-tone shading and crisp clean edges. Eye-level two-person shot. Both faces visible in the upper and middle frame; keep the lower area suitable for an overlaid speech bubble. One coherent full-screen scene. No text, speech bubbles, UI labels, logos or watermarks.”

### Existing audio helper

When available, execute `.agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs`. It is shared audio machinery; using it does not require changing the 9:16 skill or its assets.

Plan format:

```json
{
  "duration": 7,
  "fps": 30,
  "speed": 0.94,
  "speakers": [
    {"id":"alex","name":"Alex","voice":"am_adam"},
    {"id":"mia","name":"Mia","voice":"af_heart"}
  ],
  "turns": [
    {"id":"01-alex","speaker":"alex","text":"It's such a sunny day!","start":0.5,"end":3.2},
    {"id":"02-mia","speaker":"mia","text":"It is! But that wind feels cold.","start":3.2,"end":7}
  ]
}
```

From the repository root, with the output parent directory already created:

```sh
node .agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs --repo . --plan open-montage/projects/my-chat/dialogue.json --out open-montage/projects/my-chat/assets/audio-v1 --validate-only
node .agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs --repo . --plan open-montage/projects/my-chat/dialogue.json --out open-montage/projects/my-chat/assets/audio-v1
```

Use a fresh output directory; the helper refuses overwrites. It produces normalized WAVs, raw originals, and measured `voice-timings.json`. If unavailable, adapt `kokoro/kokoro.js/examples/generate_weather_sample.mjs` and `remotion/vocabulary-card-2/scripts/prepare-weather-sample.mjs` to the same output contract. Do not substitute a different TTS provider silently.

## Composition and export

- Create a separate landscape composition/entry under `remotion/vocabulary-card-2`. Preserve the existing sample and portrait registration.
- Replace all weather-specific images, cloud overlay, text, line breaks, filenames, speaker mappings and timings. Do not carry fixed sample durations into a new video.
- Use `useCurrentFrame()`, `spring()` and `interpolate()` for deterministic animation. A brief restrained spring on each popup matches the reference.
- For each turn, calculate `startFrame = Math.round(start * fps)` and `endFrame = Math.round(end * fps)`; its sequence duration is `endFrame - startFrame`.
- Keep every measured utterance inside its window. Shorten a line or redistribute available time if it does not fit; never cut off words or silently accelerate dialogue.
- Register width `1920`, height `1080`, fps `30`, and the requested frame count. A 30-second export is exactly 900 frames.
- Use an available rounded font; the approved render used `Arial Rounded MT Bold` with rounded fallbacks. Avoid introducing unrelated network font dependencies.

From `remotion/vocabulary-card-2`, replacing the new entry, ID and output:

```sh
./node_modules/.bin/remotion studio src/my-chat-landscape-entry.tsx --no-open
./node_modules/.bin/remotion render src/my-chat-landscape-entry.tsx MyChatLandscape ../../open-montage/projects/my-chat/renders/final-16x9-v1.mp4 --codec=h264 --crf=18 --concurrency=2
```

Verify that dependencies and the browser actually exist. The vocabulary project may share dependencies through `../record-store-promo/node_modules`; restore the owning package if needed. Discover the full browser executable before passing `--browser-executable`. Use the environment's normal approval/network mechanism for installations and local browser execution.

## Verify before delivery

- ffprobe confirms **1920 × 1080**, **16:9**, expected fps, duration and audio stream.
- Fully decode: `ffmpeg -v error -i <output.mp4> -f null -`.
- Measure audio peaks/mean with `ffmpeg -i <output.mp4> -af volumedetect -f null -`.
- Inspect actual rendered frames for both speakers and the longest dialogue turns. Check text padding, bottom/side safe margins, and clear faces.
- Zoom in on **both tail-to-bubble junctions**. Confirm one smooth outline with no seam, crossed border, stroke protrusion or text overlap.
- Confirm the popup side and tail direction match the speaking voice, and the final line finishes before the end.
- Deliver clickable MP4, source and prompt links. State whether it is an agreed sample or the complete requested duration. This skill describes illustrated scenes with animated popups, not full character lip sync.
