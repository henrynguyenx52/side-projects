"use strict";

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { MEDIA_DIR } = require("./config");

/**
 * Intelligently breaks down a story prompt into sequential, coherent scene prompts.
 * The number of scenes is dynamically derived from the prompt structure (sentences, numbered points, or length).
 */
function breakdownStory(masterPrompt, requestedCount = null) {
  const cleanPrompt = String(masterPrompt || "").trim();
  if (!cleanPrompt) return [];

  // 1. Detect explicit scene splitting (e.g. "Cảnh 1:", "Phân cảnh 1:", "Scene 1:", or bullet points "1. ", "2. ")
  const lines = cleanPrompt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const numberedLines = lines.filter((l) => /^(?:cảnh|scene|phân cảnh)?\s*\d+[:.\s-]/i.test(l));

  if (numberedLines.length >= 2) {
    return numberedLines.map((line, idx) => {
      const p = line.replace(/^(?:cảnh|scene|phân cảnh)?\s*\d+[:.\s-]+/i, "").trim();
      return {
        index: idx + 1,
        title: `Cảnh ${idx + 1}`,
        prompt: p || line,
        referenceImages: [],
      };
    });
  }

  // 2. Check if prompt is split by inline scene markers
  const splitRegex = /(?:cảnh|scene|phân cảnh)\s*\d+[:.\s-]+/i;
  const parts = cleanPrompt.split(splitRegex).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map((p, idx) => ({
      index: idx + 1,
      title: `Cảnh ${idx + 1}`,
      prompt: p,
      referenceImages: [],
    }));
  }

  // 3. Otherwise, split by sentences or paragraphs in prompt
  const sentences = cleanPrompt
    .split(/\n\n+|[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length >= 2) {
    return sentences.map((sent, idx) => ({
      index: idx + 1,
      title: `Cảnh ${idx + 1}`,
      prompt: sent,
      referenceImages: [],
    }));
  }

  // 4. Default fallback: create sequential scenes without arbitrary role labels
  let count = requestedCount ? Number(requestedCount) : 3;
  count = Math.max(1, Math.min(10, count));

  const scenes = [];
  for (let i = 0; i < count; i++) {
    scenes.push({
      index: i + 1,
      title: `Cảnh ${i + 1}`,
      prompt: i === 0 ? cleanPrompt : "",
      referenceImages: [],
    });
  }

  return scenes;
}

/**
 * Stitches multiple MP4 video files into one seamless video using ffmpeg.
 */
function stitchVideos(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    if (!videoPaths || videoPaths.length === 0) {
      return reject(new Error("Không có video nào để ghép."));
    }
    if (videoPaths.length === 1) {
      // If only 1 video, copy it directly
      fs.copyFileSync(videoPaths[0], outputPath);
      return resolve(outputPath);
    }

    const tmpListFile = path.join(
      path.dirname(outputPath),
      `concat_list_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`
    );

    const listContent = videoPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");
    fs.writeFileSync(tmpListFile, listContent, "utf-8");

    const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    // First attempt: fast stream copy
    execFile(
      ffmpegBin,
      ["-y", "-f", "concat", "-safe", "0", "-i", tmpListFile, "-c", "copy", outputPath],
      (err) => {
        if (!err && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          try { fs.unlinkSync(tmpListFile); } catch (_e) { }
          return resolve(outputPath);
        }

        // Fallback attempt: re-encode to ensure compatible codecs and timestamps
        execFile(
          ffmpegBin,
          [
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            tmpListFile,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            outputPath,
          ],
          (reencodeErr) => {
            try { fs.unlinkSync(tmpListFile); } catch (_e) { }
            if (reencodeErr) {
              return reject(
                new Error(`Lỗi ghép video FFMPEG: ${reencodeErr.message}`)
              );
            }
            resolve(outputPath);
          }
        );
      }
    );
  });
}

/**
 * Trims a video file to an exact target duration (in seconds) using ffmpeg.
 */
function trimVideo(inputPath, durationSec, outputPath = null) {
  return new Promise((resolve) => {
    if (!inputPath || !fs.existsSync(inputPath)) {
      return resolve(inputPath);
    }
    const dur = Number(durationSec);
    if (!dur || dur <= 0) {
      return resolve(inputPath);
    }

    const out =
      outputPath ||
      path.join(
        path.dirname(inputPath),
        `trim_${Date.now()}_${path.basename(inputPath)}`
      );

    const ffmpegBin = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    execFile(
      ffmpegBin,
      [
        "-y",
        "-ss",
        "0",
        "-t",
        String(dur),
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-avoid_negative_ts",
        "make_zero",
        out,
      ],
      (err) => {
        if (!err && fs.existsSync(out) && fs.statSync(out).size > 1000) {
          if (!outputPath) {
            try {
              fs.unlinkSync(inputPath);
              fs.renameSync(out, inputPath);
              return resolve(inputPath);
            } catch (_e) {
              return resolve(out);
            }
          }
          return resolve(out);
        }
        resolve(inputPath);
      }
    );
  });
}

module.exports = {
  breakdownStory,
  stitchVideos,
  trimVideo,
};

