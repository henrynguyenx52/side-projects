# Reusable channel and episode introduction

Use this opening system for the `English in Real Life` 16:9 series.

## Keep the two layers separate

1. `ChannelIntro` is the fixed brand bumper. Keep it in its own source file, register it as a standalone composition, and render a reusable MP4. It contains the channel name, the `English Through Stories` tagline, approved Alex and Emma artwork, and the channel sonic logo. It must not contain an episode number, topic, or topic narration.
2. `EpisodeTopicIntro` is configurable per episode. Give it the channel name, episode number, topic, short learning promise, narrator text, and narrator audio as props or data. Keep it in a separate source file.
3. A wrapper composition plays `ChannelIntro`, then `EpisodeTopicIntro`, then the unchanged episode composition. Nesting the approved episode avoids rewriting all original cue times inside Remotion.

For the current brand layout, keep the complete channel-title group centered inside the yellow sunburst on the right. Maintain a clear gap between it and the circular character artwork.

## Voice and labeling

- Generate topic narration with Kokoro voice ID `am_adam` unless the user selects another narrator.
- Show the audience-facing label `NARRATOR · ADAM`. Never display `AM_ADAM` or another engine identifier to viewers.
- Write a short spoken welcome that names the channel and clearly states the current episode topic.
- Store the text, voice ID, speed, measured audio duration, and screen duration in a versioned intro config artifact.

## Timing

Generate and normalize the topic narration, then measure it with `ffprobe`. Set the topic-screen duration from measured speech plus a short visual tail; do not guess or cut speech. Calculate the wrapper duration as:

```text
channel bumper + topic intro + approved episode
```

When creating final captions and YouTube chapters, add the exact combined intro duration to every original episode timestamp. Start chapters at `0:00 Introduction`, then use shifted scene starts. Do not shift the reusable bumper and topic screen independently in downstream metadata.

## Preview and delivery

Before rendering the full episode:

- Render one representative bumper still and one topic-screen still.
- Render a standalone, versioned channel-bumper MP4.
- Render a combined bumper-plus-topic preview.
- Preserve previously approved versions.
- Verify 1920×1080, 30 fps, H.264/AAC, 48 kHz stereo, text safe areas, audio levels, and full decoding.

After the combined preview is approved, render the wrapper composition and regenerate captions, chapters, metadata validation, and the YouTube upload bundle. The only per-episode changes should be the topic configuration and topic narration; keep the channel bumper stable unless the user explicitly requests a brand revision.
