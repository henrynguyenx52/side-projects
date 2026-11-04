---
name: duolingo-conversation-video
description: Create illustrated English conversation shorts using the existing Say/Tell Duolingo Feather style, two local Kokoro voices, ChatGPT scene artwork, and Remotion. Use for requests to reuse the weather-chat video format or make a Duolingo-style dialogue video. Not for Vietnamese narration, real footage editing, or full character lip sync.
---

# Duolingo conversation video

Reproduce the successful weather-chat format with a new topic, setting, dialogue, or character pair. This is a **repo workflow skill**, rooted at the directory containing `remotion/vocabulary-card-2`, `kokoro`, and `open-montage`. Discover that root; do not hardcode a user's home directory.

## Starting points

- Visual target: [assets/preview.png](assets/preview.png).
- Editable baseline: [assets/WeatherSample.tsx](assets/WeatherSample.tsx). It is the working sample source, not a generic renderer; adapt the weather-specific content listed below before reusing it.
- Production details and original output locations: [references/production.md](references/production.md).
- Valid dialogue-plan example: [assets/dialogue-example.json](assets/dialogue-example.json).
- Measured, normalized two-voice audio: [scripts/synthesize-dialogue.mjs](scripts/synthesize-dialogue.mjs).

## Scope and defaults

Infer the topic, duration and characters from the request. When unspecified, start with a 30-second, 1080 × 1920, 30 fps English conversation between two friends. Aim for roughly 55–65 words, then measure synthesis; the word count is guidance, not proof of timing.

Use Kokoro `am_adam` and `af_heart` at speed `0.94` as the proven starting cast; change voices when requested. Keep a stable voice and accent for each character. The sample used quiet synthetic park breeze and no music; choose sound appropriate to the new setting rather than making park noise mandatory.

The user is requesting this existing visual language, so reuse it intentionally. Do not redesign the identity merely to make each video look different. An attached illustration anchors identities/outfits; it does not require copying the background for every topic.

## Workflow

1. **Inspect and plan.** Read the source project's applicable instructions and `DESIGN.md`. If a new reference video is supplied, use the existing OpenMontage analysis workflow and inspect actual frames. If using OpenMontage for production, follow its pipeline, artifacts and explicit approval policy; this skill neither adds new gates nor bypasses existing ones. A request to save this skill is not permission to continue a pending video.
2. **Prepare original dialogue.** Short natural turns, a small situation and resolution, no narrator unless requested. Make a plan JSON in a new job directory. Match the example's fields; every turn has a unique file-safe ID, known speaker ID, text, and nonoverlapping `start`/`end` windows. Keep a small pause between voices. For an exact 30 seconds, register exactly 900 frames at 30 fps.
3. **Generate necessary artwork.** Use the available imagegen skill and built-in ChatGPT image tool. One consistent image can cover several adjacent turns; add images when actions, weather, or setting materially change. Use the supplied image for identity. Create clean rounded 2D illustrations, simple shapes and two-tone shading. Keep faces unobscured. Generate no dialogue text, speech bubbles, UI labels, logos or watermarks; compose these in Remotion. Save images and their prompts in the job workspace and copy final images into a unique public media folder.
4. **Synthesize and measure.** Execute the helper below with explicit paths. It imports the existing Kokoro source, synthesizes each voice locally, checks the measured audio against its window, and matches loudness. On overflow, shorten the line or redistribute available time; do not cut words or silently accelerate speech. Use its output timings to build the visual timeline.
5. **Adapt the layout.** Copy the baseline into a new composition folder under `remotion/vocabulary-card-2/src/compositions/<job>/`. Preserve the import of `../../config/design-system`. Use a separate entry file so existing Say/Tell videos and their font imports remain intact. Replace the title, subtitle, location label, character names/initials, speaker-to-color mapping, image/audio paths, turn text/timings/keywords/icons, and duration-dependent progress and zoom. **Remove or retime the sample's hardcoded wind/cloud overlays** for the new topic. Do not leave `Alex` as an implicit test for every new speaker pair.
6. **Render and verify.** Render the requested deliverable or agreed sample with local Remotion. Inspect at least one actual video frame per turn (at least four for a full short), confirm faces and text are visible, fully decode the MP4, and inspect audio peaks and durations. Report the real result and any remaining review gate. Never call a sample a completed full-length video.

## Audio helper

From the repository root, replacing these example paths with the new job:

```sh
node .agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs --repo . --plan open-montage/projects/my-chat/dialogue.json --out open-montage/projects/my-chat/assets/audio --validate-only
node .agents/skills/duolingo-conversation-video/scripts/synthesize-dialogue.mjs --repo . --plan open-montage/projects/my-chat/dialogue.json --out open-montage/projects/my-chat/assets/audio
```

The output contains raw WAVs, normalized `<turn-id>.wav` files and `voice-timings.json`. Copy the normalized files to the new public media folder before rendering. The helper refuses to overwrite an existing output; use a fresh version directory for revisions. It validates before loading the model. `--validate-only` needs only Node; synthesis also needs FFmpeg and the Kokoro repo dependencies/model.

## Visual rules that made the sample work

- Off-white `#F7F7F7` canvas; dark `#3C3C3C` text; green `#58CC02` progress.
- Speaker A blue `#1CB0F6` / shadow `#1899D6`; speaker B orange `#FF9600` / shadow `#E68600`.
- Large rounded image panel; stable two-person composition; gentle reframing.
- One active white speech bubble, chunky darker bottom border, small pointer and explicit speaker name. The bubble is the caption; do not repeat its sentence in a second subtitle strip.
- Rounded bold font; sample dialogue 58px, title 86px at 1080px width. Keep key text about 88px from sides and inside top/bottom safe areas. Check longer turns rather than shrinking them excessively.
- Frame-driven `spring()` and `interpolate()` only; no CSS animation or wall-clock motion. Keep motion mild enough for beginner reading.
- Small keyword highlights, not every word. Maintain matching speaker color, initial, voice and bubble side.

## Completion

Deliver the clickable MP4 link, editable source location, and generated-image prompt location. State whether this is a sample or the complete requested duration. When a workflow requires sample review, present the sample for review; do not regenerate a proposal already approved in the current session.
