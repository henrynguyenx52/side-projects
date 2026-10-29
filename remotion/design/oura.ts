/**
 * Oura tokens for vertical care-tip videos.
 * Spec: ./DESIGN.md (from awesome-design-md).
 *
 * Cream paper is the default surface. Action blue is only the one save/follow pill.
 * Earth colors are bands and the single line worth remembering, never buttons.
 * Smell tips highlight with sage/forest. Skin-brightening tips highlight with gold.
 * Sizes below are for a 1080×1920 frame, not the web sizes in DESIGN.md.
 */

export const canvas = "#f7f1e8";
export const surface = "#ffffff";
export const surfaceGrey = "#ececec";
export const silver = "#cccac7";
export const inkBand = "#000000";
export const inkBandSoft = "#19191c";
export const hairline = "#e1dcd3";

export const ink = "#1c1b1a";
export const stone = "#4a4741";
export const onStone = "#ffffff";
export const ash = "#838280";
export const mute = "#a8a5a0";
export const onDark = "#ffffff";

export const primary = "#2a72de";
export const onPrimary = "#ffffff";

export const clay = "#6b443d";
export const espresso = "#39221e";
export const gold = "#af751b";
export const ochre = "#bc924c";
export const goldSoft = "#ddaa61";
export const goldPale = "#ddbe78";
export const goldDeep = "#684d07";
export const forest = "#224228";
export const olive = "#5c6f5d";
export const sage = "#849671";
export const sageMute = "#7b886d";
export const sagePale = "#ced4b8";

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 24,
  xl: 40,
  full: 9999,
} as const;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const type = {
  display: {fontSize: 96, fontWeight: 300, lineHeight: 1.05, letterSpacing: 0},
  displaySm: {fontSize: 60, fontWeight: 300, lineHeight: 1.08, letterSpacing: 0},
  title: {fontSize: 40, fontWeight: 400, lineHeight: 1.25, letterSpacing: 0},
  body: {fontSize: 32, fontWeight: 400, lineHeight: 1.4, letterSpacing: 0},
  eyebrow: {fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: 1},
  caption: {fontSize: 32, fontWeight: 400, lineHeight: 1.35, letterSpacing: 0},
} as const;

/** Accent for the one remembered line. Text on cream uses the deep tone. */
export const highlight = {
  smell: {text: forest, band: sagePale, ink: forest},
  skin: {text: goldDeep, band: goldPale, ink: espresso},
} as const;
