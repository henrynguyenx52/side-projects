import {AbsoluteFill, useCurrentFrame} from "remotion";
import {
  Display,
  LiveCaption,
  Photo,
  Pill,
  Stage,
  TipSheet,
  hairline,
  highlight,
  ink,
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
          <Pill frame={frame}>Tại nhà</Pill>
          <Display frame={frame} start={4} color={ink} style={{marginTop: 12}}>
            Mẹo tự nhiên 🌿
          </Display>
          <div
            style={{
              marginTop: 8,
              fontSize: 32,
              fontWeight: 400,
              color: highlight.smell.text,
              ...rise(frame, 8),
            }}
          >
            Có sẵn trong nhà bạn
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${hairline}`,
            }}
          >
            <LiveCaption
              frame={frame}
              captions={captions}
              cueFrames={cueFrames}
              color={ink}
            />
          </div>
        </TipSheet>
      </Stage>
    </AbsoluteFill>
  );
};
