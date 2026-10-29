import type {CSSProperties, ReactNode} from "react";
import {AbsoluteFill, Easing, Img, interpolate, staticFile} from "remotion";
import {
  ash,
  canvas,
  espresso,
  forest,
  gold,
  hairline,
  highlight,
  ink,
  onDark,
  onPrimary,
  onStone,
  primary,
  radius,
  sage,
  sagePale,
  space,
  stone,
  surface,
  type,
} from "../../design/oura";
import {displayFamily, fontFamily} from "./fonts";

export {
  ash,
  canvas,
  espresso,
  forest,
  gold,
  hairline,
  highlight,
  ink,
  onDark,
  onPrimary,
  primary,
  radius,
  sage,
  sagePale,
  stone,
  surface,
};

export type SceneProps = {
  cueFrames: number[];
  captions: string[];
};

export const at = (cueFrames: number[], index: number) =>
  Math.max(0, (cueFrames[index] ?? 0) - 6);

export const rise = (frame: number, start: number) => {
  const opacity = interpolate(frame, [start, start + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [start, start + 14], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return {opacity, transform: `translateY(${y}px)`};
};

export const Photo = ({
  src,
  frame,
  from,
  to,
  origin,
}: {
  src: string;
  frame: number;
  from: number;
  to: number;
  origin: string;
}) => {
  const scale = interpolate(frame, [0, 260], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: espresso}}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: origin,
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Shade = ({anchor}: {anchor: "top" | "bottom"}) => {
  const background =
    anchor === "bottom"
      ? "linear-gradient(180deg, rgba(28,27,26,0) 40%, rgba(28,27,26,0.55) 66%, rgba(28,27,26,0.9) 100%)"
      : "linear-gradient(180deg, rgba(28,27,26,0.88) 0%, rgba(28,27,26,0.62) 22%, rgba(28,27,26,0) 50%)";
  return <AbsoluteFill style={{background}} />;
};

const pillTone = {
  stone: {background: stone, color: onStone},
  cream: {background: canvas, color: stone},
  primary: {background: primary, color: onPrimary},
} as const;

export const Pill = ({
  children,
  tone = "stone",
  frame,
  start = 0,
}: {
  children: ReactNode;
  tone?: keyof typeof pillTone;
  frame: number;
  start?: number;
}) => {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        ...pillTone[tone],
        fontFamily,
        fontWeight: type.eyebrow.fontWeight,
        fontSize: type.eyebrow.fontSize,
        letterSpacing: type.eyebrow.letterSpacing,
        lineHeight: 1,
        textTransform: "uppercase",
        padding: "12px 18px",
        borderRadius: radius.full,
        ...rise(frame, start),
      }}
    >
      {children}
    </div>
  );
};

export const Display = ({
  children,
  frame,
  start = 0,
  size = type.displaySm.fontSize,
  color = ink,
  style,
}: {
  children: ReactNode;
  frame: number;
  start?: number;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) => {
  return (
    <div
      style={{
        fontFamily: displayFamily,
        fontSize: size,
        fontWeight: type.display.fontWeight,
        lineHeight: type.displaySm.lineHeight,
        letterSpacing: 0,
        color,
        ...style,
        ...rise(frame, start),
      }}
    >
      {children}
    </div>
  );
};

export const TipSheet = ({children}: {children: ReactNode}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "80%",
        alignSelf: "center",
        marginTop: space.lg + 40,
        boxSizing: "border-box",
        background: "rgba(247, 241, 232, 0.88)",
        borderRadius: radius.lg,
        padding: `${space.xl + 4}px ${space.xl}px ${space.lg}px`,
        boxShadow: "0 10px 28px rgba(28, 27, 26, 0.08)",
      }}
    >
      {children}
    </div>
  );
};

export const LiveCaption = ({
  frame,
  captions,
  cueFrames,
  color,
  size = type.caption.fontSize,
}: {
  frame: number;
  captions: string[];
  cueFrames: number[];
  color: string;
  size?: number;
}) => {
  if (captions.length === 0) {
    return null;
  }
  let index = -1;
  for (let i = 0; i < cueFrames.length; i++) {
    if (frame >= cueFrames[i]) {
      index = i;
    }
  }
  const safeIndex = index < 0 ? 0 : index;
  const start = cueFrames[safeIndex] ?? 0;
  const opacity =
    safeIndex === 0
      ? 1
      : interpolate(frame, [start, start + 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return (
    <div
      style={{
        marginTop: space.sm,
        opacity,
        color,
        fontFamily,
        fontSize: size,
        fontWeight: type.caption.fontWeight,
        lineHeight: type.caption.lineHeight,
        letterSpacing: 0,
      }}
    >
      {captions[safeIndex]}
    </div>
  );
};

export const Stage = ({
  anchor,
  children,
}: {
  anchor: "start" | "end";
  children: ReactNode;
}) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily,
        justifyContent: anchor === "start" ? "flex-start" : "flex-end",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
