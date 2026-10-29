import {AbsoluteFill, useCurrentFrame} from "remotion";
import {
  LiveCaption,
  Photo,
  Pill,
  Stage,
  TipSheet,
  ash,
  at,
  hairline,
  highlight,
  ink,
  radius,
  rise,
  sagePale,
  stone,
  type SceneProps,
} from "../ui";

const Step = ({n, label, hot}: {n: string; label: string; hot: boolean}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginTop: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          background: hot ? highlight.skin.band : sagePale,
          color: hot ? highlight.skin.ink : stone,
          fontSize: 20,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: hot ? 600 : 400,
          color: hot ? ink : ash,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const AloeScene = ({cueFrames, captions}: SceneProps) => {
  const frame = useCurrentFrame();
  const peel = at(cueFrames, 1);
  const massage = at(cueFrames, 2);

  return (
    <AbsoluteFill>
      <Photo src="aloe_upscayl_2x_upscayl-standard-4x.png" frame={frame} from={1.03} to={1.08} origin="46% 36%" />
      <Stage anchor="start">
        <TipSheet>
          <Pill frame={frame}>Mẹo 1</Pill>
          <div
            style={{
              marginTop: 16,
              fontSize: 44,
              fontWeight: 400,
              lineHeight: 1.2,
              color: ink,
              ...rise(frame, 4),
            }}
          >
            Gel nha đam tươi
          </div>
          <div style={{marginTop: 8, ...rise(frame, 8)}}>
            <Step n="1" label="Gọt vỏ, lấy gel trong" hot={frame >= peel} />
            <Step n="2" label="Thoa mặt và cổ" hot={frame >= massage} />
            <Step n="3" label="Massage 10 phút, rửa sạch" hot={frame >= massage} />
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
