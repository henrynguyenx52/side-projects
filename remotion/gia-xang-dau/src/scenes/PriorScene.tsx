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
} from "../ui";

const Group = ({
  frame,
  start,
  amount,
  names,
}: {
  frame: number;
  start: number;
  amount: string;
  names: string;
}) => {
  return (
    <div
      style={{
        borderTop: "2px solid rgba(243,238,228,0.35)",
        paddingTop: 24,
        ...rise(frame, start),
      }}
    >
      <div
        style={{
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 0.9,
          color: gold,
          letterSpacing: -2,
        }}
      >
        {amount}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1.35,
          color: cream,
          maxWidth: 860,
        }}
      >
        {names}
      </div>
    </div>
  );
};

export const PriorScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={ink}>
      <Kicker color={gold} frame={frame}>
        Kỳ 15/10 · 14 đầu mối
      </Kicker>
      <div
        style={{
          marginTop: 20,
          fontSize: 36,
          color: mist,
          ...rise(frame, at(cueFrames, 1)),
        }}
      >
        Bán thấp hơn giá cơ sở 300–350 đồng mỗi lít, mỗi kilôgam.
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 36,
          marginTop: 48,
        }}
      >
        <Group
          frame={frame}
          start={at(cueFrames, 2)}
          amount="−350đ"
          names="PVOIL, Long Hưng, Trường An"
        />
        <Group
          frame={frame}
          start={at(cueFrames, 3)}
          amount="−300đ"
          names="Petrolimex và 10 đầu mối khác"
        />
      </div>
    </Stage>
  );
};
