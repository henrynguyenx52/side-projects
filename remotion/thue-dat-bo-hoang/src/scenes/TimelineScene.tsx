import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {fontFamily} from "../fonts";

const TimelineSceneInner = () => {
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
        padding: "150px 130px",
      }}
    >
      <Interactive.Div
        name="Tiêu đề lộ trình"
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 600,
          color: "#8C1D2C",
        }}
      >
        Ba luật thuế
      </Interactive.Div>
      <Interactive.Div
        name="Câu lộ trình"
        style={{
          fontFamily,
          fontSize: 72,
          fontWeight: 800,
          color: "#16130F",
          marginTop: 8,
          opacity: interpolate(frame, [0, fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Lộ trình còn lại
      </Interactive.Div>
      <div
        style={{
          display: "flex",
          marginTop: 72,
          gap: 28,
        }}
      >
        <div
          style={{
            flex: 1,
            opacity: interpolate(frame, [8, 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [8, 24], ["0px 28px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              height: 8,
              backgroundColor: "#16130F",
              marginBottom: 28,
            }}
          />
          <Interactive.Div
            name="23.10"
            style={{
              fontFamily,
              fontSize: 84,
              fontWeight: 800,
              color: "#16130F",
              lineHeight: 1,
            }}
          >
            23.10
          </Interactive.Div>
          <Interactive.Div
            name="Thảo luận tổ"
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 600,
              color: "#5E584F",
              lineHeight: 1.3,
              marginTop: 16,
            }}
          >
            Thảo luận tại tổ
          </Interactive.Div>
        </div>
        <div
          style={{
            flex: 1,
            opacity: interpolate(frame, [14, 28], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [14, 30], ["0px 28px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              height: 8,
              backgroundColor: "#16130F",
              marginBottom: 28,
            }}
          />
          <Interactive.Div
            name="06.11"
            style={{
              fontFamily,
              fontSize: 84,
              fontWeight: 800,
              color: "#16130F",
              lineHeight: 1,
            }}
          >
            06.11
          </Interactive.Div>
          <Interactive.Div
            name="Nghị trường"
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 600,
              color: "#5E584F",
              lineHeight: 1.3,
              marginTop: 16,
            }}
          >
            Nghị trường
          </Interactive.Div>
        </div>
        <div
          style={{
            flex: 1,
            opacity: interpolate(frame, [20, 34], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [20, 36], ["0px 28px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              height: 8,
              backgroundColor: "#16130F",
              marginBottom: 28,
            }}
          />
          <Interactive.Div
            name="20.11"
            style={{
              fontFamily,
              fontSize: 84,
              fontWeight: 800,
              color: "#16130F",
              lineHeight: 1,
            }}
          >
            20.11
          </Interactive.Div>
          <Interactive.Div
            name="Nếu thông qua"
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 600,
              color: "#5E584F",
              lineHeight: 1.3,
              marginTop: 16,
            }}
          >
            Nếu thông qua
          </Interactive.Div>
        </div>
        <div
          style={{
            flex: 1,
            opacity: interpolate(frame, [26, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [26, 42], ["0px 28px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              height: 8,
              backgroundColor: "#8C1D2C",
              marginBottom: 28,
            }}
          />
          <Interactive.Div
            name="2027"
            style={{
              fontFamily,
              fontSize: 84,
              fontWeight: 800,
              color: "#8C1D2C",
              lineHeight: 1,
            }}
          >
            2027
          </Interactive.Div>
          <Interactive.Div
            name="Hiệu lực"
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 600,
              color: "#5E584F",
              lineHeight: 1.3,
              marginTop: 16,
            }}
          >
            Có hiệu lực
          </Interactive.Div>
        </div>
      </div>
    </div>
  );
};

export const TimelineScene = Interactive.create({
  Component: TimelineSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
