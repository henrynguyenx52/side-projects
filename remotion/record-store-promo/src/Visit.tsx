import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {displayFamily, sansFamily} from "./fonts";

const HoursRow = ({
  name,
  days,
  hours,
  delay,
}: {
  readonly name: string;
  readonly days: string;
  readonly hours: string;
  readonly delay: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <Interactive.Div
      name={name}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingTop: 18,
        paddingBottom: 18,
        borderTop: "1px solid rgba(28,20,15,0.12)",
        opacity: interpolate(frame, [delay, delay + 0.45 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <div
        style={{
          fontFamily: sansFamily,
          fontSize: 40,
          fontWeight: 500,
          color: "#6E6258",
        }}
      >
        {days}
      </div>
      <div
        style={{
          fontFamily: displayFamily,
          fontSize: 44,
          fontWeight: 500,
          color: "#1C140F",
        }}
      >
        {hours}
      </div>
    </Interactive.Div>
  );
};

const VisitInner = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 28%, rgba(231,162,58,0.18), rgba(20,15,12,0) 55%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -80,
          bottom: -120,
          width: 520,
          height: 520,
          borderRadius: 520,
          backgroundColor: "#161311",
          boxShadow: "inset 0 0 0 18px rgba(244,235,221,0.08)",
          rotate: interpolate(frame, [0, fps], ["0deg", "120deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "extend",
          }),
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: 180,
            backgroundColor: "#F4EBDD",
            left: 170,
            top: 170,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          padding: "120px 88px 120px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Interactive.Div
          name="Street label"
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
          GROVE STREET
        </Interactive.Div>
        <Interactive.Div
          name="Visit headline"
          style={{
            marginTop: 12,
            fontFamily: displayFamily,
            fontWeight: 500,
            fontSize: 148,
            lineHeight: 0.86,
            color: "#F4EBDD",
            opacity: interpolate(frame, [0.1 * fps, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.1 * fps, 0.8 * fps],
              ["0px 36px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            ),
          }}
        >
          Come by.
        </Interactive.Div>
        <Interactive.Div
          name="Address"
          style={{
            marginTop: 20,
            fontFamily: sansFamily,
            fontSize: 48,
            fontWeight: 500,
            color: "#CDBFAE",
            opacity: interpolate(frame, [0.35 * fps, fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          418 Grove Street
        </Interactive.Div>

        <Interactive.Div
          name="Hours card"
          style={{
            marginTop: 64,
            backgroundColor: "#F4EBDD",
            padding: "36px 40px 20px",
            opacity: interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0.5 * fps, 1.2 * fps],
              ["0px 48px", "0px 0px"],
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
              marginBottom: 18,
              fontFamily: sansFamily,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: 3,
              color: "#C4492C",
            }}
          >
            HOURS
          </div>
          <HoursRow name="Weekday hours" days="Tue – Thu" hours="11–8" delay={0.7 * fps} />
          <HoursRow
            name="Weekend hours"
            days="Fri – Sat"
            hours="11–midnight"
            delay={0.85 * fps}
          />
          <HoursRow name="Sunday hours" days="Sunday" hours="12–6" delay={fps} />
          <HoursRow name="Monday hours" days="Monday" hours="Closed" delay={1.15 * fps} />
        </Interactive.Div>

        <Interactive.Div
          name="Closing line"
          style={{
            marginTop: "auto",
            fontFamily: displayFamily,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 48,
            lineHeight: 1.15,
            color: "#F4EBDD",
            opacity: interpolate(frame, [1.2 * fps, 1.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          No membership. No algorithm.
          <br />
          Just the record.
        </Interactive.Div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </>
  );
};

export const Visit = Interactive.create({
  Component: VisitInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
