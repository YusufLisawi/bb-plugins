import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mark } from "../../components/Mark";
import { measure } from "../../components/Type";
import { E, clamp, keys, mix, mixColor, tw } from "../../lib/ease";
import { MARK_H, MARK_W } from "../../lib/logo";
import { C, FONT } from "../../theme";
import { Burst, Ring, Sheen, ShineText, Sparkle, Sparkles, springAt } from "../../fx2/Fx2";
import { CREAM } from "../components/Glass";
import { HIT, ws } from "../timing";

/** 32.2 s → end, on the dark stage: the lockup draws itself, then "Try it for free". */
const FS = 158;
const CY = 860;

export const End: React.FC = () => {
  const f = useCurrentFrame();
  const at = HIT;
  if (f < at - 4) return null;
  const markH = FS * (40 / 60);
  const markW = (markH * MARK_W) / MARK_H;
  const gap = FS * (4 / 60);
  const textW = measure("brainfast.", FS, 600, -0.025);
  const total = markW + gap + textW;
  const lift = tw(f, ws("l12", 0) - 12, ws("l12", 0) + 10, 0, 1, E.expoInOut);
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
  const ctaAt = ws("l12", 0) - 2;
  const ctaS = springAt(f, ctaAt, 30, 12, 150);
  const url = springAt(f, ws("l12", 5) - 4, 30, 14, 170);
  const tapAt = ws("l12", 5) + 22;
  const press = keys(f, [[tapAt - 3, 1], [tapAt, 0.94], [tapAt + 8, 1]], E.cubicInOut);
  const ripple = tw(f, tapAt, tapAt + 24, 0, 1, E.expoOut);
  const dot = tw(f, at - 4, at, 0, 1, E.expoOut);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {f < at + 1 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <circle cx={540} cy={cy} r={8 + 12 * dot} fill={C.coral} />
          <circle cx={540} cy={cy} r={40 + 50 * dot} fill={C.coral} opacity={0.2 * dot} />
        </svg>
      ) : null}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 540px ${cy}px, rgba(255,240,234,.7) 0%, rgba(217,87,89,.3) 22%, rgba(217,87,89,0) 55%)`, opacity: (1 - tw(f, at, at + 16, 0, 1, E.cubicInOut)) * (f >= at ? 1 : 0) }} />
      <Ring x={540} y={cy} at={at} r={1000} width={30} color={C.coral} dur={34} />
      <Ring x={540} y={cy} at={at + 3} r={760} width={10} color={C.coralLight} dur={30} opacity={0.7} />
      <Burst x={540} y={cy} at={at} n={20} r0={60} r1={460} colors={[C.coral, CREAM, C.coralLight]} width={7} dur={30} />
      <div style={{ position: "absolute", left: x0 - 220, top: cy - 260, width: markW + 440, height: 520, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(217,87,89,.28) 0%, rgba(217,87,89,0) 70%)", opacity: draw }} />
      <div style={{ position: "absolute", left: x0, top: cy - markH / 2, transform: `scale(${1 + 0.05 * flash})`, transformOrigin: "50% 50%" }}>
        <Mark height={markH} progress={draw} color={mixColor(C.coral, C.coralLight, flash)} />
        {draw < 1 ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark height={markH} progress={draw} start={draw} head={CREAM} headScale={0.6} opacity={draw > 0.01 ? 1 : 0} />
          </div>
        ) : null}
        {shine > 0 && shine < 1.18 ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark height={markH} progress={Math.min(1, shine)} start={Math.max(0, shine - 0.18)} color="#FFFFFF" stroke={8} opacity={0.95} />
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: x0 + markW + gap, top: cy, transform: "translateY(-50%)", fontSize: FS, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1, color: CREAM, whiteSpace: "pre" }}>
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
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + 140, textAlign: "center", fontSize: 74, fontWeight: 600, letterSpacing: "-0.035em", color: CREAM, opacity: tw(f, ws("l11", 1) - 12, ws("l11", 1) - 2, 0, 1, E.linear) }}>
        {tag.map((w, k) => {
          const t = tw(f, ws("l11", w.i) - 3, ws("l11", w.i) + 9, 0, 1, E.expoOut);
          const last = k === tag.length - 1;
          return (
            <span key={k} style={{ display: "inline-block", marginRight: last ? 0 : "0.24em", opacity: 0.2 + 0.8 * t, transform: `translateY(${(1 - t) * 16}px)`, color: last ? mixColor(CREAM, C.coral, t) : CREAM, fontStyle: last ? "italic" : "normal" }}>
              {last ? (
                <ShineText at={ws("l11", 5) + 8} base={mixColor(CREAM, C.coral, t)} hi="#FFFFFF">
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
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, boxShadow: `0 0 0 ${ripple * 34}px rgba(217,87,89,${0.4 * (1 - ripple)})`, opacity: f >= tapAt ? 1 : 0 }} />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "30px 30px 30px 54px",
                borderRadius: 999,
                background: CREAM,
                color: C.ink,
                fontSize: 50,
                fontWeight: 650,
                letterSpacing: "-0.02em",
                transform: `scale(${mix(0.6, 1, clamp(ctaS)) * press})`,
                opacity: clamp(ctaS * 2),
                whiteSpace: "nowrap",
                overflow: "hidden",
                boxShadow: "0 30px 80px rgba(0,0,0,.5), 0 0 60px rgba(217,87,89,.25)",
              }}
            >
              Try it for free
              <div style={{ width: 72, height: 72, borderRadius: 36, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
              <Sheen at={ctaAt + 14} dur={22} opacity={0.5} color="217,87,89" />
            </div>
          </div>
          <div style={{ fontSize: 56, fontWeight: 650, letterSpacing: "-0.02em", opacity: clamp(url * 2), transform: `translateY(${(1 - clamp(url)) * 20}px)` }}>
            <ShineText at={ws("l12", 5) + 6} base={C.coral} hi="#FFFFFF">
              brainfast.ai
            </ShineText>
          </div>
        </div>
      ) : null}
      {f >= ctaAt ? <Sparkles x={150} y={1215} w={780} h={130} at={ctaAt + 10} color={CREAM} size={40} seed={6} /> : null}
      <Sparkle x={x0 + markW * 0.9} y={cy - markH * 0.55} at={at + 26} size={54} color={CREAM} />
    </AbsoluteFill>
  );
};
