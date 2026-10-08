import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mark } from "../brand/Mark";
import { E, clamp, keys, mix, mixColor, tw } from "../lib/ease";
import { MARK_H, MARK_W } from "../lib/logo";
import { BRAND, C, FONT, ACCENT_RGB } from "../theme";
import { useLayout } from "./format";
import { Impact, Sheen, ShineText, Sparkle, Sparkles, springAt } from "./fx";
import { Letters, measure } from "./type";

/**
 * The end card every film shares, in any format:
 *   final hit  → a coral point ignites (Impact), the pen draws the mark, a light
 *                runs along the stroke, "brainfast." rises letter by letter
 *   tagline    → lights word by word on the voice (tag = 5 word frames)
 *   CTA        → the lockup lifts, the pill springs in with a sheen, the URL
 *                shines, a tap ripples the button
 * Lockup geometry = the landing's Logo: mark height 2/3 of the font size, gap
 * 1/15 em, the brand sans at BRAND.wordmarkWeight / wordmarkTracking. A brand
 * whose logo file already contains the name sets wordmark "": the mark is then
 * shown alone, larger.
 */
export const Lockup: React.FC<{
  hit: number;
  tag: number[];
  ctaAt: number;
  urlAt: number;
  cta?: string;
  dark?: boolean;
  /** the line under the wordmark, lit word by word on `tag` (default: the brand tagline) */
  tagline?: string[];
}> = ({ hit, tag, ctaAt, urlAt, cta = BRAND.ctaDefault, dark = false, tagline = BRAND.tagline }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  if (f < hit - 4) return null;
  const ink = dark ? C.cream : C.ink;
  const FS = L.lockup.size;
  const k = FS / 158;
  const markH = BRAND.wordmark ? FS * (40 / 60) : Math.min(FS * 1.6, (L.W * 0.62 * MARK_H) / MARK_W);
  const markW = (markH * MARK_W) / MARK_H;
  const gap = BRAND.wordmark ? FS * (4 / 60) : 0;
  const textW = BRAND.wordmark ? measure(BRAND.wordmark, FS, BRAND.wordmarkWeight, BRAND.wordmarkTracking) : 0;
  const total = markW + gap + textW;
  const lift = tw(f, ctaAt - 10, ctaAt + 12, 0, 1, E.expoInOut);
  const cy = L.lockup.cy - lift * 90 * k;
  const x0 = L.cx - total / 2;
  const draw = tw(f, hit, hit + 20, 0, 1, E.cubicInOut);
  const flash = keys(f, [[hit + 19, 0], [hit + 22, 1], [hit + 34, 0]], E.cubicInOut);
  const shine = tw(f, hit + 30, hit + 56, 0, 1, E.cubicInOut) * 1.18;
  const ctaS = springAt(f, ctaAt, 30, 12, 150);
  const url = springAt(f, urlAt, 30, 14, 170);
  const tapAt = urlAt + 26;
  const press = keys(f, [[tapAt - 3, 1], [tapAt, 0.94], [tapAt + 8, 1]], E.cubicInOut);
  const ripple = tw(f, tapAt, tapAt + 24, 0, 1, E.expoOut);
  const dot = tw(f, hit - 4, hit, 0, 1, E.expoOut);
  const ctaTop = cy + 445 * k;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {f < hit + 1 ? (
        <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0 }}>
          <circle cx={L.cx} cy={cy} r={(8 + 12 * dot) * k} fill={C.coral} />
        </svg>
      ) : null}
      <Impact x={L.cx} y={cy} at={hit} dark={dark} scale={k} />
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
      <div style={{ position: "absolute", left: x0 + markW + gap, top: cy, transform: "translateY(-50%)", fontSize: FS, fontWeight: BRAND.wordmarkWeight, letterSpacing: `${BRAND.wordmarkTracking}em`, lineHeight: 1, color: ink }}>
        <Letters text={BRAND.wordmark} at={hit + 4} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + 140 * k, textAlign: "center", fontSize: 74 * k, fontWeight: 600, letterSpacing: "-0.035em", color: ink, opacity: tw(f, tag[0] - 12, tag[0] - 2, 0, 1, E.linear) }}>
        {tagline.map((w, i) => {
          const t = tw(f, tag[i] - 3, tag[i] + 9, 0, 1, E.expoOut);
          const last = i === tagline.length - 1;
          return (
            <span key={i} style={{ display: "inline-block", marginRight: last ? 0 : "0.24em", opacity: 0.18 + 0.82 * t, transform: `translateY(${(1 - t) * 16 * k}px)`, color: last ? mixColor(ink, C.coral, t) : ink, fontStyle: last ? "italic" : "normal" }}>
              {last ? (
                <ShineText at={tag[i] + 8} base={mixColor(ink, C.coral, t)} hi={dark ? "#FFFFFF" : "#FFC2BA"}>
                  {w}
                </ShineText>
              ) : (
                w
              )}
            </span>
          );
        })}
      </div>
      {f >= ctaAt ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: ctaTop, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 * k }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, boxShadow: `0 0 0 ${ripple * 34 * k}px rgba(${ACCENT_RGB},${0.35 * (1 - ripple)})`, opacity: f >= tapAt ? 1 : 0 }} />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 22 * k,
                padding: `${30 * k}px ${30 * k}px ${30 * k}px ${50 * k}px`,
                borderRadius: 999,
                background: dark ? C.cream : C.ink,
                color: dark ? C.ink : C.cream,
                fontSize: 46 * k,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                transform: `scale(${mix(0.6, 1, clamp(ctaS)) * press})`,
                opacity: clamp(ctaS * 2),
                whiteSpace: "nowrap",
                overflow: "hidden",
                boxShadow: dark ? `0 30px 80px rgba(0,0,0,.5), 0 0 60px rgba(${ACCENT_RGB},.25)` : "0 30px 60px rgba(23,23,23,.22)",
              }}
            >
              {cta}
              <div style={{ width: 70 * k, height: 70 * k, borderRadius: 35 * k, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={32 * k} height={32 * k} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
              <Sheen at={ctaAt + 14} dur={22} opacity={0.35} color={dark ? ACCENT_RGB : "255,255,255"} />
            </div>
          </div>
          <div style={{ fontSize: 54 * k, fontWeight: 650, letterSpacing: "-0.02em", opacity: clamp(url * 2), transform: `translateY(${(1 - clamp(url)) * 20 * k}px)` }}>
            <ShineText at={urlAt + 10} base={C.coral} hi={dark ? "#FFFFFF" : "#FFD9D4"}>
              {BRAND.url}
            </ShineText>
          </div>
        </div>
      ) : null}
      {f >= ctaAt ? <Sparkles x={L.cx - 420 * k} y={ctaTop} w={840 * k} h={130 * k} at={ctaAt + 10} color={dark ? C.cream : C.coral} size={40 * k} seed={4} /> : null}
      <Sparkle x={x0 + markW * 0.9} y={cy - markH * 0.55} at={hit + 26} size={54 * k} color={dark ? C.cream : C.coral} />
    </AbsoluteFill>
  );
};

/** Small logo, top-left of the safe area, from `from` to `to`. */
export const Bug: React.FC<{ from: number; to: number; dark?: boolean }> = ({ from, to, dark = false }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  const v = tw(f, from, from + 14, 0, 1, E.expoOut) * tw(f, to - 10, to, 1, 0, E.expoIn);
  if (v <= 0.001) return null;
  const s = L.bug.size;
  return (
    <div style={{ position: "absolute", left: L.bug.x, top: L.bug.y, display: "flex", alignItems: "center", gap: s / 6, opacity: v, transform: `translateY(${(1 - v) * -12}px)` }}>
      <Mark height={s} color={C.coral} />
      <span style={{ fontFamily: FONT, fontWeight: BRAND.wordmarkWeight, fontSize: s * 0.95, letterSpacing: `${BRAND.wordmarkTracking}em`, color: dark ? C.cream : C.ink, lineHeight: 1 }}>{BRAND.wordmark}</span>
    </div>
  );
};
