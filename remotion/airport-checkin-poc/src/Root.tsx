import {Composition} from "remotion";
import {AirportCheckIn} from "./AirportCheckIn";
import {fullJourneyDuration, fullJourneyFps, FullAirportJourney} from "./FullAirportJourney";
import {RiggedCheckInSample} from "./RiggedCheckInSample";

export const RemotionRoot = () => (
  <>
    <Composition id="FullAirportJourney" component={FullAirportJourney} durationInFrames={fullJourneyDuration} fps={fullJourneyFps} width={1920} height={1080} />
    <Composition id="AirportCheckIn" component={AirportCheckIn} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="RiggedCheckInSample" component={RiggedCheckInSample} durationInFrames={360} fps={30} width={1920} height={1080} />
  </>
);
