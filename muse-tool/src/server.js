"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { PORT, HOST, MEDIA_DIR, MODEL_ALIASES, CHROME_PATH } = require("./config");
const { Store } = require("./store");
const { MusePlaywrightEngine } = require("./engine");
const { breakdownStory, stitchVideos, trimVideo } = require("./story");

const store = new Store();
const engine = new MusePlaywrightEngine(store);

const app = express();
app.use(cors());
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// Static frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// Dedicated HTTP 206 Partial Content video streaming & media serving
app.get("/media/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(MEDIA_DIR, safeName);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const isMp4 = safeName.toLowerCase().endsWith(".mp4");
  const isWebm = safeName.toLowerCase().endsWith(".webm");
  const contentType = isMp4 ? "video/mp4" : isWebm ? "video/webm" : "image/png";

  if (range && (isMp4 || isWebm)) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Fallback static media
app.use("/media", express.static(MEDIA_DIR));

// --- Status & Info ---
app.get("/api/status", (req, res) => {
  const accounts = store.accounts;
  const liveCount = accounts.filter((a) => a.status === "LIVE").length;
  let mediaFiles = [];
  try {
    mediaFiles = fs.readdirSync(MEDIA_DIR).filter((f) => !f.startsWith("."));
  } catch (_e) {}

  res.json({
    ok: true,
    version: "1.0.0",
    engine: "Playwright",
    chromePath: engine.chromePath,
    chromeFound: fs.existsSync(engine.chromePath),
    accountsTotal: accounts.length,
    accountsLive: liveCount,
    mediaTotal: mediaFiles.length,
    settings: store.settings,
  });
});

// --- Accounts Management ---
app.get("/api/accounts", (req, res) => {
  res.json({ ok: true, accounts: store.accounts });
});

app.post("/api/accounts", (req, res) => {
  const { name } = req.body;
  const account = store.createAccount(name);
  res.json({ ok: true, account });
});

app.post("/api/accounts/:id/login", async (req, res) => {
  const account = store.getAccount(req.params.id);
  if (!account) return res.status(404).json({ ok: false, error: "Tài khoản không tồn tại" });

  // Run in background and return immediate status
  engine
    .loginInteractive(account)
    .catch((err) => console.error(`[Login] Error: ${err.message}`));

  res.json({
    ok: true,
    message: "Đã mở cửa sổ Chrome. Vui lòng hoàn tất đăng nhập tài khoản Muse.ai trong cửa sổ trình duyệt vừa hiện lên.",
  });
});

app.post("/api/accounts/:id/verify", async (req, res) => {
  const account = store.getAccount(req.params.id);
  if (!account) return res.status(404).json({ ok: false, error: "Tài khoản không tồn tại" });

  try {
    const result = await engine.verifyAccount(account);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/accounts/:id", async (req, res) => {
  await engine.closeContext(req.params.id);
  const success = store.deleteAccount(req.params.id);
  res.json({ ok: success });
});

// --- Tasks & Generation ---
app.get("/api/tasks", (req, res) => {
  res.json({ ok: true, tasks: store.tasks });
});

app.get("/api/tasks/:id", (req, res) => {
  const task = store.getTask(req.params.id);
  if (!task) return res.status(404).json({ ok: false, error: "Task not found" });
  res.json({ ok: true, task });
});

app.delete("/api/tasks/:id", (req, res) => {
  const success = store.deleteTask(req.params.id);
  res.json({ ok: success });
});

app.delete("/api/tasks", (req, res) => {
  store.clearTasks();
  res.json({ ok: true });
});

app.post("/api/generate", async (req, res) => {
  const {
    prompt,
    expect = "video",
    duration = "20s",
    aspectRatio = "9:16",
    quality = "2K",
    referenceImages = [],
    accountId = "",
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ ok: false, error: "Vui lòng nhập Prompt." });
  }

  const account = accountId ? store.getAccount(accountId) : store.pickAccount();
  const task = store.createTask(expect, prompt, {
    accountId: account?.id || "",
    accountName: account?.name || "",
    aspectRatio,
    duration,
    quality,
  });

  // Execute in background
  (async () => {
    try {
      store.updateTask(task.id, { status: "processing", progress: 5, progressText: "Bắt đầu khởi chạy..." });

      const result = await engine.generateMedia({
        prompt,
        expect,
        duration,
        aspectRatio,
        quality,
        referenceImages,
        accountId: account?.id,
        onProgress: (pct, text) => {
          store.updateTask(task.id, { progress: pct, progressText: text });
        },
      });

      store.updateTask(task.id, {
        status: "completed",
        progress: 100,
        progressText: "Hoàn tất!",
        mediaUrl: result.mediaUrl,
        localPath: result.localPath,
        fileName: result.fileName,
        completedAt: Date.now(),
      });
    } catch (err) {
      console.error(`[Generate] Error on task ${task.id}:`, err);
      store.updateTask(task.id, {
        status: "failed",
        progress: 0,
        progressText: "Thất bại",
        error: err.message,
        completedAt: Date.now(),
      });
    }
  })();

  res.json({ ok: true, task });
});

// --- Story Video Endpoints (>30s Multi-Scene) ---
app.post("/api/story/breakdown", (req, res) => {
  const { prompt, sceneCount = 3 } = req.body;
  if (!prompt) return res.status(400).json({ ok: false, error: "Vui lòng nhập mô tả câu chuyện." });
  const scenes = breakdownStory(prompt, sceneCount);
  res.json({ ok: true, scenes });
});

app.get("/api/story", (req, res) => {
  res.json({ ok: true, stories: store.stories });
});

app.get("/api/story/:id", (req, res) => {
  const story = store.getStory(req.params.id);
  if (!story) return res.status(404).json({ ok: false, error: "Không tìm thấy Story." });
  res.json({ ok: true, story });
});

app.delete("/api/story/:id", (req, res) => {
  const success = store.deleteStory(req.params.id);
  res.json({ ok: success });
});

app.post("/api/story/generate", async (req, res) => {
  const {
    prompt,
    sceneCount = 3,
    targetDuration = "30s",
    aspectRatio = "9:16",
    quality = "2K",
    referenceImages = [],
    scenes: customScenes,
  } = req.body;

  if (!prompt && (!customScenes || customScenes.length === 0)) {
    return res.status(400).json({ ok: false, error: "Vui lòng nhập mô tả câu chuyện." });
  }

  const finalScenes = (customScenes && customScenes.length > 0)
    ? customScenes
    : breakdownStory(prompt, sceneCount);

  const story = store.createStory({
    prompt,
    sceneCount: finalScenes.length,
    targetDuration,
    aspectRatio,
    quality,
    scenes: finalScenes,
  });

  // Run Story Pipeline asynchronously
  (async () => {
    try {
      store.updateStory(story.id, {
        status: "processing",
        progress: 5,
        progressText: `Bắt đầu xử lý ${story.scenes.length} phân cảnh câu chuyện...`,
      });

      const videoPaths = [];
      const totalScenes = story.scenes.length;

      for (let i = 0; i < totalScenes; i++) {
        const sc = story.scenes[i];
        store.updateStoryScene(story.id, i, {
          status: "processing",
          progress: 5,
          progressText: "Đang render video trên Muse.ai...",
        });
        store.updateStory(story.id, {
          progress: Math.round(5 + (i / totalScenes) * 80),
          progressText: `Đang render Cảnh ${i + 1}/${totalScenes}: "${sc.title}"...`,
        });

        // Combine global story reference images with scene-specific reference images
        const combinedSceneRefs = [
          ...(Array.isArray(referenceImages) ? referenceImages : []),
          ...(Array.isArray(sc.referenceImages) ? sc.referenceImages : []),
        ];

        try {
          const result = await engine.generateMedia({
            prompt: sc.prompt,
            expect: "video",
            duration: sc.duration || null,
            aspectRatio,
            quality,
            referenceImages: combinedSceneRefs,
            onProgress: (pct, text) => {
              store.updateStoryScene(story.id, i, {
                progress: pct,
                progressText: text,
              });
            },
          });

          const scTargetSec = parseInt(String(sc.duration || "").replace(/[^\d]/g, ""), 10) || 0;
          if (scTargetSec > 0 && result.localPath && fs.existsSync(result.localPath)) {
            await trimVideo(result.localPath, scTargetSec);
          }

          store.updateStoryScene(story.id, i, {
            status: "completed",
            progress: 100,
            progressText: `Hoàn tất cảnh (${scTargetSec > 0 ? `${scTargetSec}s` : (result.duration || "dynamic")})!`,
            mediaUrl: result.mediaUrl,
            localPath: result.localPath,
            duration: scTargetSec > 0 ? `${scTargetSec}s` : (result.duration || "dynamic"),
          });

          if (result.localPath && fs.existsSync(result.localPath)) {
            videoPaths.push(result.localPath);
          }
        } catch (sceneErr) {
          console.error(`[Story] Error on scene ${i + 1}:`, sceneErr);
          store.updateStoryScene(story.id, i, {
            status: "failed",
            error: sceneErr.message,
            progressText: `Lỗi: ${sceneErr.message}`,
          });
        }
      }

      if (videoPaths.length === 0) {
        throw new Error("Không có phân cảnh nào được tạo thành công.");
      }

      // Stitch videos using ffmpeg
      store.updateStory(story.id, {
        progress: 90,
        progressText: `Đang dùng FFMPEG ghép nối ${videoPaths.length} phân cảnh thành video phim hoàn chỉnh...`,
      });

      const cleanTitle = (prompt || "story")
        .replace(/[<>:"/\\|?*\x00-\x1f\n\r]/g, " ")
        .trim()
        .slice(0, 35)
        .replace(/\s+/g, "_");

      const finalFileName = `story_${cleanTitle}_${Date.now()}.mp4`;
      const finalOutputPath = path.join(MEDIA_DIR, finalFileName);

      await stitchVideos(videoPaths, finalOutputPath);

      store.updateStory(story.id, {
        status: "completed",
        progress: 100,
        progressText: `Hoàn tất toàn bộ Story Video! (${videoPaths.length} phân cảnh ghép lại)`,
        finalVideoUrl: `/media/${encodeURIComponent(finalFileName)}`,
        finalVideoPath: finalOutputPath,
        completedAt: Date.now(),
      });
      console.log(`[Story] Hoàn tất ghép video: ${finalOutputPath}`);
    } catch (err) {
      console.error(`[Story] Story generation error on ${story.id}:`, err);
      store.updateStory(story.id, {
        status: "failed",
        error: err.message,
        progressText: `Thất bại: ${err.message}`,
        completedAt: Date.now(),
      });
    }
  })();

  res.json({ ok: true, story });
});

// --- Media Gallery ---
app.get("/api/media", (req, res) => {
  try {
    const files = fs.readdirSync(MEDIA_DIR).filter((f) => !f.startsWith("."));
    const items = files.map((f) => {
      const full = path.join(MEDIA_DIR, f);
      const stat = fs.statSync(full);
      const ext = path.extname(f).toLowerCase();
      const isVideo = ext === ".mp4" || ext === ".webm";
      return {
        fileName: f,
        url: `/media/${encodeURIComponent(f)}`,
        isVideo,
        size: stat.size,
        createdAt: stat.mtimeMs,
      };
    });
    items.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ ok: true, media: items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/media/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename);
  const target = path.join(MEDIA_DIR, safeName);
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
  res.status(404).json({ ok: false, error: "File not found" });
});

// --- Settings ---
app.get("/api/settings", (req, res) => {
  res.json({ ok: true, settings: store.settings });
});

app.post("/api/settings", (req, res) => {
  const updated = store.updateSettings(req.body);
  engine.headless = updated.headless;
  res.json({ ok: true, settings: updated });
});

// ==========================================
// OpenAI-Compatible Endpoints
// ==========================================
app.get("/v1/models", (req, res) => {
  const models = Object.keys(MODEL_ALIASES).map((id) => ({
    id,
    object: "model",
    created: 1700000000,
    owned_by: "muse-studio-playwright",
  }));
  res.json({ object: "list", data: models });
});

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages, model } = req.body;
    const response = await engine.chatCompletion({ messages, model });
    res.json(response);
  } catch (err) {
    res.status(500).json({
      error: {
        message: err.message,
        type: "server_error",
        code: "muse_error",
      },
    });
  }
});

app.post(["/v1/images/generations", "/v1/images/edits"], async (req, res) => {
  try {
    const { prompt, n = 1, size = "1024x1024" } = req.body;
    let aspectRatio = "1:1";
    if (size.includes("1792") || size.includes("1920")) aspectRatio = "16:9";
    if (size.includes("1080x1920") || size.includes("720x1280")) aspectRatio = "9:16";

    const result = await engine.generateMedia({
      prompt,
      expect: "image",
      aspectRatio,
      quality: "4K",
    });

    const host = req.get("host");
    const fullUrl = `${req.protocol}://${host}${result.mediaUrl}`;

    res.json({
      created: Math.floor(Date.now() / 1000),
      data: [{ url: fullUrl }],
    });
  } catch (err) {
    res.status(500).json({
      error: {
        message: err.message,
        type: "server_error",
        code: "muse_image_error",
      },
    });
  }
});

app.post(["/v1/videos/generations", "/v1/videos"], async (req, res) => {
  try {
    const { prompt, duration = "20s", aspect_ratio = "9:16", quality = "4K" } = req.body;
    const result = await engine.generateMedia({
      prompt,
      expect: "video",
      duration,
      aspectRatio: aspect_ratio,
      quality,
    });

    const host = req.get("host");
    const fullUrl = `${req.protocol}://${host}${result.mediaUrl}`;

    res.json({
      created: Math.floor(Date.now() / 1000),
      data: [{ url: fullUrl, filename: result.fileName }],
    });
  } catch (err) {
    res.status(500).json({
      error: {
        message: err.message,
        type: "server_error",
        code: "muse_video_error",
      },
    });
  }
});

function startServer(port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Muse Playwright Web App is running!`);
      console.log(`👉 Web Dashboard: http://localhost:${port}`);
      console.log(`👉 OpenAI API:    http://localhost:${port}/v1`);
      console.log(`👉 Chrome Path:   ${engine.chromePath || "NOT FOUND"}`);
      console.log(`======================================================\n`);
      resolve(server);
    });
    server.on("error", reject);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, engine, store };
