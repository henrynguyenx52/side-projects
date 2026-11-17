"use strict";

const { engine } = require("./muse-tool/src/server");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages()[0] || (await context.newPage());
  await page.goto("https://muse.ai/thread/4ed76993-85d4-46b1-b981-b58441c08257", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const fetchResult = await page.evaluate(async () => {
    const v = document.querySelector('[data-testid="hatch-chat-attachment-presentation-video"] video');
    if (!v) return { ok: false, error: "No video element found in attachment" };
    const src = v.currentSrc || v.src;
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      return { ok: true, src, size: blob.size, type: blob.type };
    } catch (e) {
      return { ok: false, src, error: e.message };
    }
  });

  console.log("Fetch blob result:", fetchResult);
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
