import type {CSSProperties} from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {displayFamily, sansFamily} from "./fonts";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const Portrait = ({
  style,
  name,
}: {
  readonly style: CSSProperties;
  readonly name: string;
}) => (
  <Img
    name={name}
    src={staticFile("portrait.jpg")}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      ...style,
    }}
  />
);

const Grain = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity: 0.16,
      backgroundImage:
        "radial-gradient(rgba(255,255,255,0.45) 0.55px, transparent 0.7px)",
      backgroundSize: "4px 4px",
      mixBlendMode: "soft-light",
      pointerEvents: "none",
    }}
  />
);

export const CinematicPortrait = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: "#120706", overflow: "hidden"}}>
      <Portrait
        name="Soft background"
        style={{
          filter: "blur(34px) brightness(0.42) saturate(1.35)",
          scale: 1.22,
        }}
      />
      <Portrait
        name="Portrait"
        style={{
          scale: interpolate(
            frame,
            [0, durationInFrames - 1],
            [1.03, 1.12],
            {
              ...clamp,
              easing: Easing.bezier(0.37, 0, 0.63, 1),
              output: "perceptual-scale",
            },
          ),
          translate: interpolate(
            frame,
            [0, durationInFrames - 1],
            ["0px 16px", "-16px -42px"],
            {
              ...clamp,
              easing: Easing.bezier(0.37, 0, 0.63, 1),
            },
          ),
          filter: "saturate(1.08) contrast(1.04) brightness(0.92)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(12,4,3,0.08) 38%, rgba(12,4,3,0.76) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -220,
          bottom: -220,
          width: 250,
          left: 0,
          rotate: "12deg",
          translate: interpolate(
            frame,
            [0.8 * fps, 4 * fps],
            ["-340px 0px", "1320px 0px"],
            {
              ...clamp,
              easing: Easing.bezier(0.3, 0, 0.2, 1),
            },
          ),
          background:
            "linear-gradient(90deg, transparent, rgba(255,219,146,0.22), transparent)",
          mixBlendMode: "screen",
        }}
      />
      {Array.from({length: 18}, (_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: 42 + ((index * 173) % 970),
            top:
              1900 -
              ((frame * (0.7 + (index % 4) * 0.24) + index * 131) % 2180),
            width: 5 + (index % 3) * 3,
            height: 5 + (index % 3) * 3,
            borderRadius: 20,
            backgroundColor: index % 2 === 0 ? "#F7D482" : "#F4E7D4",
            opacity: 0.34 + (index % 4) * 0.12,
            boxShadow: "0 0 14px rgba(247,212,130,0.7)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 34,
          border: "1px solid rgba(248,224,181,0.52)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 74,
          right: 74,
          bottom: 108,
          opacity: interpolate(frame, [1.2 * fps, 2.4 * fps], [0, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [1.2 * fps, 2.4 * fps],
            ["0px 32px", "0px 0px"],
            {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        <div
          style={{
            fontFamily: sansFamily,
            fontSize: 27,
            fontWeight: 600,
            letterSpacing: 7,
            color: "#F7D482",
          }}
        >
          PORTRAIT IN MOTION
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: displayFamily,
            fontStyle: "italic",
            fontSize: 98,
            lineHeight: 0.92,
            color: "#FFF4E4",
          }}
        >
          Quiet grace,
          <br />
          held in light.
        </div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const EditorialShot = ({
  name,
  objectPosition,
  startScale,
  endScale,
  label,
  accent,
}: {
  readonly name: string;
  readonly objectPosition: string;
  readonly startScale: number;
  readonly endScale: number;
  readonly label: string;
  readonly accent: string;
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: "#120706", overflow: "hidden"}}>
      <Portrait
        name={name}
        style={{
          objectPosition,
          scale: interpolate(
            frame,
            [0, durationInFrames - 1],
            [startScale, endScale],
            {
              ...clamp,
              easing: Easing.bezier(0.37, 0, 0.63, 1),
              output: "perceptual-scale",
            },
          ),
          filter: "contrast(1.08) saturate(1.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(19,4,5,0.52), transparent 48%, rgba(19,4,5,0.12))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 68,
          top: 88,
          padding: "12px 20px",
          backgroundColor: accent,
          fontFamily: sansFamily,
          fontSize: 27,
          fontWeight: 700,
          letterSpacing: 5,
          color: "#FFF6E9",
          opacity: interpolate(frame, [0, 0.35 * fps], [0, 1], clamp),
          translate: interpolate(
            frame,
            [0, 0.35 * fps],
            ["-28px 0px", "0px 0px"],
            {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          left: 68,
          right: 68,
          bottom: 76,
          height: 4,
          backgroundColor: "#FFF6E9",
          transformOrigin: "left center",
          scale: `${interpolate(frame, [0, 0.7 * fps], [0, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })} 1`,
        }}
      />
      <Grain />
    </AbsoluteFill>
  );
};

export const FashionEditorial = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: "#120706"}}>
      <Sequence durationInFrames={4 * fps}>
        <EditorialShot
          name="Full portrait"
          objectPosition="50% 50%"
          startScale={1.02}
          endScale={1.1}
          label="THE RED EDIT"
          accent="#B51F2B"
        />
      </Sequence>
      <Sequence from={4 * fps} durationInFrames={4 * fps}>
        <EditorialShot
          name="Face detail"
          objectPosition="50% 12%"
          startScale={1.64}
          endScale={1.82}
          label="GOLD / SILK / LIGHT"
          accent="#6B268B"
        />
      </Sequence>
      <Sequence from={8 * fps} durationInFrames={3 * fps}>
        <EditorialShot
          name="Dress detail"
          objectPosition="50% 68%"
          startScale={1.52}
          endScale={1.68}
          label="DETAIL 03"
          accent="#B8862B"
        />
      </Sequence>
      <Sequence from={11 * fps} durationInFrames={4 * fps}>
        <EditorialShot
          name="Closing portrait"
          objectPosition="50% 50%"
          startScale={1.12}
          endScale={1.03}
          label="MODERN HERITAGE"
          accent="#B51F2B"
        />
      </Sequence>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#FFF5E7",
          pointerEvents: "none",
          opacity: Math.max(
            ...[4, 8, 11].map((second) =>
              interpolate(
                frame,
                [second * fps - 2, second * fps, second * fps + 2],
                [0, 0.5, 0],
                clamp,
              ),
            ),
          ),
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

const Lantern = ({
  left,
  top,
  size,
  delay,
}: {
  readonly left: number;
  readonly top: number;
  readonly size: number;
  readonly delay: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size * 1.18,
        borderRadius: "48% 48% 42% 42%",
        background:
          "linear-gradient(90deg, #7F0C16, #D12B28 45%, #8E1117 100%)",
        border: `${Math.max(2, size / 40)}px solid #E9B84D`,
        boxShadow: "0 0 34px rgba(235,63,42,0.45)",
        transformOrigin: "50% -50px",
        rotate: interpolate(
          frame,
          [delay, delay + 1.6 * fps, delay + 3.2 * fps],
          ["-4deg", "5deg", "-4deg"],
          {
            ...clamp,
            easing: Easing.bezier(0.37, 0, 0.63, 1),
          },
        ),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -52,
          width: 3,
          height: 52,
          backgroundColor: "#E9B84D",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: -34,
          width: 3,
          height: 34,
          backgroundColor: "#E9B84D",
        }}
      />
    </div>
  );
};

export const FestiveGlow = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 34%, #8A1A24 0%, #3D0710 64%, #170307 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 50%, transparent 0 54px, rgba(242,190,78,0.08) 55px 57px)",
          scale: interpolate(frame, [0, durationInFrames - 1], [1, 1.2], {
            ...clamp,
            output: "perceptual-scale",
          }),
        }}
      />
      <Lantern left={70} top={92} size={126} delay={0} />
      <Lantern left={862} top={170} size={106} delay={0.5 * fps} />
      <div
        style={{
          position: "absolute",
          left: 84,
          right: 84,
          top: 248,
          bottom: 190,
          overflow: "hidden",
          borderRadius: "260px 260px 16px 16px",
          border: "3px solid #E9B84D",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.46), 0 0 0 12px rgba(233,184,77,0.1)",
          opacity: interpolate(frame, [0, 1.1 * fps], [0, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [0, 1.1 * fps], [0.94, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <Portrait
          name="Framed portrait"
          style={{
            scale: interpolate(
              frame,
              [0, durationInFrames - 1],
              [1.06, 1.15],
              {
                ...clamp,
                easing: Easing.bezier(0.37, 0, 0.63, 1),
                output: "perceptual-scale",
              },
            ),
            translate: interpolate(
              frame,
              [0, durationInFrames - 1],
              ["0px 8px", "-12px -34px"],
              clamp,
            ),
            filter: "saturate(1.16) contrast(1.04) brightness(0.96)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, transparent 62%, rgba(49,3,8,0.72) 100%)",
          }}
        />
      </div>
      {Array.from({length: 16}, (_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: 24 + ((index * 211) % 1030),
            top:
              -80 +
              ((frame * (1.25 + (index % 3) * 0.3) + index * 149) % 2100),
            width: 13 + (index % 4) * 4,
            height: 7 + (index % 3) * 3,
            borderRadius: "100% 0 100% 0",
            backgroundColor: index % 3 === 0 ? "#FFD36D" : "#F2A6A2",
            rotate: `${frame * (1 + (index % 4) * 0.35) + index * 23}deg`,
            opacity: 0.72,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 66,
          textAlign: "center",
          opacity: interpolate(frame, [1.2 * fps, 2.4 * fps], [0, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [1.2 * fps, 2.4 * fps],
            ["0px 24px", "0px 0px"],
            {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        <div
          style={{
            fontFamily: displayFamily,
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: 3,
            color: "#FFF1D2",
          }}
        >
          Radiance
        </div>
        <div
          style={{
            marginTop: 5,
            fontFamily: sansFamily,
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: 7,
            color: "#E9B84D",
          }}
        >
          A FESTIVE PORTRAIT
        </div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
};
