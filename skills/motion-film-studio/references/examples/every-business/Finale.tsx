import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mark } from "../../components/Mark";
import { measure } from "../../components/Type";
import { E, clamp, keys, mix, mixColor, tw } from "../../lib/ease";
import { MARK_H, MARK_W } from "../../lib/logo";
import { C, FONT } from "../../theme";
import { Burst, Ring, Sheen, ShineText, Sparkle, Sparkles, springAt } from "../../fx2/Fx2";
import { HIT, ws } from "../timing";

/**
 * 34 s → end. Everything has collapsed into one point; it ignites on the final
 * hit, the pen draws the mark, "brainfast." rises letter by letter, a light
 * runs along the stroke, the tagline lights with the voice, then the call to
 * action: "Build your first agent for free" · brainfast.ai.
 */
const FS = 158;
const CY = 860;

export const Finale: React.FC<{ ink?: string; bg?: "light" | "dark"; cta?: string; hitAt?: number; line13?: "l10" | "l11"; lineCta?: "l11" | "l12" }> = ({
  ink = C.ink,
  cta = "Build your first agent for free",
}) => {
  const f = useCurrentFrame();
  const at = HIT;
  if (f < at - 4) return null;
  const markH = FS * (40 / 60);
  const markW = (markH * MARK_W) / MARK_H;
  const gap = FS * (4 / 60);
  const textW = measure("brainfast.", FS, 600, -0.025);
  const total = markW + gap + textW;
  const lift = tw(f, ws("l11", 0) - 12, ws("l11", 0) + 10, 0, 1, E.expoInOut);
  const cy = CY - lift * 90;
  const x0 = 540 - total / 2;
  const draw = tw(f, at, at + 20, 0, 1, E.cubicInOut);
  const flash = keys(f, [[at + 19, 0], [at + 22, 1], [at + 34, 0]], E.cubicInOut);
  const shine = tw(f, at + 30, at + 56, 0, 1, E.cubicInOut) * 1.18;
  const word = "brainfast.";
  const tag = [
    { t: "Create", i: 1 },
    { t: "a", i: 2 },
    { t: "new", i: 3 },
    { t: "brain,", i: 4 },
    { t: "fast.", i: 5 },
  ];
  const ctaAt = ws("l11", 0) - 2;
  const ctaS = springAt(f, ctaAt, 30, 12, 150);
  const url = springAt(f, ws("l11", 7) - 4, 30, 14, 170);
  const tapAt = ws("l11", 7) + 22;
  const press = keys(f, [[tapAt - 3, 1], [tapAt, 0.94], [tapAt + 8, 1]], E.cubicInOut);
  const ripple = tw(f, tapAt, tapAt + 24, 0, 1, E.expoOut);
  const dot = tw(f, at - 4, at, 0, 1, E.expoOut);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {f < at + 1 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <circle cx={540} cy={cy} r={8 + 10 * dot} fill={C.coral} />
        </svg>
      ) : null}
      <AbsoluteFill style={{ background: "#FFFFFF", opacity: 0.45 * (1 - tw(f, at, at + 12, 0, 1, E.linear)) * (f >= at ? 1 : 0) }} />
      <Ring x={540} y={cy} at={at} r={1000} width={30} color={C.coral} dur={34} />
      <Ring x={540} y={cy} at={at + 3} r={760} width={10} color={C.coralLight} dur={30} opacity={0.8} />
      <Burst x={540} y={cy} at={at} n={20} r0={60} r1={460} colors={[C.coral, ink, C.coralLight]} width={7} dur={30} />
      <div style={{ position: "absolute", left: x0, top: cy - markH / 2, transform: `scale(${1 + 0.05 * flash})`, transformOrigin: "50% 50%" }}>
        <Mark height={markH} progress={draw} color={mixColor(C.coral, C.coralLight, flash)} />
        {draw < 1 ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark height={markH} progress={draw} start={draw} head={C.cream} headScale={0.6} opacity={draw > 0.01 ? 1 : 0} />
          </div>
        ) : null}
        {shine > 0 && shine < 1.18 ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark height={markH} progress={Math.min(1, shine)} start={Math.max(0, shine - 0.18)} color="#FFFFFF" stroke={8} opacity={0.9} />
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: x0 + markW + gap, top: cy, transform: "translateY(-50%)", fontSize: FS, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1, color: ink, whiteSpace: "pre" }}>
        <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.1em 0.02em 0.22em", margin: "-0.1em -0.02em -0.22em" }}>
          {word.split("").map((ch, i) => {
            const t = tw(f, at + 4 + i * 1.8, at + 22 + i * 1.8, 0, 1, E.expoOut);
            return (
              <span key={i} style={{ position: "relative", top: `${(1 - t) * 1.2}em`, opacity: clamp(t * 2) }}>
                {ch}
              </span>
            );
          })}
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + 140, textAlign: "center", fontSize: 74, fontWeight: 600, letterSpacing: "-0.035em", color: ink, opacity: tw(f, ws("l10", 1) - 12, ws("l10", 1) - 2, 0, 1, E.linear) }}>
        {tag.map((w, k) => {
          const t = tw(f, ws("l10", w.i) - 3, ws("l10", w.i) + 9, 0, 1, E.expoOut);
          const last = k === tag.length - 1;
          return (
            <span key={k} style={{ display: "inline-block", marginRight: last ? 0 : "0.24em", opacity: 0.18 + 0.82 * t, transform: `translateY(${(1 - t) * 16}px)`, color: last ? mixColor(ink, C.coral, t) : ink, fontStyle: last ? "italic" : "normal" }}>
              {last ? (
                <ShineText at={ws("l10", 5) + 8} base={mixColor(ink, C.coral, t)} hi="#FFC2BA">
                  {w.t}
                </ShineText>
              ) : (
                w.t
              )}
            </span>
          );
        })}
      </div>
      {f >= ctaAt ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1215, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, boxShadow: `0 0 0 ${ripple * 34}px rgba(217,87,89,${0.35 * (1 - ripple)})`, opacity: f >= tapAt ? 1 : 0 }} />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "30px 30px 30px 50px",
                borderRadius: 999,
                background: C.ink,
                color: C.cream,
                fontSize: 46,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                transform: `scale(${mix(0.6, 1, clamp(ctaS)) * press})`,
                opacity: clamp(ctaS * 2),
                whiteSpace: "nowrap",
                overflow: "hidden",
                boxShadow: "0 30px 60px rgba(23,23,23,.22)",
              }}
            >
              {cta}
              <div style={{ width: 70, height: 70, borderRadius: 35, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
              <Sheen at={ctaAt + 14} dur={22} opacity={0.35} />
            </div>
          </div>
          <div style={{ fontSize: 54, fontWeight: 650, letterSpacing: "-0.02em", opacity: clamp(url * 2), transform: `translateY(${(1 - clamp(url)) * 20}px)` }}>
            <ShineText at={ws("l11", 7) + 6} base={C.coral} hi="#FFD9D4">
              brainfast.ai
            </ShineText>
          </div>
        </div>
      ) : null}
      {f >= ctaAt ? <Sparkles x={120} y={1215} w={840} h={130} at={ctaAt + 10} color={C.coral} size={40} seed={4} /> : null}
      <Sparkle x={x0 + markW * 0.9} y={cy - markH * 0.55} at={at + 26} size={54} color={C.coral} />
    </AbsoluteFill>
  );
};
