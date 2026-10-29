import {useCurrentFrame} from "remotion";
import {Kicker, SceneProps, Stage, at, cream, gold, ink, mist, rise} from "../ui";

export const SourceScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();
  const show = at(cueFrames, 0);

  return (
    <Stage background={ink}>
      <Kicker color={gold} frame={frame} start={show}>
        Tóm tắt từ VnExpress Kinh doanh
      </Kicker>
      <div
        style={{
          marginTop: 28,
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.15,
          color: cream,
          ...rise(frame, show),
        }}
      >
        Giá xăng E10 giảm hơn 1.800 đồng một lít
      </div>
      <div
        style={{
          marginTop: 32,
          fontSize: 40,
          color: mist,
          ...rise(frame, show + 8),
        }}
      >
        Phương Dung · 22/10/2026
      </div>
    </Stage>
  );
};
