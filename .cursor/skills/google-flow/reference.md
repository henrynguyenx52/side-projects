# Google Flow controls

Drive Trân Ni Image Auto with Playwright and installed Google Chrome (`channel: "chrome"`), headed, using a persistent user-data directory. Do not use the Cursor browser, Computer Use, or the system file chooser.

The tool UI is inside a cross-origin frame. Playwright can reach that frame, set its file input, and press its buttons. A click from the Cursor browser only lands on the frame.

This Chrome build refuses `--remote-debugging-port` on the default profile. Do not copy Chrome cookies or the profile to work around that. If the project URL opens `flow.google.com/about`, the Playwright profile is signed out. Stop and ask the user to sign in once in that window.

## Reference Library

Tab button: `photo_library Reference Library`.

| Control | Use |
|---|---|
| Nhóm Phân loại | **Character Profile** for `reference-image/character/`. **Style** for `reference-image/style/`. Set this before choosing files. |
| File input | After the category is set, call `setInputFiles` with every image in the current folder. Do not click Browse Files. |
| Paste image | Do not use. The button only asks for a real Cmd+V. |
| Gán cho Nhân vật | Leave **None (Chung / Không gắn)**. |
| Set as Global Reference | Leave off. |

After each batch, the thumbnail count for that group equals the number of files just chosen. Upload any file that did not appear. Do not stop after the first image.

## Prompt Manager

Tab button: `auto_stories Prompt Manager`.

| Control | Use |
|---|---|
| Single Prompt (1 câu lệnh) | Required. The whole box is one prompt, including line breaks. |
| Mỗi dòng 1 Prompt | Do not use. |
| Prompt box | One prompt at a time. Placeholder starts `Nhập nội dung prompt tại đây`. |
| Thêm 1 Prompt (1 ảnh) | The generate button. Adds the prompt and starts the pipeline (`PIPELINE RUNNING`). |
| 9:16 | Leave selected unless the user asked for another ratio. |
| 1x / 1 ảnh | Leave selected unless the user asked for more images per prompt. |
| Start Queue, Test 1 Prompt, Test 5 Prompts | Do not click. Thêm 1 Prompt already starts generation. |

The queue heading is `BẢNG HÀNG ĐỢI PROMPT`. It reads `N prompts • N ảnh`.

## Filling the prompt box

Put the prompt in the frame's text box once with `fill`. Do not type it a second time, or the stored prompt is doubled.

Before clicking **Thêm 1 Prompt (1 ảnh)**, read the box. It must contain that prompt once. After a successful add, the box returns to the placeholder and **TỔNG SỐ PROMPT** increases by one.
