"use strict";

const { engine } = require("./muse-tool/src/server");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages()[0] || (await context.newPage());
  await page.goto("https://muse.ai/thread/4ed76993-85d4-46b1-b981-b58441c08257", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    // Exact JS_GET_ATTACHMENTS code
    const list = [];
    const seen = new Set();
    function addEl(el, tid) {
      if (!el || seen.has(el)) return;
      seen.add(el);
      const isInsideExcluded = el.closest('form, [class*="chat-user-bubble"], [class*="group/msg"]');
      const v = el.querySelector('video') || (el.tagName === 'VIDEO' ? el : null);
      if (v && v.preload === 'none') {
        try { v.preload = 'metadata'; } catch (_) {}
      }
      const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
      const isVid = (tid || '').includes('video') || Boolean(v);
      const primary = isVid ? (v || img) : (img || v);
      const src = primary ? (primary.currentSrc || primary.src || '') : '';
      const vDur = (v && Number.isFinite(v.duration) && v.duration > 0) ? Math.round(v.duration * 10) / 10 : 0;
      
      list.push({
        elTag: el.tagName,
        tid,
        isInsideExcluded: Boolean(isInsideExcluded),
        hasVideo: Boolean(v),
        src,
        vSrc: v ? (v.currentSrc || v.src || '') : '',
        w: primary ? (primary.videoWidth || primary.naturalWidth || 0) : 0,
        h: primary ? (primary.videoHeight || primary.naturalHeight || 0) : 0,
        dur: vDur,
      });
    }

    document.querySelectorAll('[data-testid^="hatch-chat-attachment-presentation-"]').forEach(a => {
      addEl(a, a.getAttribute('data-testid'));
    });
    document.querySelectorAll('div[class*="hatch-agent-bubble-bg"] img, div[class*="hatch-agent-bubble-bg"] video').forEach(m => {
      addEl(m.parentElement || m, 'agent-media');
    });

    return list;
  });

  console.log("Attachments test:", JSON.stringify(result, null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
