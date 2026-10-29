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
        borderTop: `2px solid ${ink}`,
        padding: "22px 0",
        ...rise(frame, start),
      }}
    >
      <div style={{fontSize: 36, fontWeight: 700, color: ink}}>{name}</div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: 10,
          gap: 16,
        }}
      >
        <div>
          <div style={{fontSize: 56, fontWeight: 800, lineHeight: 1, color: ink}}>
            {price}
          </div>
          <div style={{marginTop: 6, fontSize: 24, color: muted}}>{unit}</div>
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: deltaColor,
            textAlign: "right",
          }}
        >
          {delta}
        </div>
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
