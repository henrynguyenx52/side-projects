"use strict";

const { engine } = require("./muse-tool/src/server");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages()[0] || (await context.newPage());
  await page.goto("https://muse.ai/thread/4ed76993-85d4-46b1-b981-b58441c08257", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const analysis = await page.evaluate(() => {
    const vids = Array.from(document.querySelectorAll("video"));
    return vids.map(v => {
      const parents = [];
      let p = v.parentElement;
      while (p && parents.length < 8) {
        parents.push({
          tag: p.tagName,
          class: p.className,
          testid: p.getAttribute('data-testid')
        });
        p = p.parentElement;
      }
      return {
        src: v.src,
        currentSrc: v.currentSrc,
        duration: v.duration,
        w: v.videoWidth,
        h: v.videoHeight,
        parents
      };
    });
  });

  console.log("Video ancestry:", JSON.stringify(analysis, null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
