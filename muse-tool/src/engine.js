"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright-core");
const {
  CHROME_PATH,
  MUSE_URL,
  MUSE_NEW_THREAD,
  MEDIA_DIR,
  DATA_DIR,
} = require("./config");
const {
  trimVideo,
  ensureVideoResolution,
  extractLastFrame,
  buildCinematicScenePrompt,
  stitchVideos,
} = require("./story");

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

  async _cleanupStaleProfile(profileDir) {
    if (!profileDir || !fs.existsSync(profileDir)) return;

    // 1. Check SingletonLock symlink to find PID
    const lockPath = path.join(profileDir, "SingletonLock");
    if (fs.existsSync(lockPath)) {
      try {
        const link = fs.readlinkSync(lockPath);
        const match = link.match(/-(\d+)$/);
        if (match && match[1]) {
          const pid = parseInt(match[1], 10);
          if (pid && pid > 0) {
            try {
              process.kill(pid, "SIGKILL");
              this.log(`Đã đóng tiến trình Chrome cũ (PID: ${pid}) đang giữ lock profile.`);
            } catch (_e) {}
          }
        }
      } catch (_e) {}
    }

    // 2. Kill any stray Chrome processes using this profileDir
    try {
      const { execSync } = require("child_process");
      const cleanPath = profileDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      execSync(`pkill -9 -f "user-data-dir=${cleanPath}" 2>/dev/null || true`, { timeout: 3000 });
    } catch (_e) {}

    // 3. Remove stale lock files
    const lockFiles = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
    for (const f of lockFiles) {
      const p = path.join(profileDir, f);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (_e) {}
      }
    }
    await new Promise((r) => setTimeout(r, 600));
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

    // Auto-cleanup any orphan processes or stale lock files before launching Chrome
    await this._cleanupStaleProfile(account.profileDir);

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
    const acc = this.store.getAccount(accountId);
    if (acc && acc.profileDir) {
      await this._cleanupStaleProfile(acc.profileDir);
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

  // --- Logout single account ---
  async logoutAccount(account) {
    if (!account) return;
    await this.closeContext(account.id);

    // Remove storage state file
    if (account.storageStatePath && fs.existsSync(account.storageStatePath)) {
      try {
        fs.unlinkSync(account.storageStatePath);
      } catch (_e) {}
    }

    // Clear Chrome cookies & session storage in profile directory
    if (account.profileDir && fs.existsSync(account.profileDir)) {
      try {
        const defaultDir = path.join(account.profileDir, "Default");
        if (fs.existsSync(defaultDir)) {
          const targets = [
            "Cookies",
            "Cookies-journal",
            "Network",
            "Session Storage",
            "Local Storage",
            "IndexedDB",
            "Service Worker",
          ];
          for (const target of targets) {
            const targetPath = path.join(defaultDir, target);
            if (fs.existsSync(targetPath)) {
              fs.rmSync(targetPath, { recursive: true, force: true });
            }
          }
        }
      } catch (_e) {}
    }

    this.store.updateAccount(account.id, {
      status: "DIE",
      errorReason: "Đã đăng xuất tài khoản.",
      lastActive: Date.now(),
    });
    this.log(`[Account] Đã đăng xuất hoàn toàn tài khoản [${account.name}].`);
  }

  // --- Logout all accounts ---
  async logoutAllAccounts() {
    await this.closeAll();
    const accounts = [...this.store.accounts];
    for (const acc of accounts) {
      await this.logoutAccount(acc);
    }
    this.log(`[Account] Đã đăng xuất toàn bộ ${accounts.length} tài khoản.`);
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
        const hasComposer = await page.evaluate(() => {
          return Boolean(document.querySelector('textarea, [contenteditable="true"]'));
        }).catch(() => false);

        if (url.includes("muse.ai") && !url.includes("login") && !url.includes("auth") && hasComposer) {
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
      // Cleanly close the interactive window and release the profile lock for automation
      await this.closeContext(account.id);
      this.log(`Đăng nhập thành công tài khoản [${account.name}]! Đã lưu storageState & giải phóng profile.`);
      return { ok: true, message: "Đăng nhập thành công!" };
    } else {
      await this.closeContext(account.id).catch(() => {});
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
        return Boolean(document.querySelector('textarea, [contenteditable="true"]'));
      }).catch(() => false);

      const isLoginUrl = page.url().includes("login") || page.url().includes("signin");
      const isLive = Boolean(hasComposer && !isLoginUrl);

      await this.closeContext(account.id);

      if (isLive) {
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
      await this.closeContext(account.id).catch(() => {});
      this.store.updateAccount(account.id, {
        status: "DIE",
        errorReason: err.message,
      });
      return { ok: false, status: "DIE", reason: err.message };
    }
  }

  // --- Dismiss any open Lightbox / Modal Dialogs (Radix UI / Muse Media Viewer) ---
  async _dismissLightboxes(page) {
    try {
      await page.keyboard.press("Escape").catch(() => {});
      await page.evaluate(() => {
        const dialogs = document.querySelectorAll(
          '[data-hatch-media-lightbox="true"], [role="dialog"][data-state="open"], div[class*="lightbox" i]'
        );
        for (const d of dialogs) {
          const closeBtn = d.querySelector(
            'button[aria-label*="close" i], button[class*="close" i], button[data-testid*="close" i], button:has(svg)'
          );
          if (closeBtn) {
            try { closeBtn.click(); } catch (_) {}
          }
        }
      }).catch(() => {});
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(200);
    } catch (_e) {}
  }

  // --- Send Prompt helper ---
  async _sendPrompt(page, promptText) {
    // 1. Dismiss any open lightbox / media viewer overlays before interacting with composer
    await this._dismissLightboxes(page);

    const composer = await page.waitForSelector('textarea, [contenteditable="true"]', {
      state: "visible",
      timeout: 25000,
    });
    if (!composer) throw new Error("Không tìm thấy ô nhập lệnh trên trang Muse.ai");

    // 2. Extra safety: dismiss lightbox once more before focusing
    await this._dismissLightboxes(page);

    // 3. Focus and click with force: true to bypass any pointer interception
    await composer.focus().catch(() => {});
    await composer.click({ force: true }).catch(() => {});
    await composer.fill(promptText);
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
      await composer.focus().catch(() => {});
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
        specs.push(
          targetDurationSec <= 5
            ? `duration: ${targetDurationSec}s, single ${targetDurationSec}-second video clip`
            : `total duration ${targetDurationSec}s`
        );
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
              ? `\n[IMPORTANT DURATION INSTRUCTION]: Strictly generate a single short ${targetDurationSec}-second video clip (duration: ${targetDurationSec}s). Do not extend it to 5s or 10s.`
              : "";
          finalPrompt = `Please generate a video (${specs.join(", ")}): ${cleanPrompt}${shortClipHint}${productTitleInstruction}`;
        }
      } else {
        finalPrompt = `Please generate a high-quality ${quality} image (${specs.join(", ")}): ${cleanPrompt}${productTitleInstruction}`;
      }

      const context = await this.getContext(account);
      let page = context.pages()[0] || (await context.newPage());

      report(12, "Đang mở luồng chat mới trên Muse.ai...");
      await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(1500);

      // Record a stable baseline BEFORE sending the prompt. Muse hydrates old
      // attachments asynchronously, so a single early scan can miss them and
      // later mistake an old clip for the new result.
      const baselineSources = new Set();
      for (let baselinePass = 0; baselinePass < 5; baselinePass++) {
        const attsBefore = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
        for (const a of attsBefore) {
          if (a.src) baselineSources.add(a.src);
          if (a.vSrc) baselineSources.add(a.vSrc);
          if (a.iSrc) baselineSources.add(a.iSrc);
        }
        if (baselinePass < 4) await page.waitForTimeout(1000);
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

      if (expect === "image") {
        const rawBuffer = Buffer.from(base64Data, "base64");
        const tempRaw = path.join(MEDIA_DIR, `temp_raw_${timeTag}`);
        fs.writeFileSync(tempRaw, rawBuffer);
        try {
          const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";
          execFileSync(ffmpegBin, ["-y", "-i", tempRaw, "-c:v", "png", localPath], { timeout: 15000 });
          try { fs.unlinkSync(tempRaw); } catch (_) {}
        } catch (_convErr) {
          fs.writeFileSync(localPath, rawBuffer);
        }
      } else {
        fs.writeFileSync(localPath, Buffer.from(base64Data, "base64"));
      }

      // Strictly trim video to target duration using ffmpeg if specified
      if (expect === "video" && targetDurationSec > 0) {
        report(98, `Đang cắt thời lượng chính xác ${targetDurationSec}s bằng FFMPEG...`);
        await trimVideo(localPath, targetDurationSec);
      }
      if (expect === "video") {
        report(99, `Đang chuẩn hóa độ phân giải ${qUpper}...`);
        await ensureVideoResolution(localPath, qUpper, aspectRatio);
      }

      report(100, "Hoàn tất!");
      this.log(`[${account.name}] Đã lưu ${expect === "video" ? "video" : "ảnh"} thành phẩm vào: ${localPath} (${(mediaData.size / (1024 * 1024)).toFixed(2)} MB)`);

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

  // --- Helper: Download media data from page context ---
  async _downloadMediaFromPage(page, finalMediaSrc, localPath) {
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
      throw new Error(`Không thể trích xuất dữ liệu media: ${mediaData?.error || "unknown"}`);
    }

    const base64Data = mediaData.dataUrl.split(",")[1];
    if (!base64Data) {
      throw new Error("Dữ liệu base64 rỗng.");
    }

    fs.writeFileSync(localPath, Buffer.from(base64Data, "base64"));
    return { size: mediaData.size, mime: mediaData.mime };
  }

  // --- Cinematic Film Pipeline: 1 Muse.ai Conversation, Frame-to-Frame Continuity ---
  async generateCinematicFilm({
    cinematicId,
    prompt,
    scenes = [],
    styleKey = "hollywood_35mm",
    customStyle = "",
    voiceKey = "female_warm",
    transition = "cut",
    aspectRatio = "16:9",
    quality = "2K",
    sceneDuration = "10s",
    commonPromptHead = "",
    commonPromptTail = "",
    commonPrompt = "",
    globalReferenceImages = [],
    accountId = "",
    onProgress = null,
    onSceneUpdate = null,
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
      report(5, `Đang khởi tạo trình duyệt cho [${account.name}]...`);
      const context = await this.getContext(account);
      let page = context.pages()[0] || (await context.newPage());

      // Open ONE SINGLE conversation thread on Muse.ai
      report(10, `[1 Cuộc hội thoại duy nhất] Đang mở luồng chat mới trên Muse.ai...`);
      await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(2000);

      // Record baseline sources BEFORE sending any prompt in this conversation
      const baselineSources = new Set();
      for (let bp = 0; bp < 5; bp++) {
        const attsBefore = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
        for (const a of attsBefore) {
          if (a.src) baselineSources.add(a.src);
          if (a.vSrc) baselineSources.add(a.vSrc);
          if (a.iSrc) baselineSources.add(a.iSrc);
        }
        if (bp < 4) await page.waitForTimeout(800);
      }
      this.log(`[Cinematic][${account.name}] Đã mở 1 cuộc hội thoại duy nhất. Baseline media cũ: ${baselineSources.size}`);

      // Setup project working directory for intermediate files
      const projectDir = path.join(DATA_DIR, "projects", `cine_proj_${cinematicId || Date.now()}`);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Prepare global reference images (applicable to the whole video)
      const globalRefFilePaths = [];
      const validGlobalRefs = (Array.isArray(globalReferenceImages) ? globalReferenceImages : []).filter(
        (img) => img && (img.b64 || img.path)
      );

      for (let gIdx = 0; gIdx < validGlobalRefs.length; gIdx++) {
        const gImg = validGlobalRefs[gIdx];
        if (gImg.path && fs.existsSync(gImg.path)) {
          globalRefFilePaths.push(gImg.path);
        } else if (gImg.b64) {
          const rawB64 = gImg.b64.replace(/^data:image\/\w+;base64,/, "");
          const tmpFile = path.join(projectDir, `global_ref_${gIdx}_${Date.now()}.png`);
          fs.writeFileSync(tmpFile, Buffer.from(rawB64, "base64"));
          globalRefFilePaths.push(tmpFile);
        }
      }

      this.log(`[Cinematic] Đã chuẩn bị ${globalRefFilePaths.length} ảnh tham chiếu CHUNG cho toàn bộ video.`);

      const sceneVideoPaths = [];
      let previousLastFramePath = null;
      const totalScenes = scenes.length;

      // Sequential generation: wait 1 by 1 inside the same conversation
      for (let i = 0; i < totalScenes; i++) {
        const sc = scenes[i];
        const sceneNum = i + 1;
        const sceneTitle = sc.title || `Cảnh ${sceneNum}`;

        // Dismiss any lingering lightbox/viewer modal before starting next scene
        await this._dismissLightboxes(page);

        if (typeof onSceneUpdate === "function") {
          onSceneUpdate(i, {
            status: "processing",
            progress: 5,
            progressText: `Bắt đầu Cảnh ${sceneNum}/${totalScenes}: "${sceneTitle}"...`,
          });
        }

        const overallPct = Math.round(10 + (i / totalScenes) * 80);
        report(overallPct, `Đang xử lý Cảnh ${sceneNum}/${totalScenes}: "${sceneTitle}"...`);

        // Gather all upload files for this scene
        const attachmentsForScene = [...globalRefFilePaths];

        // Scene-specific references
        if (Array.isArray(sc.referenceImages)) {
          sc.referenceImages.forEach((img, sRefIdx) => {
            if (img.path && fs.existsSync(img.path)) {
              attachmentsForScene.push(img.path);
            } else if (img.b64) {
              const rawB64 = img.b64.replace(/^data:image\/\w+;base64,/, "");
              const tmpFile = path.join(projectDir, `scene_${sceneNum}_ref_${sRefIdx}.png`);
              fs.writeFileSync(tmpFile, Buffer.from(rawB64, "base64"));
              attachmentsForScene.push(tmpFile);
            }
          });
        }

        // Upload all attachments to composer in this conversation
        if (attachmentsForScene.length > 0) {
          await this._dismissLightboxes(page);
          if (typeof onSceneUpdate === "function") {
            onSceneUpdate(i, {
              progressText: `Đang tải ${attachmentsForScene.length} ảnh tham chiếu nhân vật/bối cảnh vào chat...`,
            });
          }
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.setInputFiles(attachmentsForScene);
            await page.waitForTimeout(2000);
          }
        }

        // Build continuous cinematic scene prompt with strict duration and voice consistency
        const scenePrompt = buildCinematicScenePrompt({
          scene: sc,
          sceneIndex: i,
          totalScenes,
          styleKey,
          customStyle,
          voiceKey,
          duration: sc.duration || sceneDuration || "5s",
          hasLastFrame: Boolean(i > 0 && previousLastFramePath),
          globalReferenceImages,
          aspectRatio,
          quality,
          commonPromptHead,
          commonPromptTail: commonPromptTail || commonPrompt || "",
          commonPrompt,
        });

        // Send prompt into the SAME conversation
        await this._sendPrompt(page, scenePrompt);
        this.log(`[Cinematic] Đã gửi lệnh Cảnh ${sceneNum}/${totalScenes} vào cuộc hội thoại.`);

        // Wait 1 by 1 for this scene to complete rendering
        const sceneStartTime = Date.now();
        const maxWaitMs = 360000; // 6 mins per scene
        let matchedAtt = null;
        let postMediaIdleTicks = 0;
        let stableSrc = "";
        let stableN = 0;

        while (Date.now() - sceneStartTime < maxWaitMs) {
          await page.waitForTimeout(2000);

          const elapsedSec = Math.round((Date.now() - sceneStartTime) / 1000);
          const st = (await page.evaluate(JS_POLL_AGENT_STATUS).catch(() => ({}))) || {};
          const isGenerating = Boolean(st.isGenerating);

          // Get newly rendered attachments (strictly excluding baselineSources)
          const allAtts = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
          const newMatchingAtts = [];

          for (const a of allAtts) {
            const hasVideo = Boolean(a.hasVideo);
            const src = a.src || "";
            const vSrc = a.vSrc || "";
            const isMatch = hasVideo || Boolean(vSrc) || src.includes(".mp4") || src.includes(".webm") || a.dur > 0;
            if (!isMatch) continue;

            const checkSrc = vSrc || src;
            if (checkSrc && !baselineSources.has(checkSrc)) {
              newMatchingAtts.push({ ...a, checkSrc });
            }
          }

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

            const hasValidSize = (latestAtt.w > 0 && latestAtt.h > 0) || latestAtt.dur > 0 || stableN >= 2;
            if (!isGenerating && postMediaIdleTicks >= 2 && hasValidSize) {
              this.log(`[Cinematic] ✅ Cảnh ${sceneNum} đã render hoàn tất trên Muse.ai!`);
              matchedAtt = latestAtt;
              break;
            }
          }

          const sceneProg = Math.min(94, Math.round(15 + elapsedSec * 0.7));
          if (typeof onSceneUpdate === "function") {
            onSceneUpdate(i, {
              progress: sceneProg,
              progressText: `Đang render Cảnh ${sceneNum} (${elapsedSec}s)... ${isGenerating ? "[Muse đang vẽ]" : "[Đang hoàn thiện]"}`,
            });
          }
        }

        if (!matchedAtt || !matchedAtt.checkSrc) {
          throw new Error(`Quá thời gian chờ hoặc Muse.ai không xuất video cho Cảnh ${sceneNum}.`);
        }

        // Add this scene's media src to baselineSources so subsequent scenes in the same conversation ignore it!
        baselineSources.add(matchedAtt.checkSrc);
        if (matchedAtt.vSrc) baselineSources.add(matchedAtt.vSrc);
        if (matchedAtt.src) baselineSources.add(matchedAtt.src);

        // Download scene video to local storage
        const sceneClipName = `cine_${cinematicId}_scene_${String(sceneNum).padStart(2, "0")}.mp4`;
        const sceneLocalPath = path.join(MEDIA_DIR, sceneClipName);
        if (typeof onSceneUpdate === "function") {
          onSceneUpdate(i, {
            progress: 96,
            progressText: `Đang tải clip Cảnh ${sceneNum} về máy...`,
          });
        }
        await this._downloadMediaFromPage(page, matchedAtt.checkSrc, sceneLocalPath);

        // Trim video if specified (e.g. 5s or 10s)
        const targetSec = parseInt(String(sc.duration || sceneDuration || "5s").replace(/[^\d]/g, ""), 10) || 5;
        if (targetSec > 0) {
          await trimVideo(sceneLocalPath, targetSec);
        }
        await ensureVideoResolution(sceneLocalPath, quality, aspectRatio);

        sceneVideoPaths.push(sceneLocalPath);

        // EXTRACT LAST FRAME OF THIS SCENE VIDEO FOR THE NEXT SCENE
        const lastFrameName = `cine_${cinematicId}_scene_${String(sceneNum).padStart(2, "0")}_last_frame.png`;
        const lastFramePath = path.join(MEDIA_DIR, lastFrameName);
        try {
          await extractLastFrame(sceneLocalPath, lastFramePath);
          previousLastFramePath = lastFramePath;
          this.log(`[Cinematic] 📸 Đã trích xuất khung hình cuối của Cảnh ${sceneNum} -> ${lastFrameName}`);
        } catch (frameErr) {
          this.log(`[Cinematic] Cảnh báo khi trích xuất frame Cảnh ${sceneNum}: ${frameErr.message}`);
          previousLastFramePath = null;
        }

        // Notify scene completion
        if (typeof onSceneUpdate === "function") {
          onSceneUpdate(i, {
            status: "completed",
            progress: 100,
            progressText: `Hoàn tất Cảnh ${sceneNum}!`,
            mediaUrl: `/media/${encodeURIComponent(sceneClipName)}`,
            localPath: sceneLocalPath,
            lastFrameUrl: fs.existsSync(lastFramePath) ? `/media/${encodeURIComponent(lastFrameName)}` : "",
            lastFramePath: fs.existsSync(lastFramePath) ? lastFramePath : "",
            duration: `${targetSec}s`,
          });
        }

        // Cleanly dismiss any preview lightbox created by Muse for this scene
        await this._dismissLightboxes(page);
        await page.waitForTimeout(1000);
      }

      // All scenes generated in 1 conversation! Stitch with FFMPEG
      report(92, "Đang dùng FFMPEG ghép các phân cảnh với hiệu ứng chuyển cảnh mượt mà...");
      const cleanTitle = (prompt || "cinematic_film")
        .replace(/[<>:"/\\|?*\x00-\x1f\n\r]/g, " ")
        .trim()
        .slice(0, 35)
        .replace(/\s+/g, "_");

      const finalFileName = `cinematic_${cleanTitle}_${Date.now()}.mp4`;
      const finalOutputPath = path.join(MEDIA_DIR, finalFileName);

      await stitchVideos(sceneVideoPaths, finalOutputPath, {
        transition: transition || "cut",
        transitionDuration: 0.35,
        skipHeadFramesSec: 0.08,
      });
      this.log(`[Cinematic] Đã ghép thành công ${sceneVideoPaths.length} phân cảnh (transition=${transition || "cut"}) vào: ${finalOutputPath}`);

      report(100, "Hoàn tất toàn bộ Phim Điện Ảnh!");

      return {
        ok: true,
        finalFileName,
        finalVideoUrl: `/media/${encodeURIComponent(finalFileName)}`,
        finalOutputPath,
        sceneCount: sceneVideoPaths.length,
      };
    });
  }

  async renderSingleCinematicScene({
    cinematicId,
    sceneIndex,
    sceneData,
    styleKey = "hollywood_35mm",
    customStyle = "",
    voiceKey = "female_warm",
    aspectRatio = "16:9",
    quality = "2K",
    sceneDuration = "10s",
    commonPromptHead = "",
    commonPromptTail = "",
    commonPrompt = "",
    globalReferenceImages = [],
    accountId = "",
    onProgress = null,
  }) {
    let account = accountId
      ? this.store.getAccount(accountId) || this.store.pickAccount()
      : this.store.pickAccount();

    if (!account) {
      throw new Error("Không có tài khoản Muse.ai nào khả dụng. Vui lòng thêm hoặc kiểm tra tài khoản trước.");
    }

    const report = (pct, text) => {
      if (typeof onProgress === "function") {
        try { onProgress(pct, text); } catch (_e) {}
      }
    };

    return this._withAccountLock(account.id, async () => {
      report(5, `Đang khởi tạo trình duyệt cho [${account.name}]...`);
      const context = await this.getContext(account);
      let page = context.pages()[0] || (await context.newPage());

      report(10, `Đang mở luồng chat mới trên Muse.ai...`);
      await page.goto(MUSE_NEW_THREAD, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(2000);

      const baselineSources = new Set();
      for (let bp = 0; bp < 5; bp++) {
        const attsBefore = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
        for (const a of attsBefore) {
          if (a.src) baselineSources.add(a.src);
          if (a.vSrc) baselineSources.add(a.vSrc);
          if (a.iSrc) baselineSources.add(a.iSrc);
        }
        if (bp < 4) await page.waitForTimeout(800);
      }

      const projectDir = path.join(DATA_DIR, "projects", `cine_proj_${cinematicId || Date.now()}`);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Attach global references & scene-specific references
      const attachments = [];
      const validGlobalRefs = (Array.isArray(globalReferenceImages) ? globalReferenceImages : []).filter(
        (img) => img && (img.b64 || img.path)
      );
      for (let gIdx = 0; gIdx < validGlobalRefs.length; gIdx++) {
        const gImg = validGlobalRefs[gIdx];
        if (gImg.path && fs.existsSync(gImg.path)) {
          attachments.push(gImg.path);
        } else if (gImg.b64) {
          const rawB64 = gImg.b64.replace(/^data:image\/\w+;base64,/, "");
          const tmpFile = path.join(projectDir, `global_ref_${gIdx}_${Date.now()}.png`);
          fs.writeFileSync(tmpFile, Buffer.from(rawB64, "base64"));
          attachments.push(tmpFile);
        }
      }

      if (sceneData && Array.isArray(sceneData.referenceImages)) {
        sceneData.referenceImages.forEach((img, sRefIdx) => {
          if (img.path && fs.existsSync(img.path)) {
            attachments.push(img.path);
          } else if (img.b64) {
            const rawB64 = img.b64.replace(/^data:image\/\w+;base64,/, "");
            const tmpFile = path.join(projectDir, `scene_ref_${sRefIdx}_${Date.now()}.png`);
            fs.writeFileSync(tmpFile, Buffer.from(rawB64, "base64"));
            attachments.push(tmpFile);
          }
        });
      }

      if (attachments.length > 0) {
        await this._dismissLightboxes(page);
        report(15, `Đang tải ${attachments.length} ảnh tham chiếu nhân vật/bối cảnh...`);
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(attachments);
          await page.waitForTimeout(2000);
        }
      }

      const sceneNum = Number(sceneIndex) + 1;
      const scenePrompt = buildCinematicScenePrompt({
        scene: sceneData,
        sceneIndex,
        totalScenes: 1,
        styleKey,
        customStyle,
        voiceKey,
        duration: sceneData.duration || sceneDuration || "10s",
        hasLastFrame: false,
        globalReferenceImages,
        aspectRatio,
        quality,
        commonPromptHead: commonPromptHead || (sceneData && sceneData.commonPromptHead) || "",
        commonPromptTail: commonPromptTail || commonPrompt || (sceneData && (sceneData.commonPromptTail || sceneData.commonPrompt)) || "",
        commonPrompt,
      });

      report(20, `Đã gửi prompt Cảnh ${sceneNum} tới Muse.ai...`);
      await this._sendPrompt(page, scenePrompt);

      // Poll for completion
      const startTime = Date.now();
      const maxWaitMs = 360000;
      let matchedAtt = null;
      let postMediaIdleTicks = 0;
      let stableSrc = "";
      let stableN = 0;

      while (Date.now() - startTime < maxWaitMs) {
        await page.waitForTimeout(2000);
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        const st = (await page.evaluate(JS_POLL_AGENT_STATUS).catch(() => ({}))) || {};
        const isGenerating = Boolean(st.isGenerating);

        const allAtts = (await page.evaluate(JS_GET_ATTACHMENTS).catch(() => [])) || [];
        const newMatchingAtts = [];
        for (const a of allAtts) {
          const hasVideo = Boolean(a.hasVideo);
          const src = a.src || "";
          const vSrc = a.vSrc || "";
          const isMatch = hasVideo || Boolean(vSrc) || src.includes(".mp4") || src.includes(".webm") || a.dur > 0;
          if (!isMatch) continue;
          const checkSrc = vSrc || src;
          if (checkSrc && !baselineSources.has(checkSrc)) {
            newMatchingAtts.push({ ...a, checkSrc });
          }
        }

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
          const hasValidSize = (latestAtt.w > 0 && latestAtt.h > 0) || latestAtt.dur > 0 || stableN >= 2;
          if (!isGenerating && postMediaIdleTicks >= 2 && hasValidSize) {
            matchedAtt = latestAtt;
            break;
          }
        }

        const prog = Math.min(94, Math.round(20 + elapsedSec * 0.7));
        report(prog, `Đang render Cảnh ${sceneNum} (${elapsedSec}s)...`);
      }

      if (!matchedAtt || !matchedAtt.checkSrc) {
        throw new Error(`Quá thời gian chờ hoặc Muse.ai không xuất video cho Cảnh ${sceneNum}.`);
      }

      const sceneClipName = `cine_${cinematicId || "single"}_scene_${String(sceneNum).padStart(2, "0")}_v${Date.now()}.mp4`;
      const sceneLocalPath = path.join(MEDIA_DIR, sceneClipName);
      report(96, `Đang tải clip Cảnh ${sceneNum} về máy...`);
      await this._downloadMediaFromPage(page, matchedAtt.checkSrc, sceneLocalPath);

      const targetSec = parseInt(String(sceneData.duration || sceneDuration || "10s").replace(/[^\d]/g, ""), 10) || 10;
      if (targetSec > 0) {
        await trimVideo(sceneLocalPath, targetSec);
      }
      await ensureVideoResolution(sceneLocalPath, quality, aspectRatio);

      await this._dismissLightboxes(page);
      report(100, `Hoàn tất Cảnh ${sceneNum}!`);

      return {
        ok: true,
        sceneClipName,
        mediaUrl: `/media/${encodeURIComponent(sceneClipName)}`,
        localPath: sceneLocalPath,
        duration: `${targetSec}s`,
      };
    });
  }
}

module.exports = { MusePlaywrightEngine };
