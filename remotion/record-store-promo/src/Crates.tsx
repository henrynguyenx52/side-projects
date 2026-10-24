import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {displayFamily, sansFamily} from "./fonts";

const NightBusCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <Interactive.Div
      name="Night Bus"
      style={{
        display: "flex",
        gap: 32,
        alignItems: "center",
        opacity: interpolate(frame, [0, 0.7 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(frame, [0, 0.7 * fps], ["0px 48px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <div
        style={{
          width: 248,
          height: 248,
          flexShrink: 0,
          backgroundColor: "#1B3A4B",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 170,
            height: 170,
            borderRadius: 170,
            backgroundColor: "#F4EBDD",
            left: 28,
            top: 48,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 36,
            height: 36,
            borderRadius: 36,
            backgroundColor: "#E7A23A",
            right: 36,
            top: 36,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 20,
            bottom: 16,
            fontFamily: sansFamily,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#F4EBDD",
          }}
        >
          NR-014
        </div>
      </div>
      <div>
        <Interactive.Div
          name="Night Bus artist"
          style={{
            fontFamily: sansFamily,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 3,
            color: "#8A7364",
          }}
        >
          JUNE HART
        </Interactive.Div>
        <Interactive.Div
          name="Night Bus title"
          style={{
            marginTop: 8,
            fontFamily: displayFamily,
            fontSize: 64,
            fontWeight: 500,
            lineHeight: 0.95,
            color: "#1C140F",
          }}
        >
          Night Bus
        </Interactive.Div>
        <Interactive.Div
          name="Night Bus detail"
          style={{
            marginTop: 16,
            fontFamily: sansFamily,
            fontSize: 40,
            fontWeight: 500,
            color: "#C4492C",
          }}
        >
          Jazz · $24
        </Interactive.Div>
      </div>
    </Interactive.Div>
  );
};

const SaltwaterCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <Interactive.Div
      name="Saltwater Gospel"
      style={{
        display: "flex",
        gap: 32,
        alignItems: "center",
        opacity: interpolate(frame, [0.45 * fps, 1.15 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(
          frame,
          [0.45 * fps, 1.15 * fps],
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
          width: 248,
          height: 248,
          flexShrink: 0,
          backgroundColor: "#C4492C",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {[0, 1, 2, 3].map((band) => (
          <div
            key={band}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 36 + band * 48,
              height: 18,
              backgroundColor: "#F4EBDD",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 20,
            bottom: 16,
            fontFamily: sansFamily,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#F4EBDD",
          }}
        >
          NR-021
        </div>
      </div>
      <div>
        <Interactive.Div
          name="Saltwater artist"
          style={{
            fontFamily: sansFamily,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 3,
            color: "#8A7364",
          }}
        >
          THE MARLOW SISTERS
        </Interactive.Div>
        <Interactive.Div
          name="Saltwater title"
          style={{
            marginTop: 8,
            fontFamily: displayFamily,
            fontSize: 60,
            fontWeight: 500,
            lineHeight: 0.95,
            color: "#1C140F",
          }}
        >
          Saltwater
          <br />
          Gospel
        </Interactive.Div>
        <Interactive.Div
          name="Saltwater detail"
          style={{
            marginTop: 16,
            fontFamily: sansFamily,
            fontSize: 40,
            fontWeight: 500,
            color: "#C4492C",
          }}
        >
          Soul · $22
        </Interactive.Div>
      </div>
    </Interactive.Div>
  );
};

const RoomToneCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <Interactive.Div
      name="Room Tone"
      style={{
        display: "flex",
        gap: 32,
        alignItems: "center",
        opacity: interpolate(frame, [0.9 * fps, 1.6 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(
          frame,
          [0.9 * fps, 1.6 * fps],
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
          width: 248,
          height: 248,
          flexShrink: 0,
          backgroundColor: "#243028",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: 180,
            border: "3px solid #F4EBDD",
            left: 34,
            top: 28,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 90,
            height: 90,
            borderRadius: 90,
            border: "3px solid #E7A23A",
            left: 79,
            top: 73,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 20,
            bottom: 16,
            fontFamily: sansFamily,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#F4EBDD",
          }}
        >
          NR-033
        </div>
      </div>
      <div>
        <Interactive.Div
          name="Room Tone artist"
          style={{
            fontFamily: sansFamily,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 3,
            color: "#8A7364",
          }}
        >
          KITE DISTRICT
        </Interactive.Div>
        <Interactive.Div
          name="Room Tone title"
          style={{
            marginTop: 8,
            fontFamily: displayFamily,
            fontSize: 64,
            fontWeight: 500,
            lineHeight: 0.95,
            color: "#1C140F",
          }}
        >
          Room Tone
        </Interactive.Div>
        <Interactive.Div
          name="Room Tone detail"
          style={{
            marginTop: 16,
            fontFamily: sansFamily,
            fontSize: 40,
            fontWeight: 500,
            color: "#C4492C",
          }}
        >
          Ambient · $18
        </Interactive.Div>
      </div>
    </Interactive.Div>
  );
};

const CratesInner = () => {
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
          border: "2px solid rgba(28,20,15,0.08)",
          right: -280,
          top: 220,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: 760,
          border: "2px solid rgba(28,20,15,0.08)",
          right: -170,
          top: 330,
        }}
      />
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
          name="Week label"
          style={{
            fontFamily: sansFamily,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: 4,
            color: "#C4492C",
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          THIS WEEK
        </Interactive.Div>
        <Interactive.Div
          name="Crates headline"
          style={{
            marginTop: 16,
            fontFamily: displayFamily,
            fontWeight: 500,
            fontSize: 104,
            lineHeight: 0.9,
            color: "#1C140F",
            opacity: interpolate(frame, [0, 0.7 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [0, 0.7 * fps], ["0px 28px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Fresh in
          <br />
          the crates
        </Interactive.Div>
        <div
          style={{
            flex: 1,
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <NightBusCard />
          <SaltwaterCard />
          <RoomToneCard />
        </div>
        <Interactive.Div
          name="Crates footer"
          style={{
            marginTop: 36,
            fontFamily: sansFamily,
            fontSize: 40,
            fontWeight: 500,
            color: "#6E6258",
            opacity: interpolate(frame, [1.2 * fps, 1.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          In the shop on Grove Street
        </Interactive.Div>
      </div>
    </>
  );
};

export const Crates = Interactive.create({
  Component: CratesInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
