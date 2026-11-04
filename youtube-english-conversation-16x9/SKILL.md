---
name: youtube-english-conversation-16x9
description: Produce and revise long-form 16:9 YouTube English-conversation lessons with illustrated characters, Kokoro voices, image-free teaching cards, Remotion, QA, subtitles, chapters, thumbnails, and upload metadata. Use for landscape YouTube episodes; not vertical Shorts, Vietnamese videos, real-footage editing, or full lip-sync animation.
---

# YouTube English Conversation 16:9

Create polished 1920×1080 English-learning episodes using the established illustrated conversation format, local Kokoro voices, OpenMontage planning, and Remotion rendering.

## Route the work

- For a new episode or a full revision, follow [references/production-workflow.md](references/production-workflow.md).
- For the reusable channel bumper and episode-specific narrated opening, follow [references/channel-intro.md](references/channel-intro.md).
- For voice auditions, speaker replacement, or audio-only remuxing, follow [references/voice-revisions.md](references/voice-revisions.md).
- For captions, chapters, thumbnail, metadata, and the upload bundle, follow [references/youtube-delivery.md](references/youtube-delivery.md).

Use existing repository implementations when present. In this workspace, inspect `open-montage`, `remotion/vocabulary-card-2`, and `kokoro` before creating new infrastructure.

## Preserve these invariants

1. Honor approved previews and OpenMontage approval gates. Version later revisions instead of overwriting approved output.
2. Default to 1920×1080, 30 fps, and 16:9 unless the user specifies otherwise.
3. Measure generated TTS duration. Never cut speech or conceal overflow.
4. Keep the episode label and topic constant throughout the episode.
5. Use one speech bubble for the active speaker. Its pointer must be curved, integrated into the bubble, aimed at the speaker, and contained within the composition.
6. Use dedicated, image-free teaching screens. Introduce each lesson, narrate both the expression and its meaning, highlight only the currently spoken expression words, keep meaning text unhighlighted, and remove redundant top captions.
7. Keep character design, speaker side, bubble color, and voice mapping stable across scenes.
8. For a voice-only revision, remux audio while copying the approved video stream when all replacement cues fit. Prove visual identity by comparing video-stream hashes.
9. Validate representative frames, the full decode, media properties, audio peaks, caption timing, and text safe areas. Save a machine-readable QA artifact.
10. Use a two-part opening: a reusable standalone channel bumper followed by a configurable episode-topic narration screen. Keep them in separate source files and compositions.

## Default creative choices

Use these only when the user has not already chosen alternatives:

- Young man: Kokoro `am_puck`
- Young woman: Kokoro `af_heart`
- Narrator and lesson voice: Kokoro `am_adam`
- Audience-facing narrator name: `ADAM`; do not expose the engine ID `am_adam` on screen
- Palette: off-white `#F7F7F7`, green `#58CC02`, blue `#1CB0F6`, orange `#FF9600`
- Art: friendly rounded educational cartoon, consistent characters, no generated text embedded in scene images

The approved main-character performance defaults are Alex at speed `1.02` and Emma at speed `1.01`. Shape emotional dialogue through natural wording, expressive punctuation, short performance beats, and intentional pauses of roughly `0.3–0.4` seconds between turns. Match each line's actual emotion; do not force every line into the cheerful emotions used in the approval sample. Normalize each character consistently with `loudnorm=I=-19:TP=-2:LRA=7`.

Perceived age is subjective. Before replacing a voice throughout an episode, render matched samples of the same representative line at the same speed and normalization settings.

## Deliver the result

Provide clickable links to the final MP4, composition source, QA report, and YouTube package. State whether the result is a preview, an audio-only remux, or a full render. Do not upload or publish externally unless the user explicitly asks.
