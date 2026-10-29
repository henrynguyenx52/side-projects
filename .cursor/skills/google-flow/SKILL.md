---
name: google-flow
description: >-
  Load every image in reference-image/character and reference-image/style into
  Google Flow (Trân Ni Image Auto), write prompts from the user's request and
  an optional sample video, then click Thêm 1 Prompt to generate. Use when the
  user asks to gen ảnh on Google Flow, load reference images, upload character
  or style images, or turn a sample TikTok or video into style images.
---

# Google Flow

Load reference images, then click the generate button. The agent writes the prompts. This skill does not cover Remotion, Hyperframes, speech, or editing the Flow tool.

Paths are relative to the repo root.

```
reference-image/character/   identity images
reference-image/style/       style images, including stills cut from a sample video
```

Load every image in those two folders. An empty folder means zero uploads for that group. Do not pick a subset. Accepted files: png, jpg, jpeg, webp.

Button names and the Playwright controls are in [reference.md](reference.md). Read it before touching the page. Drive the page with Playwright. Do not use the Cursor browser, Computer Use, or the system file chooser.

## 1. Prompts

Write the prompts from the user's request. Do not reuse a canned prompt from an older job.

If the user also sends a sample video or a video URL, cut that video before uploading:

1. Save one still per distinct scene into `reference-image/style/`, in scene order (`01-short-name.jpg`, then `02-...`).
2. Skip a frame that is only a white flash, a glitch, or a duplicate of the scene already saved.
3. A blurry frame is still a scene. Keep it, and write the prompt so the result is sharp and natural, with the same pose and outfit.
4. Each saved still is one style image, and it gets one prompt.

Each prompt uses the character image for the face and body, and the matching style image for outfit, pose, and background. Say which style image that prompt belongs to, because the tool attaches every uploaded reference to every generation. One prompt per style image. If there is no style image and no sample video, write only the prompts the user's request needs, against the character image.

Vertical output stays 9:16, one image per prompt, unless the user asks otherwise.

## 2. Load references

Open the Flow project with Playwright, `channel: "chrome"`, headed, and a persistent user-data directory. The tool UI is inside a cross-origin frame. Use that frame. Do not click **Browse Files**.

If the navigation lands on `flow.google.com/about`, the Playwright profile is not signed in. Stop and tell the user to sign in once in that window. This Chrome build refuses a debug port on its default profile, so Playwright cannot attach to the already signed-in Chrome.

1. Open **Reference Library**.
2. Set **Nhóm Phân loại** to **Character Profile**. Set the frame's file input to every file in `reference-image/character/`. Confirm the new character count equals the file count.
3. Set **Nhóm Phân loại** to **Style**. Set the frame's file input to every file in `reference-image/style/`. Confirm the new style count equals the file count.

Set the category before each batch. Leave **Gán cho Nhân vật** on **None** and leave **Set as Global Reference** off. If a folder is empty, skip that batch and say so.

## 3. Generate

Stay in **Single Prompt (1 câu lệnh)**. **9:16** and **1 ảnh** stay selected.

For each prompt:

1. Replace the box with that one prompt. The box must show it once.
2. Click **Thêm 1 Prompt (1 ảnh)**.

That button queues the prompt and starts the pipeline. Do not also click **Start Queue**, **Test 1 Prompt**, or **Test 5 Prompts**.

Stop when **BẢNG HÀNG ĐỢI PROMPT** shows the same number of prompts as the prompts you wrote, and the same number of images. Tell the user that count, plus how many character files and style files were loaded.
