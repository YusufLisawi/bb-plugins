import React from "react";
import { AbsoluteFill, spring, useCurrentFrame } from "remotion";
import { DotGrid } from "../components/Fx";
import { Mark } from "../components/Mark";
import { E, clamp, keys, mix, mixColor, tw } from "../lib/ease";
import { LOCKUP, lockup } from "../lib/lockup";
import { C, FONT } from "../theme";
import { FPS, T } from "../timing";

/**
 * 12.0–15.0 s — the lockup, on the final hit. The spark that started the film
 * lands as the period of "brainfast.", the word builds backwards out of it, the
 * pen draws the mark one last time, the dot cools from coral to ink so the end
 * frame is the exact official logo, then the line and the URL settle in.
 */
const HIT = T.hit;
const WORD = "brainfast";

export const S7Outro: React.FC = () => {
  const f = useCurrentFrame();
  const L = lockup();

  const punch = keys(f, [[HIT, 1.7], [HIT + 10, 0.92], [HIT + 20, 1]], E.cubicInOut);
  const cool = tw(f, HIT + 56, HIT + 86, 0, 1, E.cubicInOut);
  const draw = tw(f, HIT + 12, HIT + 44, 0, 1, E.cubicInOut);
  const shine = tw(f, HIT + 118, HIT + 150, 0, 1, E.cubicInOut);
  const push = tw(f, HIT, T.end, 1, 1.035, E.linear);

  const ring = (d: number, grow: number, len: number) => {
    const t = tw(f, HIT + d, HIT + d + len, 0, 1, E.expoOut);
    return { r: L.period.r + grow * t, o: f >= HIT + d ? 1 - t : 0, w: 6 * (1 - t) + 0.5 };
  };
  const r1 = ring(0, 420, 46);
  const r2 = ring(5, 760, 60);

  const tag = "Build custom AI agents that work for your business.".split(" ");
  const pill = spring({ frame: f - (HIT + 84), fps: FPS, config: { damping: 14, mass: 0.6, stiffness: 150 } });

  const wordStyle: React.CSSProperties = {
    fontSize: LOCKUP.fs,
    fontWeight: LOCKUP.weight,
    letterSpacing: `${LOCKUP.track}em`,
    lineHeight: 1,
    color: C.ink,
    whiteSpace: "pre",
  };

  return (
    <AbsoluteFill style={{ background: C.cream, fontFamily: FONT }}>
      <DotGrid
        color={C.ink}
        opacity={0.06}
        gap={40}
        r={1.5}
        ripples={[
          { x: L.period.x, y: L.period.y, at: HIT, speed: 40, width: 120, amp: 2 },
          { x: L.markX + L.markW / 2, y: LOCKUP.cy, at: HIT + 44, speed: 34, width: 100, amp: 1.2 },
        ]}
      />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 48%" }}>
        {/* shockwaves from the landing spark */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <circle cx={L.period.x} cy={L.period.y} r={r1.r} fill="none" stroke={C.coral} strokeWidth={r1.w} opacity={r1.o} />
          <circle cx={L.period.x} cy={L.period.y} r={r2.r} fill="none" stroke={C.coral} strokeWidth={r2.w * 0.5} opacity={r2.o * 0.5} />
        </svg>

        {/* the mark: drawn once more, then a highlight travels the stroke */}
        <div style={{ position: "absolute", left: L.markX, top: L.markY }}>
          <Mark height={L.markH} progress={draw} color={C.coral} />
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark
              height={L.markH}
              progress={Math.min(1, shine * 1.15)}
              start={Math.max(0, shine * 1.15 - 0.16)}
              color={C.coralLight}
              stroke={20}
              opacity={shine > 0 && shine < 1 ? 0.9 : 0}
            />
          </div>
        </div>

        {/* "brainfast" builds backwards out of the dot */}
        <div style={{ position: "absolute", left: L.textX, top: LOCKUP.cy, transform: "translateY(-50%)", ...wordStyle }}>
          <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.1em 0.02em 0.2em", margin: "-0.1em -0.02em -0.2em" }}>
            {WORD.split("").map((ch, i) => {
              const s = HIT + 3 + (WORD.length - 1 - i) * 2.2;
              const t = tw(f, s, s + 22, 0, 1, E.expoOut);
              return (
                <span key={i} style={{ position: "relative", top: `${(1 - t) * 1.1}em`, left: `${(1 - t) * 0.25}em`, opacity: clamp(t * 2) }}>
                  {ch}
                </span>
              );
            })}
          </span>
          <span style={{ opacity: 0 }}>.</span>
        </div>

        {/* the period: the spark, cooling from coral to ink */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <circle cx={L.period.x} cy={L.period.y} r={L.period.r * punch} fill={mixColor(C.coral, C.ink, cool)} />
        </svg>

        {/* line + URL */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 628, textAlign: "center", fontSize: 46, fontWeight: 500, letterSpacing: "-0.02em", color: "rgba(23,23,23,.72)" }}>
          <span style={{ display: "inline-block", overflow: "hidden", padding: "0.05em 0 0.15em", verticalAlign: "top" }}>
            {tag.map((w, i) => {
              const t = tw(f, HIT + 60 + i * 2.5, HIT + 84 + i * 2.5, 0, 1, E.expoOut);
              return (
                <span key={i} style={{ position: "relative", top: `${(1 - t) * 1.2}em`, opacity: clamp(t * 2) }}>
                  {w}
                  {i < tag.length - 1 ? " " : ""}
                </span>
              );
            })}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 960,
            top: 756,
            transform: `translateX(-50%) scale(${mix(0.6, 1, pill)})`,
            opacity: clamp(pill * 2),
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "18px 20px 18px 34px",
            borderRadius: 999,
            background: C.ink,
            color: C.cream,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            whiteSpace: "nowrap",
          }}
        >
          brainfast.ai
          <div style={{ width: 44, height: 44, borderRadius: 22, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
