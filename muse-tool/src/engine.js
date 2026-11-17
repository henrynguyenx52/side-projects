"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("playwright-core");
const {
  CHROME_PATH,
  MUSE_URL,
  MUSE_NEW_THREAD,
  MEDIA_DIR,
} = require("./config");
const { trimVideo } = require("./story");

const JS_GET_ATTACHMENTS = `
(() => {
  const list = [];
  const seen = new Set();
  function addEl(el, tid) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    if (el.closest('form, [class*="chat-user-bubble"]')) return;
    const v = el.querySelector('video') || (el.tagName === 'VIDEO' ? el : null);
    if (v && v.preload === 'none') {
      try { v.preload = 'metadata'; } catch (_) {}
    }
    const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
    const isVid = (tid || '').includes('video') || Boolean(v);
    const primary = isVid ? (v || img) : (img || v);
    const src = primary ? (primary.currentSrc || primary.src || '') : '';
    const vDur = (v && Number.isFinite(v.duration) && v.duration > 0) ? Math.round(v.duration * 10) / 10 : 0;
    if (src && !seen.has(src)) {
      seen.add(src);
      list.push({
        tid: tid || el.getAttribute('data-testid') || (isVid ? 'video' : 'image'),
        hasVideo: Boolean(v),
        hasImg: Boolean(img),
        src,
        vSrc: v ? (v.currentSrc || v.src || '') : '',
        iSrc: img ? (img.currentSrc || img.src || '') : '',
        w: primary ? (primary.videoWidth || primary.naturalWidth || 0) : 0,
        h: primary ? (primary.videoHeight || primary.naturalHeight || 0) : 0,
        dur: vDur,
      });
    }
  }
  document.querySelectorAll('[data-testid^="hatch-chat-attachment-presentation-"]').forEach(a => {
    addEl(a, a.getAttribute('data-testid'));
  });
  document.querySelectorAll('div[class*="hatch-agent-bubble-bg"] img, div[class*="hatch-agent-bubble-bg"] video').forEach(m => {
    const s = m.currentSrc || m.src || '';
    if (s && !s.includes('avatar') && !s.includes('emoji')) {
      addEl(m.parentElement || m, 'agent-media');
    }
  });
  document.querySelectorAll('video').forEach(v => {
    const s = v.currentSrc || v.src || '';
    if (s && !s.includes('avatar') && !v.closest('[class*="status-avatar"]')) {
      addEl(v.parentElement || v, 'video-element');
    }
  });
  return list;
})()
`;

const JS_POLL_AGENT_STATUS = `
(() => {
  const scope = document.querySelector('main, [class*="chat-scroll"], [class*="hatch-chat-scroll"]') || document.body;
  if (!scope) {
    return { cnt: 0, txt: '', isGenerating: false, productTitle: '' };
  }
  const bs = Array.from(scope.querySelectorAll('div[class*="hatch-chat-groupable-bubble"]'))
    .filter(b => /hatch-agent-bubble-bg/.test(b.className || ''));
  const nonEmpty = bs.filter(b => (b.innerText || '').trim().length > 0);
  const lastTxt = nonEmpty.length ? (nonEmpty[nonEmpty.length - 1].innerText || '').trim() : '';

  let productTitle = '';
  for (const b of nonEmpty) {
    const t = b.innerText || '';
    const m = t.match(/\\[\\[?\\s*PRODUCT_TITLE\\s*:\\s*([^\\]\\n]+?)\\s*\\]?\\]/i);
    if (m && m[1] && !/NONE|exact product name/i.test(m[1].trim())) {
      productTitle = m[1].trim();
    }
  }

  const statusEl = document.querySelector('[data-testid="hatch-status-panel-sliding-surface"]');
  const statusHasSpinner = Boolean(
    statusEl &&
      statusEl.querySelector(
        '.animate-spin, svg.animate-spin, [role="progressbar"], [data-testid*="loading" i], [data-testid*="spinner" i]'
      )
  );

  const isGenerating = Boolean(
    document.querySelector('[data-testid="hatch-composer-stop-button"]') ||
    document.querySelector('button[aria-label*="Stop" i]') ||
    document.querySelector('button[aria-label*="停止"]') ||
    document.querySelector('button[aria-label*="dừng" i]') ||
    statusHasSpinner
  );

  return {
    cnt: bs.length,
    txt: lastTxt,
    isGenerating,
    productTitle,
  };
})()
`;

function buildProbeVideoDurationJs(targetSrc) {
  return `
(async () => {
  const src = ${JSON.stringify(targetSrc)};
  if (!src) return 0;
  const domVids = Array.from(document.querySelectorAll('video'));
  const existing = domVids.find(v => (v.currentSrc || v.src || '') === src);
  if (existing && Number.isFinite(existing.duration) && existing.duration > 0) {
    return Math.round(existing.duration * 10) / 10;
  }
  return await new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      try { v.removeAttribute('src'); v.load(); } catch (_) {}
      resolve(val);
    };
    const timer = setTimeout(() => finish(0), 4000);
    v.onloadedmetadata = () => {
      clearTimeout(timer);
      const d = Number.isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration * 10) / 10 : 0;
      finish(d);
    };
    v.onerror = () => {
      clearTimeout(timer);
      finish(0);
    };
    v.src = src;
  });
})()
`;
}

class MusePlaywrightEngine {
  constructor(store, options = {}) {
    this.store = store;
    this.chromePath = options.chromePath || CHROME_PATH;
    this.headless = options.headless ?? store.settings.headless;
    this.activeContexts = new Map();
    this.lockMap = new Map();
  }

  log(msg) {
    const time = new Date().toLocaleTimeString("vi-VN");
    console.log(`[${time}] [MuseEngine] ${msg}`);
  }

  _withAccountLock(accountId, fn) {
    const key = accountId || "default";
    const current = this.lockMap.get(key) || Promise.resolve();
    const next = current
      .catch(() => {})
      .then(fn)
      .catch((err) => {
      this.log(`Error in locked task for ${key}: ${err.message}`);
      throw err;
    });
    this.lockMap.set(key, next);
    return next;
  }

  async getContext(account, forceHeadless = null) {
    if (!account) throw new Error("Chưa có tài khoản nào được chọn.");
    const isHeadless = forceHeadless !== null ? forceHeadless : this.headless;
    const existing = this.activeContexts.get(account.id);

    if (existing) {
      try {
        const pages = existing.pages();
        if (pages.length > 0) return existing;
      } catch (_e) {
        this.activeContexts.delete(account.id);
      }
    }

    if (!this.chromePath || !fs.existsSync(this.chromePath)) {
      throw new Error(
        `Không tìm thấy Google Chrome tại: ${this.chromePath}. Hãy kiểm tra đường dẫn cài đặt Chrome.`
      );
    }

    this.log(`Khởi động Chrome cho [${account.name}] (headless: ${isHeadless})`);
    const context = await chromium.launchPersistentContext(account.profileDir, {
      executablePath: this.chromePath,
      headless: isHeadless,
      viewport: { width: 1280, height: 800 },
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--window-size=1280,800",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    this.activeContexts.set(account.id, context);
    return context;
  }

  async closeContext(accountId) {
    const ctx = this.activeContexts.get(accountId);
    if (ctx) {
      try {
        await ctx.close();
      } catch (_e) {}
      this.activeContexts.delete(accountId);
    }
  }

  async closeAll() {
    for (const [id, ctx] of this.activeContexts.entries()) {
      try {
        await ctx.close();
      } catch (_e) {}
    }
    this.activeContexts.clear();
  }

  async _probeVideoDuration(page, targetSrc) {
    try {
      return await page.evaluate(buildProbeVideoDurationJs(targetSrc));
    } catch (_e) {
      return 0;
    }
  }

  // --- Interactive Login ---
  async loginInteractive(account, timeoutSec = 300) {
    if (!account) throw new Error("Tài khoản không hợp lệ");
    await this.closeContext(account.id);

    this.log(`Mở trình duyệt đăng nhập tương tác cho [${account.name}]...`);
    const context = await this.getContext(account, false);
    let page = context.pages()[0];
    if (!page) page = await context.newPage();

    await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.bringToFront();

    this.store.updateAccount(account.id, {
      status: "LOGGING_IN",
      errorReason: "Đang chờ người dùng đăng nhập trong cửa sổ Chrome...",
    });

    const deadline = Date.now() + timeoutSec * 1000;
    let loggedIn = false;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const url = page.url();
        const cookies = await context.cookies([MUSE_URL]);
        const hasSessionCookie = cookies.some((c) =>
          c.name.includes("session") || c.name.includes("token") || c.name.includes("auth") || c.name.includes("muse")
        );
        const hasComposer = await page.evaluate(() => {
          return Boolean(document.querySelector("textarea") || document.querySelector('[contenteditable="true"]'));
        }).catch(() => false);

        if (url.includes("muse.ai") && !url.includes("login") && !url.includes("auth") && (hasComposer || hasSessionCookie)) {
          loggedIn = true;
          break;
        }
      } catch (err) {
        this.log(`Login poll warning: ${err.message}`);
      }
    }

    if (loggedIn) {
      await context.storageState({ path: account.storageStatePath }).catch(() => {});
      this.store.updateAccount(account.id, {
        status: "LIVE",
        lastActive: Date.now(),
        errorReason: "",
      });
      this.log(`Đăng nhập thành công tài khoản [${account.name}]!`);
      return { ok: true, message: "Đăng nhập thành công!" };
    } else {
      this.store.updateAccount(account.id, {
        status: "DIE",
        errorReason: "Hết thời gian chờ đăng nhập (5 phút).",
      });
      throw new Error("Hết thời gian chờ đăng nhập Muse.ai.");
    }
  }

  // --- Session Verification ---
  async verifyAccount(account) {
    if (!account) return { ok: false, reason: "No account" };
    try {
      const context = await this.getContext(account, true);
      let page = context.pages()[0] || (await context.newPage());
      await page.goto(MUSE_NEW_THREAD, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});

      const hasComposer = await page.evaluate(() => {
        return Boolean(document.querySelector("textarea"));
      }).catch(() => false);

      const isLoginUrl = page.url().includes("login") || page.url().includes("signin");

      if (hasComposer && !isLoginUrl) {
        this.store.updateAccount(account.id, {
          status: "LIVE",
          lastActive: Date.now(),
          errorReason: "",
        });
        return { ok: true, status: "LIVE" };
      } else {
        this.store.updateAccount(account.id, {
          status: "DIE",
          errorReason: "Phiên đăng nhập đã hết hạn.",
        });
        return { ok: false, status: "DIE", reason: "Phiên đăng nhập đã hết hạn" };
      }
    } catch (err) {
      this.store.updateAccount(account.id, {
        status: "DIE",
        errorReason: err.message,
      });
      return { ok: false, status: "DIE", reason: err.message };
    }
  }

  // --- Send Prompt helper ---
  async _sendPrompt(page, promptText) {
    const textarea = await page.waitForSelector("textarea", { timeout: 25000 });
    if (!textarea) throw new Error("Không tìm thấy ô nhập lệnh trên trang Muse.ai");

    await textarea.click();
    await textarea.fill(promptText);
    await page.waitForTimeout(300);

    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, [role=button]")).filter(
        (b) => b.offsetParent !== null
      );
      const sendBtn = btns.find((b) => {
        const label = (b.getAttribute("aria-label") || "") + (b.getAttribute("data-testid") || "") + (b.innerText || "");
        return /send|gửi|发送/i.test(label);
      });
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      await page.keyboard.press("Enter");
    }
  }

  // --- Generate Media (Video / Image) ---
  async generateMedia({
    prompt,
    expect = "video",
    duration = "20s",
    aspectRatio = "9:16",
    quality = "2K",
    referenceImages = [],
    accountId = "",
    onProgress = null,
  }) {
    let account = accountId
      ? this.store.getAccount(accountId) || this.store.pickAccount()
      : this.store.pickAccount();

    if (!account) {
      throw new Error("Không có tài khoản Muse.ai nào khả dụng. Vui lòng thêm và đăng nhập tài khoản trước.");
    }

    const report = (pct, text) => {
      if (typeof onProgress === "function") {
        try {
          onProgress(pct, text);
        } catch (_e) {}
      }
    };

    return this._withAccountLock(account.id, async () => {
      report(5, `Đang khởi tạo phiên trình duyệt cho [${account.name}]...`);

      const cleanPrompt = String(prompt || "").trim();
      let targetDurationSec = 0;
      if (expect === "video") {
        if (duration && duration !== "dynamic") {
          targetDurationSec = parseInt(String(duration).replace(/[^\d]/g, ""), 10) || 0;
        }
        // If no explicit duration, check if prompt contains duration (e.g. "15s", "10 giây", "dài 20s")
        if (!targetDurationSec) {
          const durMatch = cleanPrompt.match(/(?:dài|thời lượng|duration)?\s*(\d+)\s*(?:s|giây|seconds?)\b/i);
          if (durMatch) {
            targetDurationSec = parseInt(durMatch[1], 10) || 0;
          }
        }
      }

      const isLongVideo = expect === "video" && targetDurationSec > 10;
      const clipCount = isLongVideo ? Math.max(2, Math.ceil(targetDurationSec / 10)) : 1;

      // Build specifications
      const specs = [];
      if (aspectRatio) specs.push(`aspect ratio ${aspectRatio}`);
      if (expect === "video" && targetDurationSec > 0) {
        if (targetDurationSec <= 5) {
          specs.push("duration: 5s", "single 5-second video clip");
        } else {
          specs.push(`total duration ${targetDurationSec}s`);
        }
      }
      const qUpper = String(quality || "2K").toUpperCase();
      specs.push(`resolution ${qUpper}`);

      const validRefImgs = (Array.isArray(referenceImages) ? referenceImages : []).filter(
        (img) => img && (img.b64 || img.path)
      );
      const hasCharacterRef = validRefImgs.some((i) => i.role === "character");
      const hasProductRef = validRefImgs.some((i) => i.role === "product");

      if (hasCharacterRef) {
        specs.push("strictly preserve the exact face, hairstyle, outfit, and identity of the attached character reference image");
      }
      if (hasProductRef) {
        specs.push("strictly preserve the exact appearance, logo, packaging, and details of the attached product reference image");
      }

      // Instruction for product title extraction
      const productTitleInstruction = hasProductRef
        ? `\n\n[MANDATORY PRODUCT TITLE EXTRACTION]: Please inspect the product image. Output [[PRODUCT_TITLE: exact product name from packaging/image]] on the very first line.`
        : "";

      let finalPrompt = cleanPrompt;
      if (expect === "video") {
        if (isLongVideo) {
          finalPrompt =
            `Please create a complete ${targetDurationSec}-second video (${specs.join(", ")}) for this scene: ${cleanPrompt}\n\n` +
            `[YÊU CẦU BẮT BUỘC VỀ ĐỘ DÀI ${targetDurationSec} GIÂY & LỆNH GHÉP VIDEO HOÀN CHỈNH / MANDATORY MULTI-CLIP & FFMPEG STITCHING]:\n` +
            `Vì mỗi đoạn video đơn lẻ chỉ dài tối đa 5s–10s, bạn BẮT BUỘC thực hiện đầy đủ 2 bước sau trong lượt này:\n` +
            `1. Chia kịch bản thành ${clipCount} phân cảnh nối tiếp nhau mượt mà (${clipCount} đoạn 10s = tổng cộng ${targetDurationSec}s), giữ đồng nhất ${hasCharacterRef ? "nhân vật mẫu, " : ""}bối cảnh${hasProductRef ? " và sản phẩm mẫu" : ""}, rồi tạo ngay tất cả các đoạn video thành phần đó.\n` +
            `2. GHÉP VIDEO HOÀN CHỈNH (STITCH VIDEO): Ngay sau khi tạo xong các đoạn video thành phần, BẮT BUỘC dùng công cụ ffmpeg trong workspace để ghép nối tất cả các đoạn video theo đúng thứ tự thành 1 file MP4 hoàn chỉnh duy nhất dài ${targetDurationSec} giây (final_stitched_${targetDurationSec}s.mp4) và đính kèm/xuất file MP4 hoàn chỉnh đó ra khung chat!${productTitleInstruction}`;
        } else {
          const shortClipHint =
            targetDurationSec > 0 && targetDurationSec <= 5
              ? "\n[IMPORTANT DURATION INSTRUCTION]: Strictly generate a single short 5-second video clip (duration: 5s). Do NOT generate 10s."
              : "";
          finalPrompt = `Please generate a video (${specs.join(", ")}): ${cleanPrompt}${shortClipHint}${productTitleInstruction}`;
        }
      } else {
        finalPrompt = `Please generate an image (${specs.join(", ")}): ${cleanPrompt}${productTitleInstruction}`;
      }

      const context = await this.getContext(account);
      let page = context.pages()[0] || (await context.newPage());

      report(12, "Đang mở luồng chat mới trên Muse.ai...");
      await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(1500);

      // Record baseline sources BEFORE sending prompt to completely avoid picking up old videos or placeholders
      const attsBefore = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
      const baselineSources = new Set();
      for (const a of attsBefore) {
        if (a.src) baselineSources.add(a.src);
        if (a.vSrc) baselineSources.add(a.vSrc);
        if (a.iSrc) baselineSources.add(a.iSrc);
      }
      this.log(`[${account.name}] Đã quét baseline: bỏ qua ${baselineSources.size} media cũ trên trang.`);

      // Handle Reference Images
      if (validRefImgs.length > 0) {
        report(22, `Đang đính kèm ${validRefImgs.length} ảnh tham chiếu...`);
        const tempPaths = [];
        for (let i = 0; i < validRefImgs.length; i++) {
          const img = validRefImgs[i];
          if (img.path && fs.existsSync(img.path)) {
            tempPaths.push(img.path);
          } else if (img.b64) {
            const rawB64 = img.b64.replace(/^data:image\/\w+;base64,/, "");
            const tmpFile = path.join(MEDIA_DIR, `temp_ref_${Date.now()}_${i}.png`);
            fs.writeFileSync(tmpFile, Buffer.from(rawB64, "base64"));
            tempPaths.push(tmpFile);
          }
        }

        if (tempPaths.length > 0) {
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.setInputFiles(tempPaths);
            await page.waitForTimeout(1500);
          }
          setTimeout(() => {
            tempPaths.forEach((p) => {
              if (p.includes("temp_ref_") && fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch (_e) {}
              }
            });
          }, 60000);
        }
      }

      report(30, "Đang gửi Prompt vào Muse.ai...");
      await this._sendPrompt(page, finalPrompt);
      this.log(`[${account.name}] Đã gửi prompt thành công. Bắt đầu giám sát tiến trình Muse render...`);

      // Polling loop
      const startPollTime = Date.now();
      const maxWaitMs = isLongVideo ? 900000 : 360000; // 15 mins for long video, 6 mins for short
      let matchedAtt = null;
      let extractedProductTitle = "";
      let postMediaIdleTicks = 0;
      let stitchCmdCount = 0;
      const knownClipDurations = new Map();
      let stableSrc = "";
      let stableN = 0;

      while (Date.now() - startPollTime < maxWaitMs) {
        await page.waitForTimeout(2000);

        const elapsedSec = Math.round((Date.now() - startPollTime) / 1000);
        const progPct = Math.min(94, Math.round(35 + elapsedSec * 0.4));

        // Poll agent state
        const st = (await page.evaluate(JS_POLL_AGENT_STATUS).catch(() => ({}))) || {};
        if (st.productTitle && !extractedProductTitle) {
          extractedProductTitle = String(st.productTitle).trim();
        }

        const isGenerating = Boolean(st.isGenerating);
        const curTxt = String(st.txt || "").trim();

        // Get newly rendered attachments (strictly excluding baseline)
        const allAtts = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
        const newMatchingAtts = [];

        for (const a of allAtts) {
          const hasVideo = Boolean(a.hasVideo);
          const src = a.src || "";
          const vSrc = a.vSrc || "";

          let isMatch = false;
          if (expect === "video") {
            isMatch = hasVideo || Boolean(vSrc) || src.includes(".mp4") || src.includes(".webm") || a.dur > 0;
          } else {
            isMatch = a.hasImg || (!hasVideo && !src.includes(".mp4"));
          }
          if (!isMatch) continue;

          const checkSrc = expect === "video" ? vSrc || src : src;
          if (checkSrc && !baselineSources.has(checkSrc)) {
            newMatchingAtts.push({ ...a, checkSrc });
          }
        }

        // ==================== FAST PATH: IMAGE HOẶC VIDEO NGẮN (<= 10s) ====================
        if (!isLongVideo) {
          const latestAtt = newMatchingAtts.length ? newMatchingAtts[newMatchingAtts.length - 1] : null;
          if (latestAtt) {
            if (latestAtt.checkSrc === stableSrc) {
              stableN += 1;
            } else {
              stableSrc = latestAtt.checkSrc;
              stableN = 0;
            }

            if (!isGenerating) {
              postMediaIdleTicks += 1;
            } else {
              postMediaIdleTicks = 0;
            }

            const hasValidSize = (latestAtt.w > 0 && latestAtt.h > 0) || (latestAtt.dur > 0) || stableN >= 2;
            if (!isGenerating && postMediaIdleTicks >= 1 && hasValidSize) {
              this.log(`[${account.name}] ✅ Đã nhận diện thành phẩm hoàn tất (Media: ${latestAtt.checkSrc.slice(0, 60)}...)`);
              matchedAtt = latestAtt;
              break;
            }
          }

          report(
            progPct,
            `Muse.ai đang render ${expect === "video" ? "Video" : "Ảnh"} (${elapsedSec}s)... ${
              isGenerating ? "[Đang xử lý]" : "[Đang hoàn thiện]"
            }`
          );
          continue;
        }

        // ==================== LONG VIDEO (>10s): MULTI-CLIP & FFMPEG STITCHING ====================
        for (const item of newMatchingAtts) {
          const cSrc = item.checkSrc;
          let d = Number(item.dur || 0);
          if (!d && (!knownClipDurations.has(cSrc) || knownClipDurations.get(cSrc) === 0)) {
            d = await this._probeVideoDuration(page, cSrc);
          }
          if (d > 0 || !knownClipDurations.has(cSrc)) {
            knownClipDurations.set(cSrc, d);
          }
        }

        const latestAtt = newMatchingAtts.length ? newMatchingAtts[newMatchingAtts.length - 1] : null;
        if (latestAtt) {
          const latestSrc = latestAtt.checkSrc;
          const latestDur = knownClipDurations.get(latestSrc) || Number(latestAtt.dur || 0);

          if (latestSrc === stableSrc) {
            stableN += 1;
          } else {
            stableSrc = latestSrc;
            stableN = 0;
          }

          if (!isGenerating) {
            postMediaIdleTicks += 1;
          } else {
            postMediaIdleTicks = 0;
          }

          // Case 1: The latest video has achieved the target duration (>= 70% of targetDurationSec) and Muse has finished
          if (!isGenerating && postMediaIdleTicks >= 4 && latestDur >= targetDurationSec * 0.7) {
            this.log(`[${account.name}] ✅ Đã nhận Video ghép hoàn chỉnh dài ${latestDur}s (Mục tiêu: ${targetDurationSec}s)!`);
            matchedAtt = latestAtt;
            break;
          }

          // Case 2: Muse generated individual 5s-10s clips and finished its turn, but hasn't stitched them yet!
          // Auto-send follow-up stitch command!
          if (!isGenerating && postMediaIdleTicks >= 4 && latestDur < targetDurationSec * 0.7 && stitchCmdCount < 2) {
            stitchCmdCount += 1;
            const clipCnt = newMatchingAtts.length;
            this.log(`[${account.name}] 🎬 Phát hiện ${clipCnt} clip thành phần (~${latestDur}s). Đang gửi lệnh FFMPEG Stitch...`);
            report(Math.min(90, progPct), `🎬 Đang ra lệnh Muse ghép ${clipCnt} đoạn clip thành video ${targetDurationSec}s hoàn chỉnh...`);

            const followUpCmd =
              `Bây giờ hãy ghép nối tất cả ${clipCnt} đoạn video vừa tạo ở trên theo đúng thứ tự thành 1 video MP4 hoàn chỉnh duy nhất dài ${targetDurationSec} giây! ` +
              `(Please run ffmpeg right now in your workspace to concatenate/stitch all ${clipCnt} generated video clips above in sequential order into ONE single seamless final MP4 video file named final_stitched_${targetDurationSec}s.mp4, and attach/present that final stitched MP4 video in the chat!)`;

            await this._sendPrompt(page, followUpCmd);
            postMediaIdleTicks = 0;
            await page.waitForTimeout(3000);
            continue;
          }

          // Fallback after 2 stitch attempts
          if (!isGenerating && stitchCmdCount >= 2 && postMediaIdleTicks >= 6) {
            this.log(`[${account.name}] ⚠️ Lấy video thành phẩm mới nhất sau khi hoàn tất lệnh ghép.`);
            matchedAtt = latestAtt;
            break;
          }
        }

        report(
          progPct,
          `Đang render & ghép Video ${targetDurationSec}s (${elapsedSec}s)... ${
            isGenerating ? "[Đang render]" : "[Đang kiểm tra thành phẩm]"
          }`
        );
      }

      if (!matchedAtt || !matchedAtt.checkSrc) {
        throw new Error(`Quá thời gian chờ hoặc Muse.ai chưa xuất video thành phẩm hoàn chỉnh.`);
      }

      const finalMediaSrc = matchedAtt.checkSrc;
      report(95, "Đang trích xuất và tải file video chuẩn về máy...");
      this.log(`[${account.name}] Bắt đầu tải file media từ: ${finalMediaSrc.slice(0, 80)}...`);

      // Safe extraction using FileReader.readAsDataURL inside browser context
      const mediaData = await page.evaluate(async (src) => {
        try {
          const resp = await fetch(src);
          if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
          const blob = await resp.blob();

          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("FileReader failed"));
            reader.readAsDataURL(blob);
          });

          return {
            ok: true,
            mime: blob.type || (src.includes(".mp4") ? "video/mp4" : "image/png"),
            dataUrl,
            size: blob.size,
          };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }, finalMediaSrc);

      if (!mediaData || !mediaData.ok || !mediaData.dataUrl) {
        throw new Error(`Không thể trích xuất dữ liệu video: ${mediaData?.error || "unknown"}`);
      }

      const base64Data = mediaData.dataUrl.split(",")[1];
      if (!base64Data) {
        throw new Error("Dữ liệu base64 rỗng.");
      }

      // Name resolution
      const ext = expect === "video" ? ".mp4" : ".png";
      let cleanTitle = "";
      if (extractedProductTitle && !/NONE|exact product name/i.test(extractedProductTitle)) {
        cleanTitle = extractedProductTitle
          .replace(/[\r\n\t]+/g, " ")
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
          .slice(0, 80)
          .trim();
      }
      if (!cleanTitle) {
        cleanTitle = cleanPrompt
          .replace(/[<>:"/\\|?*\x00-\x1f\n\r]/g, " ")
          .trim()
          .slice(0, 50);
      }

      const timeTag = Date.now();
      const baseName = `${cleanTitle ? `${cleanTitle}_` : ""}${timeTag}${ext}`;
      const localPath = path.join(MEDIA_DIR, baseName);
      fs.writeFileSync(localPath, Buffer.from(base64Data, "base64"));

      // Strictly trim video to target duration using ffmpeg if specified
      if (expect === "video" && targetDurationSec > 0) {
        report(98, `Đang cắt thời lượng chính xác ${targetDurationSec}s bằng FFMPEG...`);
        await trimVideo(localPath, targetDurationSec);
      }

      report(100, "Hoàn tất!");
      this.log(`[${account.name}] Đã lưu video thành phẩm vào: ${localPath} (${(mediaData.size / (1024 * 1024)).toFixed(2)} MB)`);

      const realDur = (matchedAtt && (knownClipDurations.get(matchedAtt.checkSrc) || Number(matchedAtt.dur || 0))) || 0;
      const finalDurText = targetDurationSec > 0 ? `${targetDurationSec}s` : (realDur > 0 ? `${realDur}s` : "dynamic");

      return {
        ok: true,
        expect,
        fileName: baseName,
        localPath,
        mediaUrl: `/media/${encodeURIComponent(baseName)}`,
        productTitle: cleanTitle,
        duration: finalDurText,
        aspectRatio,
        quality: qUpper,
      };
    });
  }

  // --- Chat Completion (OpenAI Compatible) ---
  async chatCompletion({ messages = [], model = "muse-spark", accountId = "" }) {
    const account = accountId
      ? this.store.getAccount(accountId) || this.store.pickAccount()
      : this.store.pickAccount();

    if (!account) throw new Error("Chưa có tài khoản Muse.ai khả dụng.");

    const lastMsg = messages[messages.length - 1];
    const userPrompt = typeof lastMsg?.content === "string" ? lastMsg.content : JSON.stringify(lastMsg?.content || "");

    return this._withAccountLock(account.id, async () => {
      const context = await this.getContext(account);
      let page = context.pages()[0] || (await context.newPage());

      await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 30000 });
      await this._sendPrompt(page, userPrompt);

      await page.waitForTimeout(4000);
      let replyText = "";
      const deadline = Date.now() + 120000;

      while (Date.now() < deadline) {
        await page.waitForTimeout(2000);
        const res = await page.evaluate(() => {
          const bubbles = Array.from(document.querySelectorAll('div[class*="hatch-chat-groupable-bubble"], [class*="hatch-agent-bubble-bg"]'));
          const isGenerating = Array.from(document.querySelectorAll("button, [role=button]")).some(
            (b) => /stop|dừng/i.test(b.innerText || "")
          );
          const lastBubble = bubbles[bubbles.length - 1];
          return {
            text: lastBubble ? lastBubble.innerText : "",
            isGenerating,
          };
        });

        if (res.text && !res.isGenerating) {
          replyText = res.text;
          break;
        }
      }

      return {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: replyText || "Không nhận được phản hồi từ Muse.",
            },
            finish_reason: "stop",
          },
        ],
      };
    });
  }
}

module.exports = { MusePlaywrightEngine };
