import {useCurrentFrame} from "remotion";
import {
  Kicker,
  SceneProps,
  Stage,
  at,
  cream,
  down,
  ink,
  muted,
  red,
  rise,
} from "../ui";

const Row = ({
  frame,
  start,
  name,
  price,
  unit,
  delta,
  deltaColor,
}: {
  frame: number;
  start: number;
  name: string;
  price: string;
  unit: string;
  delta: string;
  deltaColor: string;
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr 220px",
        alignItems: "end",
        borderTop: `2px solid ${ink}`,
        padding: "26px 0",
        ...rise(frame, start),
      }}
    >
      <div style={{fontSize: 42, fontWeight: 700, color: ink}}>{name}</div>
      <div>
        <div style={{fontSize: 56, fontWeight: 800, lineHeight: 1, color: ink}}>
          {price}
        </div>
        <div style={{marginTop: 6, fontSize: 26, color: muted}}>{unit}</div>
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: deltaColor,
          textAlign: "right",
        }}
      >
        {delta}
      </div>
    </div>
  );
};

export const WorldScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={cream}>
      <Kicker color={red} frame={frame}>
        Mặt bằng thế giới
      </Kicker>
      <div
        style={{
          marginTop: 16,
          fontSize: 36,
          color: muted,
          ...rise(frame, at(cueFrames, 0)),
        }}
      >
        Giá trong nước được điều chỉnh theo bình quân 7 ngày.
      </div>
      <div style={{marginTop: 48}}>
        <Row
          frame={frame}
          start={at(cueFrames, 1)}
          name="RON 95 pha E10"
          price="133,5"
          unit="USD một thùng"
          delta="−8,4%"
          deltaColor={down}
        />
        <Row
          frame={frame}
          start={at(cueFrames, 2)}
          name="Dầu diesel"
          price="168"
          unit="USD"
          delta="+1,8%"
          deltaColor={red}
        />
        <Row
          frame={frame}
          start={at(cueFrames, 3)}
          name="Dầu mazut"
          price="800,6"
          unit="USD một tấn"
          delta="+3,7%"
          deltaColor={red}
        />
      </div>
    </Stage>
  );
};
