import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {fontFamily} from "../fonts";

const RuleSceneInner = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        padding: "150px 140px",
        gap: 80,
      }}
    >
      <div
        style={{
          width: 620,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <Interactive.Div
          name="Nhãn thuế suất"
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: 600,
            color: "#8C1D2C",
          }}
        >
          Áp trên toàn bộ diện tích
        </Interactive.Div>
        <Interactive.Div
          name="Tỷ lệ 0,2%"
          style={{
            fontFamily,
            fontSize: 220,
            fontWeight: 800,
            color: "#16130F",
            lineHeight: 0.9,
            marginTop: 12,
            opacity: interpolate(frame, [0, fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [0, fps], ["0px 36px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          0,2%
        </Interactive.Div>
        <Interactive.Div
          name="Không ngưỡng thấp"
          style={{
            fontFamily,
            fontSize: 40,
            fontWeight: 400,
            color: "#5E584F",
            lineHeight: 1.35,
            marginTop: 28,
          }}
        >
          Phần trong hạn mức cũng không được hưởng thuế suất thấp hơn.
        </Interactive.Div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            borderTop: "2px solid #16130F",
            paddingTop: 22,
            opacity: interpolate(frame, [8, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [8, 22], ["24px 0px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Interactive.Div
            name="Bỏ hoang"
            style={{
              fontFamily,
              fontSize: 52,
              fontWeight: 700,
              color: "#16130F",
              lineHeight: 1.15,
            }}
          >
            Bỏ hoang
          </Interactive.Div>
          <Interactive.Div
            name="Giải thích bỏ hoang"
            style={{
              fontFamily,
              fontSize: 32,
              fontWeight: 400,
              color: "#5E584F",
              marginTop: 8,
            }}
          >
            Đất đã giao hoặc cho thuê rồi để không
          </Interactive.Div>
        </div>
        <div
          style={{
            borderTop: "2px solid #16130F",
            paddingTop: 22,
            opacity: interpolate(frame, [16, 28], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [16, 30], ["24px 0px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Interactive.Div
            name="Không đưa vào sử dụng"
            style={{
              fontFamily,
              fontSize: 52,
              fontWeight: 700,
              color: "#16130F",
              lineHeight: 1.15,
            }}
          >
            Không đưa vào sử dụng
          </Interactive.Div>
          <Interactive.Div
            name="Giải thích không sử dụng"
            style={{
              fontFamily,
              fontSize: 32,
              fontWeight: 400,
              color: "#5E584F",
              marginTop: 8,
            }}
          >
            Có đất nhưng không khai thác
          </Interactive.Div>
        </div>
        <div
          style={{
            borderTop: "2px solid #16130F",
            paddingTop: 22,
            opacity: interpolate(frame, [24, 36], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [24, 38], ["24px 0px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Interactive.Div
            name="Chậm đưa vào sử dụng"
            style={{
              fontFamily,
              fontSize: 52,
              fontWeight: 700,
              color: "#16130F",
              lineHeight: 1.15,
            }}
          >
            Chậm đưa vào sử dụng
          </Interactive.Div>
          <Interactive.Div
            name="Giải thích chậm sử dụng"
            style={{
              fontFamily,
              fontSize: 32,
              fontWeight: 400,
              color: "#5E584F",
              marginTop: 8,
            }}
          >
            Đưa vào dùng muộn hơn quy định
          </Interactive.Div>
        </div>
      </div>
    </div>
  );
};

export const RuleScene = Interactive.create({
  Component: RuleSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
