"use strict";

const { engine } = require("./muse-tool/src/server");
const { MUSE_NEW_THREAD } = require("./muse-tool/src/config");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages()[0] || (await context.newPage());
  await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForTimeout(3000);

  const clicked = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const target = all.find(el => el.children.length === 0 && el.innerText && el.innerText.includes("Phong Châu throne hall"));
    if (target) {
      target.click();
      return { found: true, tag: target.tagName, text: target.innerText };
    }
    return { found: false };
  });

  console.log("Clicked sidebar item:", clicked);
  if (clicked.found) {
    await page.waitForTimeout(4000);
    console.log("Current URL after click:", page.url());
    await page.screenshot({ path: "scratch_thread_page.png" });

    const content = await page.evaluate(() => {
      const vids = Array.from(document.querySelectorAll("video")).map(v => ({
        src: v.src,
        currentSrc: v.currentSrc,
        duration: v.duration,
        w: v.videoWidth,
        h: v.videoHeight,
        className: v.className
      }));
      const attachments = Array.from(document.querySelectorAll('[data-testid^="hatch-chat-attachment-presentation-"]')).map(el => ({
        tid: el.getAttribute('data-testid'),
        html: el.outerHTML.slice(0, 300)
      }));
      const allMedias = Array.from(document.querySelectorAll('img, video')).map(m => ({
        tag: m.tagName,
        src: (m.currentSrc || m.src || '').slice(0, 100),
        w: m.naturalWidth || m.videoWidth || 0,
        h: m.naturalHeight || m.videoHeight || 0
      }));
      const bubbles = Array.from(document.querySelectorAll('div[class*="hatch-chat-groupable-bubble"]')).map(b => b.innerText.slice(0, 150));
      return { vids, attachments, allMedias, bubbles };
    });
    console.log("Content:", JSON.stringify(content, null, 2));
  }

  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
