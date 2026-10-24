import React from "react";
import {AbsoluteFill, Easing, interpolate} from "remotion";
import {fontFamily} from "./fonts";

export const ink = "#16130F";
export const cream = "#F3EEE4";
export const gold = "#C6A15A";
export const red = "#8C1D2C";
export const muted = "#5E584F";
export const mist = "#D9D0C3";
export const down = "#1E6B45";
export const downOnDark = "#B7D7C4";
export const upOnDark = "#F0B4A8";

export type SceneProps = {
  cueFrames: number[];
};

export const at = (cueFrames: number[], index: number) =>
  Math.max(0, (cueFrames[index] ?? 0) - 6);

export const rise = (frame: number, start: number) => {
  const opacity = interpolate(frame, [start, start + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [start, start + 16], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return {opacity, transform: `translateY(${y}px)`};
};

export const Stage: React.FC<{
  background: string;
  children: React.ReactNode;
}> = ({background, children}) => {
  return (
    <AbsoluteFill style={{backgroundColor: background, fontFamily}}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "84px 120px 196px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const Kicker: React.FC<{
  children: React.ReactNode;
  color: string;
  frame: number;
  start?: number;
}> = ({children, color, frame, start = 0}) => {
  return (
    <div
      style={{
        fontSize: 32,
        fontWeight: 600,
        letterSpacing: 1.5,
        color,
        ...rise(frame, start),
      }}
    >
      {children}
    </div>
  );
};
