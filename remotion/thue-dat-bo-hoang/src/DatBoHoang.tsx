import {linearTiming, TransitionSeries} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {useVideoConfig} from "remotion";
import {MinisterScene} from "./scenes/MinisterScene";
import {ReviewScene} from "./scenes/ReviewScene";
import {RuleScene} from "./scenes/RuleScene";
import {SourceScene} from "./scenes/SourceScene";
import {ThresholdScene} from "./scenes/ThresholdScene";
import {TimelineScene} from "./scenes/TimelineScene";
import {TitleScene} from "./scenes/TitleScene";

export const DatBoHoang = () => {
  const {fps} = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Mở đầu" durationInFrames={5 * fps}>
        <TitleScene
          name="Mở đầu"
          style={{
            backgroundColor: "#16130F",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 15})}
      />
      <TransitionSeries.Sequence name="Mức thuế" durationInFrames={6 * fps}>
        <RuleScene
          name="Mức thuế"
          style={{
            backgroundColor: "#F3EEE4",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 15})}
      />
      <TransitionSeries.Sequence name="Bộ trưởng" durationInFrames={6 * fps}>
        <MinisterScene
          name="Bộ trưởng"
          style={{
            backgroundColor: "#16130F",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 15})}
      />
      <TransitionSeries.Sequence name="Thu hồi" durationInFrames={7 * fps}>
        <ThresholdScene
          name="Thu hồi"
          style={{
            backgroundColor: "#16130F",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 15})}
      />
      <TransitionSeries.Sequence name="Thẩm tra" durationInFrames={7 * fps}>
        <ReviewScene
          name="Thẩm tra"
          style={{
            backgroundColor: "#C4A46A",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 15})}
      />
      <TransitionSeries.Sequence name="Lộ trình" durationInFrames={6 * fps}>
        <TimelineScene
          name="Lộ trình"
          style={{
            backgroundColor: "#F3EEE4",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 15})}
      />
      <TransitionSeries.Sequence name="Nguồn" durationInFrames={4 * fps}>
        <SourceScene
          name="Nguồn"
          style={{
            backgroundColor: "#16130F",
            overflow: "hidden",
          }}
        />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
