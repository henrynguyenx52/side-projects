import type {ReactNode} from "react";
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from "remotion";

const FPS = 30;
const SCENE_FRAMES = 270;
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const navy = "#0E1835";
const blue = "#4267D8";
const aqua = "#70E0DC";
const gold = "#FFD276";

type Scene = {
  image: string;
  step: string;
  title: string;
  speaker1: string;
  line1: ReactNode;
  speaker2: string;
  line2: ReactNode;
  tip: string;
  pan: "left" | "right";
};

const scenes: Scene[] = [
  {image: "01-entering-airport.png", step: "01", title: "Entering the airport", speaker1: "TRAVELER", line1: <>Excuse me, where is the <Key>check-in area</Key>?</>, speaker2: "AIRPORT STAFF", line2: <>Follow the signs to the departure hall.</>, tip: "Look for DEPARTURES and your airline.", pan: "right"},
  {image: "airport-checkin-modern-v1.png", step: "02", title: "Checking in", speaker1: "AGENT", line1: <>May I see your <Key>passport</Key>, please?</>, speaker2: "TRAVELER", line2: <>Certainly. <Key>Here you are.</Key></>, tip: "Keep your passport and booking ready.", pan: "left"},
  {image: "03-security.png", step: "03", title: "Going through security", speaker1: "OFFICER", line1: <>Please place your belongings <Key>in the tray</Key>.</>, speaker2: "TRAVELER", line2: <>Should I take out my laptop?</>, tip: "Liquids and electronics may need separate screening.", pan: "left"},
  {image: "04-departure-immigration.png", step: "04", title: "Passport control", speaker1: "OFFICER", line1: <>What is the purpose of your trip?</>, speaker2: "TRAVELER", line2: <>I'm traveling for <Key>tourism</Key>.</>, tip: "Answer clearly and keep your documents ready.", pan: "left"},
  {image: "05-boarding.png", step: "05", title: "Boarding the flight", speaker1: "GATE AGENT", line1: <>May I see your boarding pass?</>, speaker2: "TRAVELER", line2: <>Of course. <Key>Here it is.</Key></>, tip: "Check your gate and boarding time.", pan: "left"},
  {image: "06-on-plane.png", step: "06", title: "On the airplane", speaker1: "FLIGHT ATTENDANT", line1: <>Would you like any help with your bag?</>, speaker2: "TRAVELER", line2: <>No, thank you. <Key>I've got it.</Key></>, tip: "Stow your bag and fasten your seat belt.", pan: "right"},
  {image: "07-arrival-immigration.png", step: "07", title: "Arriving at passport control", speaker1: "OFFICER", line1: <>How long will you be staying?</>, speaker2: "TRAVELER", line2: <>I'll be staying for <Key>one week</Key>.</>, tip: "Be ready to state your plans and accommodation.", pan: "left"},
  {image: "08-baggage-claim.png", step: "08", title: "Collecting your luggage", speaker1: "TRAVELER", line1: <>Which carousel is for Flight 216?</>, speaker2: "AIRPORT STAFF", line2: <>Your bags will arrive at <Key>carousel five</Key>.</>, tip: "Check the baggage screen for your flight.", pan: "left"},
  {image: "09-customs.png", step: "09", title: "Going through customs", speaker1: "CUSTOMS OFFICER", line1: <>Do you have anything to declare?</>, speaker2: "TRAVELER", line2: <>No, <Key>nothing to declare</Key>.</>, tip: "Choose the correct customs channel.", pan: "left"},
  {image: "10-destination-exit.png", step: "10", title: "Welcome to your destination", speaker1: "TRAVELER", line1: <>I've arrived. Now, where can I get a taxi?</>, speaker2: "LESSON COMPLETE", line2: <>You made it <Key>from departure to destination!</Key></>, tip: "You now know the essential airport English.", pan: "right"},
];

function Key({children}: {children: ReactNode}) {
  return <span style={{color: gold, fontWeight: 850}}>{children}</span>;
}

const fadeWindow = (frame: number, points: [number, number, number, number]) =>
  interpolate(frame, points, [0, 1, 1, 0], clamp);

const SpeechCard = ({speaker, children, opacity}: {speaker: string; children: ReactNode; opacity: number}) => (
  <div style={{opacity, transform: `translateY(${(1 - opacity) * 20}px)`, width: 650}}>
    <div style={{display: "inline-flex", background: blue, color: "white", borderRadius: "12px 12px 0 0", padding: "9px 18px", marginLeft: 25, fontSize: 17, fontWeight: 850, letterSpacing: 2.5}}>{speaker}</div>
    <div style={{background: "linear-gradient(135deg, rgba(255,255,255,.95), rgba(245,248,255,.86))", border: "1.5px solid rgba(255,255,255,.8)", borderRadius: 24, padding: "25px 31px 28px", boxShadow: "0 25px 70px rgba(12,25,66,.25)", backdropFilter: "blur(18px)", color: navy, fontSize: 40, fontWeight: 630, lineHeight: 1.22}}>{children}</div>
  </div>
);

const SceneView = ({scene, index, localFrame}: {scene: Scene; index: number; localFrame: number}) => {
  const sceneOpacity = interpolate(localFrame, [0, 15, SCENE_FRAMES - 18, SCENE_FRAMES], [0, 1, 1, 0], clamp);
  const zoom = interpolate(localFrame, [0, SCENE_FRAMES], [1.01, 1.085], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const direction = scene.pan === "left" ? -1 : 1;
  const panX = interpolate(localFrame, [0, SCENE_FRAMES], [direction * -18, direction * 26], clamp);
  const titleOpacity = fadeWindow(localFrame, [9, 22, 57, 74]);
  const firstOpacity = fadeWindow(localFrame, [51, 67, 128, 143]);
  const secondOpacity = fadeWindow(localFrame, [139, 154, 218, 232]);
  const tipOpacity = fadeWindow(localFrame, [220, 232, 255, 269]);

  return (
    <AbsoluteFill style={{opacity: sceneOpacity, overflow: "hidden"}}>
      <Img src={staticFile(`assets/${scene.image}`)} style={{position: "absolute", inset: -30, width: "calc(100% + 60px)", height: "calc(100% + 60px)", objectFit: "cover", transform: `translateX(${panX}px) scale(${zoom})`, filter: "saturate(1.04) contrast(1.015)"}} />
      <div style={{position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,17,47,.3), rgba(20,32,73,.04) 48%, rgba(8,17,47,.08))"}} />

      <div style={{position: "absolute", left: 72, right: 72, top: 45, display: "flex", alignItems: "center", justifyContent: "space-between", color: "white"}}>
        <div style={{display: "flex", alignItems: "center", gap: 16}}>
          <div style={{width: 53, height: 53, borderRadius: 15, display: "grid", placeItems: "center", background: "rgba(12,25,62,.86)", border: "1px solid rgba(255,255,255,.28)", fontSize: 21, fontWeight: 900}}>{scene.step}</div>
          <div style={{fontSize: 18, letterSpacing: 4.2, fontWeight: 850, textShadow: "0 2px 12px rgba(0,0,0,.3)"}}>AIRPORT ENGLISH</div>
        </div>
        <div style={{display: "flex", gap: 7}}>{scenes.map((_, i) => <div key={i} style={{width: i === index ? 34 : 8, height: 8, borderRadius: 8, background: i === index ? aqua : "rgba(255,255,255,.5)"}} />)}</div>
      </div>

      <div style={{position: "absolute", left: 83, top: 135, opacity: titleOpacity, transform: `translateY(${(1 - titleOpacity) * 20}px)`, color: "white", textShadow: "0 3px 20px rgba(4,12,39,.5)"}}>
        <div style={{fontSize: 62, fontWeight: 820, letterSpacing: -1.8}}>{scene.title}</div>
        <div style={{marginTop: 15, width: 90, height: 7, borderRadius: 8, background: aqua}} />
      </div>

      <div style={{position: "absolute", left: 82, top: 160}}>
        <SpeechCard speaker={scene.speaker1} opacity={firstOpacity}>{scene.line1}</SpeechCard>
        <div style={{position: "absolute", left: 0, top: 0}}><SpeechCard speaker={scene.speaker2} opacity={secondOpacity}>{scene.line2}</SpeechCard></div>
      </div>

      <div style={{position: "absolute", left: 280, right: 280, bottom: 45, opacity: Math.max(firstOpacity, secondOpacity), transform: `translateY(${(1 - Math.max(firstOpacity, secondOpacity)) * 25}px)`, background: "linear-gradient(110deg, rgba(9,20,51,.94), rgba(31,51,104,.91))", color: "white", border: "1px solid rgba(255,255,255,.25)", borderRadius: 24, padding: "21px 34px 24px", textAlign: "center", fontSize: 35, boxShadow: "0 20px 55px rgba(5,12,35,.32)"}}>
        {firstOpacity >= secondOpacity ? scene.line1 : scene.line2}
      </div>

      <div style={{position: "absolute", left: 50, right: 50, bottom: 40, opacity: tipOpacity, display: "flex", justifyContent: "center"}}>
        <div style={{padding: "18px 29px", borderRadius: 99, background: "rgba(255,248,232,.95)", color: navy, fontSize: 25, fontWeight: 760, boxShadow: "0 18px 45px rgba(8,20,57,.22)"}}><span style={{color: blue, fontWeight: 900, marginRight: 12}}>TRAVEL TIP</span>{scene.tip}</div>
      </div>
    </AbsoluteFill>
  );
};

export const FullAirportJourney = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: navy, fontFamily: "Inter, Arial, Helvetica, sans-serif"}}>
      {scenes.map((scene, index) => {
        const localFrame = frame - index * SCENE_FRAMES;
        if (localFrame < -1 || localFrame > SCENE_FRAMES + 1) return null;
        return <SceneView key={scene.step} scene={scene} index={index} localFrame={localFrame} />;
      })}
    </AbsoluteFill>
  );
};

export const fullJourneyDuration = scenes.length * SCENE_FRAMES;
export const fullJourneyFps = FPS;
