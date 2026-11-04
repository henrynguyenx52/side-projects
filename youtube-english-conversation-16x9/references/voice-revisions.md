# Voice revisions

## Approved emotional character treatment

For new episodes, use these established defaults unless the user requests different voices:

- Alex: Kokoro `am_puck`, baseline speed `1.02`.
- Emma: Kokoro `af_heart`, baseline speed `1.01`.
- Write dialogue in short, speakable beats and use punctuation that reflects the intended performance.
- Leave approximately `0.3–0.4` seconds between conversational turns when timing permits.
- Normalize each generated character cue with `loudnorm=I=-19:TP=-2:LRA=7`.

Kokoro does not provide a direct emotion parameter. Express the scene-specific emotion through wording, punctuation, segmentation, and small pacing changes. Keep the approved baseline speeds by default; vary them only modestly when a line clearly benefits, then document the exception. The approval sample used a delighted-and-relieved Alex and a playfully warning Emma, but those emotions are examples rather than permanent character moods.

## Audition voices first

Render the same representative line for every candidate using the same model, speed, normalization, and export settings. Put each sample in a separately named file and report its measured duration. For a youthful American male, start with `am_puck`, `am_echo`, and `am_eric`; treat perceived age as a user preference, not an objective property.

Do not modify the episode until the user chooses a sample.

## Replace one speaker throughout an episode

1. Create a new versioned audio directory.
2. Copy all non-target files byte-for-byte.
3. Regenerate every cue belonging to the target speaker with the selected voice.
4. Measure each new file and compare it with the cue window.
5. Use one consistent speed by default. If a few cues need small adjustments, document their IDs and speeds.
6. Update the plan and composition source so future full renders use the chosen voice.
7. Validate file coverage, hashes of untouched audio, and timing overflow.

## Audio-only remux

When the approved visuals must remain identical and replacement cues fit existing windows, use the helper:

```bash
node scripts/remux-speaker-audio.mjs \
  --plan <job>/episode-plan.json \
  --input <job>/renders/approved.mp4 \
  --audio-dir <job>/assets/audio/<version> \
  --speaker alex \
  --output <job>/renders/revised.mp4
```

Run first with `--validate-only` to check inputs and cue lengths without writing a video.

The helper mutes the approved mix during the target speaker's cue windows, delays the replacement WAVs to their cue starts, mixes them in, and copies the original video stream.

## Prove the revision

After remuxing:

- Fully decode the output.
- Hash the input and output video streams independently and require equality.
- Probe duration, codecs, sample rate, and channels.
- Measure audio levels and listen to replacement boundaries.
- Report any cue-specific speed adjustments.

