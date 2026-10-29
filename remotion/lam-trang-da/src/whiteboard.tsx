import {
  evolvePath,
  getLength,
  getPointAtLength,
} from "@remotion/paths";
import type {ReactNode} from "react";
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from "remotion";
import {fontFamily} from "./fonts";

export const ink = "#1c1c1c";
export const blue = "#3a7bd5";
export const gold = "#c4963a";
export const rose = "#c45c6a";
export const green = "#2f6b45";
export const mute = "#8a847c";
export const paper = "#f4f1eb";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const Paper = () => {
  return (
    <AbsoluteFill style={{backgroundColor: paper}}>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        <filter id="crumple" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="3"
            seed="4"
            result="noise"
          />
          <feDiffuseLighting in="noise" lightingColor="#fffaf3" surfaceScale="2.2">
            <feDistantLight azimuth="220" elevation="55" />
          </feDiffuseLighting>
        </filter>
        <rect width="1080" height="1920" fill={paper} />
        <rect width="1080" height="1920" filter="url(#crumple)" opacity="0.28" />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 78,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#b7b1a8",
          fontFamily,
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: "0.22em",
        }}
      >
        MẸO DA
      </div>
    </AbsoluteFill>
  );
};

const HAND_W = 300;
const HAND_SCALE = HAND_W / 545;
const TIP_X = 22 * HAND_SCALE;
const TIP_Y = 19 * HAND_SCALE;

const Hand = ({x, y}: {x: number; y: number}) => {
  if (x < -20 || y < -20 || x > 1120 || y > 1880) {
    return null;
  }
  return (
    <Img
      src={staticFile("sketches/hand.png")}
      style={{
        position: "absolute",
        left: x - TIP_X,
        top: y - TIP_Y,
        width: HAND_W,
        height: HAND_W * (824 / 545),
        zIndex: 8,
        pointerEvents: "none",
      }}
    />
  );
};

const writing = (frame: number, start: number, end: number) =>
  frame >= start && frame <= end;

export const Stroke = ({
  d,
  start,
  end,
  frame,
  color,
  width = 7,
  fill,
}: {
  d: string;
  start: number;
  end: number;
  frame: number;
  color: string;
  width?: number;
  fill?: string;
}) => {
  if (frame < start) {
    return null;
  }
  const progress = interpolate(frame, [start, end], [0, 1], clamp);
  const drawn = evolvePath(Math.min(1, Math.max(0.001, progress)), d);
  const fillOpacity = fill
    ? interpolate(frame, [end - 8, end + 6], [0, 1], clamp)
    : 0;

  return (
    <>
      {fill ? (
        <path d={d} fill={fill} opacity={fillOpacity} stroke="none" />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={drawn.strokeDasharray}
        strokeDashoffset={drawn.strokeDashoffset}
      />
    </>
  );
};

const PenOnPath = ({
  d,
  start,
  end,
  frame,
}: {
  d: string;
  start: number;
  end: number;
  frame: number;
}) => {
  if (!writing(frame, start, end)) {
    return null;
  }
  const length = Math.max(1, getLength(d));
  const progress = interpolate(frame, [start, end], [0, 1], clamp);
  const distance = Math.min(length - 0.5, Math.max(0.5, progress * length));
  const point = getPointAtLength(d, distance);
  if (!point) {
    return null;
  }
  return <Hand x={point.x} y={point.y} />;
};

const Sketch = ({
  src,
  x,
  y,
  width,
  height,
  start,
  end,
  frame,
  axis = "x",
  hand = true,
}: {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  start: number;
  end: number;
  frame: number;
  axis?: "x" | "y";
  hand?: boolean;
}) => {
  if (frame < start) {
    return null;
  }
  const progress = interpolate(frame, [start, end], [0, 1], clamp);
  const revealW = axis === "x" ? width * progress : width;
  const revealH = axis === "y" ? height * progress : height;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: revealW,
          height: revealH,
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{width, height, maxWidth: "none"}}
        />
      </div>
      {hand && writing(frame, start, end) ? (
        <Hand
          x={axis === "x" ? x + revealW : x + width * 0.55}
          y={axis === "y" ? y + revealH : y + height * 0.46}
        />
      ) : null}
    </>
  );
};

const textWidth = (text: string, size: number) => {
  let width = 0;
  for (const char of text) {
    if (char === " ") {
      width += size * 0.34;
    } else if ("íìỉĩịiíl1·".includes(char)) {
      width += size * 0.34;
    } else if ("mwMWĐ".includes(char)) {
      width += size * 1.02;
    } else {
      width += size * 0.78;
    }
  }
  return width;
};

export const Write = ({
  text,
  x,
  y,
  size,
  start,
  end,
  frame,
  color,
  weight = 700,
  hand = true,
}: {
  text: string;
  x: number;
  y: number;
  size: number;
  start: number;
  end: number;
  frame: number;
  color: string;
  weight?: number;
  hand?: boolean;
}) => {
  if (frame < start) {
    return null;
  }
  const progress = interpolate(frame, [start, end], [0, 1], clamp);
  const width = textWidth(text, size);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          color,
          fontFamily,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
          clipPath: `inset(-20% ${(1 - progress) * 100}% -40% -4%)`,
        }}
      >
        {text}
      </div>
      {hand && writing(frame, start, end) ? (
        <Hand x={x + width * progress} y={y + size * 0.78} />
      ) : null}
    </>
  );
};

const Sheet = ({children}: {children: ReactNode}) => {
  return <AbsoluteFill>{children}</AbsoluteFill>;
};

const svgStyle = {
  position: "absolute" as const,
  inset: 0,
  width: 1080,
  height: 1920,
};

export const HookBoard = () => {
  const frame = useCurrentFrame();
  return (
    <Sheet>
      <Write
        text="Da vẫn"
        x={120}
        y={300}
        size={92}
        start={8}
        end={36}
        frame={frame}
        color={ink}
      />
      <Write
        text="sạm?"
        x={120}
        y={420}
        size={120}
        start={38}
        end={78}
        frame={frame}
        color={blue}
      />
      <Sketch
        src="sketches/jar.png"
        x={360}
        y={740}
        width={300}
        height={328}
        start={82}
        end={108}
        frame={frame}
      />
      <svg style={svgStyle}>
        <Stroke
          d="M 410 820 L 610 1000"
          start={110}
          end={126}
          frame={frame}
          color={rose}
          width={8}
        />
        <Stroke
          d="M 610 820 L 410 1000"
          start={127}
          end={142}
          frame={frame}
          color={rose}
          width={8}
        />
      </svg>
      <PenOnPath d="M 410 820 L 610 1000" start={110} end={126} frame={frame} />
      <PenOnPath d="M 610 820 L 410 1000" start={127} end={142} frame={frame} />
      <Write
        text="Khoan mua thêm"
        x={120}
        y={1180}
        size={64}
        start={144}
        end={160}
        frame={frame}
        color={ink}
      />
    </Sheet>
  );
};

export const BridgeBoard = () => {
  const frame = useCurrentFrame();
  return (
    <Sheet>
      <Write
        text="Vì sao da sạm?"
        x={120}
        y={280}
        size={72}
        start={6}
        end={40}
        frame={frame}
        color={ink}
      />
      <Sketch
        src="sketches/cells.png"
        x={70}
        y={450}
        width={360}
        height={447}
        start={44}
        end={90}
        frame={frame}
      />
      <Sketch
        src="sketches/sun.png"
        x={520}
        y={500}
        width={270}
        height={274}
        start={120}
        end={158}
        frame={frame}
      />
      <Write
        text="Tế bào chết"
        x={110}
        y={930}
        size={40}
        start={92}
        end={116}
        frame={frame}
        color={blue}
      />
      <Write
        text="Tia cực tím"
        x={540}
        y={930}
        size={40}
        start={160}
        end={176}
        frame={frame}
        color={gold}
        hand={false}
      />
    </Sheet>
  );
};

export const AloeBoard = () => {
  const frame = useCurrentFrame();
  return (
    <Sheet>
      <Write
        text="1 · Nha đam"
        x={120}
        y={260}
        size={78}
        start={6}
        end={36}
        frame={frame}
        color={ink}
      />
      <Sketch
        src="sketches/aloe.png"
        x={470}
        y={390}
        width={168}
        height={770}
        start={40}
        end={108}
        frame={frame}
        axis="y"
      />
      <svg style={svgStyle}>
        <Stroke
          d="M 150 1480 H 860"
          start={186}
          end={204}
          frame={frame}
          color={blue}
          width={16}
        />
      </svg>
      <Write
        text="Gọt vỏ, lấy gel trong"
        x={120}
        y={1200}
        size={42}
        start={112}
        end={140}
        frame={frame}
        color={ink}
        weight={600}
      />
      <Write
        text="Thoa mặt và cổ"
        x={120}
        y={1280}
        size={42}
        start={142}
        end={164}
        frame={frame}
        color={ink}
        weight={600}
      />
      <Write
        text="Massage 10 phút, rồi rửa"
        x={120}
        y={1360}
        size={42}
        start={166}
        end={198}
        frame={frame}
        color={blue}
        weight={600}
      />
    </Sheet>
  );
};

export const BeanBoard = () => {
  const frame = useCurrentFrame();
  return (
    <Sheet>
      <Write
        text="2 · Đậu đỏ"
        x={120}
        y={260}
        size={78}
        start={6}
        end={34}
        frame={frame}
        color={ink}
      />
      <Sketch
        src="sketches/beans.png"
        x={80}
        y={410}
        width={640}
        height={350}
        start={38}
        end={90}
        frame={frame}
      />
      <Write
        text="Trộn sữa chua không đường"
        x={120}
        y={830}
        size={40}
        start={94}
        end={120}
        frame={frame}
        color={ink}
        weight={600}
      />
      <Sketch
        src="sketches/bowl.png"
        x={240}
        y={940}
        width={420}
        height={300}
        start={124}
        end={162}
        frame={frame}
      />
      <Write
        text="Thoa mặt và tay"
        x={120}
        y={1300}
        size={42}
        start={166}
        end={186}
        frame={frame}
        color={ink}
        weight={600}
      />
      <Write
        text="Đắp 15 phút, rồi rửa"
        x={120}
        y={1380}
        size={42}
        start={188}
        end={210}
        frame={frame}
        color={blue}
        weight={600}
      />
    </Sheet>
  );
};

export const CtaBoard = () => {
  const frame = useCurrentFrame();
  return (
    <Sheet>
      <Write
        text="An toàn, lành tính"
        x={180}
        y={520}
        size={48}
        start={8}
        end={40}
        frame={frame}
        color={ink}
        weight={600}
      />
      <Write
        text="rất tiết kiệm"
        x={250}
        y={610}
        size={52}
        start={36}
        end={64}
        frame={frame}
        color={blue}
      />
      <Write
        text="Thử một vùng nhỏ trước"
        x={150}
        y={760}
        size={40}
        start={78}
        end={120}
        frame={frame}
        color={mute}
        weight={600}
      />
      <Write
        text="LƯU"
        x={360}
        y={900}
        size={150}
        start={128}
        end={160}
        frame={frame}
        color={blue}
      />
      <Write
        text="Áp dụng mỗi tuần"
        x={250}
        y={1100}
        size={46}
        start={164}
        end={196}
        frame={frame}
        color={ink}
        weight={600}
      />
      <svg style={svgStyle}>
        <Stroke
          d="M 250 1200 H 780"
          start={200}
          end={222}
          frame={frame}
          color={gold}
          width={10}
        />
      </svg>
      <PenOnPath d="M 250 1200 H 780" start={200} end={222} frame={frame} />
    </Sheet>
  );
};
