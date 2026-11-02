// =========================================================================
// Vocabulary Contrast & Comparison System Types
// =========================================================================

export type DirectionType = "incoming" | "outgoing" | "neutral";
export type AspectRatioType = "9:16" | "16:9" | "1:1";

export interface ContrastWordDetail {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  vietnameseMeaning?: string;
  direction: DirectionType;
  directionLabel: string;
  directionIcon?: string;
  examples: string[];
  explanation: string;
  keyCollocations?: string[];
  colorAccent?: string;
}

export interface ComparisonInsight {
  headline: string;
  summary: string;
  ruleA: string;
  ruleB: string;
  memoryTrick: string;
}

export interface CommonMistakeDetail {
  incorrect: string;
  correct: string;
  explanation: string;
}

export interface QuizDetail {
  question: string;
  options: string[];
  answer: string;
  answerWord: string;
  explanation: string;
}

export interface NarrationScene {
  sceneId: string;
  title: string;
  text: string;
  caption: string;
  audioFile?: string;
  audioDurationSeconds: number;
  startFrame: number;
  durationInFrames: number;
}

export interface SubtitleCue {
  text: string;
  startFrame: number;
  endFrame: number;
  isKeyword?: boolean;
  sceneId: string;
  color?: string;
}

export interface VideoTheme {
  wordAColor: string;
  wordBColor: string;
  bgColor: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentGlow: string;
  mistakeColor: string;
  correctColor: string;
}

export interface VideoConfigProps {
  aspectRatio: AspectRatioType;
  width: number;
  height: number;
  fps: number;
  totalDurationInFrames: number;
  voice: string;
  showSubtitles: boolean;
  includeMistakeScene: boolean;
  includeQuizScene: boolean;
  ctaText: string;
  targetAudience: string;
  level: string;
  theme: VideoTheme;
}

export interface VocabularyComparison {
  id: string;
  wordA: ContrastWordDetail;
  wordB: ContrastWordDetail;
  comparison: ComparisonInsight;
  commonMistake?: CommonMistakeDetail;
  quiz: QuizDetail;
  homework?: {
    question: string;
    options: string[];
    instruction?: string;
    note?: string;
  };
  narration: {
    audioMasterFile?: string;
    totalAudioDurationSeconds: number;
    scenes: NarrationScene[];
  };
  subtitles: SubtitleCue[];
  config: VideoConfigProps;
}

export interface VocabularyComparisonInput {
  wordA: string;
  wordB: string;
  language?: string;
  targetAudience?: string;
  level?: string;
  duration?: number;
  aspectRatio?: AspectRatioType;
  resolution?: string;
  fps?: number;
  voice?: string;
  customMistake?: CommonMistakeDetail;
  customQuiz?: QuizDetail;
}
