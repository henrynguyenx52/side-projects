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
        src="kitchen_upscayl_2x_upscayl-standard-4x.png"
        frame={frame}
        from={1.02}
        to={1.07}
        origin="50% 38%"
      />
      <Stage anchor="start">
        <TipSheet>
          <Pill frame={frame}>Tại nhà</Pill>
          <Display frame={frame} start={4} color={ink} style={{marginTop: 12}}>
            Mẹo trắng da
          </Display>
          <div
            style={{
              marginTop: 8,
              fontSize: 32,
              fontWeight: 400,
              color: highlight.skin.text,
              ...rise(frame, 8),
            }}
          >
            Lành tính, có sẵn trong nhà
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
