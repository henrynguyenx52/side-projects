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

const MinisterSceneInner = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  return (
    <>
      <CanvasImage
        name="Ảnh Ngô Văn Tuấn"
        src={staticFile("ngo-van-tuan.jpg")}
        fit="cover"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          scale: interpolate(frame, [0, durationInFrames], [1, 1.06], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: "0px 30px",
        }}
      />
      <Interactive.Div
        name="Nguồn ảnh"
        style={{
          position: "absolute",
          top: 40,
          left: 48,
          fontFamily,
          fontSize: 26,
          fontWeight: 600,
          color: "#F7F3EA",
          textShadow: "0px 2px 12px rgba(22, 19, 15, 0.6)",
        }}
      >
        Ảnh: Cổng thông tin điện tử Quốc hội
      </Interactive.Div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 430,
          backgroundColor: "#16130F",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 150px 70px",
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0, fps], ["0px 36px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <Interactive.Div
          name="Bối cảnh"
          style={{
            fontFamily,
            fontSize: 32,
            fontWeight: 600,
            color: "#C6A15A",
          }}
        >
          Sáng 23/10 · Quốc hội
        </Interactive.Div>
        <Interactive.Div
          name="Tên bộ trưởng"
          style={{
            fontFamily,
            fontSize: 84,
            fontWeight: 800,
            color: "#F3EEE4",
            lineHeight: 1.05,
            marginTop: 8,
          }}
        >
          Ngô Văn Tuấn
        </Interactive.Div>
        <Interactive.Div
          name="Vai trò"
          style={{
            fontFamily,
            fontSize: 40,
            fontWeight: 400,
            color: "#D9D0C3",
            marginTop: 10,
          }}
        >
          Bộ trưởng Tài chính, thừa ủy quyền Thủ tướng, trình sửa ba luật thuế.
        </Interactive.Div>
        <Interactive.Div
          name="Ba luật"
          style={{
            fontFamily,
            fontSize: 34,
            fontWeight: 600,
            color: "#F3EEE4",
            marginTop: 18,
          }}
        >
          Doanh nghiệp · Đất phi nông nghiệp · Thu nhập cá nhân
        </Interactive.Div>
      </div>
    </>
  );
};

export const MinisterScene = Interactive.create({
  Component: MinisterSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
