import {AbsoluteFill, useCurrentFrame} from "remotion";
import {
  LiveCaption,
  Photo,
  Pill,
  Stage,
  TipSheet,
  at,
  cream,
  ink,
  lime,
  rise,
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
        marginTop: 10,
        opacity: hot ? 1 : 0.4,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          background: hot ? lime : "rgba(246,241,231,0.16)",
          color: hot ? ink : cream,
          fontSize: 20,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div style={{fontSize: 32, fontWeight: 700, color: cream}}>{label}</div>
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
          <Pill bg={lime} color={ink} frame={frame}>
            MẸO 1
          </Pill>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
              ...rise(frame, 4),
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: -0.8,
                color: cream,
              }}
            >
              Phèn chua có sẵn trong bếp
            </div>
            <div style={{fontSize: 44, lineHeight: 1}}>🧂</div>
          </div>
          <div style={{marginTop: 16, ...rise(frame, 8)}}>
            <Step n="1" label="Rang chín" hot={frame >= grind} />
            <Step n="2" label="Giã mịn" hot={frame >= grind} />
            <Step n="3" label="Lau khô, thoa bột mỏng" hot={frame >= apply} />
          </div>
          <div
            style={{
              marginTop: 16,
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
