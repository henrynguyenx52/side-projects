import {linearTiming, TransitionSeries} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {useVideoConfig, Interactive} from "remotion";
import {Booths} from "./Booths";
import {Crates} from "./Crates";
import {Opening} from "./Opening";
import {Visit} from "./Visit";

export const RecordStorePromo = () => {
  const {fps} = useVideoConfig();

  return (
    <>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Opening" durationInFrames={4 * fps}>
          <Opening
            name="Opening"
            style={{
              backgroundColor: "#140F0C",
            }}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: 0.6 * fps})}
        />
        <TransitionSeries.Sequence name="Crates" durationInFrames={5 * fps}>
          <Crates
            name="Crates"
            style={{
              backgroundColor: "#F4EBDD",
            }}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: 0.6 * fps})}
        />
        <TransitionSeries.Sequence name="Booths" durationInFrames={5 * fps}>
          <Booths
            name="Booths"
            style={{
              backgroundColor: "#140F0C",
            }}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: 0.6 * fps})}
        />
        <TransitionSeries.Sequence name="Visit" durationInFrames={6 * fps}>
          <Visit
            name="Visit"
            style={{
              backgroundColor: "#140F0C",
            }}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Interactive.Div
        name="Text"
        style={{
          position: "absolute",
          translate: "465.7px 913.5px",
          fontFamily: "sans-serif",
          fontSize: 81,
          color: "white"
        }}
      >Text</Interactive.Div>
    </>
  );
};
