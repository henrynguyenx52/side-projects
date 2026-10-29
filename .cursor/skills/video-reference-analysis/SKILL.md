---
name: video-reference-analysis
description: Analyze a public video URL or local video, capture one representative still per distinct scene into reference-image/jobs, and write an image-generation manifest with one prompt per still. Use when the user asks to analyze a video, extract scenes, capture video reference images, or prepare prompts for Flow image generation.
---

# Video reference analysis

Turn one video into a self-contained job for `flow-image-generation`. This skill does not generate images.

## Input

Require:

- a public, accessible video URL or a local video path;
- the requested outcome or visual direction;
- a character reference in `reference-image/character/`.

If the character folder is empty, ask for it. Do not bypass a login wall, DRM, CAPTCHA, paywall, or platform download restriction. If the video cannot be obtained lawfully as a local media file, use browser screenshots at scene changes instead.

## Output contract

Create a unique lowercase job id: `YYYYMMDD-short-title`.

```
reference-image/jobs/<job-id>/
  analysis.json
  prompts.md
  style/
    01-short-scene-name.jpg
    02-short-scene-name.jpg
```

Never overwrite an existing job. All paths in `analysis.json` are relative to the repo root. It is the only input accepted by `flow-image-generation`.

```json
{
  "schema_version": 1,
  "job_id": "20261027-example",
  "source": { "url": "https://...", "captured_at": "ISO-8601" },
  "output": { "aspect_ratio": "9:16", "images_per_prompt": 1 },
  "character_files": ["reference-image/character/example.png"],
  "scenes": [
    {
      "index": 1,
      "style_file": "reference-image/jobs/20261027-example/style/01-night-portrait.jpg",
      "timestamp_seconds": 2.4,
      "description": "What the frame depicts",
      "prompt": "Full image-generation prompt"
    }
  ]
}
```

`prompts.md` repeats the prompts in scene order, one prompt per line, with the style filename at the start of each line.

## Workflow

1. Inspect the video and identify distinct visual scenes in chronological order.
2. Capture one representative vertical still for every distinct scene into `style/`.
   - Skip white flashes, glitches, title cards, and duplicates.
   - Keep a blurry frame when it is a distinct scene; describe it as sharp and natural in the prompt.
   - Use `01-`, `02-`, … filenames in scene order.
3. Write exactly one English prompt per still. Every prompt must:
   - say it uses the character reference for face and body;
   - name its matching `style_file` and say all other style references are ignored;
   - preserve that still's outfit, pose, composition, and background;
   - request a sharp natural image, no on-screen text, `Vertical 9:16, one image`, unless the user asks otherwise.
4. Write `analysis.json` and `prompts.md`. Validate before finishing:
   - every `style_file` exists;
   - scenes are numbered consecutively;
   - `character_files` lists every accepted image in `reference-image/character/`;
   - one non-empty prompt exists for every scene.
5. Report the job manifest path, scene count, and frame filenames. Do not invoke the generation skill.
