import type {ReactNode} from "react";
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ink = "#101A37";
const blue = "#4165D7";
const cyan = "#75E5E0";

const fadeWindow = (frame: number, start: number, hold: number, end: number) =>
  interpolate(frame, [start, start + 12, hold, end], [0, 1, 1, 0], clamp);

const Dialogue = ({side, label, children, opacity}: {side: "left" | "right"; label: string; children: ReactNode; opacity: number}) => (
  <div style={{position: "absolute", top: 94, left: side === "left" ? 92 : undefined, right: side === "right" ? 92 : undefined, width: 650, opacity, transform: `translateY(${(1 - opacity) * 24}px) scale(${0.96 + opacity * 0.04})`}}>
    <div style={{display: "inline-block", marginLeft: 28, marginBottom: -1, padding: "10px 18px", borderRadius: "13px 13px 0 0", background: blue, color: "white", fontSize: 18, fontWeight: 800, letterSpacing: 2.8}}>{label}</div>
    <div style={{padding: "27px 33px 30px", border: "1.5px solid rgba(255,255,255,.78)", borderRadius: 25, background: "linear-gradient(135deg, rgba(255,255,255,.94), rgba(246,248,255,.82))", boxShadow: "0 24px 70px rgba(25,43,99,.22), inset 0 1px 0 white", backdropFilter: "blur(18px)", color: ink, fontSize: 42, fontWeight: 620, lineHeight: 1.22}}>{children}</div>
  </div>
);

const LessonCaption = ({opacity, children}: {opacity: number; children: ReactNode}) => (
  <div style={{position: "absolute", left: 245, right: 245, bottom: 48, opacity, transform: `translateY(${(1 - opacity) * 28}px)`, padding: "23px 38px 25px", border: "1px solid rgba(255,255,255,.32)", borderRadius: 25, background: "linear-gradient(110deg, rgba(11,23,54,.94), rgba(33,53,104,.9))", boxShadow: "0 20px 55px rgba(8,16,42,.28)", color: "white", textAlign: "center", fontSize: 38, lineHeight: 1.25}}>{children}</div>
);

export const AirportCheckIn = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const intro = spring({frame, fps, config: {damping: 18, stiffness: 80}});
  const introOut = interpolate(frame, [42, 61], [1, 0], clamp);
  const agent = fadeWindow(frame, 69, 151, 168);
  const passenger = fadeWindow(frame, 171, 245, 260);
  const recap = interpolate(frame, [265, 282], [0, 1], clamp);
  const zoom = interpolate(frame, [0, 264], [1.02, 1.11], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const panX = interpolate(frame, [0, 264], [0, -36], clamp);
  const panY = interpolate(frame, [0, 264], [0, 16], clamp);
  const passportPulse = 0.72 + Math.sin(frame * 0.14) * 0.18;
  const focus = interpolate(frame, [54, 80], [0, 1], clamp);

  return (
    <AbsoluteFill style={{overflow: "hidden", background: "#CCD4F5", fontFamily: "Inter, Arial, Helvetica, sans-serif"}}>
      <Img src={staticFile("assets/airport-checkin-modern-v1.png")} style={{position: "absolute", left: -24, top: -12, width: "calc(100% + 48px)", height: "calc(100% + 24px)", objectFit: "cover", transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, filter: `saturate(${1.02 + focus * 0.06}) contrast(${1.01 + focus * 0.025})`}} />
      <div style={{position: "absolute", inset: 0, background: `radial-gradient(circle at 63% 42%, rgba(255,255,255,0) 0 24%, rgba(31,42,95,${focus * 0.14}) 66%, rgba(17,27,62,${focus * 0.25}) 100%)`}} />
      <div style={{position: "absolute", left: 1144, top: 350, width: 65, height: 48, borderRadius: 9, border: `3px solid rgba(255,230,157,${agent * passportPulse})`, boxShadow: `0 0 0 8px rgba(255,220,125,${agent * 0.12}), 0 0 30px rgba(255,207,91,${agent * 0.55})`, opacity: agent, transform: `scale(${1 + Math.sin(frame * 0.14) * 0.025})`}} />

      <div style={{position: "absolute", left: 79, top: 70, opacity: intro * introOut, transform: `translateY(${(1 - intro) * -25}px)`, color: ink}}>
        <div style={{fontSize: 20, fontWeight: 850, letterSpacing: 5.5, color: blue}}>ENGLISH IN REAL LIFE</div>
        <div style={{fontSize: 68, fontWeight: 820, letterSpacing: -2, marginTop: 8}}>At the check-in counter</div>
        <div style={{width: 92, height: 7, borderRadius: 9, marginTop: 17, background: cyan}} />
      </div>

      <Dialogue label="CHECK-IN AGENT" side="left" opacity={agent}>May I see your <span style={{color: blue, fontWeight: 850}}>passport</span>, please?</Dialogue>
      <Dialogue label="PASSENGER" side="left" opacity={passenger}>Certainly. <span style={{color: "#087C82", fontWeight: 850}}>Here you are.</span></Dialogue>

      <LessonCaption opacity={agent}><span style={{color: cyan, fontWeight: 850, marginRight: 20}}>AGENT</span>May I see your <span style={{color: "#FFD778", fontWeight: 850}}>passport</span>, please?</LessonCaption>
      <LessonCaption opacity={passenger}><span style={{color: cyan, fontWeight: 850, marginRight: 20}}>PASSENGER</span>Certainly. <span style={{color: "#FFD778", fontWeight: 850}}>Here you are.</span></LessonCaption>

      <div style={{position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: recap, background: `linear-gradient(120deg, rgba(18,29,66,${recap * 0.88}), rgba(50,75,145,${recap * 0.78}))`, backdropFilter: `blur(${recap * 10}px)`}}>
        <div style={{textAlign: "center", color: "white", transform: `translateY(${(1 - recap) * 25}px)`}}>
          <div style={{fontSize: 19, fontWeight: 850, letterSpacing: 5, color: cyan}}>USEFUL PHRASE</div>
          <div style={{fontSize: 68, fontWeight: 760, marginTop: 17}}>May I see your passport, please?</div>
          <div style={{display: "inline-block", marginTop: 25, padding: "11px 22px", borderRadius: 99, color: ink, background: "#FFF8EA", fontSize: 21, fontWeight: 800}}>A polite way to ask for a document</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
