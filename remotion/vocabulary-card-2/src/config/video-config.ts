import type { AspectRatioType, VideoConfigProps } from "../types.ts";
import { defaultTheme } from "./design-system.ts";

export const RESOLUTION_PRESETS: Record<
  AspectRatioType,
  { width: number; height: number }
> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

export const DEFAULT_VIDEO_CONFIG: VideoConfigProps = {
  aspectRatio: "9:16",
  width: 1080,
  height: 1920,
  fps: 30,
  totalDurationInFrames: 1350, // ~45s
  voice: "baotrang",
  showSubtitles: true,
  includeMistakeScene: true,
  includeQuizScene: true,
  ctaText: "Follow for more daily English tips!",
  targetAudience: "Vietnamese English learners",
  level: "A2-B2",
  theme: defaultTheme,
};
