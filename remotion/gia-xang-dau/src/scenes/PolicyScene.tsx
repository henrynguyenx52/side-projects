import {useCurrentFrame} from "remotion";
import {
  Kicker,
  SceneProps,
  Stage,
  at,
  cream,
  ink,
  muted,
  red,
  rise,
} from "../ui";

const Rule = ({
  frame,
  start,
  text,
}: {
  frame: number;
  start: number;
  text: string;
}) => {
  return (
    <div
      style={{
        borderTop: `2px solid ${ink}`,
        padding: "18px 0",
        fontSize: 36,
        fontWeight: 700,
        color: ink,
        ...rise(frame, start),
      }}
    >
      {text}
    </div>
  );
};

export const PolicyScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={cream}>
      <Kicker color={red} frame={frame}>
        Nghị định kinh doanh xăng dầu
      </Kicker>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 28,
        }}
      >
        <div style={{...rise(frame, at(cueFrames, 0))}}>
          <div style={{fontSize: 28, fontWeight: 600, color: muted}}>
            Thủ tướng yêu cầu
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1,
              color: ink,
              letterSpacing: -1,
            }}
          >
            21/10
          </div>
          <div style={{marginTop: 12, fontSize: 32, color: ink}}>
            Hoàn thiện và trình nghị định mới
          </div>
        </div>
        <div
          style={{
            fontSize: 42,
            color: muted,
            ...rise(frame, at(cueFrames, 1)),
          }}
        >
          ↓
        </div>
        <div style={{...rise(frame, at(cueFrames, 1))}}>
          <div style={{fontSize: 28, fontWeight: 600, color: muted}}>
            trình trước
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1,
              color: red,
              letterSpacing: -1,
            }}
          >
            10/11
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 32,
          color: muted,
          ...rise(frame, at(cueFrames, 2)),
        }}
      >
        Dự thảo hơn hai năm, qua 14 phiên bản.
      </div>
      <div style={{marginTop: 28}}>
        <Rule
          frame={frame}
          start={at(cueFrames, 3)}
          text="Không công bố giá cơ sở định kỳ."
        />
        <Rule
          frame={frame}
          start={at(cueFrames, 4)}
          text="Đầu mối tự quyết giá bán lẻ theo công thức, và phải kê khai để giám sát."
        />
      </div>
    </Stage>
  );
};
