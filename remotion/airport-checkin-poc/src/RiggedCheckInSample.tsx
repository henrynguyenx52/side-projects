import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.inOut(Easing.cubic);

const range = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, {...clamp, easing: ease});

const Limb = ({x1, y1, length, angle, width, color}: {x1: number; y1: number; length: number; angle: number; width: number; color: string}) => (
  <g transform={`translate(${x1} ${y1}) rotate(${angle})`}>
    <rect x={-width / 2} y={0} width={width} height={length} rx={width / 2} fill={color} stroke="#17213f" strokeWidth={7} />
  </g>
);

type CharacterProps = {
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1;
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  walk?: number;
  bodyBob?: number;
  headAngle?: number;
  eyeX?: number;
  blink?: number;
  mouthOpen?: number;
  frontUpperArm?: number;
  frontForearm?: number;
  backUpperArm?: number;
  backForearm?: number;
  passport?: {visible: boolean; transferX?: number; transferY?: number};
  name: string;
};

const Character = ({
  x, y, scale = 1, facing = 1, skin, shirt, pants, hair, walk = 0, bodyBob = 0,
  headAngle = 0, eyeX = 0, blink = 0, mouthOpen = 0, frontUpperArm = 8,
  frontForearm = -8, backUpperArm = -8, backForearm = 10, passport, name,
}: CharacterProps) => {
  const legA = Math.sin(walk * Math.PI * 2) * 24;
  const legB = -legA;
  const armWalk = Math.sin(walk * Math.PI * 2) * 18;
  const eyeScale = Math.max(0.08, 1 - blink * 0.92);
  return (
    <g transform={`translate(${x} ${y + bodyBob}) scale(${facing * scale} ${scale})`} aria-label={name}>
      <ellipse cx="0" cy="25" rx="92" ry="18" fill="rgba(14,24,53,.18)" />

      <g transform={`rotate(${legB} -28 -175)`}>
        <Limb x1={-28} y1={-175} length={105} angle={0} width={40} color={pants} />
        <g transform="translate(-28 -70)"><Limb x1={0} y1={0} length={103} angle={-legB * 0.45} width={35} color={pants} /></g>
        <ellipse cx={-24} cy={35} rx={44} ry={20} fill="#f6f1e8" stroke="#17213f" strokeWidth={7} />
      </g>
      <g transform={`rotate(${legA} 28 -175)`}>
        <Limb x1={28} y1={-175} length={105} angle={0} width={40} color={pants} />
        <g transform="translate(28 -70)"><Limb x1={0} y1={0} length={103} angle={-legA * 0.45} width={35} color={pants} /></g>
        <ellipse cx={32} cy={35} rx={44} ry={20} fill="#fff" stroke="#17213f" strokeWidth={7} />
      </g>

      <g transform={`rotate(${backUpperArm - armWalk} -70 -290)`}>
        <Limb x1={-70} y1={-290} length={100} angle={0} width={35} color={shirt} />
        <g transform={`translate(-70 -190) rotate(${backForearm})`}>
          <Limb x1={0} y1={0} length={94} angle={0} width={31} color={skin} />
          <circle cx="0" cy="99" r="22" fill={skin} stroke="#17213f" strokeWidth={7} />
        </g>
      </g>

      <path d="M-86 -338 Q0 -382 86 -338 L72 -174 Q0 -142 -72 -174 Z" fill={shirt} stroke="#17213f" strokeWidth={8} />
      <path d="M-62 -179 Q0 -145 62 -179 L54 -139 L-54 -139 Z" fill={pants} stroke="#17213f" strokeWidth={7} />

      <g transform={`rotate(${headAngle} 0 -425)`}>
        <ellipse cx="0" cy="-430" rx="92" ry="105" fill={skin} stroke="#17213f" strokeWidth={8} />
        <path d="M-88 -450 Q-83 -555 5 -552 Q96 -543 89 -448 Q57 -500 6 -504 Q-45 -500 -88 -450Z" fill={hair} stroke="#17213f" strokeWidth={8} />
        <g transform={`translate(${eyeX} 0) scale(1 ${eyeScale})`}>
          <ellipse cx="-34" cy="-437" rx="13" ry="18" fill="#17213f" />
          <ellipse cx="34" cy="-437" rx="13" ry="18" fill="#17213f" />
          <circle cx="-30" cy="-442" r="4" fill="white" />
          <circle cx="38" cy="-442" r="4" fill="white" />
        </g>
        <path d={`M-27 -390 Q0 ${-378 + mouthOpen * 25} 27 -390`} fill={mouthOpen > 0.25 ? "#8f3150" : "none"} stroke="#17213f" strokeWidth={7} strokeLinecap="round" />
      </g>

      <g transform={`rotate(${frontUpperArm + armWalk} 70 -290)`}>
        <Limb x1={70} y1={-290} length={100} angle={0} width={35} color={shirt} />
        <g transform={`translate(70 -190) rotate(${frontForearm})`}>
          <Limb x1={0} y1={0} length={94} angle={0} width={31} color={skin} />
          <circle cx="0" cy="99" r="23" fill={skin} stroke="#17213f" strokeWidth={7} />
          {passport?.visible ? (
            <g transform={`translate(${passport.transferX ?? 0} ${105 + (passport.transferY ?? 0)}) rotate(-8)`}>
              <rect x="-37" y="0" width="74" height="96" rx="7" fill="#5a277d" stroke="#17213f" strokeWidth="6" />
              <circle cx="0" cy="35" r="15" fill="none" stroke="#d9b86c" strokeWidth="4" />
              <path d="M-20 66 H20" stroke="#d9b86c" strokeWidth="5" />
            </g>
          ) : null}
        </g>
      </g>
    </g>
  );
};

const Bubble = ({speaker, text, x, y, opacity}: {speaker: string; text: string; x: number; y: number; opacity: number}) => (
  <div style={{position: "absolute", left: x, top: y, opacity, transform: `translateY(${(1 - opacity) * 18}px)`, width: 610, padding: "22px 30px 26px", borderRadius: 28, background: "rgba(255,255,255,.96)", border: "3px solid #182342", boxShadow: "0 18px 50px rgba(17,30,70,.18)", color: "#101a37"}}>
    <div style={{fontSize: 17, fontWeight: 900, letterSpacing: 3, color: "#4165d7", marginBottom: 9}}>{speaker}</div>
    <div style={{fontSize: 39, fontWeight: 750, lineHeight: 1.18}}>{text}</div>
  </div>
);

export const RiggedCheckInSample = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const travelerX = range(frame, [0, 85, 105], [-170, 550, 565]);
  const walk = frame < 88 ? frame / 18 : 0;
  const travelerBob = frame < 88 ? Math.abs(Math.sin(walk * Math.PI * 2)) * -13 : 0;
  const agentTalk = frame >= 120 && frame <= 205 ? 0.25 + Math.abs(Math.sin(frame * 0.38)) * 0.8 : 0;
  const travelerTalk = frame >= 215 && frame <= 270 ? 0.2 + Math.abs(Math.sin(frame * 0.34)) * 0.7 : 0;
  const reach = range(frame, [275, 302, 334, 350], [0, 1, 1, 0]);
  const agentReach = range(frame, [305, 330, 348], [0, 1, 0]);
  const titleIn = spring({frame, fps, config: {damping: 18, stiffness: 80}});
  const titleOut = range(frame, [65, 82], [1, 0]);
  const bubbleAgent = range(frame, [112, 124, 193, 207], [0, 1, 1, 0]);
  const bubbleTraveler = range(frame, [207, 219, 261, 275], [0, 1, 1, 0]);
  const blinkTraveler = frame % 94 >= 89 ? Math.sin(((frame % 94) - 89) / 5 * Math.PI) : 0;
  const blinkAgent = frame % 107 >= 102 ? Math.sin(((frame % 107) - 102) / 5 * Math.PI) : 0;
  const passportWithTraveler = frame < 331;

  return (
    <AbsoluteFill style={{overflow: "hidden", background: "linear-gradient(#dcecff 0 72%, #bdc9db 72%)", fontFamily: "Inter, Arial, sans-serif"}}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0}}>
        <rect width="1920" height="780" fill="#dcecff" />
        <path d="M0 0 H1920 V185 H0Z" fill="#223b78" />
        <g opacity=".92">
          <rect x="260" y="250" width="1240" height="410" rx="24" fill="#b9dcf5" stroke="#7692bd" strokeWidth="10" />
          {[0,1,2,3,4].map((i) => <line key={i} x1={500 + i * 230} y1="255" x2={500 + i * 230} y2="655" stroke="#eef7ff" strokeWidth="13" />)}
          <path d="M270 520 H1490" stroke="#eef7ff" strokeWidth="13" />
        </g>
        <rect x="1300" y="78" width="420" height="145" rx="18" fill="#102455" stroke="#7ee8e1" strokeWidth="8" />
        <text x="1510" y="138" textAnchor="middle" fill="white" fontSize="34" fontWeight="800">CHECK-IN  •  A12</text>
        <text x="1510" y="185" textAnchor="middle" fill="#7ee8e1" fontSize="25" fontWeight="700">ON TIME</text>

        <g transform={`translate(${travelerX - 150} 910)`}>
          <line x1="18" y1="-160" x2="38" y2="-295" stroke="#17213f" strokeWidth="13" />
          <rect x="-58" y="-190" width="130" height="175" rx="25" fill="#2c86a0" stroke="#17213f" strokeWidth="9" />
          <circle cx="-28" cy="0" r="16" fill="#17213f" /><circle cx="44" cy="0" r="16" fill="#17213f" />
        </g>

        <Character name="Traveler" x={travelerX} y={930} scale={1.05} skin="#f3bd91" shirt="#f6eee2" pants="#198492" hair="#8c402b" walk={walk} bodyBob={travelerBob} headAngle={reach * -5} eyeX={reach * 5} blink={blinkTraveler} mouthOpen={travelerTalk} frontUpperArm={8 - reach * 76} frontForearm={-8 + reach * 40} passport={{visible: passportWithTraveler}} />

        <Character name="Check-in agent" x={1350} y={900} scale={1.02} facing={-1} skin="#bd754e" shirt="#526fce" pants="#263966" hair="#25233c" headAngle={agentReach * -5} eyeX={agentReach * 6} blink={blinkAgent} mouthOpen={agentTalk} frontUpperArm={8 - agentReach * 70} frontForearm={-8 + agentReach * 34} passport={{visible: !passportWithTraveler}} />

        <g>
          <path d="M1050 690 H1785 L1870 980 H970Z" fill="#e7e9f4" stroke="#17213f" strokeWidth="11" />
          <rect x="1200" y="768" width="365" height="110" rx="18" fill="#4165d7" />
          <text x="1382" y="838" textAnchor="middle" fill="white" fontSize="31" fontWeight="850">SKYWAY AIR</text>
          <rect x="1125" y="664" width="190" height="28" rx="8" fill="#253768" />
        </g>
      </svg>

      <div style={{position: "absolute", left: 72, top: 57, opacity: titleIn * titleOut, color: "white", transform: `translateY(${(1 - titleIn) * -18}px)`}}>
        <div style={{fontSize: 18, fontWeight: 900, letterSpacing: 5, color: "#7ee8e1"}}>RIGGED 2D ANIMATION TEST</div>
        <div style={{fontSize: 55, fontWeight: 850, marginTop: 8}}>At the check-in counter</div>
      </div>

      <Bubble speaker="CHECK-IN AGENT" text="Good morning. May I see your passport, please?" x={120} y={255} opacity={bubbleAgent} />
      <Bubble speaker="TRAVELER" text="Certainly. Here you are." x={145} y={270} opacity={bubbleTraveler} />

      <div style={{position: "absolute", left: 430, right: 430, bottom: 32, padding: "18px 30px", borderRadius: 22, background: "rgba(14,24,53,.94)", color: "white", textAlign: "center", fontSize: 27, fontWeight: 700}}>
        WALK CYCLE · JOINTED LIMBS · FACIAL ACTING · PROP HANDOFF
      </div>
    </AbsoluteFill>
  );
};
