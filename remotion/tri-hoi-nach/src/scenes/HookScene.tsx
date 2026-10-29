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
      <Photo src="hook.jpg" frame={frame} from={1.02} to={1.08} origin="62% 28%" />
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
            Sự thật
          </Pill>
          <Display
            frame={frame}
            start={4}
            size={typeScale.display.fontSize}
            color={onDark}
            style={{marginTop: 18, lineHeight: typeScale.display.lineHeight}}
          >
            Mồ hôi
          </Display>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginTop: 16,
              ...rise(frame, 8),
            }}
          >
            <div
              style={{
                background: highlight.smell.band,
                color: highlight.smell.ink,
                fontSize: 44,
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: 0,
                padding: "10px 18px",
                borderRadius: radius.lg,
              }}
            >
              Không có mùi?!
            </div>
            <div style={{fontSize: 64, lineHeight: 1}}>😱</div>
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
