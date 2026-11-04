# Production workflow

## 1. Inspect and plan

Read repository instructions and inspect prior episodes before changing code. Reuse the established composition, character assets, font system, and rendering scripts where possible. If OpenMontage is part of the project, preserve its proposal and asset-generation approval gates.

Refine the script into connected scenes. Each scene should respond to or naturally develop the preceding scene; add short narrator bridges only when conversation alone cannot make the transition clear.

Create a job directory with a machine-readable plan. A useful minimum is:

```json
{
  "title": "Episode title",
  "duration": 480,
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "scenes": [{"id": "scene-01", "start": 0, "end": 45}],
  "cues": [
    {
      "id": "cue-001",
      "scene": "scene-01",
      "speaker": "alex",
      "voice": "am_puck",
      "text": "How's the weather been lately?",
      "start": 4.2,
      "end": 6.8
    }
  ]
}
```

Keep lesson content separate from timing. Store an intro plus cards with `expression` and `meaning`; use a second timing artifact when word-level highlight windows are required.

For this series, also create a versioned intro configuration and follow [channel-intro.md](channel-intro.md). Keep the reusable channel bumper independent from the episode-specific narrator text and timing.

## 2. Generate and measure audio

Load the local Kokoro model once per batch. Generate raw WAV files into a new versioned directory, then normalize into a separate versioned directory. A reliable loudness target for speech is `loudnorm=I=-19:TP=-2:LRA=7`, adjusted only when the existing series uses another documented target.

Measure every result with `ffprobe` and update cue windows from measured duration. Small, disclosed speed adjustments are acceptable to preserve an approved edit, but do not make a voice unnaturally fast or truncate it.

Measure the episode-topic narration separately. Use the internal narrator voice ID in production metadata, but use the friendly display name `ADAM` on screen.

## 3. Create artwork and layout

Reuse approved character references. Generate only scene art that is genuinely needed. Ask image generation for backgrounds and characters without embedded text; render all educational UI and dialogue text in Remotion so it stays editable and crisp.

Keep faces outside text safe areas. Use consistent speaker placement and visual identity. The episode label must use the same episode number and topic on every scene.

Dialogue bubbles should be large enough for the complete line. Use an SVG or CSS curved tail that joins the bubble cleanly and points toward the active speaker; do not use a detached triangle.

## 4. Build teaching sequences

For each target expression:

1. Transition away from the illustrated conversation to an image-free intro screen.
2. Let the narrator introduce the learning moment.
3. Show one expression and its meaning on a dedicated card.
4. Speak the expression, then the meaning.
5. Highlight only the words in the expression as they are spoken.
6. Keep the meaning readable but never karaoke-highlight it.
7. Do not repeat the expression in a top-of-screen caption.
8. Return to the conversation with a short verbal or visual bridge.

## 5. Render safely

Render a representative scene preview before a full episode whenever a layout, teaching-card, or voice-system change is involved. Preserve approved previews under versioned names.

For an opening revision, render the standalone channel bumper and the combined bumper-plus-topic preview before rendering the full wrapper composition.

Typical Remotion invocation:

```bash
npx remotion render <entry> <composition-id> <output.mp4> --codec=h264
```

## 6. Quality assurance

Before delivery:

- Probe resolution, frame rate, duration, codecs, channels, and sample rate.
- Decode the entire video with FFmpeg to catch corruption.
- Render representative stills from every scene type, including the longest bubble and every teaching-card layout.
- Confirm all speech finishes within its cue window.
- Check audio peaks and listen at scene boundaries.
- Confirm the episode label never changes.
- Confirm teaching screens have no image and no redundant top caption.
- Confirm only expression words receive highlight color.
- Verify caption timing and chapter order.
- Save a structured final-review JSON containing checks, paths, and pass/fail status.

