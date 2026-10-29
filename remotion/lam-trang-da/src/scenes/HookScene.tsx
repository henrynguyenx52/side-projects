import {AbsoluteFill, useCurrentFrame} from "remotion";
import {type as typeScale} from "../../../design/oura";
import {
  Display,
  LiveCaption,
  Photo,
  Pill,
  Shade,
  Stage,
  highlight,
  onDark,
  radius,
  rise,
  type SceneProps,
} from "../ui";

export const HookScene = ({cueFrames, captions}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Photo src="hook_upscayl_2x_upscayl-standard-4x.png" frame={frame} from={1.04} to={1.08} origin="50% 32%" />
      <Shade anchor="bottom" />
      <Stage anchor="end">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 56px 52px",
          }}
        >
          <Pill tone="cream" frame={frame}>
            Da sạm
          </Pill>
          <Display
            frame={frame}
            start={4}
            size={typeScale.display.fontSize}
            color={onDark}
            style={{marginTop: 18, lineHeight: typeScale.display.lineHeight}}
          >
            Mỹ phẩm đắt
          </Display>
          <div
            style={{
              marginTop: 16,
              background: highlight.skin.band,
              color: highlight.skin.ink,
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: 0,
              padding: "12px 18px",
              borderRadius: radius.lg,
              ...rise(frame, 8),
            }}
          >
            Da vẫn không sáng?!
          </div>
          <div style={{maxWidth: 920}}>
            <LiveCaption
              frame={frame}
              captions={captions}
              cueFrames={cueFrames}
              color={onDark}
            />
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};
