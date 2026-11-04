---
name: duolingo-conversation-video
description: Create illustrated English conversation shorts with the existing Say/Tell Duolingo Feather style, two local Kokoro voices, ChatGPT artwork, and Remotion. Use to reuse the weather-chat video format with a new topic, setting, or character pair.
---

# Duolingo conversation video

Use the existing repositories in this workspace to create a friendly illustrated conversation between two people. Resolve all paths below relative to this file's directory.

## Defaults

- English dialogue, 30 seconds, vertical 1080 × 1920, 30 fps: exactly 900 frames.
- Two distinct Kokoro voices: `am_adam` and `af_heart`, starting at speed `0.94`.
- About 55–65 words in short natural turns, with a small situation and resolution. Measure the actual speech before finalizing timing.
- ChatGPT-generated scene artwork, with gentle camera movement and animated speech bubbles. Full character animation and lip sync are outside this format.
- Quiet ambience appropriate to the setting. Music is optional; keep dialogue clear.

Treat these as starting points. Honor the user's requested topic, language, duration, characters, voices, and output format.

## Existing implementation

- Visual specification: `remotion/vocabulary-card-2/DESIGN.md`.
- Theme, card styles and animation presets: `remotion/vocabulary-card-2/src/config/design-system.ts`.
- Working layout: `remotion/vocabulary-card-2/src/compositions/WeatherConversation/WeatherSample.tsx`.
- Isolated entry: `remotion/vocabulary-card-2/src/weather-sample-entry.tsx`.
- Kokoro source: `kokoro/kokoro.js/src/kokoro.js`.
- Voice files: `kokoro/kokoro.js/voices/`.
- Working synthesis example: `kokoro/kokoro.js/examples/generate_weather_sample.mjs`.
- Audio preparation example: `remotion/vocabulary-card-2/scripts/prepare-weather-sample.mjs`.
- Generic audio helper, if available: `.agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs`.
- Original review copy: `open-montage/projects/weather-duo-30s/assets/sample/sample-v2.mp4`.

Keep previous videos intact. Create a unique job directory, media directory, composition and entry file for new work. Do not overwrite the weather sample to create a different video.

## Visual language

- Off-white background `#F7F7F7`; dark text `#3C3C3C`; green progress `#58CC02`.
- Speaker A: blue `#1CB0F6`, darker bottom border `#1899D6`, light highlight `#DDF4FF`.
- Speaker B: orange `#FF9600`, darker bottom border `#E68600`, light highlight `#FFF0D8`.
- Rounded, bold typography. At 1080px width, the sample uses an 86px title and 58px dialogue, with approximately 88px side margins.
- Rounded illustration panel with both faces visible. Stable two-person framing and mild reframing keep attention on the exchange.
- One active white speech bubble with a chunky bottom border and a curved, asymmetric tail aimed toward the speaker. Draw the tail with smooth Bézier curves, not a straight triangular pointer. Use a single continuous SVG outline for the bubble and tail so their connecting points are flush, with no protruding strokes, seams or border crossing through the tail. Keep text padded inside the bubble body. In full-screen 16:9 scenes, place the bubble directly over the illustration and let the tail identify the speaker. The bubble is the caption; do not duplicate the sentence in a separate subtitle band.
- Use small keyword highlights and restrained progress indicators. Keep speaker color, voice, name, initial and bubble side consistent.
- Drive animation with Remotion `useCurrentFrame()`, `spring()` and `interpolate()`, not CSS animations or wall-clock timers.

## Production workflow

1. Read applicable repository instructions and inspect the existing style and layout. When the user supplies a new reference video, analyze it with OpenMontage and inspect actual frames. Follow OpenMontage's pipeline and approval policy when using it; do not repeat an approval already granted in the session.
2. Write original dialogue with short, clear turns and a natural ending. Use no narrator or spoken intro unless requested. Plan each turn's speaker, text, start/end window, and optional highlighted keyword.
3. Generate only the artwork needed to communicate the scene changes. Use ChatGPT's built-in image-generation tool and the available imagegen skill. An attached image anchors character identity and clothing. Preserve those anchors across scenes. One image can cover several adjacent turns; add images for materially different actions or settings.
4. Synthesize each turn locally with Kokoro. Use model `onnx-community/Kokoro-82M-v1.0-ONNX`, q8, CPU; cache in `kokoro/kokoro.js/.cache/`. Use the existing source and voice files. Record each audio file's measured duration. Shorten a line or revise its window if it does not fit; never cut off words or silently speed up speech.
5. Normalize each voice using FFmpeg `loudnorm=I=-19:TP=-2:LRA=7` at 24kHz. Keep raw audio and separate normalized copies. Copy final media into a unique directory inside `remotion/vocabulary-card-2/public/` and reference it with `staticFile()`.
6. Adapt the working layout into a new composition. Replace all sample-specific titles, names/initials, speaker-color tests, location labels, image/audio paths, text, keywords, icons and timings. Remove or retime weather-specific cloud/wind overlays. Update every duration-dependent progress and zoom calculation; do not leave the sample's `13.8`- or `30`-second constants accidentally.
7. Register the requested duration in a separate entry file. Derive sequence durations from rounded endpoints: `startFrame = Math.round(start * fps)`, `endFrame = Math.round(end * fps)`, `durationInFrames = endFrame - startFrame`.
8. Render the requested full video or agreed sample. Inspect actual rendered frames and audio measurements before delivery. If a sample-review gate is active, present the sample and wait for feedback before full production.

## Artwork prompt pattern

“Original illustrated scene for a friendly English-learning video. Use the supplied character reference for identities, hair and clothing. [Describe the two people, their action, setting and weather.] Duolingo-inspired rounded 2D editorial cartoon, simple geometric silhouettes, flat saturated colors, subtle two-tone shading, expressive faces, crisp clean edges. Eye-level two-person shot; both faces visible, comfortable space around heads. Landscape 3:2 illustration for a panel inside a vertical video. No text, speech bubbles, UI labels, logos, watermarks or collage.”

Render all exact text and UI in Remotion. Save the final image and its actual generation prompt in the job workspace. Reuse the selected artwork as a consistency reference for later scenes when needed.

## Reusable audio helper

When the generic helper exists, provide a JSON plan like:

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

Use a fresh output directory whose parent exists:

```sh
node .agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs --repo . --plan open-montage/projects/my-chat/dialogue.json --out open-montage/projects/my-chat/assets/audio-v1 --validate-only
node .agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs --repo . --plan open-montage/projects/my-chat/dialogue.json --out open-montage/projects/my-chat/assets/audio-v1
```

The helper produces raw audio, normalized WAVs and `voice-timings.json`, and refuses to overwrite previous output. If it is unavailable, adapt the working synthesis and preparation examples listed above to the same plan and output contract.

## Runtime and rendering

Verify dependencies and the actual model/browser before claiming readiness. The existing vocabulary project's `node_modules` may be a symlink to `../record-store-promo/node_modules`; restore the owning package when necessary rather than casually replacing the symlink. Do not run simultaneous installs in the same package. Use the environment's normal escalation mechanism if network or local browser execution requires it.

From `remotion/vocabulary-card-2`, replacing the example entry, composition and output:

```sh
./node_modules/.bin/remotion studio src/my-chat-entry.tsx --no-open
./node_modules/.bin/remotion render src/my-chat-entry.tsx MyChat ../../open-montage/projects/my-chat/renders/final-v1.mp4 --codec=h264 --crf=18 --concurrency=2
```

Use available rounded fonts or deliberately load a local font. An isolated entry avoids unrelated network-dependent font imports from older compositions. If specifying a browser executable, discover its actual full path first.

## Verification and delivery

- Check resolution, frame rate, duration, codecs and audio stream with ffprobe.
- Fully decode the result: `ffmpeg -v error -i <output.mp4> -f null -`.
- Measure audio with `ffmpeg -i <output.mp4> -af volumedetect -f null -`; check clipping and relative voice loudness.
- Inspect at least one rendered frame per dialogue turn, at least four for a full short. Check long bubbles, speaker identity, face visibility, margins and overlays.
- Ensure every measured utterance fits its window and the last line finishes before the video ends.
- Deliver clickable links to the MP4, editable source and image prompts. Clearly identify samples versus complete videos. Do not claim lip sync or character acting when only illustrations and UI are animated.
