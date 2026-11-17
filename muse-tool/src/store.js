"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DATA_DIR, PROFILES_DIR } = require("./config");

class Store {
  constructor(dbPath = path.join(DATA_DIR, "store.json")) {
    this.dbPath = dbPath;
    this.data = {
      accounts: [],
      tasks: [],
      batchRows: [],
      stories: [],
      settings: {
        headless: false,
        autoDownload: true,
        defaultAspectRatio: "9:16",
        defaultDuration: "20s",
        defaultQuality: "2K",
      },
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, "utf-8");
        const parsed = JSON.parse(raw);
        this.data = {
          accounts: parsed.accounts || [],
          tasks: parsed.tasks || [],
          batchRows: parsed.batchRows || [],
          stories: parsed.stories || [],
          settings: { ...this.data.settings, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error("[Store] Load error, using defaults:", err.message);
    }
  }

  save() {
    try {
      const tmpPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), "utf-8");
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      console.error("[Store] Save error:", err.message);
    }
  }

  // --- Accounts ---
  get accounts() {
    return this.data.accounts;
  }

  getAccount(id) {
    return this.data.accounts.find((a) => a.id === id) || null;
  }

  pickAccount() {
    const live = this.data.accounts.filter((a) => a.status === "LIVE");
    if (live.length > 0) {
      // Pick least recently active
      live.sort((a, b) => (a.lastActive || 0) - (b.lastActive || 0));
      return live[0];
    }
    return this.data.accounts[0] || null;
  }

  createAccount(name) {
    const id = `acc_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
    const cleanName = String(name || `Muse_${this.data.accounts.length + 1}`).trim();
    const profileDir = path.join(PROFILES_DIR, id);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    const acc = {
      id,
      name: cleanName,
      status: "UNKNOWN",
      profileDir,
      storageStatePath: path.join(profileDir, "storage_state.json"),
      lastActive: Date.now(),
      quota: null,
      errorReason: "",
      createdAt: Date.now(),
    };
    this.data.accounts.push(acc);
    this.save();
    return acc;
  }

  updateAccount(id, updates) {
    const acc = this.getAccount(id);
    if (acc) {
      Object.assign(acc, updates);
      this.save();
    }
    return acc;
  }

  deleteAccount(id) {
    const idx = this.data.accounts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const acc = this.data.accounts[idx];
      this.data.accounts.splice(idx, 1);
      this.save();
      try {
        if (acc.profileDir && fs.existsSync(acc.profileDir)) {
          fs.rmSync(acc.profileDir, { recursive: true, force: true });
        }
      } catch (_e) {}
      return true;
    }
    return false;
  }

  // --- Tasks ---
  get tasks() {
    return this.data.tasks;
  }

  getTask(id) {
    return this.data.tasks.find((t) => t.id === id) || null;
  }

  createTask(type, prompt, options = {}) {
    const id = `task_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const task = {
      id,
      type: type || "video",
      prompt: String(prompt || "").trim(),
      status: "queued",
      progress: 0,
      progressText: "Đang chờ trong hàng đợi...",
      accountId: options.accountId || "",
      accountName: options.accountName || "",
      aspectRatio: options.aspectRatio || "9:16",
      duration: options.duration || "20s",
      quality: options.quality || "2K",
      mediaUrl: "",
      localPath: "",
      fileName: "",
      error: "",
      createdAt: Date.now(),
      completedAt: null,
    };
    this.data.tasks.unshift(task); // latest first
    // Limit stored tasks to 200
    if (this.data.tasks.length > 200) {
      this.data.tasks = this.data.tasks.slice(0, 200);
    }
    this.save();
    return task;
  }

  updateTask(id, updates) {
    const task = this.getTask(id);
    if (task) {
      Object.assign(task, updates);
      this.save();
    }
    return task;
  }

  deleteTask(id) {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.data.tasks.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  clearTasks() {
    this.data.tasks = [];
    this.save();
  }

  // --- Batch Rows ---
  get batchRows() {
    return this.data.batchRows;
  }

  setBatchRows(rows) {
    this.data.batchRows = rows || [];
    this.save();
    return this.data.batchRows;
  }

  // --- Stories ---
  get stories() {
    return this.data.stories || [];
  }

  getStory(id) {
    return (this.data.stories || []).find((s) => s.id === id) || null;
  }

  createStory({ prompt, sceneCount = 3, targetDuration = "30s", aspectRatio = "9:16", quality = "2K", scenes = [] }) {
    const id = `story_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const story = {
      id,
      prompt: String(prompt || "").trim(),
      sceneCount: Number(sceneCount) || scenes.length || 3,
      targetDuration,
      aspectRatio,
      quality,
      status: "processing", // processing | completed | failed
      progress: 0,
      progressText: "Đang khởi tạo các phân cảnh...",
      scenes: scenes.map((s, idx) => ({
        id: `sc_${id}_${idx + 1}`,
        index: idx + 1,
        title: s.title || `Cảnh ${idx + 1}`,
        prompt: s.prompt,
        referenceImages: Array.isArray(s.referenceImages) ? s.referenceImages : [],
        status: "queued", // queued | processing | completed | failed
        progress: 0,
        progressText: "Chờ xử lý...",
        mediaUrl: "",
        localPath: "",
        error: "",
      })),
      finalVideoUrl: "",
      finalVideoPath: "",
      error: "",
      createdAt: Date.now(),
      completedAt: null,
    };
    if (!this.data.stories) this.data.stories = [];
    this.data.stories.unshift(story);
    if (this.data.stories.length > 50) this.data.stories = this.data.stories.slice(0, 50);
    this.save();
    return story;
  }

  updateStory(id, updates) {
    const story = this.getStory(id);
    if (story) {
      Object.assign(story, updates);
      this.save();
    }
    return story;
  }

  updateStoryScene(storyId, sceneIdx, sceneUpdates) {
    const story = this.getStory(storyId);
    if (story && story.scenes && story.scenes[sceneIdx]) {
      Object.assign(story.scenes[sceneIdx], sceneUpdates);
      this.save();
    }
    return story;
  }

  deleteStory(id) {
    const idx = (this.data.stories || []).findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.stories.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Settings ---
  get settings() {
    return this.data.settings;
  }

  updateSettings(updates) {
    Object.assign(this.data.settings, updates);
    this.save();
    return this.data.settings;
  }
}

module.exports = { Store };
