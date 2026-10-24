import {useCurrentFrame} from "remotion";
import {
  Kicker,
  SceneProps,
  Stage,
  at,
  cream,
  gold,
  ink,
  mist,
  rise,
  upOnDark,
} from "../ui";

const Row = ({
  frame,
  start,
  name,
  price,
  unit,
  delta,
}: {
  frame: number;
  start: number;
  name: string;
  price: string;
  unit: string;
  delta: string;
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        borderTop: "2px solid rgba(243,238,228,0.28)",
        paddingTop: 28,
        ...rise(frame, start),
      }}
    >
      <div>
        <div style={{fontSize: 28, fontWeight: 600, color: gold}}>{delta}</div>
        <div style={{marginTop: 8, fontSize: 52, fontWeight: 700, color: cream}}>
          {name}
        </div>
      </div>
      <div style={{textAlign: "right"}}>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 0.9,
            color: upOnDark,
            letterSpacing: -2,
          }}
        >
          {price}
        </div>
        <div style={{marginTop: 8, fontSize: 28, color: mist}}>{unit}</div>
      </div>
    </div>
  );
};

export const DieselScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={ink}>
      <Kicker color={gold} frame={frame}>
        Ngược lại
      </Kicker>
      <div
        style={{
          marginTop: 56,
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <Row
          frame={frame}
          start={at(cueFrames, 0)}
          name="Dầu diesel"
          price="29.550"
          unit="đồng một lít"
          delta="+450 đồng"
        />
        <Row
          frame={frame}
          start={at(cueFrames, 1)}
          name="Dầu mazut"
          price="23.370"
          unit="đồng một kilôgam"
          delta="Tăng"
        />
      </div>
    </Stage>
  );
};
