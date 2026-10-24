import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {displayFamily, sansFamily} from "./fonts";

const OpeningInner = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(231,162,58,0.2), rgba(20,15,12,0) 58%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.28,
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
          padding: "120px 88px 128px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <Interactive.Div
            name="Established"
            style={{
              fontFamily: sansFamily,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: 4,
              color: "#E7A23A",
            }}
          >
            EST. 1978
          </Interactive.Div>
          <Interactive.Div
            name="Independent"
            style={{
              fontFamily: sansFamily,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: 4,
              color: "#CDBFAE",
            }}
          >
            INDEPENDENT
          </Interactive.Div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{position: "relative", width: 720, height: 720}}>
            <Interactive.Div
              name="Vinyl"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 720,
                backgroundColor: "#161311",
                boxShadow: "0 36px 80px rgba(0,0,0,0.5)",
                overflow: "hidden",
                scale: interpolate(frame, [0, 0.8 * fps], [0.92, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                  output: "perceptual-scale",
                }),
                rotate: interpolate(frame, [0, fps], ["0deg", "198deg"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "extend",
                }),
              }}
            >
              <svg
                width={720}
                height={720}
                viewBox="0 0 720 720"
                style={{position: "absolute", inset: 0}}
              >
                {Array.from({length: 16}, (_, index) => (
                  <circle
                    key={index}
                    cx={360}
                    cy={360}
                    r={334 - index * 12}
                    fill="none"
                    stroke={
                      index % 3 === 0
                        ? "rgba(244,235,221,0.24)"
                        : "rgba(244,235,221,0.08)"
                    }
                    strokeWidth={index % 4 === 0 ? 2 : 1}
                  />
                ))}
              </svg>
              <div
                style={{
                  position: "absolute",
                  width: 250,
                  height: 250,
                  left: 235,
                  top: 235,
                  borderRadius: 250,
                  backgroundColor: "#F4EBDD",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  rotate: interpolate(frame, [0, fps], ["0deg", "-198deg"], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "extend",
                  }),
                }}
              >
                <div
                  style={{
                    fontFamily: displayFamily,
                    fontSize: 64,
                    fontWeight: 600,
                    color: "#1C140F",
                    lineHeight: 1,
                  }}
                >
                  NR
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 22,
                    backgroundColor: "#140F0C",
                  }}
                />
                <div
                  style={{
                    fontFamily: sansFamily,
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: 3,
                    color: "#6E6258",
                  }}
                >
                  STEREO
                </div>
              </div>
            </Interactive.Div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 720,
                pointerEvents: "none",
                background:
                  "linear-gradient(120deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 42%, rgba(0,0,0,0.28) 72%, rgba(255,255,255,0) 100%)",
              }}
            />
            <svg
              width={720}
              height={720}
              viewBox="0 0 720 720"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 3,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <g
                style={{
                  transformBox: "view-box",
                  transformOrigin: "610px 118px",
                  rotate: interpolate(frame, [0, fps], ["-26deg", "0deg"], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  }),
                }}
              >
                <line
                  x1={610}
                  y1={118}
                  x2={468}
                  y2={228}
                  stroke="#E7D7C3"
                  strokeWidth={12}
                  strokeLinecap="round"
                />
                <circle cx={468} cy={228} r={13} fill="#C4492C" />
                <circle cx={610} cy={118} r={18} fill="#E4D5C0" />
                <circle cx={610} cy={118} r={7} fill="#140F0C" />
              </g>
            </svg>
          </div>
        </div>

        <div>
          <Interactive.Div
            name="Store name"
            style={{
              fontFamily: displayFamily,
              fontWeight: 500,
              fontSize: 156,
              lineHeight: 0.84,
              color: "#F4EBDD",
              opacity: interpolate(frame, [0.3 * fps, 1.1 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
              translate: interpolate(
                frame,
                [0.3 * fps, 1.1 * fps],
                ["0px 36px", "0px 0px"],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                },
              ),
            }}
          >
            Needle
            <br />
            Room
          </Interactive.Div>
          <Interactive.Div
            name="Tagline"
            style={{
              marginTop: 28,
              fontFamily: displayFamily,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 54,
              color: "#E7A23A",
              opacity: interpolate(frame, [0.7 * fps, 1.5 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            Drop the needle.
          </Interactive.Div>
          <div
            style={{
              marginTop: 32,
              width: 180,
              height: 4,
              backgroundColor: "#E7A23A",
              transformOrigin: "left center",
              scale: interpolate(frame, [0.8 * fps, 1.6 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                output: "perceptual-scale",
              }),
            }}
          />
          <Interactive.Div
            name="Friday note"
            style={{
              marginTop: 28,
              fontFamily: sansFamily,
              fontSize: 40,
              fontWeight: 500,
              color: "#CDBFAE",
              opacity: interpolate(frame, [fps, 1.8 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            New arrivals every Friday
          </Interactive.Div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
};

export const Opening = Interactive.create({
  Component: OpeningInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
