import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {
  LiveCaption,
  Photo,
  Pill,
  Shade,
  Stage,
  at,
  cream,
  ink,
  lime,
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
          <Pill bg={cream} color={ink} frame={frame}>
            MỖI NGÀY
          </Pill>
          <div
            style={{
              marginTop: 14,
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -1.6,
              color: cream,
              textShadow: "0 8px 28px rgba(0,0,0,0.45)",
              ...rise(frame, 4),
            }}
          >
            Tiết kiệm
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.15,
              color: lime,
              textShadow: "0 6px 20px rgba(0,0,0,0.4)",
              ...rise(frame, 8),
            }}
          >
            An toàn · Tự tin ✨
          </div>
          <div
            style={{
              marginTop: 22,
              background: lime,
              color: ink,
              fontWeight: 800,
              fontSize: 34,
              lineHeight: 1,
              padding: "18px 28px",
              borderRadius: 999,
              opacity: pop,
              transform: `scale(${0.9 + pop * 0.1})`,
            }}
          >
            Lưu video này
          </div>
          <div style={{maxWidth: 900, textShadow: "0 2px 14px rgba(0,0,0,0.55)"}}>
            <LiveCaption
              frame={frame}
              captions={captions}
              cueFrames={cueFrames}
              color={cream}
            />
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};
