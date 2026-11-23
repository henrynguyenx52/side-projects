"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { PORT, HOST, DATA_DIR, MEDIA_DIR, MODEL_ALIASES, CHROME_PATH } = require("./config");
const { Store } = require("./store");
const { MusePlaywrightEngine } = require("./engine");
const {
  buildScenePrompt,
  isUsableVideoFile,
  isUsableImageFile,
  breakdownStory,
  stitchVideos,
  CINEMATIC_STYLES,
  CINEMATIC_VOICES,
  breakdownCinematicScript,
} = require("./story");

const store = new Store();
const engine = new MusePlaywrightEngine(store);

const app = express();
app.use(cors());
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// Static frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// Dedicated HTTP 206 Partial Content video streaming & media serving
app.get("/media/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(MEDIA_DIR, safeName);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return res.status(404).send("File not found");
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

app.post("/api/accounts/logout-all", async (req, res) => {
  try {
    await engine.logoutAllAccounts();
    res.json({ ok: true, message: "Đã đăng xuất tất cả các tài khoản Muse.ai thành công." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/accounts/:id/logout", async (req, res) => {
  const account = store.getAccount(req.params.id);
  if (!account) return res.status(404).json({ ok: false, error: "Tài khoản không tồn tại" });
  try {
    await engine.logoutAccount(account);
    res.json({ ok: true, message: `Đã đăng xuất tài khoản [${account.name}] thành công.` });
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

app.post("/api/debug/eval", async (req, res) => {
  try {
    const account = store.accounts[0];
    const context = await engine.getContext(account);
    const page = context.pages()[0];
    const fn = new Function(req.body.code);
    const result = await page.evaluate(req.body.code);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
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
    expect = "video",
    sceneCount = 3,
    targetDuration = "30s",
    aspectRatio = "9:16",
    quality = "2K",
    referenceImages = [],
    scenes: customScenes,
    projectId = "story",
    resume = true,
    maxRetries = 3,
    culturalDirection = "",
  } = req.body;

  if (!prompt && (!customScenes || customScenes.length === 0)) {
    return res.status(400).json({ ok: false, error: "Vui lòng nhập mô tả câu chuyện." });
  }

  const isImageStory = expect === "image";
  const finalScenes = (customScenes && customScenes.length > 0)
    ? customScenes
    : breakdownStory(prompt, sceneCount);

  const selectedAccount = store.pickAccount();
  if (!selectedAccount || selectedAccount.status !== "LIVE") {
    return res.status(409).json({
      ok: false,
      error: "Không có tài khoản Muse.ai LIVE. Hãy đăng nhập hoặc verify tài khoản trước khi chạy story.",
    });
  }
  if (!CHROME_PATH || !fs.existsSync(CHROME_PATH)) {
    return res.status(409).json({ ok: false, error: "Không tìm thấy Chrome/Edge để chạy Muse automation." });
  }

  const invalidSceneIndex = finalScenes.findIndex((scene) => !scene || !String(scene.prompt || "").trim());
  if (invalidSceneIndex !== -1) {
    return res.status(400).json({ ok: false, error: `Cảnh ${invalidSceneIndex + 1} chưa có prompt.` });
  }
  const missingReference = referenceImages.find(
    (image) => image && image.path && !fs.existsSync(image.path)
  );
  if (missingReference) {
    return res.status(400).json({
      ok: false,
      error: `Không tìm thấy ảnh tham chiếu: ${missingReference.path}`,
    });
  }

  const safeProjectId = String(projectId || "story")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "story";
  const projectClipDir = path.join(DATA_DIR, "projects", safeProjectId, isImageStory ? "images" : "clips");
  fs.mkdirSync(projectClipDir, { recursive: true });
  const retryLimit = Math.max(1, Math.min(5, Number(maxRetries) || 3));

  const story = store.createStory({
    prompt,
    expect: isImageStory ? "image" : "video",
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
        progressText: `Bắt đầu xử lý ${story.scenes.length} phân cảnh ${isImageStory ? "hình ảnh" : "video"}...`,
      });

      const mediaPaths = [];
      const totalScenes = story.scenes.length;
      const failedScenes = [];

      for (let i = 0; i < totalScenes; i++) {
        const sc = story.scenes[i];
        const shotNumber = Number(sc.index) || i + 1;
        const fileExt = isImageStory ? ".png" : ".mp4";
        const clipPath = path.join(projectClipDir, `shot_${String(shotNumber).padStart(2, "0")}${fileExt}`);
        const expectedSceneSeconds = parseInt(String(sc.duration || "").replace(/[^\d]/g, ""), 10) || 0;
        const isUsable = isImageStory
          ? isUsableImageFile(clipPath)
          : isUsableVideoFile(clipPath, 100000, expectedSceneSeconds);
        const previousClipHash = isUsable ? sha256File(clipPath) : "";

        if (resume !== false && isUsable) {
          mediaPaths.push(clipPath);
          store.updateStoryScene(story.id, i, {
            status: "completed",
            progress: 100,
            progressText: isImageStory ? "Đã có ảnh hợp lệ, tiếp tục từ checkpoint." : "Đã có clip hợp lệ, tiếp tục từ checkpoint.",
            localPath: clipPath,
            mediaUrl: `/media/${encodeURIComponent(path.basename(clipPath))}`,
            duration: isImageStory ? null : (sc.duration || "dynamic"),
          });
          continue;
        }

        store.updateStoryScene(story.id, i, {
          status: "processing",
          progress: 5,
          progressText: isImageStory ? "Đang tạo ảnh trên Muse.ai..." : "Đang render video trên Muse.ai...",
        });
        store.updateStory(story.id, {
          progress: Math.round(5 + (i / totalScenes) * 80),
          progressText: `Đang tạo ${isImageStory ? "Ảnh" : "Video"} Cảnh ${i + 1}/${totalScenes}: "${sc.title}"...`,
        });

        // Combine global story reference images with scene-specific reference images
        const combinedSceneRefs = [
          ...(Array.isArray(referenceImages) ? referenceImages : []),
          ...(Array.isArray(sc.referenceImages) ? sc.referenceImages : []),
        ];

        try {
          let result = null;
          let lastError = null;
          const scenePrompt = buildScenePrompt(sc, {
            storyTitle: prompt,
            referenceImages: combinedSceneRefs,
            culturalDirection,
          });

          for (let attempt = 1; attempt <= retryLimit; attempt++) {
            try {
              store.updateStoryScene(story.id, i, {
                progressText: `Đang xử lý, lần thử ${attempt}/${retryLimit}...`,
              });
              result = await engine.generateMedia({
                prompt:
                  `${scenePrompt}\n\nFRESH RENDER REQUEST ID: ${story.id}-${shotNumber}-${attempt}. ` +
                  "Create a completely new render for this request; do not reuse or return any previous media attachment.",
                expect: isImageStory ? "image" : "video",
                duration: isImageStory ? null : (sc.duration || null),
                aspectRatio,
                quality,
                referenceImages: combinedSceneRefs,
                accountId: selectedAccount.id,
                onProgress: (pct, text) => {
                  store.updateStoryScene(story.id, i, {
                    progress: pct,
                    progressText: `[${attempt}/${retryLimit}] ${text}`,
                  });
                },
              });

              const isResultValid = isImageStory
                ? isUsableImageFile(result.localPath)
                : isUsableVideoFile(result.localPath, 100000, expectedSceneSeconds);

              if (!isResultValid) {
                throw new Error(isImageStory ? "Muse trả về ảnh rỗng hoặc không hợp lệ." : "Muse trả về clip rỗng hoặc quá nhỏ.");
              }
              if (previousClipHash && sha256File(result.localPath) === previousClipHash) {
                throw new Error("Muse Tool nhận lại đúng media cũ; chưa có media mới cho prompt này.");
              }
              break;
            } catch (attemptError) {
              lastError = attemptError;
              result = null;
            }
          }
          if (!result) throw lastError || new Error("Không render được cảnh sau các lần thử.");

          const scTargetSec = expectedSceneSeconds;
          fs.copyFileSync(result.localPath, clipPath);

          store.updateStoryScene(story.id, i, {
            status: "completed",
            progress: 100,
            progressText: isImageStory ? "Hoàn tất ảnh cảnh!" : `Hoàn tất cảnh (${scTargetSec > 0 ? `${scTargetSec}s` : (result.duration || "dynamic")})!`,
            mediaUrl: result.mediaUrl,
            localPath: clipPath,
            duration: isImageStory ? null : (scTargetSec > 0 ? `${scTargetSec}s` : (result.duration || "dynamic")),
          });

          mediaPaths.push(clipPath);
        } catch (sceneErr) {
          console.error(`[Story] Error on scene ${i + 1}:`, sceneErr);
          store.updateStoryScene(story.id, i, {
            status: "failed",
            error: sceneErr.message,
            progressText: `Lỗi: ${sceneErr.message}`,
          });
          failedScenes.push(i + 1);
        }
      }

      if (mediaPaths.length !== totalScenes) {
        throw new Error(
          `Chưa đủ cảnh hoàn thành (${mediaPaths.length}/${totalScenes}). Cảnh lỗi: ${failedScenes.join(", ") || "không xác định"}.`
        );
      }

      if (isImageStory) {
        store.updateStory(story.id, {
          status: "completed",
          progress: 100,
          progressText: `Hoàn tất toàn bộ ${mediaPaths.length} ảnh phân cảnh Storyboard!`,
          finalImages: mediaPaths.map((p, idx) => ({
            index: idx + 1,
            localPath: p,
            mediaUrl: `/media/${encodeURIComponent(path.basename(p))}`,
            fileName: path.basename(p),
          })),
          completedAt: Date.now(),
        });
        console.log(`[Story] Hoàn tất tạo bộ ảnh phân cảnh (${mediaPaths.length} ảnh).`);
      } else {
        // Stitch videos using ffmpeg
        store.updateStory(story.id, {
          progress: 90,
          progressText: `Đang dùng FFMPEG ghép nối ${mediaPaths.length} phân cảnh thành video phim hoàn chỉnh...`,
        });

        const cleanTitle = (prompt || "story")
          .replace(/[<>:"/\\|?*\x00-\x1f\n\r]/g, " ")
          .trim()
          .slice(0, 35)
          .replace(/\s+/g, "_");

        const finalFileName = `story_${cleanTitle}_v${Date.now()}.mp4`;
        const finalOutputPath = path.join(MEDIA_DIR, finalFileName);

        await stitchVideos(mediaPaths, finalOutputPath);

        store.updateStory(story.id, {
          status: "completed",
          progress: 100,
          progressText: `Hoàn tất toàn bộ Story Video! (${mediaPaths.length} phân cảnh ghép lại)`,
          finalVideoUrl: `/media/${encodeURIComponent(finalFileName)}`,
          finalVideoPath: finalOutputPath,
          completedAt: Date.now(),
        });
        console.log(`[Story] Hoàn tất ghép video: ${finalOutputPath}`);
      }
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

// --- Cinematic Film Studio Endpoints (1 Conversation, Continuous Frame-to-Frame) ---
app.get("/api/cinematic/styles", (req, res) => {
  res.json({ ok: true, styles: CINEMATIC_STYLES, voices: CINEMATIC_VOICES });
});

app.get("/api/cinematic/voices", (req, res) => {
  res.json({ ok: true, voices: CINEMATIC_VOICES });
});

app.post("/api/cinematic/breakdown", (req, res) => {
  const { prompt, sceneCount = null } = req.body;
  if (!prompt) return res.status(400).json({ ok: false, error: "Vui lòng nhập kịch bản hoặc ý tưởng phim." });
  const scenes = breakdownCinematicScript(prompt, sceneCount);
  res.json({ ok: true, scenes });
});

app.get("/api/cinematic", (req, res) => {
  res.json({ ok: true, cinematics: store.cinematics });
});

app.get("/api/cinematic/:id", (req, res) => {
  const cinematic = store.getCinematic(req.params.id);
  if (!cinematic) return res.status(404).json({ ok: false, error: "Không tìm thấy dự án phim." });
  res.json({ ok: true, cinematic });
});

app.delete("/api/cinematic/:id", (req, res) => {
  const success = store.deleteCinematic(req.params.id);
  res.json({ ok: success });
});

app.post("/api/cinematic/generate", async (req, res) => {
  const {
    prompt,
    styleKey = "hollywood_35mm",
    customStyle = "",
    voiceKey = "natural_dialogue",
    transition = "cut",
    aspectRatio = "16:9",
    quality = "2K",
    sceneDuration = "10s",
    commonPromptHead = "",
    commonPromptTail = "",
    commonPrompt = "",
    globalReferenceImages = [],
    scenes: customScenes,
    accountId = "",
  } = req.body;

  if (!prompt && (!customScenes || customScenes.length === 0)) {
    return res.status(400).json({ ok: false, error: "Vui lòng nhập kịch bản hoặc danh sách phân cảnh." });
  }

  const selectedAccount = accountId ? store.getAccount(accountId) : store.pickAccount();
  if (!selectedAccount || selectedAccount.status !== "LIVE") {
    return res.status(409).json({
      ok: false,
      error: "Không có tài khoản Muse.ai LIVE. Vui lòng đăng nhập hoặc kiểm tra tài khoản trước.",
    });
  }

  if (!CHROME_PATH || !fs.existsSync(CHROME_PATH)) {
    return res.status(409).json({ ok: false, error: "Không tìm thấy trình duyệt Chrome/Edge để chạy Muse automation." });
  }

  const finalScenes = (customScenes && customScenes.length > 0)
    ? customScenes
    : breakdownCinematicScript(prompt, 3);

  const invalidSceneIndex = finalScenes.findIndex((scene) => !scene || !String(scene.prompt || "").trim());
  if (invalidSceneIndex !== -1) {
    return res.status(400).json({ ok: false, error: `Cảnh ${invalidSceneIndex + 1} chưa có nội dung kịch bản.` });
  }

  const cinematic = store.createCinematic({
    prompt,
    styleKey,
    customStyle,
    voiceKey,
    transition,
    aspectRatio,
    quality,
    sceneDuration,
    commonPromptHead,
    commonPromptTail: commonPromptTail || commonPrompt || "",
    commonPrompt: commonPromptTail || commonPrompt || "",
    globalReferenceImages,
    scenes: finalScenes,
  });

  // Run Cinematic Film Generation asynchronously
  (async () => {
    try {
      store.updateCinematic(cinematic.id, {
        status: "processing",
        progress: 5,
        progressText: `Bắt đầu sản xuất ${cinematic.scenes.length} phân cảnh trong 1 cuộc hội thoại duy nhất...`,
      });

      const result = await engine.generateCinematicFilm({
        cinematicId: cinematic.id,
        prompt,
        scenes: cinematic.scenes,
        styleKey,
        customStyle,
        voiceKey,
        transition,
        aspectRatio,
        quality,
        sceneDuration,
        commonPromptHead,
        commonPromptTail: commonPromptTail || commonPrompt || "",
        commonPrompt: commonPromptTail || commonPrompt || "",
        globalReferenceImages,
        accountId: selectedAccount.id,
        onProgress: (pct, text) => {
          store.updateCinematic(cinematic.id, { progress: pct, progressText: text });
        },
        onSceneUpdate: (sceneIdx, sceneUpdates) => {
          store.updateCinematicScene(cinematic.id, sceneIdx, sceneUpdates);
        },
      });

      store.updateCinematic(cinematic.id, {
        status: "completed",
        progress: 100,
        progressText: `Hoàn tất toàn bộ Phim Điện Ảnh! (${result.sceneCount} cảnh)`,
        finalVideoUrl: result.finalVideoUrl,
        finalVideoPath: result.finalOutputPath,
        completedAt: Date.now(),
      });
      console.log(`[Cinematic] Hoàn tất phim điện ảnh: ${result.finalOutputPath}`);
    } catch (err) {
      console.error(`[Cinematic] Error on cinematic ${cinematic.id}:`, err);
      store.updateCinematic(cinematic.id, {
        status: "failed",
        error: err.message,
        progressText: `Thất bại: ${err.message}`,
        completedAt: Date.now(),
      });
    }
  })();

  res.json({ ok: true, cinematic });
});

// Render/Re-render a specific single scene in an existing Cinematic project
app.post("/api/cinematic/:id/render-scene", async (req, res) => {
  const { id } = req.params;
  const {
    sceneIndex,
    prompt,
    camera,
    narration,
    duration,
    referenceImages,
    commonPromptHead,
    commonPromptTail,
    commonPrompt,
    accountId,
  } = req.body;

  const cinematic = store.getCinematic(id);
  if (!cinematic) {
    return res.status(404).json({ ok: false, error: "Không tìm thấy dự án phim." });
  }

  const sIdx = Number(sceneIndex);
  if (isNaN(sIdx) || sIdx < 0 || !cinematic.scenes || !cinematic.scenes[sIdx]) {
    return res.status(400).json({ ok: false, error: "Chỉ số phân cảnh không hợp lệ." });
  }

  const selectedAccount = accountId ? store.getAccount(accountId) : store.pickAccount();
  if (!selectedAccount || selectedAccount.status !== "LIVE") {
    return res.status(409).json({
      ok: false,
      error: "Không có tài khoản Muse.ai LIVE khả dụng. Vui lòng kiểm tra lại tài khoản.",
    });
  }

  const currentScene = cinematic.scenes[sIdx];
  const updatedSceneData = {
    ...currentScene,
    prompt: prompt !== undefined ? String(prompt).trim() : currentScene.prompt,
    camera: camera !== undefined ? String(camera).trim() : currentScene.camera,
    narration: narration !== undefined ? String(narration).trim() : currentScene.narration,
    duration: duration || currentScene.duration || cinematic.sceneDuration || "10s",
    referenceImages: Array.isArray(referenceImages) ? referenceImages : currentScene.referenceImages || [],
    status: "processing",
    progress: 5,
    progressText: `Bắt đầu render lại Cảnh ${sIdx + 1}...`,
  };

  store.updateCinematicScene(id, sIdx, updatedSceneData);

  // Run single scene render asynchronously
  (async () => {
    try {
      const result = await engine.renderSingleCinematicScene({
        cinematicId: id,
        sceneIndex: sIdx,
        sceneData: updatedSceneData,
        styleKey: cinematic.styleKey,
        customStyle: cinematic.customStyle,
        voiceKey: cinematic.voiceKey,
        aspectRatio: cinematic.aspectRatio,
        quality: cinematic.quality,
        sceneDuration: cinematic.sceneDuration,
        commonPromptHead: commonPromptHead !== undefined ? commonPromptHead : cinematic.commonPromptHead || "",
        commonPromptTail: commonPromptTail !== undefined ? commonPromptTail : (cinematic.commonPromptTail || cinematic.commonPrompt || ""),
        commonPrompt: commonPromptTail !== undefined ? commonPromptTail : (cinematic.commonPromptTail || cinematic.commonPrompt || ""),
        globalReferenceImages: cinematic.globalReferenceImages,
        accountId: selectedAccount.id,
        onProgress: (pct, text) => {
          store.updateCinematicScene(id, sIdx, { progress: pct, progressText: text });
        },
      });

      store.updateCinematicScene(id, sIdx, {
        status: "completed",
        progress: 100,
        progressText: `Hoàn tất Cảnh ${sIdx + 1}!`,
        mediaUrl: result.mediaUrl,
        localPath: result.localPath,
        duration: result.duration,
      });
      console.log(`[Cinematic] Đã render lại thành công Cảnh ${sIdx + 1} của dự án ${id}: ${result.localPath}`);
    } catch (err) {
      console.error(`[Cinematic] Lỗi render lại Cảnh ${sIdx + 1} của ${id}:`, err);
      store.updateCinematicScene(id, sIdx, {
        status: "failed",
        progressText: `Lỗi: ${err.message}`,
        error: err.message,
      });
    }
  })();

  res.json({ ok: true, scene: store.getCinematic(id).scenes[sIdx] });
});

// Stitch selected scenes (or all completed scenes) into a final movie
app.post("/api/cinematic/:id/stitch", async (req, res) => {
  const { id } = req.params;
  const { selectedSceneIndices, transition = "cut" } = req.body;

  const cinematic = store.getCinematic(id);
  if (!cinematic) {
    return res.status(404).json({ ok: false, error: "Không tìm thấy dự án phim." });
  }

  let scenesToStitch = (cinematic.scenes || []).filter(
    (s) => s.localPath && fs.existsSync(s.localPath)
  );

  if (Array.isArray(selectedSceneIndices) && selectedSceneIndices.length > 0) {
    const set = new Set(selectedSceneIndices.map(Number));
    scenesToStitch = (cinematic.scenes || []).filter(
      (s, idx) => set.has(idx) && s.localPath && fs.existsSync(s.localPath)
    );
  }

  if (scenesToStitch.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Không có phân cảnh nào đã hoàn tất để ghép. Hãy render các cảnh trước khi ghép video.",
    });
  }

  try {
    const videoPaths = scenesToStitch.map((s) => s.localPath);
    const cleanTitle = (cinematic.prompt || "cinematic_film")
      .replace(/[<>:"/\\|?*\x00-\x1f\n\r]/g, " ")
      .trim()
      .slice(0, 30)
      .replace(/\s+/g, "_");

    const finalFileName = `cinematic_${cleanTitle}_stitched_${Date.now()}.mp4`;
    const finalOutputPath = path.join(MEDIA_DIR, finalFileName);

    await stitchVideos(videoPaths, finalOutputPath, {
      transition: transition || "cut",
      transitionDuration: 0.35,
      skipHeadFramesSec: 0.08,
    });

    const finalVideoUrl = `/media/${encodeURIComponent(finalFileName)}`;
    store.updateCinematic(id, {
      finalVideoUrl,
      finalVideoPath: finalOutputPath,
      status: "completed",
      progress: 100,
      progressText: `Đã ghép thành công ${videoPaths.length} phân cảnh hoàn chỉnh!`,
      completedAt: Date.now(),
    });

    res.json({
      ok: true,
      finalVideoUrl,
      finalOutputPath,
      sceneCount: videoPaths.length,
      cinematic: store.getCinematic(id),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Media Gallery ---
app.get("/api/media", (req, res) => {
  try {
    const files = fs.readdirSync(MEDIA_DIR).filter((f) => !f.startsWith("."));
    const items = files
      .filter((f) => {
        try {
          return fs.statSync(path.join(MEDIA_DIR, f)).isFile();
        } catch (_e) {
          return false;
        }
      })
      .map((f) => {
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
      if (fs.statSync(target).isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
      } else {
        fs.unlinkSync(target);
      }
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
