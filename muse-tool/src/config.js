"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

function detectChromePath() {
  const platform = os.platform();
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  if (platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (platform === "win32") {
    const prefixes = [
      process.env.LOCALAPPDATA,
      process.env["PROGRAMFILES"],
      process.env["PROGRAMFILES(X86)"],
    ].filter(Boolean);
    const subPaths = [
      "Google\\Chrome\\Application\\chrome.exe",
      "Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const prefix of prefixes) {
      for (const sub of subPaths) {
        const full = path.join(prefix, sub);
        if (fs.existsSync(full)) return full;
      }
    }
  } else {
    // Linux
    const linuxCandidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ];
    for (const c of linuxCandidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return "";
}

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const MEDIA_DIR = path.join(DATA_DIR, "media");
const PROFILES_DIR = path.join(DATA_DIR, "profiles");

// Ensure directories exist
[DATA_DIR, MEDIA_DIR, PROFILES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

module.exports = {
  PORT: Number(process.env.PORT || 18638),
  HOST: process.env.HOST || "0.0.0.0",
  ROOT_DIR,
  DATA_DIR,
  MEDIA_DIR,
  PROFILES_DIR,
  MUSE_URL: "https://muse.ai",
  MUSE_NEW_THREAD: "https://muse.ai/thread/new",
  CHROME_PATH: detectChromePath(),
  HEADLESS: process.env.HEADLESS === "true" || false,
  MODEL_ALIASES: {
    "muse-spark": { type: "chat", mode: "chat" },
    "muse-chat": { type: "chat", mode: "chat" },
    "muse-code": { type: "chat", mode: "code" },
    "muse-image": { type: "image", mode: "create" },
    "muse-video": { type: "video", mode: "create" },
    "gpt-4o": { type: "chat", mode: "chat" },
    "dall-e-3": { type: "image", mode: "create" },
    "sora": { type: "video", mode: "create" },
    "veo-3": { type: "video", mode: "create" },
  },
};
