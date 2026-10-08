import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { E, clamp, mix, rnd, tw } from "../../lib/ease";
import { C, FONT } from "../../theme";
import { CHANNEL, ChannelGlyph } from "../../loop/components/Kit";
import { Kinetic, Sparkle, springAt } from "../../fx2/Fx2";
import { GlassCube } from "../components/Cube";
import { CREAM, DIM, GLabel } from "../components/Glass";
import { HIT, VO, ws } from "../timing";
import { INSIDE_END } from "./Inside";

/**
 * 21.6–32.2 s.
 *  "Every correction makes it sharper" — corrections fly into the glass brain,
 *   the web of what it knows snaps into focus.
 *  "Every day it gets better" — a curve climbs day by day.
 *  "So it grows with your business. More customers, more channels, more agents.
 *   All in plain sight." — the camera pulls back: one glass agent becomes a
 *   team of them, customers stream in, channels attach, and light passes
 *   through all of it — then everything converges on the final hit.
 */
const G_IN = INSIDE_END - 2;
const FIXES = [ws("l09", 1) - 4, ws("l09", 1) + 6, ws("l09", 2) + 4];
const SHARP = ws("l09", 4) - 1;
const DAYS: [number, number] = [ws("l09", 5) - 4, ws("l09", 9) + 10];
const PULL: [number, number] = [VO.l10 - 4, ws("l10", 5) + 4];
const CUSTOMERS = ws("l10", 7) - 4;
const CHANNELS = ws("l10", 9) - 4;
const AGENTS = ws("l10", 11) - 4;
const SIGHT = ws("l10", 12) - 2;
const CONVERGE: [number, number] = [HIT - 18, HIT - 2];

const CENTER = { x: 540, y: 1080 };
const GRID = [-1, 0, 1].flatMap((r) => [-1, 0, 1].map((c) => ({ c, r })));
const ROLES = ["Support", "Sales", "Bookings"];
const CHS: (keyof typeof CHANNEL)[] = ["whatsapp", "instagram", "web", "messenger", "gmail", "slack"];

export const Grow: React.FC = () => {
  const f = useCurrentFrame();
  if (f < G_IN - 2 || f > HIT + 2) return null;
  const inT = clamp(springAt(f, G_IN, 30, 16, 140));
  const pull = tw(f, PULL[0], PULL[1], 0, 1, E.expoInOut);
  const conv = tw(f, CONVERGE[0], CONVERGE[1], 0, 1, E.expoIn);
  const sharp = tw(f, FIXES[0], SHARP, 0, 1, E.cubicIn);
  const snap = f >= SHARP ? 1 - tw(f, SHARP, SHARP + 12, 0, 1, E.expoOut) : 0;
  const blur = (1 - sharp) * 10 * (1 - pull);
  const days = tw(f, DAYS[0], DAYS[1], 0, 1, E.cubicInOut);
  const sightT = tw(f, SIGHT, SIGHT + 26, 0, 1, E.cubicInOut);
  // the lead cube: big in the middle, then one of nine
  const leadSize = mix(360, 190, pull);
  const spacing = 300;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: inT, transform: `scale(${mix(1, 0.05, conv)})`, transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
      {/* knowledge web around the brain, drifting into focus */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: 1 - pull }}>
        {Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2 + rnd(i) * 0.3;
          const r = 230 + rnd(i * 3.1) * 200;
          const x = CENTER.x + Math.cos(a + f * 0.002) * r * 1.2;
          const y = CENTER.y + Math.sin(a + f * 0.002) * r * 0.8;
          const m = (i + 5) % 28;
          const am = (m / 28) * Math.PI * 2 + rnd(m) * 0.3;
          const rm = 230 + rnd(m * 3.1) * 200;
          const xm = CENTER.x + Math.cos(am + f * 0.002) * rm * 1.2;
          const ym = CENTER.y + Math.sin(am + f * 0.002) * rm * 0.8;
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={xm} y2={ym} stroke={C.coralLight} strokeOpacity={0.18 + 0.3 * sharp} strokeWidth={1.4} />
              <circle cx={x} cy={y} r={4 + rnd(i * 5) * 5 + 3 * snap} fill={i % 4 === 0 ? C.coral : "rgba(250,249,245,.7)"} />
            </g>
          );
        })}
      </svg>
      {/* corrections flying in */}
      {FIXES.map((at, i) => {
        const t = tw(f, at, at + 14, 0, 1, E.expoIn);
        if (f < at - 2 || t >= 1) return null;
        const from = [
          { x: 120, y: 700 },
          { x: 960, y: 820 },
          { x: 200, y: 1500 },
        ][i];
        return (
          <div key={i} style={{ position: "absolute", left: mix(from.x, CENTER.x, t) - 70, top: mix(from.y, CENTER.y, t) - 30, padding: "12px 20px", borderRadius: 999, background: "rgba(217,87,89,.22)", boxShadow: "inset 0 0 0 1.5px rgba(238,143,139,.7)", color: CREAM, fontSize: 26, fontWeight: 700, transform: `scale(${mix(1, 0.2, t)})`, opacity: 1 - tw(t, 0.8, 1, 0, 1, E.linear), whiteSpace: "nowrap" }}>
            +1 correction
          </div>
        );
      })}
      {/* the cubes */}
      {GRID.map(({ c, r }, i) => {
        const lead = c === 0 && r === 0;
        const appear = lead ? 1 : clamp(springAt(f, PULL[0] + 8 + Math.hypot(c, r) * 5 + i, 30, 13, 170)) * (pull > 0 ? 1 : 0);
        if (appear <= 0.01) return null;
        const size = lead ? leadSize : 190;
        const x = CENTER.x + c * spacing * pull;
        const y = CENTER.y + r * spacing * pull;
        const sheen = sightT > 0 && sightT < 1 ? clamp(sightT * 1.6 - (c + 1 + r + 1) * 0.1) : -1;
        return (
          <div key={i} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, perspective: 1600, transform: `scale(${appear})` }}>
            <GlassCube size={size} rx={-16} ry={30 + f * 0.5 + i * 11} glass={1} glow={0.5 + 0.5 * sightT + 0.4 * snap} inner={1} sheen={sheen} />
          </div>
        );
      })}
      {/* connections + customers streaming in */}
      {pull > 0 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {GRID.map(({ c, r }, i) =>
            c === 0 && r === 0 ? null : (
              <line key={i} x1={CENTER.x} y1={CENTER.y} x2={CENTER.x + c * spacing * pull} y2={CENTER.y + r * spacing * pull} stroke={C.coralLight} strokeOpacity={0.35 * pull} strokeWidth={2} strokeDasharray="2 14" strokeDashoffset={-f * 1.5} />
            ),
          )}
          {f >= CUSTOMERS
            ? Array.from({ length: 36 }, (_, i) => {
                const lane = i % 8;
                const a = (lane / 8) * Math.PI * 2 + 0.3;
                const speed = 0.018 + rnd(i) * 0.01;
                const t = (((f - CUSTOMERS) * speed + rnd(i * 3.3)) % 1 + 1) % 1;
                const R = 900 * (1 - t) + 120;
                const x = CENTER.x + Math.cos(a) * R;
                const y = CENTER.y + Math.sin(a) * R * 1.3;
                const fade = tw(f, CUSTOMERS, CUSTOMERS + 10, 0, 1, E.linear);
                return <circle key={i} cx={x} cy={y} r={6} fill={i % 3 ? CREAM : C.coral} opacity={fade * Math.sin(Math.PI * t) * 0.9} />;
              })
            : null}
        </svg>
      ) : null}
      {/* channels attach */}
      {f >= CHANNELS - 2
        ? CHS.map((ch, i) => {
            const s = clamp(springAt(f, CHANNELS + i * 3, 30, 12, 200));
            const a = (i / CHS.length) * Math.PI * 2 - Math.PI / 2;
            const x = CENTER.x + Math.cos(a) * 470;
            const y = CENTER.y + Math.sin(a) * 560;
            return (
              <div key={ch} style={{ position: "absolute", left: x - 52, top: y - 52, width: 104, height: 104, borderRadius: 30, background: "rgba(255,255,255,.92)", boxShadow: "0 20px 50px rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})`, opacity: clamp(s * 2) }}>
                <ChannelGlyph ch={ch} size={56} />
              </div>
            );
          })
        : null}
      {/* more agents: roles label the top row */}
      {f >= AGENTS - 2
        ? ROLES.map((role, i) => {
            const s = clamp(springAt(f, AGENTS + i * 3, 30, 13, 190));
            return (
              <div key={role} style={{ position: "absolute", left: CENTER.x + (i - 1) * spacing - 110, top: CENTER.y - spacing - 150, width: 220, textAlign: "center", transform: `translateY(${(1 - s) * 20}px)`, opacity: s }}>
                <GLabel color={C.coralLight} size={22}>
                  {role}
                </GLabel>
              </div>
            );
          })
        : null}
      {/* every day it gets better */}
      {days > 0 && pull < 1 ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: 1480, height: 230, opacity: (1 - pull) * tw(f, DAYS[0], DAYS[0] + 8, 0, 1, E.linear) }}>
          <svg width={900} height={230} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {Array.from({ length: 7 }, (_, d) => (
              <text key={d} x={60 + d * 130} y={222} fill={DIM} fontSize={20} fontFamily="DM Mono" letterSpacing="2" textAnchor="middle">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][d]}
              </text>
            ))}
            <path d="M 60 170 C 190 165, 250 150, 320 132 S 450 110, 520 92 S 650 58, 720 44 S 820 22, 840 18" fill="none" stroke={C.coral} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${1000 * days} 1000`} />
            {(() => {
              const pts = [
                [60, 170],
                [190, 158],
                [320, 132],
                [450, 110],
                [580, 80],
                [710, 46],
                [840, 18],
              ];
              const k = Math.min(pts.length - 1, Math.floor(days * (pts.length - 1) + 0.0001));
              return pts.slice(0, k + 1).map(([x, y], j) => <circle key={j} cx={x} cy={y} r={j === k ? 13 : 8} fill={j === k ? CREAM : C.coral} stroke={C.coral} strokeWidth={j === k ? 5 : 0} />);
            })()}
          </svg>
        </div>
      ) : null}
      <Sparkle x={CENTER.x + 150} y={CENTER.y - 170} at={SHARP} size={64} color={CREAM} />
      <Sparkle x={CENTER.x - 180} y={CENTER.y + 140} at={SHARP + 4} size={44} color={C.coralLight} />
    </AbsoluteFill>
  );
};

export const GrowText: React.FC = () => (
  <>
    <Kinetic from={VO.l09 - 2} to={ws("l09", 5) - 10} y={250} size={96} color={CREAM} hi={C.coral} shineAt={SHARP} shineHi="#FFFFFF" words={[
      { t: "Every", at: ws("l09", 0) },
      { t: "correction", at: ws("l09", 1), br: true },
      { t: "makes", at: ws("l09", 2) },
      { t: "it", at: ws("l09", 3) },
      { t: "sharper.", at: ws("l09", 4), hi: true },
    ]} />
    <Kinetic from={ws("l09", 5) - 4} to={VO.l10 - 8} y={250} size={96} color={CREAM} hi={C.coral} words={[
      { t: "Every", at: ws("l09", 5) },
      { t: "day,", at: ws("l09", 6), br: true },
      { t: "it", at: ws("l09", 7) },
      { t: "gets", at: ws("l09", 8) },
      { t: "better.", at: ws("l09", 9), hi: true },
    ]} />
    <Kinetic from={VO.l10 - 2} to={ws("l10", 6) - 10} y={250} size={96} color={CREAM} hi={C.coral} words={[
      { t: "It", at: ws("l10", 1) },
      { t: "grows", at: ws("l10", 2), hi: true },
      { t: "with", at: ws("l10", 3), br: true },
      { t: "your", at: ws("l10", 4) },
      { t: "business.", at: ws("l10", 5) },
    ]} />
    <Kinetic from={ws("l10", 6) - 4} to={ws("l10", 12) - 10} y={230} size={84} color={CREAM} hi={C.coral} words={[
      { t: "More", at: ws("l10", 6) },
      { t: "customers.", at: ws("l10", 7), hi: true, br: true },
      { t: "More", at: ws("l10", 8) },
      { t: "channels.", at: ws("l10", 9), hi: true, br: true },
      { t: "More", at: ws("l10", 10) },
      { t: "agents.", at: ws("l10", 11), hi: true },
    ]} />
    <Kinetic from={ws("l10", 12) - 4} to={CONVERGE[0] - 4} y={250} size={100} color={CREAM} hi={C.coral} shineAt={ws("l10", 15) + 2} shineHi="#FFFFFF" words={[
      { t: "All", at: ws("l10", 12) },
      { t: "in", at: ws("l10", 13), br: true },
      { t: "plain", at: ws("l10", 14), hi: true },
      { t: "sight.", at: ws("l10", 15), hi: true },
    ]} />
  </>
);

export const GROW_BEATS = { G_IN, FIXES, SHARP, DAYS, PULL, CUSTOMERS, CHANNELS, AGENTS, SIGHT, CONVERGE };
