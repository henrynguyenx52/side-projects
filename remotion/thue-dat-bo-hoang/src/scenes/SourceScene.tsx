import {Interactive, interpolate, useCurrentFrame} from "remotion";
import {fontFamily} from "../fonts";

const SourceSceneInner = () => {
  const frame = useCurrentFrame();

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
        name="Nhãn nguồn"
        style={{
          fontFamily,
          fontSize: 32,
          fontWeight: 600,
          color: "#C6A15A",
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Tóm tắt từ VnExpress Kinh doanh
      </Interactive.Div>
      <Interactive.Div
        name="Tên bài"
        style={{
          fontFamily,
          fontSize: 72,
          fontWeight: 800,
          color: "#F3EEE4",
          lineHeight: 1.15,
          marginTop: 18,
        }}
      >
        Chính phủ đề xuất
      </Interactive.Div>
      <Interactive.Div
        name="Tên bài dòng hai"
        style={{
          fontFamily,
          fontSize: 72,
          fontWeight: 800,
          color: "#F3EEE4",
          lineHeight: 1.15,
          marginTop: 4,
        }}
      >
        áp thuế 0,2% với đất bỏ hoang
      </Interactive.Div>
      <Interactive.Div
        name="Tác giả"
        style={{
          fontFamily,
          fontSize: 40,
          fontWeight: 400,
          color: "#D9D0C3",
          marginTop: 28,
        }}
      >
        Anh Tú · 23/10/2026
      </Interactive.Div>
      <Interactive.Div
        name="Nguồn ảnh"
        style={{
          fontFamily,
          fontSize: 32,
          fontWeight: 400,
          color: "#A39888",
          marginTop: 12,
        }}
      >
        Ảnh: Cổng thông tin điện tử Quốc hội
      </Interactive.Div>
    </div>
  );
};

export const SourceScene = Interactive.create({
  Component: SourceSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
