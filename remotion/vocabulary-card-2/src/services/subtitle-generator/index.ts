import type { VocabularyComparison, SubtitleCue } from "../../types.ts";

export class SubtitleGeneratorService {
  /**
   * Split a text into readable chunks (approx 3 to 6 words each)
   */
  private static chunkText(text: string, maxWordsPerChunk = 5): string[] {
    const words = text.trim().split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += maxWordsPerChunk) {
      chunks.push(words.slice(i, i + maxWordsPerChunk).join(" "));
    }

    return chunks;
  }

  /**
   * Check if chunk contains a target keyword
   */
  private static containsKeyword(
    chunk: string,
    keywords: string[]
  ): boolean {
    const lower = chunk.toLowerCase();
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  /**
   * Generate synchronized subtitle cues for the video
   */
  public static generateSubtitles(
    comparison: VocabularyComparison
  ): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const keywords = [
      comparison.wordA.word,
      comparison.wordB.word,
      "borrow",
      "lend",
      "say",
      "tell",
      "in",
      "out",
      "receive",
      "give",
      "nhận",
      "cho đi",
      "mượn",
      "cho mượn",
    ];

    for (const scene of comparison.narration.scenes) {
      if (!scene.text || scene.durationInFrames <= 0) continue;

      const chunks = this.chunkText(scene.text);
      if (chunks.length === 0) continue;

      // Usable frame range inside the scene (leaving small intro & outro breathing room)
      const introBuffer = 5;
      const outroBuffer = 5;
      const usableFrames = Math.max(
        15,
        scene.durationInFrames - introBuffer - outroBuffer
      );
      const framesPerChunk = Math.floor(usableFrames / chunks.length);

      chunks.forEach((chunk, index) => {
        const startFrame =
          scene.startFrame + introBuffer + index * framesPerChunk;
        const endFrame =
          index === chunks.length - 1
            ? scene.startFrame + scene.durationInFrames - outroBuffer
            : startFrame + framesPerChunk;

        const isKeyword = this.containsKeyword(chunk, keywords);

        cues.push({
          text: chunk,
          startFrame,
          endFrame,
          isKeyword,
          sceneId: scene.sceneId,
          color: isKeyword ? comparison.config.theme.wordAColor : undefined,
        });
      });
    }

    return cues;
  }
}
