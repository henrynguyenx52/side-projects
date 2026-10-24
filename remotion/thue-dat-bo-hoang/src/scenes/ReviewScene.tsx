import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {fontFamily} from "../fonts";

const ReviewSceneInner = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  return (
    <>
      <CanvasImage
        name="Ảnh Phan Văn Mãi"
        src={staticFile("phan-van-mai.jpg")}
        fit="cover"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          scale: interpolate(frame, [0, durationInFrames], [1.04, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 860,
          backgroundColor: "#F3EEE4",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 72px 80px 64px",
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0, fps], ["48px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Interactive.Div
          name="Cơ quan thẩm tra"
          style={{
            fontFamily,
            fontSize: 28,
            fontWeight: 600,
            color: "#8C1D2C",
          }}
        >
          Báo cáo thẩm tra
        </Interactive.Div>
        <Interactive.Div
          name="Tên chủ nhiệm"
          style={{
            fontFamily,
            fontSize: 64,
            fontWeight: 800,
            color: "#16130F",
            lineHeight: 1.05,
            marginTop: 12,
          }}
        >
          Phan Văn Mãi
        </Interactive.Div>
        <Interactive.Div
          name="Chức danh"
          style={{
            fontFamily,
            fontSize: 30,
            fontWeight: 400,
            color: "#5E584F",
            lineHeight: 1.3,
            marginTop: 8,
          }}
        >
          Chủ nhiệm Ủy ban Kinh tế và Tài chính
        </Interactive.Div>
        <div
          style={{
            height: 2,
            backgroundColor: "#16130F",
            margin: "28px 0",
            width: 120,
          }}
        />
        <Interactive.Div
          name="Tác động ngân sách"
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: "#16130F",
            lineHeight: 1.25,
          }}
        >
          Chưa đánh giá được tiền thuế thu về
        </Interactive.Div>
        <Interactive.Div
          name="Bất khả kháng"
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: "#16130F",
            lineHeight: 1.25,
            marginTop: 18,
          }}
        >
          Chưa loại trừ bất khả kháng
        </Interactive.Div>
        <Interactive.Div
          name="Dự án phân kỳ"
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: "#16130F",
            lineHeight: 1.25,
            marginTop: 6,
          }}
        >
          và dự án đầu tư phân kỳ
        </Interactive.Div>
        <Interactive.Div
          name="Mâu thuẫn 0,15%"
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: "#16130F",
            lineHeight: 1.25,
            marginTop: 18,
          }}
        >
          Luật hiện hành: 0,15% với đất dùng sai
        </Interactive.Div>
        <Interactive.Div
          name="Đề nghị"
          style={{
            fontFamily,
            fontSize: 30,
            fontWeight: 400,
            color: "#5E584F",
            lineHeight: 1.35,
            marginTop: 22,
          }}
        >
          Cần khớp khái niệm với Luật Đất đai và không thu trùng nghĩa vụ tài
          chính.
        </Interactive.Div>
      </div>
    </>
  );
};

export const ReviewScene = Interactive.create({
  Component: ReviewSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
