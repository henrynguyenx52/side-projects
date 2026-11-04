# YouTube delivery

## Check current platform guidance

YouTube requirements can change. Before preparing a final upload, browse the current official YouTube Help pages for thumbnails, video settings, chapters, captions, audience designation, and altered/synthetic-content disclosure. Start with these official help IDs: `72431`, `57404`, `9884579`, `2734698`, `9528076`, and `14328491`.

Do not make the legal audience designation for the user. Explain the available setting and require the user to confirm it before publishing.

## Build the upload folder

Include:

- Final MP4
- Thumbnail image and editable thumbnail source
- Title, description, tags, chapters, and pinned comment
- UTF-8 `.srt` captions
- Upload settings and a final checklist
- Machine-readable metadata and validation results

Generate the text package with:

```bash
node scripts/build-youtube-package.mjs \
  --job <job-directory> \
  --video <final.mp4> \
  --config <metadata-config.json> \
  --out <job>/youtube-upload-v1
```

Use `--validate-only` before writing the package. Adapt [youtube-package-config.example.json](youtube-package-config.example.json) rather than editing the example in place.

## Metadata rules

- Make the title specific, natural, and consistent with the episode number and topic.
- Put the learning promise in the first two description lines.
- Use chapter timestamps from measured scene starts; the first chapter begins at `0:00`.
- When the two-part channel/topic opening is present, use `0:00 Introduction` and shift every original scene chapter by the exact combined intro duration.
- Prefer a focused tag list over keyword stuffing.
- Include the playlist or next-episode suggestion when known.

Every spoken line needs a caption. For a combined lesson narration cue, use the lesson timing artifact to create accurately timed entries for the intro and each card. Split the expression and meaning only when their boundary is measured; otherwise keep both in one timed card entry rather than inventing precision.

Include the episode-topic narrator line in captions. Offset all original episode captions by the same combined intro duration used for chapters.

## Thumbnail

Reuse approved character art. Show both main faces when practical, add one short learning promise, preserve high contrast, and inspect the design at 320×180. Render thumbnail text and UI in editable code or design source rather than baking generated text into AI artwork.

## Publish carefully

Upload as unlisted first. Wait for HD processing and checks, confirm title, description, captions, chapters, thumbnail, audience, disclosure, playlist, and end screen, then review on both desktop and mobile before making it public. Publishing remains an explicit user-authorized action.

