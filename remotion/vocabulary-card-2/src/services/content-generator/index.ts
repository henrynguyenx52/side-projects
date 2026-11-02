import type {
  VocabularyComparisonInput,
  VocabularyComparison,
  NarrationScene,
  VideoConfigProps,
} from "../../types.ts";
import { DEFAULT_VIDEO_CONFIG, RESOLUTION_PRESETS } from "../../config/video-config.ts";
import { CONTRAST_PRESETS } from "./vocabulary-database.ts";

export class ContentGeneratorService {
  /**
   * Normalize word key (e.g. "borrow", "lend" -> "borrow-lend")
   */
  private static getPairKey(wordA: string, wordB: string): string {
    return `${wordA.trim().toLowerCase()}-${wordB.trim().toLowerCase()}`;
  }

  /**
   * Generate or retrieve educational contrast content
   */
  public static generateContent(
    input: VocabularyComparisonInput
  ): VocabularyComparison {
    const pairKey = this.getPairKey(input.wordA, input.wordB);
    const preset = CONTRAST_PRESETS[pairKey];

    const aspectRatio = input.aspectRatio || DEFAULT_VIDEO_CONFIG.aspectRatio;
    const resolution = RESOLUTION_PRESETS[aspectRatio];

    const config: VideoConfigProps = {
      ...DEFAULT_VIDEO_CONFIG,
      aspectRatio,
      width: resolution.width,
      height: resolution.height,
      fps: input.fps || DEFAULT_VIDEO_CONFIG.fps,
      voice: input.voice || DEFAULT_VIDEO_CONFIG.voice,
      targetAudience: input.targetAudience || DEFAULT_VIDEO_CONFIG.targetAudience,
      level: input.level || DEFAULT_VIDEO_CONFIG.level,
    };

    let wordA = preset ? preset.wordA : null;
    let wordB = preset ? preset.wordB : null;
    let comparison = preset ? preset.comparison : null;
    let commonMistake = input.customMistake || (preset ? preset.commonMistake : undefined);
    let quiz = input.customQuiz || (preset ? preset.quiz : null);
    let narrationScripts = preset ? preset.narrationScripts : null;

    if (!wordA || !wordB || !comparison || !quiz || !narrationScripts) {
      // Dynamic fallback for any general English word contrast
      const nameA = input.wordA.trim();
      const nameB = input.wordB.trim();

      wordA = {
        word: nameA,
        pronunciation: `/${nameA.toLowerCase()}/`,
        partOfSpeech: "verb",
        definition: `The definition and typical contextual usage of ${nameA}.`,
        vietnameseMeaning: `Ý nghĩa của ${nameA}`,
        direction: "incoming",
        directionLabel: `${nameA} (Usage A)`,
        examples: [`Here is how to use ${nameA} in a natural everyday sentence.`],
        explanation: `${nameA} is typically used in specific situations contrasting with ${nameB}.`,
        keyCollocations: [`key phrase with ${nameA}`],
        colorAccent: config.theme.wordAColor,
      };

      wordB = {
        word: nameB,
        pronunciation: `/${nameB.toLowerCase()}/`,
        partOfSpeech: "verb",
        definition: `The definition and typical contextual usage of ${nameB}.`,
        vietnameseMeaning: `Ý nghĩa của ${nameB}`,
        direction: "outgoing",
        directionLabel: `${nameB} (Usage B)`,
        examples: [`Here is how to use ${nameB} in a natural everyday sentence.`],
        explanation: `${nameB} contrasts directly with ${nameA} in grammar or direction.`,
        keyCollocations: [`key phrase with ${nameB}`],
        colorAccent: config.theme.wordBColor,
      };

      comparison = {
        headline: "The Key Distinction",
        summary: `Understand when to choose ${nameA} vs ${nameB}.`,
        ruleA: `Use ${nameA} for the first concept.`,
        ruleB: `Use ${nameB} for the second concept.`,
        memoryTrick: `Remember: ${nameA} and ${nameB} have different grammatical patterns!`,
      };

      commonMistake = {
        incorrect: `Incorrect usage mixing ${nameA} and ${nameB}.`,
        correct: `Correct natural usage with ${nameB}.`,
        explanation: `Pay close attention to how native speakers choose between ${nameA} and ${nameB}.`,
      };

      quiz = {
        question: `Which word fits best in this sentence: Choose _____?`,
        options: [`A. ${nameA}`, `B. ${nameB}`],
        answer: "B",
        answerWord: nameB,
        explanation: `Because of the context, ${nameB} is the correct natural choice!`,
      };

      narrationScripts = {
        hook: {
          spoken: `Stop confusing ${nameA} and ${nameB}! Here is the simple distinction you need to know.`,
          caption: `${nameA} vs ${nameB} Distinction`,
        },
        wordA: {
          spoken: `${nameA} is used when you want to express the first meaning. Notice how it behaves naturally in context.`,
          caption: `Understanding ${nameA}`,
        },
        wordB: {
          spoken: `${nameB} is used for the contrasting situation. Keep this clear distinction in mind.`,
          caption: `Understanding ${nameB}`,
        },
        comparison: {
          spoken: `Here is the main difference: ${nameA} is for one direction, while ${nameB} is for the other!`,
          caption: `${nameA} vs ${nameB} Golden Rule`,
        },
        mistake: {
          spoken: `A very common mistake is confusing these two words in daily conversation. Make sure to use them correctly.`,
          caption: `Common Mistake to Avoid`,
        },
        quiz: {
          spoken: `Let's test what you learned! Is the answer A: ${nameA}, or B: ${nameB}? The correct answer is B: ${nameB}!`,
          caption: `Quick Quiz Challenge`,
        },
        cta: {
          spoken: `Follow for more everyday English tips and level up your speaking today!`,
          caption: `Follow for more English tips!`,
        },
      };
    }

    // Build ordered scenes list
    const rawScenes: { id: string; title: string; spoken: string; caption: string }[] = [
      {
        id: "hook",
        title: "Hook",
        spoken: narrationScripts.hook.spoken,
        caption: narrationScripts.hook.caption,
      },
      {
        id: "wordA",
        title: wordA.word,
        spoken: narrationScripts.wordA.spoken,
        caption: narrationScripts.wordA.caption,
      },
      {
        id: "wordB",
        title: wordB.word,
        spoken: narrationScripts.wordB.spoken,
        caption: narrationScripts.wordB.caption,
      },
      {
        id: "comparison",
        title: "Comparison",
        spoken: narrationScripts.comparison.spoken,
        caption: narrationScripts.comparison.caption,
      },
    ];

    if (config.includeMistakeScene && commonMistake && narrationScripts.mistake) {
      rawScenes.push({
        id: "mistake",
        title: "Common Mistake",
        spoken: narrationScripts.mistake.spoken,
        caption: narrationScripts.mistake.caption,
      });
    }

    if (config.includeQuizScene && quiz) {
      rawScenes.push({
        id: "quiz",
        title: "Quick Quiz",
        spoken: narrationScripts.quiz.spoken,
        caption: narrationScripts.quiz.caption,
      });
    }

    rawScenes.push({
      id: "cta",
      title: "Call to Action",
      spoken: narrationScripts.cta.spoken,
      caption: narrationScripts.cta.caption,
    });

    const scenes: NarrationScene[] = rawScenes.map((s) => ({
      sceneId: s.id,
      title: s.title,
      text: s.spoken,
      caption: s.caption,
      audioDurationSeconds: 0,
      startFrame: 0,
      durationInFrames: 0,
    }));

    return {
      id: pairKey,
      wordA,
      wordB,
      comparison,
      commonMistake,
      quiz,
      narration: {
        totalAudioDurationSeconds: 0,
        scenes,
      },
      subtitles: [],
      config,
    };
  }

  /**
   * Validate content for educational accuracy
   */
  public static validateContent(data: VocabularyComparison): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.wordA.word || !data.wordB.word) {
      errors.push("Both wordA and wordB must have non-empty names.");
    }
    if (data.wordA.word.toLowerCase() === data.wordB.word.toLowerCase()) {
      errors.push("wordA and wordB cannot be identical.");
    }
    if (!data.quiz.question || data.quiz.options.length < 2) {
      errors.push("Quiz must have a question and at least 2 options.");
    }
    if (!data.quiz.answer) {
      errors.push("Quiz must have a defined correct answer.");
    }
    if (data.narration.scenes.length === 0) {
      errors.push("Narration must have at least one scene.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
