import {AbsoluteFill, useCurrentFrame} from "remotion";
import {
  Display,
  LiveCaption,
  Photo,
  Pill,
  Stage,
  TipSheet,
  forest,
  gold,
  hairline,
  highlight,
  ink,
  radius,
  rise,
  surface,
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
        background: surface,
        borderRadius: radius.lg,
        border: `1px solid ${hairline}`,
        padding: "16px 16px 14px",
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.2,
          color: ink,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 24,
          fontWeight: 400,
          lineHeight: 1.3,
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
          <Pill frame={frame}>Mẹo 2</Pill>
          <Display frame={frame} start={4} color={ink} style={{marginTop: 14}}>
            Chanh / Gừng 🍋
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
            <Tile title="Chanh" note="Cắt nửa quả, chà nhẹ" noteColor={forest} />
            <Tile title="Gừng" note="Có sẵn trong tủ lạnh" noteColor={gold} />
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 30,
              fontWeight: 600,
              color: ink,
              ...rise(frame, 12),
            }}
          >
            Axit tự nhiên diệt khuẩn
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
