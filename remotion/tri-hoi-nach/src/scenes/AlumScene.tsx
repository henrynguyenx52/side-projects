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
  ink,
  radius,
  rise,
  sage,
  sagePale,
  stone,
  type SceneProps,
} from "../ui";

const Step = ({
  n,
  label,
  hot,
}: {
  n: string;
  label: string;
  hot: boolean;
}) => {
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
          background: hot ? sage : sagePale,
          color: hot ? ink : stone,
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

export const AlumScene = ({cueFrames, captions}: SceneProps) => {
  const frame = useCurrentFrame();
  const grind = at(cueFrames, 1);
  const apply = at(cueFrames, 2);

  return (
    <AbsoluteFill>
      <Photo src="alum.jpg" frame={frame} from={1.04} to={1.1} origin="62% 68%" />
      <Stage anchor="start">
        <TipSheet>
          <Pill frame={frame}>Mẹo 1</Pill>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
              fontSize: 40,
              fontWeight: 400,
              lineHeight: 1.25,
              letterSpacing: 0,
              color: ink,
              ...rise(frame, 4),
            }}
          >
            <div style={{flex: 1, minWidth: 0}}>Phèn chua có sẵn trong bếp</div>
            <div style={{fontSize: 44, lineHeight: 1}}>🧂</div>
          </div>
          <div style={{marginTop: 8, ...rise(frame, 8)}}>
            <Step n="1" label="Rang chín" hot={frame >= grind} />
            <Step n="2" label="Giã mịn" hot={frame >= grind} />
            <Step n="3" label="Lau khô, thoa bột mỏng" hot={frame >= apply} />
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
