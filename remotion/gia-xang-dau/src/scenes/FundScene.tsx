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

export const FundScene = ({cueFrames}: SceneProps) => {
  const frame = useCurrentFrame();

  return (
    <Stage background={ink}>
      <Kicker color={gold} frame={frame}>
        Quỹ bình ổn giá
      </Kicker>
      <div style={{marginTop: 28, ...rise(frame, at(cueFrames, 0))}}>
        <div
          style={{
            fontSize: 160,
            fontWeight: 800,
            lineHeight: 0.9,
            color: gold,
            letterSpacing: -3,
          }}
        >
          300đ
        </div>
        <div style={{marginTop: 12, fontSize: 40, color: cream}}>
          trích mỗi lít xăng sinh học
        </div>
      </div>
      <div
        style={{
          marginTop: 48,
          paddingTop: 28,
          borderTop: "2px solid rgba(243,238,228,0.28)",
          fontSize: 44,
          fontWeight: 700,
          color: mist,
          maxWidth: "100%",
          ...rise(frame, at(cueFrames, 1)),
        }}
      >
        Ngừng sử dụng quỹ với các mặt hàng còn lại.
      </div>
    </Stage>
  );
};
