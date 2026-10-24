import {AbsoluteFill, useCurrentFrame} from "remotion";
import {
  LiveCaption,
  Photo,
  Pill,
  Stage,
  TipSheet,
  cream,
  ink,
  lime,
  rise,
  type SceneProps,
} from "../ui";

export const BridgeScene = ({cueFrames, captions}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Photo
        src="kitchen.jpg"
        frame={frame}
        from={1.02}
        to={1.07}
        origin="50% 42%"
      />
      <Stage anchor="start">
        <TipSheet>
          <Pill bg={lime} color={ink} frame={frame}>
            TẠI NHÀ
          </Pill>
          <div
            style={{
              marginTop: 12,
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              color: cream,
              ...rise(frame, 4),
            }}
          >
            Mẹo tự nhiên 🌿
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 36,
              fontWeight: 700,
              color: lime,
              ...rise(frame, 8),
            }}
          >
            Có sẵn trong nhà bạn
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(246,241,231,0.18)",
            }}
          >
            <LiveCaption
              frame={frame}
              captions={captions}
              cueFrames={cueFrames}
              color={cream}
              size={32}
            />
          </div>
        </TipSheet>
      </Stage>
    </AbsoluteFill>
  );
};
