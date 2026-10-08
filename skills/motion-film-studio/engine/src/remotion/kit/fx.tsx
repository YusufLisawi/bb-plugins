import React from "react";
import { AbsoluteFill, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { E, clamp, keys, mix, rnd, tw } from "../lib/ease";
import { C, FONT, ACCENT_RGB } from "../theme";

/**
 * The motion vocabulary: every effect is a pure function of the frame with
 * continuous curves (no per-frame randomness), so the 8-sample motion blur of
 * the master streaks them cleanly instead of double-exposing. All sizes are in
 * pixels of the composition; effects cover the whole frame of any format.
 */

/** Spring 0 → 1 (overshoots a little) starting at `at`. Damping 14 / stiffness 170 = a confident pop. */
export const springAt = (f: number, at: number, fps = 30, damping = 14, stiffness = 170, mass = 0.6) =>
  spring({ frame: f - at, fps, config: { damping, stiffness, mass } });

const FullSvg: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {children}
    </svg>
  );
};

/**
 * A glossy band of light that sweeps across its parent once. The parent must
 * clip (overflow: hidden + border radius). Use on cards as they land, on the
 * CTA button, on counters when they settle.
 */
export const Sheen: React.FC<{ at: number; dur?: number; color?: string; opacity?: number; width?: number; angle?: number; blend?: React.CSSProperties["mixBlendMode"] }> = ({
  at,
  dur = 22,
  color = "255,255,255",
  opacity = 0.85,
  width = 38,
  angle = 18,
  blend = "normal",
}) => {
  const f = useCurrentFrame();
  const t = tw(f, at, at + dur, 0, 1, E.cubicInOut);
  if (t <= 0 || t >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none", mixBlendMode: blend }}>
      <div
        style={{
          position: "absolute",
          top: "-60%",
          bottom: "-60%",
          width: `${width}%`,
          left: `${mix(-60, 130, t)}%`,
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, rgba(${color},0) 0%, rgba(${color},${opacity * 0.35}) 35%, rgba(${color},${opacity}) 50%, rgba(${color},${opacity * 0.35}) 65%, rgba(${color},0) 100%)`,
        }}
      />
    </div>
  );
};

/** Text whose fill carries a travelling highlight (background-clip: text). On coral text use hi="#FFC2BA"; on dark use "#FFFFFF". */
export const ShineText: React.FC<{ at: number; dur?: number; base: string; hi: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, dur = 26, base, hi, children, style }) => {
  const f = useCurrentFrame();
  const t = tw(f, at, at + dur, 0, 1, E.cubicInOut);
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(100deg, ${base} 0%, ${base} 40%, ${hi} 50%, ${base} 60%, ${base} 100%)`,
        backgroundSize: "260% 100%",
        backgroundPosition: `${mix(130, -30, t)}% 0%`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** A four-point star glint: pops, turns a little, fades. Frame coordinates. */
export const Sparkle: React.FC<{ x: number; y: number; at: number; size?: number; color?: string; dur?: number }> = ({ x, y, at, size = 46, color = "#FFFFFF", dur = 20 }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur) return null;
  const t = (f - at) / dur;
  const s = Math.sin(Math.PI * clamp(t)) * (1 + 0.15 * Math.sin(Math.PI * t * 2));
  const r = size * s;
  const w = r * 0.22;
  const d = `M ${x} ${y - r} Q ${x + w * 0.35} ${y - w * 0.35} ${x + r} ${y} Q ${x + w * 0.35} ${y + w * 0.35} ${x} ${y + r} Q ${x - w * 0.35} ${y + w * 0.35} ${x - r} ${y} Q ${x - w * 0.35} ${y - w * 0.35} ${x} ${y - r} Z`;
  return (
    <FullSvg>
      <g transform={`rotate(${mix(-20, 25, t)} ${x} ${y})`}>
        <path d={d} fill={color} opacity={0.95} />
        <circle cx={x} cy={y} r={r * 0.28} fill={color} opacity={0.35} />
      </g>
    </FullSvg>
  );
};

/** Four staggered sparkles around a rectangle (the "it landed" accent). */
export const Sparkles: React.FC<{ x: number; y: number; w: number; h: number; at: number; color?: string; size?: number; seed?: number }> = ({ x, y, w, h, at, color = "#FFFFFF", size = 40, seed = 1 }) => {
  const pts: [number, number, number, number][] = [
    [x - 8, y + h * 0.25, 0, 1],
    [x + w + 6, y - 6, 3, 0.8],
    [x + w * 0.78, y + h + 10, 6, 0.65],
    [x + w * 0.18, y - 14, 8, 0.55],
  ];
  return (
    <>
      {pts.map(([px, py, d, k], i) => (
        <Sparkle key={i} x={px + (rnd(seed * 7 + i) - 0.5) * 20} y={py} at={at + d} size={size * k} color={color} />
      ))}
    </>
  );
};

/** Radial streaks from a point (impacts, arrivals, the drop). */
export const Burst: React.FC<{ x: number; y: number; at: number; n?: number; r0?: number; r1?: number; colors?: string[]; width?: number; dur?: number; seed?: number }> = ({
  x,
  y,
  at,
  n = 14,
  r0 = 30,
  r1 = 240,
  colors = [C.coral, C.cream],
  width = 5,
  dur = 26,
  seed = 3,
}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur) return null;
  const t = tw(f, at, at + dur, 0, 1, E.expoOut);
  return (
    <FullSvg>
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2 + rnd(seed + k) * 0.4;
        const len = r1 * (0.7 + 0.5 * rnd(seed * 3 + k));
        const d0 = r0 + len * t * 0.55;
        const d1 = r0 + len * t;
        return (
          <line
            key={k}
            x1={x + Math.cos(a) * d0}
            y1={y + Math.sin(a) * d0}
            x2={x + Math.cos(a) * d1}
            y2={y + Math.sin(a) * d1}
            stroke={colors[k % colors.length]}
            strokeWidth={width * (1 - t)}
            strokeLinecap="round"
          />
        );
      })}
    </FullSvg>
  );
};

/** Expanding shockwave ring. */
export const Ring: React.FC<{ x: number; y: number; at: number; r?: number; width?: number; color?: string; dur?: number; opacity?: number }> = ({
  x,
  y,
  at,
  r = 600,
  width = 18,
  color = C.coral,
  dur = 30,
  opacity = 1,
}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur) return null;
  const t = tw(f, at, at + dur, 0, 1, E.expoOut);
  return (
    <FullSvg>
      <circle cx={x} cy={y} r={20 + r * t} fill="none" stroke={color} strokeWidth={width * (1 - t)} opacity={opacity * (1 - t)} />
    </FullSvg>
  );
};

/**
 * The drop / final-hit moment in one component: a bloom of light (not a flat
 * grey flash — that reads as a glitch on dark scenes), two rings and a burst.
 */
export const Impact: React.FC<{ x: number; y: number; at: number; dark?: boolean; scale?: number; colors?: string[] }> = ({ x, y, at, dark = false, scale = 1, colors }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + 36) return null;
  const bloom = dark
    ? `radial-gradient(circle at ${x}px ${y}px, rgba(255,240,234,.7) 0%, rgba(${ACCENT_RGB},.3) 22%, rgba(${ACCENT_RGB},0) 55%)`
    : `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,.95) 0%, rgba(255,255,255,.5) 30%, rgba(255,255,255,0) 60%)`;
  return (
    <>
      <AbsoluteFill style={{ background: bloom, opacity: 1 - tw(f, at, at + 16, 0, 1, E.cubicInOut), pointerEvents: "none" }} />
      <Ring x={x} y={y} at={at} r={1000 * scale} width={30 * scale} color={C.coral} dur={34} />
      <Ring x={x} y={y} at={at + 3} r={760 * scale} width={10 * scale} color={C.coralLight} dur={30} opacity={0.8} />
      <Burst x={x} y={y} at={at} n={20} r0={60 * scale} r1={460 * scale} colors={colors ?? [C.coral, dark ? C.cream : C.ink, C.coralLight]} width={7 * scale} dur={30} />
    </>
  );
};

/** Soft bloom behind something important. */
export const Glow: React.FC<{ x: number; y: number; r: number; color: string; opacity?: number }> = ({ x, y, r, color, opacity = 1 }) => (
  <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, opacity, pointerEvents: "none" }} />
);

/**
 * A number that rolls like a real odometer: each digit turns only while every
 * digit below it rolls over from 9, so at rest every column sits exactly on a
 * whole number (a digit caught half-way reads as a lag). Masked strips with the
 * line height built in — nothing is ever cropped.
 */
export const Odometer: React.FC<{ value: number; from?: number; at: number; dur?: number; lh?: number; style?: React.CSSProperties }> = ({ value, from = 0, at, dur = 30, lh = 1.12, style }) => {
  const f = useCurrentFrame();
  const v = mix(from, value, tw(f, at, at + dur, 0, 1, E.quintOut));
  const txt = Math.round(value).toLocaleString("en-US");
  const digits = txt.replace(/\D/g, "").length;
  let di = 0;
  return (
    <span style={{ display: "inline-flex", fontVariantNumeric: "tabular-nums", lineHeight: `${lh}em`, height: `${lh}em`, ...style }}>
      {txt.split("").map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
        const place = digits - 1 - di++;
        const unit = Math.pow(10, place);
        const whole = Math.floor(v / unit);
        const lower = v - whole * unit;
        const carry = place === 0 ? lower : Math.max(0, lower - (unit - 1));
        const cont = whole + carry;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", height: `${lh}em`, width: "0.62em", position: "relative" }}>
            <span style={{ display: "block", transform: `translateY(${-(cont % 10) * lh}em)` }}>
              {Array.from({ length: 11 }, (_, k) => (
                <span key={k} style={{ display: "block", height: `${lh}em`, textAlign: "center" }}>
                  {k % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

/** Slow drifting soft discs (depth, air). Low-frequency motion only. */
export const Bokeh: React.FC<{ n?: number; color?: string; opacity?: number; seed?: number; speed?: number }> = ({ n = 18, color = ACCENT_RGB, opacity = 0.12, seed = 5, speed = 1 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const span = H + 280;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const r = 30 + rnd(seed + i) * 120;
        const x = rnd(seed * 2 + i) * W + Math.sin(f * 0.012 * speed + i) * 40;
        const y = (((rnd(seed * 3 + i) * span - f * (0.3 + rnd(i) * 0.6) * speed) % span) + span) % span - 140;
        return (
          <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, rgba(${color},${opacity}) 0%, rgba(${color},0) 70%)`, pointerEvents: "none" }} />
        );
      })}
    </>
  );
};

/** Deterministic confetti (celebrations: HIRED, PROMOTED, a milestone). */
export const Confetti: React.FC<{ at: number; x: number; y: number; n?: number; colors?: string[] }> = ({ at, x, y, n = 60, colors = [C.coral, C.ink, "#F2B544", "#5E6AD2", "#1C9A83", C.cream] }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + 60) return null;
  const t = f - at;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (rnd(i * 3.1) - 0.5) * 2.4;
        const v = 18 + rnd(i * 7.3) * 22;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 0.9 * t * t;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 14, height: 26, background: colors[i % colors.length], transform: `rotate(${t * (8 + rnd(i) * 20)}deg)`, opacity: 1 - tw(t, 40, 60, 0, 1, E.linear) }} />;
      })}
    </>
  );
};

/** A rubber stamp slamming onto paper (HIRED, APPROVED, A+). Coral stamps multiply into the paper; light stamps on colour get a shadow. */
export const Stamp: React.FC<{ at: number; text: string; x: number; y: number; rot?: number; size?: number; color?: string }> = ({ at, text, x, y, rot = -12, size = 150, color = C.coral }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = keys(f, [[at, 2.6], [at + 5, 0.92], [at + 10, 1]], E.cubicInOut);
  const onPaper = color === C.coral;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`,
        opacity: clamp((f - at) / 3),
        padding: "10px 34px",
        border: `${size * 0.066}px solid ${color}`,
        borderRadius: size * 0.16,
        color,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        mixBlendMode: onPaper ? "multiply" : "normal",
        boxShadow: onPaper ? "none" : "0 10px 30px rgba(60,10,10,.25)",
        textShadow: onPaper ? "none" : "0 10px 30px rgba(60,10,10,.35)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/** Film grain: one noise tile re-positioned every frame (added to the finished frames too, see finish.py). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => {
  const f = useCurrentFrame();
  const x = Math.floor(rnd(f * 1.7) * 512);
  const y = Math.floor(rnd(f * 3.1 + 9) * 512);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -512, backgroundImage: `url(${staticFile("img/grain.png")})`, backgroundSize: "512px 512px", transform: `translate(${x}px, ${y}px)` }} />
    </AbsoluteFill>
  );
};

/** Drifting dot grid (the calm "cream world" texture). */
export const DotField: React.FC<{ color?: string; opacity?: number; gap?: number; drift?: number }> = ({ color = "23,23,23", opacity = 0.06, gap = 40, drift = 0.4 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundImage: `radial-gradient(rgba(${color},${opacity}) 1.6px, transparent 1.6px)`, backgroundSize: `${gap}px ${gap}px`, backgroundPosition: `0px ${-(f * drift) % gap}px`, pointerEvents: "none" }} />
  );
};
