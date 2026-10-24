import {Composition, Folder} from "remotion";
import {DatBoHoang} from "./DatBoHoang";
import {MinisterScene} from "./scenes/MinisterScene";
import {ReviewScene} from "./scenes/ReviewScene";
import {RuleScene} from "./scenes/RuleScene";
import {SourceScene} from "./scenes/SourceScene";
import {ThresholdScene} from "./scenes/ThresholdScene";
import {TimelineScene} from "./scenes/TimelineScene";
import {TitleScene} from "./scenes/TitleScene";

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="Dat-bo-hoang">
        <Composition
          id="DatBoHoang"
          component={DatBoHoang}
          durationInFrames={1140}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="MoDau"
          component={TitleScene}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#16130F",
              overflow: "hidden",
            },
          }}
        />
        <Composition
          id="MucThue"
          component={RuleScene}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#F3EEE4",
              overflow: "hidden",
            },
          }}
        />
        <Composition
          id="BoTruong"
          component={MinisterScene}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#16130F",
              overflow: "hidden",
            },
          }}
        />
        <Composition
          id="ThuHoi"
          component={ThresholdScene}
          durationInFrames={210}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#16130F",
              overflow: "hidden",
            },
          }}
        />
        <Composition
          id="ThamTra"
          component={ReviewScene}
          durationInFrames={210}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#C4A46A",
              overflow: "hidden",
            },
          }}
        />
        <Composition
          id="LoTrinh"
          component={TimelineScene}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#F3EEE4",
              overflow: "hidden",
            },
          }}
        />
        <Composition
          id="Nguon"
          component={SourceScene}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            style: {
              backgroundColor: "#16130F",
              overflow: "hidden",
            },
          }}
        />
      </Folder>
    </>
  );
};
