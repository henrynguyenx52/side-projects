import {Composition} from "remotion";
import {TriHoiNach} from "./TriHoiNach";
import {durationInFrames, fps} from "./timeline";

export const RemotionRoot = () => {
  return (
    <Composition
      id="TriHoiNach"
      component={TriHoiNach}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1080}
      height={1920}
    />
  );
};
