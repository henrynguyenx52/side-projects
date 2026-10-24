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

const Price = ({
  frame,
  start,
  name,
  range,
}: {
  frame: number;
  start: number;
  name: string;
  range: string;
}) => {
  return (
    <div
      style={{
        flex: 1,
        borderTop: `2px solid ${ink}`,
        paddingTop: 22,
        ...rise(frame, start),
      }}
    >
      <div style={{fontSize: 32, fontWeight: 600, color: red}}>{name}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: 52,
          fontWeight: 800,
          color: ink,
          letterSpacing: -1,
        }}
      >
        {range}
      </div>
      <div style={{marginTop: 6, fontSize: 26, color: muted}}>đồng một lít</div>
    </div>
  );
};

export const RetailScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={cream}>
      <Kicker color={red} frame={frame}>
        Giá bán thực tế
      </Kicker>
      <div style={{marginTop: 28, ...rise(frame, at(cueFrames, 0))}}>
        <div style={{fontSize: 36, fontWeight: 600, color: muted}}>
          Petrolimex · PVOIL
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 0.95,
            color: down,
            letterSpacing: -2,
          }}
        >
          −300 đến −350đ
        </div>
        <div style={{marginTop: 8, fontSize: 32, color: ink}}>
          so với giá trần, mỗi lít
        </div>
      </div>
      <div style={{display: "flex", gap: 48, marginTop: 42}}>
        <Price
          frame={frame}
          start={at(cueFrames, 1)}
          name="E10"
          range="24.860 – 24.910"
        />
        <Price
          frame={frame}
          start={at(cueFrames, 2)}
          name="E5"
          range="25.010 – 25.060"
        />
      </div>
      <div
        style={{
          marginTop: 36,
          fontSize: 36,
          fontWeight: 700,
          color: ink,
          ...rise(frame, at(cueFrames, 3)),
        }}
      >
        Giữ đến ngày 29/10
      </div>
    </Stage>
  );
};
