import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {fontFamily} from "./fonts";
import {cues} from "./timeline";
import {cream, ink} from "./ui";

export const Captions = () => {
  const frame = useCurrentFrame();
  const cue = cues.find(
    (item) => frame >= item.startFrame && frame < item.displayEndFrame,
  );
  if (!cue) {
    return null;
  }

  const opacity = interpolate(frame - cue.startFrame, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 96px 44px",
      }}
    >
      <div
        style={{
          opacity,
          maxWidth: 1580,
          backgroundColor: ink,
          color: cream,
          fontFamily,
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1.35,
          textAlign: "center",
          padding: "16px 36px",
          borderRadius: 8,
        }}
      >
        {cue.caption}
      </div>
    </AbsoluteFill>
  );
};
