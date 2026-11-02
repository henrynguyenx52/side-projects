import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { VocabularyComparison } from "../../types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AudioSynthesisResult {
  comparison: VocabularyComparison;
  audioFiles: string[];
}

export class TtsService {
  /**
   * Process all scenes in a VocabularyComparison using ZeroTTS (voice: baotrang)
   */
  public static processNarrationAudio(
    comparison: VocabularyComparison,
    publicAudioDir: string,
    voice: string = "baotrang"
  ): AudioSynthesisResult {
    const projectRoot = path.resolve(__dirname, "../../..");
    const sideProjectsRoot = path.resolve(projectRoot, "../..");
    const textToVoiceRoot = path.join(sideProjectsRoot, "text-to-voice");
    const pythonBin = path.join(textToVoiceRoot, ".venv/bin/python");
    const pythonSrc = path.join(textToVoiceRoot, "src");
    const synthesizerScript = path.join(projectRoot, "scripts/synthesize_zerotts.py");

    const pairId = comparison.id;
    const tempDir = path.join(projectRoot, "src/data/generated");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputJsonPath = path.join(tempDir, `${pairId}-raw.json`);
    const outputJsonPath = path.join(tempDir, `${pairId}.json`);

    // Write raw comparison JSON
    fs.writeFileSync(inputJsonPath, JSON.stringify(comparison, null, 2), "utf-8");

    console.log(`[ZeroTTS] Invoking ZeroTTS with voice "${voice}"...`);
    const cmd = `PYTHONPATH="${pythonSrc}" "${pythonBin}" "${synthesizerScript}" --json-input "${inputJsonPath}" --output-dir "${publicAudioDir}" --voice "${voice}" --json-output "${outputJsonPath}"`;

    try {
      execSync(cmd, { stdio: "inherit", cwd: projectRoot });

      // Clean up raw input file
      if (fs.existsSync(inputJsonPath)) {
        fs.unlinkSync(inputJsonPath);
      }

      // Read back updated comparison JSON with exact measured audio durations and frame timings
      const updatedData = JSON.parse(
        fs.readFileSync(outputJsonPath, "utf-8")
      ) as VocabularyComparison;

      const audioFiles = updatedData.narration.scenes
        .map((s) => s.audioFile)
        .filter(Boolean) as string[];

      return {
        comparison: updatedData,
        audioFiles,
      };
    } catch (err) {
      console.error("[ZeroTTS] Python synthesis failed, falling back to safe timing:", err);
      throw err;
    }
  }
}
