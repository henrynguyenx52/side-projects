import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {displayFamily, sansFamily} from "./fonts";

const Fact = ({
  name,
  number,
  title,
  detail,
  delay,
}: {
  readonly name: string;
  readonly number: string;
  readonly title: string;
  readonly detail: string;
  readonly delay: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <Interactive.Div
      name={name}
      style={{
        display: "flex",
        gap: 32,
        alignItems: "baseline",
        paddingTop: 28,
        paddingBottom: 28,
        borderTop: "1px solid rgba(244,235,221,0.2)",
        opacity: interpolate(frame, [delay, delay + 0.6 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(
          frame,
          [delay, delay + 0.6 * fps],
          ["0px 28px", "0px 0px"],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
      }}
    >
      <div
        style={{
          width: 92,
          flexShrink: 0,
          fontFamily: displayFamily,
          fontSize: 52,
          fontWeight: 500,
          color: "#E7A23A",
        }}
      >
        {number}
      </div>
      <div>
        <div
          style={{
            fontFamily: displayFamily,
            fontSize: 52,
            fontWeight: 500,
            color: "#F4EBDD",
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: sansFamily,
            fontSize: 36,
            fontWeight: 500,
            color: "#CDBFAE",
          }}
        >
          {detail}
        </div>
      </div>
    </Interactive.Div>
  );
};

const BoothsInner = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <>
      <div
        style={{
          position: "absolute",
          width: 980,
          height: 980,
          borderRadius: 980,
          border: "2px solid rgba(244,235,221,0.14)",
          left: -240,
          top: 360,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: 720,
          border: "2px solid rgba(231,162,58,0.45)",
          left: -110,
          top: 490,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.25,
          backgroundImage:
            "radial-gradient(rgba(244,235,221,0.28) 0.6px, transparent 0.7px)",
          backgroundSize: "3px 3px",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          padding: "140px 88px 120px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Interactive.Div
          name="Booths label"
          style={{
            fontFamily: sansFamily,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 4,
            color: "#E7A23A",
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          THE BOOTHS
        </Interactive.Div>
        <Interactive.Div
          name="Booths headline"
          style={{
            marginTop: 20,
            fontFamily: displayFamily,
            fontWeight: 500,
            fontSize: 108,
            lineHeight: 0.9,
            color: "#F4EBDD",
            opacity: interpolate(frame, [0.15 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.15 * fps, 0.9 * fps],
              ["0px 32px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            ),
          }}
        >
          Stay for
          <br />
          the whole side.
        </Interactive.Div>
        <Interactive.Div
          name="Booths body"
          style={{
            marginTop: 36,
            maxWidth: 860,
            fontFamily: sansFamily,
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1.25,
            color: "#CDBFAE",
            opacity: interpolate(frame, [0.4 * fps, 1.1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Four booths, house headphones, and nobody hovering. If it stays with
          you, take it home.
        </Interactive.Div>
        <div style={{marginTop: "auto", paddingTop: 48}}>
          <Fact
            name="Listening booths"
            number="01"
            title="Listening booths"
            detail="Headphones are already out."
            delay={0.7 * fps}
          />
          <Fact
            name="Staff picks"
            number="02"
            title="Staff picks"
            detail="A short stack on the counter."
            delay={0.95 * fps}
          />
          <Fact
            name="Trade-ins"
            number="03"
            title="Trade-ins welcome"
            detail="Bring the records you've outgrown."
            delay={1.2 * fps}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </>
  );
};

export const Booths = Interactive.create({
  Component: BoothsInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
