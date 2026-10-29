import {Composition} from "remotion";
import {LamTrangDa} from "./LamTrangDa";
import {durationInFrames, fps} from "./timeline";

export const RemotionRoot = () => {
  return (
    <Composition
      id="LamTrangDa"
      component={LamTrangDa}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1080}
      height={1920}
    />
  );
};
