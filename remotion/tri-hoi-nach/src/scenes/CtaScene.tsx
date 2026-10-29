import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {
  Display,
  LiveCaption,
  Photo,
  Pill,
  Shade,
  Stage,
  at,
  highlight,
  onDark,
  onPrimary,
  primary,
  radius,
  rise,
  type SceneProps,
} from "../ui";

export const CtaScene = ({cueFrames, captions}: SceneProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const saveAt = at(cueFrames, 1);
  const pop = spring({
    frame: frame - saveAt,
    fps,
    config: {damping: 12, stiffness: 150, mass: 0.65},
  });

  return (
    <AbsoluteFill>
      <Photo
        src="confident.jpg"
        frame={frame}
        from={1.08}
        to={1.02}
        origin="50% 36%"
      />
      <Shade anchor="bottom" />
      <Stage anchor="end">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 60px 48px",
          }}
        >
          <Pill tone="cream" frame={frame}>
            Mỗi ngày
          </Pill>
          <Display
            frame={frame}
            start={4}
            size={84}
            color={onDark}
            style={{marginTop: 14}}
          >
            Tiết kiệm
          </Display>
          <div
            style={{
              marginTop: 8,
              fontSize: 40,
              fontWeight: 400,
              lineHeight: 1.2,
              color: highlight.smell.band,
              ...rise(frame, 8),
            }}
          >
            An toàn · Tự tin ✨
          </div>
          <div
            style={{
              marginTop: 22,
              background: primary,
              color: onPrimary,
              fontWeight: 600,
              fontSize: 28,
              lineHeight: 1,
              padding: "16px 28px",
              borderRadius: radius.full,
              opacity: pop,
              transform: `scale(${0.92 + pop * 0.08})`,
            }}
          >
            Lưu video này
          </div>
          <div style={{maxWidth: 900}}>
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
