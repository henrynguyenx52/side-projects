"use strict";

const { engine } = require("./muse-tool/src/server");
const { MUSE_NEW_THREAD } = require("./muse-tool/src/config");

async function test() {
  const account = engine.store.accounts[0];
  const context = await engine.getContext(account, false);
  let page = context.pages().find(p => p.url().includes("muse.ai")) || context.pages()[0] || (await context.newPage());
  console.log("Navigating to", MUSE_NEW_THREAD);
  await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    bodySnippet: document.body.innerText.slice(0, 500),
    inputs: Array.from(document.querySelectorAll("input")).map(i => ({ type: i.type, name: i.name, id: i.id })),
    buttons: Array.from(document.querySelectorAll("button")).map(b => b.innerText.slice(0, 50))
  }));

  console.log("Page info:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "scratch_page_state.png" });
  console.log("Screenshot saved to scratch_page_state.png");
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
