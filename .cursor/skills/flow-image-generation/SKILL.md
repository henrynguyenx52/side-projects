---
name: flow-image-generation
description: Read a validated video-reference-analysis manifest, upload its character and scene reference images to Trân Ni Image Auto, then queue each stored prompt with browser-use. Use when the user provides an analysis.json job manifest or asks to generate Flow images from prepared video-reference output.
---

# Flow image generation

Consume one job produced by `video-reference-analysis`. Do not create, revise, or infer prompts; use the manifest prompts exactly.

## Input and preflight

Require the path to `reference-image/jobs/<job-id>/analysis.json`.

Reject the job if:

- `schema_version` is not `1`;
- a listed character or style path is missing or has an unsupported extension;
- `scenes` are not consecutive from 1;
- the prompt count differs from the style-file count;
- `aspect_ratio` is not `9:16` or `images_per_prompt` is not `1` without an explicit user override.

Use every listed character file and every listed style file. Do not scan unrelated files in `reference-image/`.

## Browser-use setup

Use a local, headed Google Chrome session controlled by `browser-use`, with:

- `user_data_dir` set to `~/.config/browseruse/profiles/flow-google`. Create that directory if it is missing. Always reuse it. Do not create a second profile, and do not copy cookies or the default Chrome profile into it;
- `channel="chrome"`;
- `cross_origin_iframes=True`;
- the Trân Ni Image Auto project URL;
- browser-use actor/CDP operations, including `DOM.setFileInputFiles`.

Never use the Cursor browser, Computer Use, or the native file chooser.

Open the project in that profile before uploading.

- If the page is already signed in, continue. Do not ask the user to sign in again.
- If it lands on `flow.google.com/about` or a Google sign-in page, leave this Chrome window open and ask the user to sign in once there. The same profile directory keeps that session for later runs. After they confirm, resume in this profile.

The tool UI is a cross-origin iframe. Attach to that iframe before interacting.

## Load references

1. Open **Reference Library**.
2. Set **Nhóm Phân loại** to **Character Profile**, set its multi-file input to all `character_files`, and verify those cards appear.
3. Set **Nhóm Phân loại** to **Art Style / Texture** (the current tool's label for Style), set the same input to all scene style files, and verify every manifest filename appears.
4. Keep **Gán cho Nhân vật** as **None (Chung / Không gắn)** and **Set as Global Reference** off.

If this is a rerun, do not add a duplicate reference card. Verify existing cards by filename and upload only missing files.

## Queue generation

1. Open **Prompt Manager**.
2. Keep **Single Prompt (1 câu lệnh)**, **9:16**, and **1 ảnh** selected.
3. Before adding prompts, inspect the queue:
   - If it contains prompts for a different job, stop and ask whether to clear it.
   - If it already contains the complete current job, report the queue state and stop.
4. For each manifest scene in index order:
   - fill the textarea once with that scene's `prompt`;
   - read it back and verify an exact single copy;
   - click **Thêm 1 Prompt (1 ảnh)** once;
   - verify the field clears and the queue count increments by one.

Never click **Start Queue**, **Test 1 Prompt**, or **Test 5 Prompts**.

Finish only when **BẢNG HÀNG ĐỢI PROMPT** has the same number of prompts and images as `scenes`. Report the job id, queue count, and loaded character/style counts.
