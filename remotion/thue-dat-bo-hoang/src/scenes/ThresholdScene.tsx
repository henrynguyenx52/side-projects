import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {fontFamily} from "../fonts";

const ThresholdSceneInner = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "140px 140px",
      }}
    >
      <Interactive.Div
        name="Định nghĩa"
        style={{
          fontFamily,
          fontSize: 40,
          fontWeight: 400,
          color: "#D9D0C3",
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Đất Nhà nước giao, cho thuê mà không sử dụng liên tục
      </Interactive.Div>
      <div
        style={{
          display: "flex",
          gap: 64,
          marginTop: 36,
        }}
      >
        <div style={{flex: 1}}>
          <Interactive.Div
            name="24 tháng"
            style={{
              fontFamily,
              fontSize: 180,
              fontWeight: 800,
              color: "#C6A15A",
              lineHeight: 0.9,
              opacity: interpolate(frame, [4, 4 + fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
              translate: interpolate(
                frame,
                [4, 4 + fps],
                ["0px 40px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          >
            24 tháng
          </Interactive.Div>
          <Interactive.Div
            name="Đất nông nghiệp"
            style={{
              fontFamily,
              fontSize: 48,
              fontWeight: 700,
              color: "#F3EEE4",
              marginTop: 18,
            }}
          >
            Đất nông nghiệp bỏ hoang
          </Interactive.Div>
          <Interactive.Div
            name="Thu hồi nông nghiệp"
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 400,
              color: "#D9D0C3",
              lineHeight: 1.35,
              marginTop: 12,
            }}
          >
            Quá 24 tháng liên tục, bị phạt mà vẫn không dùng tiếp thì bị thu
            hồi.
          </Interactive.Div>
        </div>
        <div
          style={{
            width: 2,
            backgroundColor: "#3A342C",
          }}
        />
        <div style={{flex: 1}}>
          <Interactive.Div
            name="60 tháng"
            style={{
              fontFamily,
              fontSize: 180,
              fontWeight: 800,
              color: "#E7D7B1",
              lineHeight: 0.9,
              opacity: interpolate(frame, [12, 12 + fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
              translate: interpolate(
                frame,
                [12, 12 + fps],
                ["0px 40px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          >
            60 tháng
          </Interactive.Div>
          <Interactive.Div
            name="Đất dự án"
            style={{
              fontFamily,
              fontSize: 48,
              fontWeight: 700,
              color: "#F3EEE4",
              marginTop: 18,
            }}
          >
            Đất dự án chậm tiến độ
          </Interactive.Div>
          <Interactive.Div
            name="Thu hồi dự án"
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 400,
              color: "#D9D0C3",
              lineHeight: 1.35,
              marginTop: 12,
            }}
          >
            Nộp thêm một khoản tăng dần mỗi năm. Quá 60 tháng không khai thác
            thì bị thu hồi.
          </Interactive.Div>
        </div>
      </div>
    </div>
  );
};

export const ThresholdScene = Interactive.create({
  Component: ThresholdSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
