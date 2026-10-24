import type {ReactNode} from "react";
import {AbsoluteFill, Easing, Img, interpolate, staticFile} from "remotion";
import {fontFamily} from "./fonts";

export const ink = "#14110E";
export const cream = "#F6F1E7";
export const lime = "#D6F25A";

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
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: ink}}>
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
      ? "linear-gradient(180deg, rgba(8,6,4,0) 34%, rgba(8,6,4,0.42) 58%, rgba(8,6,4,0.9) 80%, rgba(8,6,4,0.96) 100%)"
      : "linear-gradient(180deg, rgba(8,6,4,0.92) 0%, rgba(8,6,4,0.72) 24%, rgba(8,6,4,0) 52%)";
  return <AbsoluteFill style={{background}} />;
};

export const Pill = ({
  children,
  bg,
  color,
  frame,
  start = 0,
}: {
  children: ReactNode;
  bg: string;
  color: string;
  frame: number;
  start?: number;
}) => {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 26,
        letterSpacing: 0.8,
        padding: "10px 16px",
        borderRadius: 999,
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
        width: "100%",
        boxSizing: "border-box",
        background: "rgba(14,12,10,0.94)",
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        padding: "52px 48px 28px",
        boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
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
  size = 34,
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
        marginTop: 14,
        opacity,
        color,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.35,
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
