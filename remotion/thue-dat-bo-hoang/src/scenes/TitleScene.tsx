import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {fontFamily} from "../fonts";

const TitleSceneInner = () => {
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
        padding: "140px 150px",
      }}
    >
      <Interactive.Div
        name="Chuyên mục"
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 600,
          color: "#C6A15A",
          letterSpacing: 3,
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Kinh doanh · 23.10.2026
      </Interactive.Div>
      <div
        style={{
          width: interpolate(frame, [4, 22], [0, 180], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          height: 8,
          backgroundColor: "#8C1D2C",
          marginTop: 28,
        }}
      />
      <Interactive.Div
        name="Tỷ lệ thuế"
        style={{
          fontFamily,
          fontSize: 300,
          fontWeight: 800,
          color: "#F3EEE4",
          lineHeight: 0.9,
          marginTop: 28,
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
        name="Tiêu đề"
        style={{
          fontFamily,
          fontSize: 84,
          fontWeight: 700,
          color: "#F3EEE4",
          lineHeight: 1.15,
          marginTop: 12,
          opacity: interpolate(frame, [14, 14 + fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        thuế đề xuất với đất bỏ hoang
      </Interactive.Div>
      <Interactive.Div
        name="Không hạn mức"
        style={{
          fontFamily,
          fontSize: 48,
          fontWeight: 400,
          color: "#D9D0C3",
          marginTop: 28,
          opacity: interpolate(frame, [22, 22 + fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Không áp dụng hạn mức. Cả diện tích đều chịu thuế.
      </Interactive.Div>
    </div>
  );
};

export const TitleScene = Interactive.create({
  Component: TitleSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
