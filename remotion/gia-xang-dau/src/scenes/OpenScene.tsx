import {useCurrentFrame} from "remotion";
import {Kicker, SceneProps, Stage, at, cream, gold, ink, mist, rise} from "../ui";

export const OpenScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();
  const show = at(cueFrames, 0);

  return (
    <Stage background={ink}>
      <Kicker color={gold} frame={frame}>
        Kinh doanh · 22.10.2026
      </Kicker>
      <div
        style={{
          width: 180,
          height: 8,
          backgroundColor: "#8C1D2C",
          marginTop: 28,
          ...rise(frame, 4),
        }}
      />
      <div
        style={{
          marginTop: 36,
          fontSize: 42,
          fontWeight: 600,
          color: mist,
          ...rise(frame, show),
        }}
      >
        Mỗi lít xăng E10 giảm
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 128,
          fontWeight: 800,
          lineHeight: 0.92,
          color: cream,
          letterSpacing: -3,
          ...rise(frame, show),
        }}
      >
        −1.800đ
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 40,
          fontWeight: 400,
          color: mist,
          ...rise(frame, show + 6),
        }}
      >
        Từ 15 giờ ngày 22/10/2026
      </div>
    </Stage>
  );
};
