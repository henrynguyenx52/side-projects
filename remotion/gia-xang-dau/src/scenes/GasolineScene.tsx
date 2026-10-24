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

const Column = ({
  frame,
  start,
  name,
  price,
  delta,
}: {
  frame: number;
  start: number;
  name: string;
  price: string;
  delta: string;
}) => {
  return (
    <div style={{flex: 1, ...rise(frame, start)}}>
      <div style={{fontSize: 36, fontWeight: 600, color: red}}>{name}</div>
      <div
        style={{
          marginTop: 12,
          fontSize: 108,
          fontWeight: 800,
          lineHeight: 0.92,
          letterSpacing: -2,
          color: ink,
        }}
      >
        {price}
      </div>
      <div style={{marginTop: 8, fontSize: 28, color: muted}}>đồng một lít</div>
      <div
        style={{
          marginTop: 28,
          fontSize: 64,
          fontWeight: 800,
          color: down,
          lineHeight: 1,
        }}
      >
        {delta}
      </div>
    </div>
  );
};

export const GasolineScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={cream}>
      <Kicker color={red} frame={frame}>
        Giá trần mới
      </Kicker>
      <div style={{display: "flex", gap: 72, marginTop: 48, flex: 1}}>
        <Column
          frame={frame}
          start={at(cueFrames, 0)}
          name="E10 RON 95-III"
          price="25.210"
          delta="−1.810"
        />
        <div style={{width: 2, backgroundColor: ink, opacity: 0.15}} />
        <Column
          frame={frame}
          start={at(cueFrames, 1)}
          name="E5 RON 92"
          price="25.360"
          delta="−1.610"
        />
      </div>
    </Stage>
  );
};
