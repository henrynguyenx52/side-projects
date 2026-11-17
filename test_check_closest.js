"use strict";

const { engine } = require("./muse-tool/src/server");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages()[0] || (await context.newPage());
  await page.goto("https://muse.ai/thread/4ed76993-85d4-46b1-b981-b58441c08257", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const check = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="hatch-chat-attachment-presentation-video"]');
    if (!el) return "No element";
    const userBubble = el.closest('[class*="chat-user-bubble"]');
    const groupMsg = el.closest('[class*="group/msg"]');
    const form = el.closest('form');
    let p = el;
    const classes = [];
    while (p) {
      if (p.className) classes.push({ tag: p.tagName, class: p.className });
      p = p.parentElement;
    }
    return {
      hasUserBubble: Boolean(userBubble),
      hasGroupMsg: Boolean(groupMsg),
      groupMsgClass: groupMsg ? groupMsg.className : null,
      hasForm: Boolean(form),
      classes
    };
  });

  console.log("Check closest:", JSON.stringify(check, null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
