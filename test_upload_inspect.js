"use strict";

const { engine } = require("./muse-tool/src/server");
const { MUSE_NEW_THREAD } = require("./muse-tool/src/config");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages().find(p => p.url().includes("muse.ai")) || context.pages()[0] || (await context.newPage());
  console.log("Navigating to", MUSE_NEW_THREAD);
  await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForTimeout(2000);

  const beforeUpload = await page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea")).map(t => ({
      visible: t.offsetParent !== null,
      placeholder: t.placeholder,
      className: t.className
    }));
    const contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]')).map(c => ({
      visible: c.offsetParent !== null,
      className: c.className
    }));
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(f => ({
      visible: f.offsetParent !== null
    }));
    return { textareas, contenteditables, fileInputs };
  });
  console.log("Before upload:", JSON.stringify(beforeUpload, null, 2));

  // Now simulate attaching 3 files
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    const files = [
      "/Users/hungnguyen/Documents/side-projects/muse-tool/data/media/son_tinh_reference.jpg",
      "/Users/hungnguyen/Documents/side-projects/muse-tool/data/media/thuy_tinh_reference.jpg",
      "/Users/hungnguyen/Documents/side-projects/muse-tool/data/media/mi_nuong_reference.jpg"
    ];
    console.log("Uploading 3 files...");
    await fileInput.setInputFiles(files);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "scratch_after_upload.png" });

    const afterUpload = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll("textarea")).map(t => ({
        visible: t.offsetParent !== null,
        placeholder: t.placeholder,
        className: t.className
      }));
      const contenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]')).map(c => ({
        visible: c.offsetParent !== null,
        className: c.className
      }));
      const dialogs = Array.from(document.querySelectorAll('dialog, [role="dialog"], [class*="modal"]')).map(d => ({
        visible: d.offsetParent !== null,
        innerText: d.innerText.slice(0, 100)
      }));
      return { textareas, contenteditables, dialogs };
    });
    console.log("After upload:", JSON.stringify(afterUpload, null, 2));
  } else {
    console.log("No file input found!");
  }
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
