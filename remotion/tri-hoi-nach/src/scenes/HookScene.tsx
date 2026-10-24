import {AbsoluteFill, useCurrentFrame} from "remotion";
import {
  LiveCaption,
  Photo,
  Pill,
  Shade,
  Stage,
  cream,
  ink,
  lime,
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
          <Pill bg={cream} color={ink} frame={frame}>
            SỰ THẬT
          </Pill>
          <div
            style={{
              marginTop: 18,
              fontSize: 108,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: cream,
              textShadow: "0 8px 28px rgba(0,0,0,0.45)",
              ...rise(frame, 4),
            }}
          >
            MỒ HÔI
          </div>
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
                background: lime,
                color: ink,
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: -0.6,
                padding: "8px 16px 12px",
                borderRadius: 14,
                boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
                transform: "rotate(-1.1deg)",
              }}
            >
              KHÔNG CÓ MÙI?!
            </div>
            <div style={{fontSize: 64, lineHeight: 1}}>😱</div>
          </div>
          <div style={{maxWidth: 920, textShadow: "0 2px 16px rgba(0,0,0,0.55)"}}>
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
