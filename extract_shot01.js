"use strict";

const fs = require("fs");
const path = require("path");
const { engine } = require("./muse-tool/src/server");
const { trimVideo } = require("./muse-tool/src/story");

async function extract() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages()[0] || (await context.newPage());
  console.log("Navigating to thread 4ed76993-85d4-46b1-b981-b58441c08257...");
  await page.goto("https://muse.ai/thread/4ed76993-85d4-46b1-b981-b58441c08257", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const mediaData = await page.evaluate(async () => {
    const v = document.querySelector('[data-testid="hatch-chat-attachment-presentation-video"] video');
    if (!v) return { ok: false, error: "No video found" };
    const src = v.currentSrc || v.src;
    try {
      const resp = await fetch(src);
      if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
      const blob = await resp.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });
      return { ok: true, dataUrl, size: blob.size };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  if (!mediaData.ok) {
    console.error("Extract failed:", mediaData.error);
    process.exit(1);
  }

  const buf = Buffer.from(mediaData.dataUrl.split(",")[1], "base64");
  const rawPath = path.resolve("./muse-tool/data/media/shot_01_raw.mp4");
  fs.writeFileSync(rawPath, buf);
  console.log(`Saved raw video to ${rawPath} (${Math.round(buf.length / 1024)} KB)`);

  const vimaxClipPath = path.resolve("./ViMax/.working_dir/son_tinh_thuy_tinh_new/script2video/videos/shot_01.mp4");
  fs.mkdirSync(path.dirname(vimaxClipPath), { recursive: true });

  console.log(`Trimming to exactly 5s: ${vimaxClipPath}`);
  await trimVideo(rawPath, 5, vimaxClipPath);
  console.log(`✅ Cảnh 1 đã sẵn sàng tại: ${vimaxClipPath} (${Math.round(fs.statSync(vimaxClipPath).size / 1024)} KB)`);
  process.exit(0);
}

extract().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
