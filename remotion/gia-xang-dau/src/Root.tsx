import {Composition} from "remotion";
import {GiaXangDau} from "./GiaXangDau";
import {durationInFrames, fps} from "./timeline";

export const RemotionRoot = () => {
  return (
    <Composition
      id="GiaXangDau"
      component={GiaXangDau}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1920}
      height={1080}
    />
  );
};
