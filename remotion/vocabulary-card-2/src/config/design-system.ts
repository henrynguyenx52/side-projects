import type { VideoTheme } from "../types.ts";

export const defaultTheme: VideoTheme = {
  wordAColor: "#1CB0F6", // Duolingo Macaw Blue (SAY)
  wordBColor: "#FF9600", // Duolingo Fox Orange (TELL)
  bgColor: "#F7F7F7",    // Duolingo Crisp Canvas
  cardBg: "#FFFFFF",
  cardBorder: "#E5E5E5",
  textPrimary: "#3C3C3C",  // Duolingo Slate Ink
  textSecondary: "#777777", // Duolingo Muted Gray
  accentGlow: "rgba(88, 204, 2, 0.25)", // Feather Green Glow
  mistakeColor: "#FF4B4B", // Cardinal Red
  correctColor: "#58CC02", // Feather Green
};

export const springPresets = {
  snappy: { damping: 14, mass: 0.5, stiffness: 120 },
  bouncy: { damping: 10, mass: 0.45, stiffness: 140 }, // Extra bouncy for Duolingo feel
  smooth: { damping: 16, mass: 0.7, stiffness: 90 },
  gentle: { damping: 20, mass: 1.0, stiffness: 70 },
};

// Duolingo 3D Tactile Card Style (Signature 3D bottom border)
export const duoCardStyle = {
  background: "#FFFFFF",
  border: "2.5px solid #E5E5E5",
  borderBottom: "6px solid #DCDCDC",
  borderRadius: 24,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
};

// Duolingo 3D Button Helpers
export const duo3DButtonStyle = (bgColor: string, darkColor: string, textColor = "#FFFFFF") => ({
  background: bgColor,
  color: textColor,
  border: "none",
  borderBottom: `5px solid ${darkColor}`,
  borderRadius: 18,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  cursor: "pointer",
});

// Backward compatibility alias
export const glassCardStyle = duoCardStyle;
