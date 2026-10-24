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

const Tile = ({
  title,
  note,
  noteColor,
}: {
  title: string;
  note: string;
  noteColor: string;
}) => {
  return (
    <div
      style={{
        flex: 1,
        background: cream,
        borderRadius: 18,
        padding: "16px 16px 14px",
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.15,
          color: ink,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 24,
          fontWeight: 700,
          color: noteColor,
        }}
      >
        {note}
      </div>
    </div>
  );
};

export const CitrusScene = ({cueFrames, captions}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Photo
        src="citrus.jpg"
        frame={frame}
        from={1.03}
        to={1.09}
        origin="42% 70%"
      />
      <Stage anchor="start">
        <TipSheet>
          <Pill bg={lime} color={ink} frame={frame}>
            MẸO 2
          </Pill>
          <div
            style={{
              marginTop: 14,
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.2,
              color: cream,
              ...rise(frame, 4),
            }}
          >
            Chanh / Gừng 🍋
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 34,
              fontWeight: 700,
              color: lime,
              ...rise(frame, 8),
            }}
          >
            Sẵn trong tủ lạnh
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              ...rise(frame, 10),
            }}
          >
            <Tile title="Chanh" note="Cắt nửa quả, chà nhẹ" noteColor="#2F6A34" />
            <Tile title="Gừng" note="Có sẵn trong tủ lạnh" noteColor="#8A5A12" />
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 30,
              fontWeight: 800,
              color: cream,
              ...rise(frame, 12),
            }}
          >
            Axit tự nhiên diệt khuẩn
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
