import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { ContentGeneratorService } from "../src/services/content-generator/index.ts";
import { TtsService } from "../src/services/tts/index.ts";
import { SubtitleGeneratorService } from "../src/services/subtitle-generator/index.ts";
import type { VocabularyComparisonInput, VocabularyComparison } from "../src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PipelineOptions {
  wordA: string;
  wordB: string;
  voice?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  renderVideo?: boolean;
  renderStills?: boolean;
}

export class VideoProductionPipeline {
  private static rootDir = path.resolve(__dirname, "..");
  private static publicAudioDir = path.join(this.rootDir, "public");
  private static outputDir = path.join(this.rootDir, "out");
  private static dataDir = path.join(this.rootDir, "src/data/generated");

  /**
   * Run the end-to-end video production pipeline for a single vocabulary contrast pair
   */
  public static async run(options: PipelineOptions): Promise<{
    comparison: VocabularyComparison;
    videoPath?: string;
    stillPaths: string[];
  }> {
    const { wordA, wordB, voice = "baotrang", aspectRatio = "9:16", renderVideo = true, renderStills = true } = options;

    console.log(`\n============================================================`);
    console.log(`🚀 Starting Video Generation Pipeline: ${wordA} vs ${wordB}`);
    console.log(`============================================================\n`);

    // Ensure output directories exist
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

    // Step 1: Input Validation
    console.log(`[Step 1/8] Validating vocabulary input...`);
    if (!wordA || !wordB) {
      throw new Error("Both wordA and wordB must be provided.");
    }
    console.log(`✓ Input valid: "${wordA}" vs "${wordB}"`);

    // Step 2: Generate Educational Content
    console.log(`[Step 2/8] Generating educational contrast content...`);
    const input: VocabularyComparisonInput = {
      wordA,
      wordB,
      voice,
      aspectRatio,
    };
    const content = ContentGeneratorService.generateContent(input);

    // Step 3: Validate Explanations & Quiz
    console.log(`[Step 3/8] Validating educational logic and grammar...`);
    const validation = ContentGeneratorService.validateContent(content);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(", ")}`);
    }
    console.log(`✓ Educational content validated.`);

    // Step 4 & 5: Generate Audio & Calculate Exact Scene Timing
    console.log(`[Step 4 & 5/8] Synthesizing TTS audio and computing dynamic scene timings...`);
    const { comparison: timedComparison } = TtsService.processNarrationAudio(
      content,
      this.publicAudioDir,
      voice
    );

    console.log(`✓ Audio generated: ${timedComparison.narration.totalAudioDurationSeconds.toFixed(2)}s total`);
    console.log(`✓ Scene frame allocations:`);
    timedComparison.narration.scenes.forEach((s) => {
      console.log(`   - Scene "${s.sceneId}": ${s.durationInFrames} frames (~${(s.durationInFrames / 30).toFixed(1)}s) [startFrame: ${s.startFrame}]`);
    });
    console.log(`✓ Total Video Duration: ${timedComparison.config.totalDurationInFrames} frames (~${(timedComparison.config.totalDurationInFrames / 30).toFixed(1)}s)`);

    // Step 6: Generate Synchronized Subtitles
    console.log(`[Step 6/8] Generating synchronized subtitle cues...`);
    const subtitles = SubtitleGeneratorService.generateSubtitles(timedComparison);
    timedComparison.subtitles = subtitles;
    console.log(`✓ Generated ${subtitles.length} synchronized subtitle cues.`);

    // Step 7: Persist Data Model
    const pairSlug = timedComparison.id;
    const propsJsonPath = path.join(this.dataDir, `${pairSlug}.json`);
    fs.writeFileSync(propsJsonPath, JSON.stringify(timedComparison, null, 2));
    console.log(`✓ Comparison data saved to: ${propsJsonPath}`);

    let videoPath: string | undefined;
    const stillPaths: string[] = [];

    // Step 8: Remotion Rendering & Quality Inspection
    if (renderVideo) {
      console.log(`\n[Step 7/8] Rendering MP4 video with Remotion CLI...`);
      const outputVideoFile = path.join(this.outputDir, `${pairSlug}.mp4`);
      
      const renderCmd = `npx remotion render VocabularyContrast "${outputVideoFile}" --props="${propsJsonPath}"`;
      console.log(`Executing: ${renderCmd}`);
      execSync(renderCmd, { stdio: "inherit", cwd: this.rootDir });
      
      videoPath = outputVideoFile;
      console.log(`\n🎉 Final MP4 rendered successfully: ${outputVideoFile}`);
    }

    if (renderStills) {
      console.log(`\n[Step 8/8] Extracting still frames across all scenes for quality inspection...`);
      const stillsDir = path.join(this.outputDir, "stills", pairSlug);
      if (!fs.existsSync(stillsDir)) fs.mkdirSync(stillsDir, { recursive: true });

      for (const scene of timedComparison.narration.scenes) {
        // Sample frame at mid-point of the scene
        const sampleFrame = scene.startFrame + Math.floor(scene.durationInFrames * 0.5);
        const stillPath = path.join(stillsDir, `scene-${scene.sceneId}.png`);
        
        console.log(`Extracting frame ${sampleFrame} for scene "${scene.sceneId}"...`);
        const stillCmd = `npx remotion still VocabularyContrast "${stillPath}" --frame=${sampleFrame} --props="${propsJsonPath}"`;
        execSync(stillCmd, { stdio: "inherit", cwd: this.rootDir });
        stillPaths.push(stillPath);
      }
      console.log(`✓ Extracted ${stillPaths.length} verification stills to: ${stillsDir}`);
    }

    return {
      comparison: timedComparison,
      videoPath,
      stillPaths,
    };
  }

  /**
   * Run batch generation across multiple word pairs
   */
  public static async runBatch(
    pairs: { wordA: string; wordB: string; voice?: string }[]
  ) {
    console.log(`\n============================================================`);
    console.log(`📦 Running Batch Video Generation (${pairs.length} videos)`);
    console.log(`============================================================\n`);

    const results = [];
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      console.log(`\n--- Processing item ${i + 1}/${pairs.length}: ${pair.wordA} vs ${pair.wordB} ---`);
      const result = await this.run({
        wordA: pair.wordA,
        wordB: pair.wordB,
        voice: pair.voice || "Samantha",
        renderVideo: true,
        renderStills: true,
      });
      results.push(result);
    }

    console.log(`\n============================================================`);
    console.log(`✅ Batch Generation Complete! Produced ${results.length} videos.`);
    console.log(`============================================================\n`);
    return results;
  }
}

// CLI execution handler
async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const batchFile = getArg("--batch");
  if (batchFile) {
    const fullBatchPath = path.resolve(process.cwd(), batchFile);
    if (!fs.existsSync(fullBatchPath)) {
      console.error(`Batch file not found: ${fullBatchPath}`);
      process.exit(1);
    }
    const pairs = JSON.parse(fs.readFileSync(fullBatchPath, "utf-8"));
    await VideoProductionPipeline.runBatch(pairs);
    return;
  }

  const wordA = getArg("--wordA") || "Borrow";
  const wordB = getArg("--wordB") || "Lend";
  const voice = getArg("--voice") || "baotrang";
  const aspectRatio = (getArg("--aspectRatio") || "9:16") as "9:16" | "16:9" | "1:1";
  const skipRender = args.includes("--skipRender");
  const skipStills = args.includes("--skipStills");

  await VideoProductionPipeline.run({
    wordA,
    wordB,
    voice,
    aspectRatio,
    renderVideo: !skipRender,
    renderStills: !skipStills,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
