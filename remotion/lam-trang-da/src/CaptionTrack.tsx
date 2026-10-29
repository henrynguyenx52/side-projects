import {interpolate, useCurrentFrame} from "remotion";
import {captionCues} from "./captionCues";
import {fontFamily} from "./fonts";
import {fps} from "./timeline";
import {blue, mute} from "./whiteboard";

export const CaptionTrack = () => {
  const frame = useCurrentFrame();
  const time = frame / fps;
  const cue = captionCues.find((item) => time >= item.start && time < item.end);
  if (!cue) {
    return null;
  }

  const start = cue.start * fps;
  const end = cue.end * fps;
  const opacity = Math.min(
    interpolate(frame, [start, start + 4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [end - 3, end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 1700,
        zIndex: 9,
        textAlign: "center",
        opacity,
        fontFamily,
        fontWeight: 600,
        fontSize: 36,
        lineHeight: 1.25,
        color: mute,
      }}
    >
      {cue.parts.map((part, index) => (
        <span key={`${part.text}-${index}`} style={{color: part.hot ? blue : mute}}>
          {part.text}
        </span>
      ))}
    </div>
  );
};
