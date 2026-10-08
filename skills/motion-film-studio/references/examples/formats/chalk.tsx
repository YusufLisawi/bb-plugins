import React from "react";
import { useCurrentFrame } from "remotion";
import { E, clamp, mix, tw } from "../../lib/ease";
import { FONT } from "../../theme";

export const CHALK = "#F3F0E3";
export const CHALK_Y = "#FFD46E";
export const CHALK_R = "#FF9A92";
export const CHALK_G = "#9BE3B5";
export const BOARD = "#1E3A32";

/** SVG filter defs: rough chalk edges (static turbulence → deterministic). */
export const ChalkDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={3.5} xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="speckle" />
        <feComposite in="rough" in2="speckle" operator="in" />
      </filter>
    </defs>
  </svg>
);

/** Everything inside looks drawn in chalk. */
export const Chalk: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", inset: 0, filter: "url(#chalk)", ...style }}>{children}</div>
);

/** Text that writes itself on, left to right (a wipe that follows the hand). */
export const Write: React.FC<{ at: number; dur?: number; x: number; y: number; size: number; color?: string; weight?: number; children: React.ReactNode; w?: number; italic?: boolean; align?: "left" | "center" }> = ({
  at,
  dur = 14,
  x,
  y,
  size,
  color = CHALK,
  weight = 600,
  children,
  w,
  italic,
  align = "left",
}) => {
  const f = useCurrentFrame();
  const p = tw(f, at, at + dur, 0, 1, E.linear);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing: "-0.02em", lineHeight: 1.15, color, fontStyle: italic ? "italic" : "normal", clipPath: `inset(-20% ${(1 - p) * 100}% -20% -2%)`, whiteSpace: "pre" }}>
      {children}
    </div>
  );
};

/** A chalk stroke that draws itself. */
export const Stroke: React.FC<{ d: string; at: number; dur?: number; color?: string; width?: number }> = ({ d, at, dur = 12, color = CHALK, width = 7 }) => {
  const f = useCurrentFrame();
  const t = tw(f, at, at + dur, 0, 1, E.cubicInOut);
  if (t <= 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - t} />
    </svg>
  );
};

/**
 * A scene on the board: visible from `from`, erased by a felt eraser sweeping
 * left → right over [out, out + 14]. Leaves a faint dusty haze.
 */
export const Board: React.FC<{ from: number; out: number; top?: number; height?: number; children: React.ReactNode }> = ({ from, out, top = 560, height = 1180, children }) => {
  const f = useCurrentFrame();
  if (f < from - 1 || f > out + 30) return null;
  const e = tw(f, out, out + 14, 0, 1, E.cubicInOut);
  const haze = e > 0 ? Math.sin(Math.PI * clamp((f - out) / 30)) * 0.18 : 0;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${e * 100}%)` }}>{children}</div>
      {haze > 0 ? <div style={{ position: "absolute", left: 0, top, width: 1080 * e, height, background: `radial-gradient(ellipse at 50% 50%, rgba(243,240,227,${haze}), rgba(243,240,227,0) 70%)` }} /> : null}
      {e > 0 && e < 1 ? <Eraser x={mix(-160, 1080, e)} y={top + height / 2} /> : null}
    </>
  );
};

export const Eraser: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div style={{ position: "absolute", left: x - 90, top: y - 60, width: 180, height: 120, transform: "rotate(-8deg)", filter: "drop-shadow(0 14px 18px rgba(0,0,0,.45))" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 180, height: 74, borderRadius: 16, background: "linear-gradient(180deg, #C9894E, #A96C38)" }} />
    <div style={{ position: "absolute", left: 6, top: 70, width: 168, height: 46, borderRadius: "0 0 12px 12px", background: "#3C3A38" }} />
    <div style={{ position: "absolute", left: 20, top: 22, fontFamily: FONT, fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,.6)", letterSpacing: "0.1em" }}>ERASER</div>
  </div>
);
