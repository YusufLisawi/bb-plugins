import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { useLayout } from "../../kit/format";
import { Grain, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { ChannelGlyph, Cursor, Icon, IconName } from "../../kit/ui";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/chatgpt-vs-claude/vo/lines.json";
import words from "../../../../public/films/chatgpt-vs-claude/vo/words.json";

loadFonts();

/**
 * CHATGPT VS CLAUDE VS GEMINI — AI, explained · 02. A notebook explainer:
 * all three are LLMs (next-word guessers), made by different companies; the
 * app is not the brain; which brain leads changes every few months; for a
 * business what matters is what the brain knows and where it helps.
 * Marker strokes draw themselves; sticky notes; a live next-word demo; an X-ray.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);

/* ── beats ── */
const DEAL = [T.ws("l01", 0), T.ws("l01", 1), T.ws("l01", 2)];
const EQ = T.ws("l02", 2);
const Q = T.ws("l02", 3);
const NOT = T.ws("l03", 1);
const MINUTE = T.ws("l03", 6);
const LLM = T.ws("l04", 3);
const WORDS3 = [T.ws("l04", 4), T.ws("l04", 5), T.ws("l04", 6)];
const READ = T.ws("l05", 1);
const TRICK = T.ws("l05", 12);
const TYPE = T.ws("l06", 0);
const CANDS = [T.ws("l06", 3), T.ws("l06", 4), T.ws("l06", 5)];
const PICK = T.lineEnd("l06") + 4;
const FAST = T.ws("l07", 2);
const THINK = T.ws("l07", 13);
const MAKERS = [T.ws("l08", 4), T.ws("l08", 7), T.ws("l08", 10)];
const CONFUSE = T.ws("l09", 0);
const APP = T.ws("l10", 3);
const XRAY = T.ws("l10", 4);
const INSIDE = T.ws("l10", 8);
const ALL3 = T.ws("l11", 2);
const BEST = T.ws("l12", 5);
const TURNS = T.ws("l12", 8);
const AHEAD = T.ws("l12", 16);
const WRONG = T.ws("l13", 5);
const KNOWS = [T.ws("l13", 13), T.ws("l13", 14), T.ws("l13", 15)];
const WHERE = T.ws("l13", 17);
const BF = T.ws("l14", 1);
const OPTS = [T.ws("l14", 6), T.ws("l14", 7), T.ws("l14", 9)];
const TEACH = T.ws("l14", 11);
const COLLAPSE: [number, number] = [T.ws("l15", 0) - 16, T.ws("l15", 0) - 2];
const HIT = T.ws("l15", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => T.ws("l15", i));
const CTA = T.ws("l16", 0) - 2;
const URL = T.ws("l16", T.nwords("l16") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l16") + 60);

/* ── the three, in neutral colours (no logos) ── */
const BRAINS = [
  { app: "ChatGPT", model: "GPT", maker: "OpenAI", color: "#1F7A63" },
  { app: "Claude", model: "Claude", maker: "Anthropic", color: "#C8703F" },
  { app: "Gemini", model: "Gemini", maker: "Google", color: "#4A6CF7" },
];
const INK = "#1D1B19";
const HILITE = "#FFE27A";
const PAPER = "#FBF8F1";

/** A marker stroke that draws itself (pathLength-normalised). */
const Scribble: React.FC<{ d: string; at: number; dur?: number; color?: string; width?: number; out?: number; tf?: string }> = ({ d, at, dur = 12, color = INK, width = 8, out = 1e9, tf }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  const t = tw(f, at, at + dur, 0, 1, E.cubicInOut);
  const o = 1 - tw(f, out, out + 8, 0, 1, E.linear);
  if (t <= 0 || o <= 0) return null;
  return (
    <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      <path d={d} transform={tf} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - t} opacity={o} />
    </svg>
  );
};

/** In/out visibility for a scene window. */
const win = (f: number, a: number, b: number, inDur = 10, outDur = 10) => tw(f, a, a + inDur, 0, 1, E.expoOut) * (1 - tw(f, b, b + outDur, 0, 1, E.expoIn));

const Paper: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(70,110,190,.10) 2px, transparent 2px), linear-gradient(90deg, rgba(70,110,190,.10) 2px, transparent 2px)", backgroundSize: "54px 54px", backgroundPosition: `0 ${-(f * 0.3) % 54}px` }} />
    <div style={{ position: "absolute", left: 104, top: 0, bottom: 0, width: 3, background: "rgba(217,87,89,.28)" }} />
  </AbsoluteFill>
);

const AppTile: React.FC<{ b: (typeof BRAINS)[number]; size?: number; xray?: number; label?: boolean }> = ({ b, size = 250, xray = 0, label = true }) => (
  <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, fontFamily: FONT }}>
    <div style={{ position: "relative", width: size, height: size, borderRadius: size * 0.26, background: b.color, boxShadow: `0 ${size * 0.1}px ${size * 0.2}px ${b.color}55, inset 0 -8px 0 rgba(0,0,0,.12)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ opacity: 1 - xray }}>
        <Icon name="message" size={size * 0.46} color="#FFFFFF" stroke={2.2} />
      </div>
      {xray > 0 ? (
        <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 3px, transparent 3px 7px)`, opacity: xray, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: size * 0.5, height: size * 0.5, borderRadius: size * 0.06, border: `${size * 0.018}px solid rgba(255,255,255,.95)`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.6, 1, xray)})` }}>
            {[0, 1, 2, 3].map((k) => (
              <React.Fragment key={k}>
                <div style={{ position: "absolute", left: `${22 + k * 18}%`, top: -size * 0.07, width: size * 0.018, height: size * 0.06, background: "rgba(255,255,255,.95)" }} />
                <div style={{ position: "absolute", left: `${22 + k * 18}%`, bottom: -size * 0.07, width: size * 0.018, height: size * 0.06, background: "rgba(255,255,255,.95)" }} />
              </React.Fragment>
            ))}
            <div style={{ fontFamily: FONT, fontSize: size * 0.1, fontWeight: 800, color: C.white, letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1 }}>{b.model}</div>
          </div>
        </div>
      ) : null}
    </div>
    {label ? <div style={{ fontSize: size * 0.18, fontWeight: 800, letterSpacing: "-0.035em", color: INK, whiteSpace: "nowrap" }}>{b.app}</div> : null}
  </div>
);

const Sticky: React.FC<{ x: number; y: number; at: number; rot?: number; w?: number; color?: string; children: React.ReactNode; out?: number }> = ({ x, y, at, rot = -3, w = 380, color = HILITE, children, out = 1e9 }) => {
  const f = useCurrentFrame();
  const s = clamp(springAt(f, at, 30, 12, 180));
  const o = 1 - tw(f, out, out + 8, 0, 1, E.expoIn);
  if (f < at - 1 || o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2) * o, background: color, padding: "22px 26px", boxShadow: "0 18px 30px rgba(60,40,0,.18)", fontFamily: FONT, color: INK }}>
      <div style={{ position: "absolute", left: "50%", top: -14, width: 110, height: 30, marginLeft: -55, background: "rgba(255,255,255,.55)", transform: "rotate(-2deg)" }} />
      {children}
    </div>
  );
};

/* ── S1: three apps, "same thing?" ── */
const Apps: React.FC<{ f: number }> = ({ f }) => {
  if (f > LLM + 4) return null;
  const out = tw(f, LLM - 16, LLM - 2, 0, 1, E.expoIn);
  const xs = [220, 540, 860];
  return (
    <>
      {BRAINS.map((b, i) => {
        const s = clamp(springAt(f, DEAL[i] - 6, 30, 12, 150));
        return (
          <div key={b.app} style={{ position: "absolute", left: xs[i], top: 1130, transform: `translate(-50%, -50%) translateY(${(1 - s) * -900 - out * 1300}px) rotate(${(1 - s) * (i - 1) * 30 + (i - 1) * 3}deg)`, opacity: clamp(s * 3) }}>
            <AppTile b={b} size={250} />
          </div>
        );
      })}
      {[380, 700].map((x, i) => (
        <React.Fragment key={x}>
          <Scribble d={`M ${x - 30} ${1086} L ${x + 30} ${1082}`} at={EQ + i * 3} color={INK} width={10} out={LLM - 16} />
          <Scribble d={`M ${x - 30} ${1120} L ${x + 30} ${1116}`} at={EQ + 3 + i * 3} color={INK} width={10} out={LLM - 16} />
          <Scribble d={`M ${x + 30} ${1050} L ${x - 30} ${1156}`} at={NOT + i * 4} color={C.coral} width={12} out={LLM - 16} />
        </React.Fragment>
      ))}
      {f >= Q && f < NOT + 6 ? (
        <div style={{ position: "absolute", left: 540, top: 780, transform: `translate(-50%, -50%) scale(${clamp(springAt(f, Q, 30, 10, 200))}) rotate(8deg)`, fontFamily: FONT, fontSize: 200, fontWeight: 900, color: C.coral, opacity: 1 - tw(f, NOT, NOT + 6, 0, 1, E.linear) }}>?</div>
      ) : null}
      <Sticky x={800} y={1500} at={MINUTE - 4} rot={5} w={320} out={LLM - 16}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Icon name="activity" size={44} color={INK} stroke={2.6} />
          <div style={{ fontSize: 44, fontWeight: 850, letterSpacing: "-0.03em" }}>1 minute</div>
        </div>
      </Sticky>
    </>
  );
};

/* ── S2: L L M ── */
const Acronym: React.FC<{ f: number }> = ({ f }) => {
  if (f < LLM - 6 || f > READ + 4) return null;
  const out = tw(f, READ - 14, READ - 2, 0, 1, E.expoIn);
  const rows = [["L", "arge"], ["L", "anguage"], ["M", "odels"]];
  return (
    <>
      {rows.map(([a, rest], i) => {
        const s = clamp(springAt(f, LLM - 4 + i * 3, 30, 12, 180));
        const n = Math.round(tw(f, WORDS3[i] - 2, WORDS3[i] + 8, 0, rest.length, E.linear));
        const y = 830 + i * 260;
        return (
          <div key={i} style={{ position: "absolute", left: 170, top: y, display: "flex", alignItems: "baseline", fontFamily: FONT, transform: `translateX(${out * -900}px)`, opacity: 1 - out }}>
            <div style={{ position: "relative", fontSize: 260, fontWeight: 900, color: C.coral, letterSpacing: "-0.04em", lineHeight: 0.9, transform: `scale(${mix(0.3, 1, s)})`, transformOrigin: "50% 80%", opacity: clamp(s * 2) }}>{a}</div>
            <div style={{ position: "relative", fontSize: 136, fontWeight: 800, color: INK, letterSpacing: "-0.045em", marginLeft: 6 }}>
              <div style={{ position: "absolute", left: -6, right: -10, bottom: 14, height: 44, background: HILITE, transformOrigin: "0 50%", transform: `scaleX(${tw(f, WORDS3[i] + 4, WORDS3[i] + 14, 0, 1, E.cubicInOut)})`, zIndex: 0 }} />
              <span style={{ position: "relative" }}>{rest.slice(0, n)}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ── S3: it read the internet, and learned one trick ── */
const BRAIN_D = "M540 900 C 470 850, 380 870, 380 950 C 320 980, 320 1070, 380 1100 C 370 1180, 460 1220, 540 1180 C 620 1220, 710 1180, 700 1100 C 760 1070, 760 980, 700 950 C 700 870, 610 850, 540 900 Z M540 900 L 540 1180 M450 980 C 480 990, 490 1020, 470 1050 M630 980 C 600 990, 590 1020, 610 1050";
const Reading: React.FC<{ f: number }> = ({ f }) => {
  if (f < READ - 4 || f > TYPE + 4) return null;
  const out = tw(f, TYPE - 14, TYPE - 2, 0, 1, E.expoIn);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      <Scribble d={BRAIN_D} at={READ - 2} dur={22} color={INK} width={10} tf="translate(540 1160) scale(1.25) translate(-540 -1040)" />
      {Array.from({ length: 16 }, (_, i) => {
        const at = READ + 4 + i * 4;
        const t = tw(f, at, at + 20, 0, 1, E.cubicIn);
        if (t <= 0 || t >= 1) return null;
        const a = rnd(i * 2.3) * Math.PI * 2;
        const sx = 540 + Math.cos(a) * 620;
        const sy = 1160 + Math.sin(a) * 620;
        return (
          <div key={i} style={{ position: "absolute", left: mix(sx, 540, t), top: mix(sy, 1160, t), transform: `translate(-50%, -50%) rotate(${(1 - t) * 90 * (rnd(i) - 0.5)}deg) scale(${mix(1, 0.2, t)})`, width: 70, height: 88, borderRadius: 8, background: C.white, boxShadow: "0 6px 14px rgba(0,0,0,.14)", padding: 10, boxSizing: "border-box" }}>
            {[0, 1, 2, 3].map((k) => (
              <div key={k} style={{ height: 6, marginTop: 7, borderRadius: 3, background: k === 0 ? BRAINS[i % 3].color : "#DDD8CE", width: `${[80, 100, 70, 90][k]}%` }} />
            ))}
          </div>
        );
      })}
      <Sticky x={540} y={1560} at={TRICK - 4} rot={-4} w={600}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em" }}>THE ONE TRICK</div>
        <div style={{ fontSize: 54, fontWeight: 850, letterSpacing: "-0.04em", lineHeight: 1.02, marginTop: 6 }}>Guess the next word.</div>
      </Sticky>
    </div>
  );
};

/* ── S4–S5: the next-word demo ── */
const CAND = [
  { w: "order", p: 62 },
  { w: "message", p: 21 },
  { w: "patience", p: 9 },
];
const MORE = "It ships tomorrow, and you'll get a tracking link by email.".split(" ");
const Demo: React.FC<{ f: number }> = ({ f }) => {
  if (f < TYPE - 6 || f > MAKERS[0] - 20) return null;
  const vis = win(f, TYPE - 6, MAKERS[0] - 44, 10, 10);
  const n = Math.round(tw(f, TYPE, TYPE + 12, 0, 15, E.linear));
  const pick = tw(f, PICK, PICK + 12, 0, 1, E.expoInOut);
  const listOut = tw(f, PICK + 6, PICK + 16, 0, 1, E.expoIn);
  const k = Math.floor(tw(f, FAST - 4, THINK - 6, 0, MORE.length, E.linear));
  const cloud = tw(f, THINK - 4, THINK + 12, 0, 1, E.cubicInOut);
  const caret = Math.floor(f / 8) % 2 === 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: vis }}>
      <div style={{ position: "absolute", left: 130, top: 800, width: 820, minHeight: 250, borderRadius: 34, background: C.white, boxShadow: "0 24px 50px rgba(40,30,10,.12)", padding: "34px 40px", boxSizing: "border-box", fontFamily: FONT, fontSize: 52, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.22, color: INK }}>
        {"Thanks for your".slice(0, n)}{" "}
        <span style={{ position: "relative", display: "inline-block", minWidth: pick > 0.5 ? 0 : 190 }}>
          <span style={{ position: "absolute", left: 0, right: 0, bottom: 4, height: 5, background: pick > 0.5 ? "transparent" : C.coral, opacity: caret || pick > 0 ? 1 : 0.3 }} />
          <span style={{ background: pick > 0.5 ? HILITE : "transparent", padding: "0 6px", borderRadius: 8, opacity: pick }}>order</span>
          {pick > 0.5 ? "!" : ""}
        </span>{" "}
        {MORE.slice(0, k).join(" ")}
        {k > 0 && k < MORE.length ? <span style={{ display: "inline-block", width: 5, height: 50, marginLeft: 4, verticalAlign: "-6px", background: C.coral }} /> : null}
      </div>
      {cloud > 0 ? (
        <Scribble tf="translate(0 40)" d="M 110 800 C 60 700, 220 640, 320 690 C 380 610, 560 610, 620 680 C 700 620, 900 640, 920 730 C 1010 760, 1010 900, 940 950 C 990 1040, 880 1100, 800 1060 C 740 1120, 560 1120, 500 1070 C 420 1120, 250 1110, 220 1040 C 110 1060, 60 960, 110 900 C 70 860, 80 820, 110 800 Z" at={THINK - 4} dur={18} color={C.coral} width={8} />
      ) : null}
      {cloud > 0 ? <Sparkles x={120} y={700} w={860} h={440} at={THINK + 10} color={C.coral} size={40} seed={5} /> : null}
      {/* candidates */}
      <div style={{ position: "absolute", left: 150, top: 1180, width: 780, opacity: 1 - listOut, transform: `translateY(${listOut * 40}px)` }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: "#6F6A62", marginBottom: 18 }}>NEXT WORD?</div>
        {CAND.map((c, i) => {
          const s = clamp(springAt(f, CANDS[i] - 2, 30, 14, 190));
          const bar = tw(f, CANDS[i], CANDS[i] + 14, 0, c.p, E.expoOut);
          return (
            <div key={c.w} style={{ display: "flex", alignItems: "center", gap: 22, height: 110, opacity: clamp(s * 2), transform: `translateX(${(1 - s) * 60}px)` }}>
              <div style={{ width: 240, fontFamily: FONT, fontSize: 52, fontWeight: 750, color: i === 0 ? INK : "#6F6A62", letterSpacing: "-0.03em" }}>{c.w}</div>
              <div style={{ flex: 1, height: 34, borderRadius: 17, background: "#EDE8DD", overflow: "hidden" }}>
                <div style={{ width: `${bar}%`, height: "100%", borderRadius: 17, background: i === 0 ? C.coral : "#B8B1A4" }} />
              </div>
              <div style={{ width: 110, textAlign: "right", fontFamily: MONO, fontSize: 36, color: i === 0 ? C.coral : "#6F6A62" }}>{Math.round(bar)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── S6–S7: who makes them; the app vs the brain inside ── */
const Makers: React.FC<{ f: number }> = ({ f }) => {
  if (f < T.VO.l08 - 10 || f > BEST + 6) return null;
  const inn = (i: number) => clamp(springAt(f, T.VO.l08 - 8 + i * 4, 30, 13, 160));
  const out = tw(f, BEST - 12, BEST + 2, 0, 1, E.expoIn);
  const focus = tw(f, APP - 18, APP - 4, 0, 1, E.expoInOut) * (1 - tw(f, ALL3 - 14, ALL3, 0, 1, E.expoInOut));
  const makersOut = tw(f, CONFUSE - 8, CONFUSE + 4, 0, 1, E.expoIn);
  const xs = [220, 540, 860];
  return (
    <>
      {BRAINS.map((b, i) => {
        const s = inn(i);
        const isFirst = i === 0;
        const x = isFirst ? mix(xs[0], 540, focus) : xs[i] + focus * (i === 1 ? 700 : 500);
        const size = isFirst ? mix(250, 480, focus) : 250;
        const xr = isFirst ? Math.max(tw(f, XRAY, XRAY + 14, 0, 1, E.cubicInOut)) : tw(f, ALL3 - 6 + i * 6, ALL3 + 8 + i * 6, 0, 1, E.cubicInOut);
        return (
          <div key={b.app} style={{ position: "absolute", left: x, top: mix(1120, 1150, focus), transform: `translate(-50%, -50%) scale(${mix(0.5, 1, s)}) translateY(${out * 1400}px)`, opacity: clamp(s * 2) * (isFirst ? 1 : 1 - focus) }}>
            <AppTile b={b} size={size} xray={xr} />
          </div>
        );
      })}
      {/* makers */}
      {BRAINS.map((b, i) => {
        const s = clamp(springAt(f, MAKERS[i] - 2, 30, 12, 190));
        if (f < MAKERS[i] - 3) return null;
        return (
          <div key={b.maker} style={{ position: "absolute", left: xs[i], top: 1450, transform: `translate(-50%, -50%) rotate(${(i - 1) * 3}deg) scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2) * (1 - makersOut), padding: "12px 24px", background: HILITE, boxShadow: "0 12px 24px rgba(60,40,0,.16)", fontFamily: FONT, fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: INK, whiteSpace: "nowrap" }}>
            {b.maker}
          </div>
        );
      })}
      {BRAINS.map((b, i) => (
        <Scribble key={b.app} d={`M ${xs[i]} 1405 C ${xs[i] + 14} 1385, ${xs[i] - 10} 1365, ${xs[i]} 1340`} at={MAKERS[i] + 2} dur={8} color={INK} width={6} out={CONFUSE - 8} />
      ))}
      {/* app vs brain labels */}
      <Scribble d="M 290 870 C 290 830, 310 810, 350 810 L 730 810 C 770 810, 790 830, 790 870" at={APP - 4} dur={12} color={C.coral} width={8} out={ALL3 - 14} />
      {f >= APP - 2 && f < ALL3 ? (
        <div style={{ position: "absolute", left: 540, top: 760, transform: `translate(-50%, -50%) scale(${clamp(springAt(f, APP - 2, 30, 12, 190))})`, opacity: 1 - tw(f, ALL3 - 14, ALL3 - 4, 0, 1, E.linear), fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: C.coral, background: PAPER, padding: "4px 14px" }}>THE APP</div>
      ) : null}
      {f >= INSIDE - 20 && f < ALL3 ? (
        <Sticky x={800} y={1560} at={INSIDE - 20} rot={4} w={360} out={ALL3 - 14}>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em" }}>INSIDE</div>
          <div style={{ fontSize: 44, fontWeight: 850, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 4 }}>GPT = the brain (the model)</div>
        </Sticky>
      ) : null}
      {BRAINS.map((b, i) =>
        f >= ALL3 ? (
          <div key={`lb${i}`} style={{ position: "absolute", left: xs[i], top: 1440, transform: "translate(-50%, -50%)", opacity: tw(f, ALL3 + 8 + i * 6, ALL3 + 16 + i * 6, 0, 1, E.linear) * (1 - out), fontFamily: MONO, fontSize: 22, letterSpacing: "0.1em", color: "#6F6A62", textAlign: "center", whiteSpace: "nowrap" }}>
            APP + BRAIN
          </div>
        ) : null,
      )}
    </>
  );
};

/* ── S8: they take turns ── */
const CH = { x: 150, y: 900, w: 800, h: 620 };
const series = [
  [0.3, 0.55, 0.5, 0.62, 0.9, 0.82, 0.78],
  [0.2, 0.35, 0.7, 0.66, 0.7, 0.92, 0.84],
  [0.1, 0.25, 0.45, 0.8, 0.75, 0.8, 0.95],
];
const Race: React.FC<{ f: number }> = ({ f }) => {
  if (f < BEST - 8 || f > KNOWS[0] - 6) return null;
  const vis = win(f, BEST - 8, WRONG + 30, 10, 12);
  const draw = tw(f, T.ws("l12", 6) - 4, AHEAD + 6, 0, 1, E.linear);
  const pts = (s: number[]) => s.map((v, i) => [CH.x + (i / (s.length - 1)) * CH.w, CH.y + CH.h - v * CH.h] as const);
  const path = (s: number[]) => pts(s).map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  // who leads at the drawing head
  const idx = draw * (series[0].length - 1);
  const valAt = (s: number[]) => {
    const i = Math.min(s.length - 2, Math.floor(idx));
    return mix(s[i], s[i + 1], idx - i);
  };
  const vals = series.map(valAt);
  const lead = vals.indexOf(Math.max(...vals));
  const hx = CH.x + draw * CH.w;
  const hy = CH.y + CH.h - vals[lead] * CH.h;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: vis }}>
      <Scribble d={`M ${CH.x} ${CH.y - 20} L ${CH.x} ${CH.y + CH.h} L ${CH.x + CH.w + 20} ${CH.y + CH.h}`} at={BEST - 6} dur={12} width={7} />
      <div style={{ position: "absolute", left: CH.x + CH.w - 160, top: CH.y + CH.h + 18, fontFamily: MONO, fontSize: 24, letterSpacing: "0.1em", color: "#6F6A62" }}>TIME →</div>
      <div style={{ position: "absolute", left: CH.x + 16, top: CH.y - 60, fontFamily: MONO, fontSize: 24, letterSpacing: "0.1em", color: "#6F6A62" }}>↑ BEST RIGHT NOW</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {series.map((s, i) => (
          <path key={i} d={path(s)} pathLength={1} fill="none" stroke={BRAINS[i].color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        ))}
      </svg>
      {draw > 0.02 ? (
        <div style={{ position: "absolute", left: hx, top: hy - 60, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg width={60} height={44} viewBox="0 0 60 44"><path d="M4 40 L 8 10 L 20 24 L 30 4 L 40 24 L 52 10 L 56 40 Z" fill="#F2B544" stroke={INK} strokeWidth={3} strokeLinejoin="round" /></svg>
          <div style={{ marginTop: 4, padding: "4px 12px", borderRadius: 999, background: BRAINS[lead].color, color: C.white, fontFamily: FONT, fontSize: 26, fontWeight: 750, whiteSpace: "nowrap" }}>{BRAINS[lead].model}</div>
        </div>
      ) : null}
      <Scribble d={`M ${CH.x - 20} ${CH.y - 30} L ${CH.x + CH.w + 20} ${CH.y + CH.h + 30} M ${CH.x + CH.w + 20} ${CH.y - 30} L ${CH.x - 20} ${CH.y + CH.h + 30}`} at={WRONG - 2} dur={12} color={C.coral} width={16} />
    </div>
  );
};

/* ── S9: what matters: what it knows, where it helps ── */
const Matters: React.FC<{ f: number }> = ({ f }) => {
  if (f < KNOWS[0] - 12 || f > BF + 10) return null;
  const vis = win(f, KNOWS[0] - 12, BF - 6, 10, 12);
  const notes = [["your prices", -5, 250, 980], ["your hours", 4, 830, 950], ["your policies", -3, 540, 1440]] as const;
  const chans: { ch: "web" | "whatsapp" | "instagram"; x: number }[] = [
    { ch: "web", x: 330 },
    { ch: "whatsapp", x: 540 },
    { ch: "instagram", x: 750 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: vis }}>
      <Scribble d="M540 960 C 480 915, 400 935, 400 1000 C 350 1025, 350 1105, 400 1130 C 392 1195, 470 1230, 540 1195 C 610 1230, 688 1195, 680 1130 C 730 1105, 730 1025, 680 1000 C 680 935, 600 915, 540 960 Z M540 960 L 540 1195" at={KNOWS[0] - 10} dur={16} color={INK} width={10} tf="translate(540 1170) scale(1.2) translate(-540 -1077)" />
      {notes.map(([t, rot, x, y], i) => (
        <Sticky key={t} x={x} y={y} at={KNOWS[i] - 2} rot={rot} w={300}>
          <div style={{ fontSize: 42, fontWeight: 850, letterSpacing: "-0.03em" }}>{t}</div>
        </Sticky>
      ))}
      {chans.map((c, i) => {
        const s = clamp(springAt(f, WHERE + i * 4, 30, 12, 190));
        return (
          <div key={c.ch} style={{ position: "absolute", left: c.x, top: 1590, transform: `translate(-50%, -50%) scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2), width: 120, height: 120, borderRadius: 34, background: C.white, boxShadow: "0 14px 30px rgba(40,30,10,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChannelGlyph ch={c.ch} size={62} />
          </div>
        );
      })}
    </div>
  );
};

/* ── S10: in Brainfast, pick the brain (the real model selector) ── */
const Picker: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f < BF - 10 || f > COLLAPSE[1] + 2) return null;
  const s = clamp(springAt(f, BF - 6, 30, 14, 150));
  const open = tw(f, T.ws("l14", 3) - 2, T.ws("l14", 3) + 8, 0, 1, E.expoOut);
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const picked = f >= OPTS[2] + 12;
  const hot = OPTS.map((o, i) => (f >= o - 2 && f < (OPTS[i + 1] ?? OPTS[2] + 12) - 2 ? 1 : 0));
  const knowledge = clamp(springAt(f, TEACH, 30, 13, 180));
  const cy = (i: number) => 1030 + i * 108;
  const cur = { x: keys(f, [[OPTS[0] - 10, 980], [OPTS[0], 760], [OPTS[1], 760], [OPTS[2], 760], [OPTS[2] + 10, 760]], E.expoInOut), y: keys(f, [[OPTS[0] - 10, 1300], [OPTS[0], cy(0) + 40], [OPTS[1], cy(1) + 40], [OPTS[2], cy(2) + 40], [OPTS[2] + 10, cy(1) + 40]], E.expoInOut) };
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${L.cx}px ${L.lockup.cy}px`, transform: `scale(${1 - 0.95 * col})`, opacity: 1 - tw(col, 0.7, 1, 0, 1, E.linear) }}>
      <div style={{ position: "absolute", left: 130, top: 700, width: 820, transform: `translateY(${(1 - s) * 500}px)`, opacity: clamp(s * 2), borderRadius: 40, background: C.white, boxShadow: "0 40px 90px rgba(40,30,10,.16)", fontFamily: FONT, color: C.ink, padding: "30px 36px 36px", boxSizing: "border-box", minHeight: 700 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark height={34} color={C.cream} stroke={26} />
          </div>
          <div>
            <div style={{ fontSize: 34, fontWeight: 750, letterSpacing: "-0.03em" }}>Your agent</div>
            <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray }}>CORE SETTINGS</div>
          </div>
        </div>
        <div style={{ marginTop: 34, fontSize: 26, fontWeight: 650 }}>AI model</div>
        <div style={{ marginTop: 12, height: 90, borderRadius: 22, boxShadow: `inset 0 0 0 ${open > 0.5 ? 3 : 2}px ${open > 0.5 ? C.ink : "#E3E0D8"}`, display: "flex", alignItems: "center", padding: "0 26px", fontSize: 32, color: picked ? C.ink : C.gray2, fontWeight: picked ? 700 : 500 }}>
          {picked ? (
            <>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: BRAINS[1].color, marginRight: 14 }} />
              Claude
            </>
          ) : (
            "Select an AI model..."
          )}
          <div style={{ flex: 1 }} />
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth={2.6} strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
        {open > 0 && !picked ? (
          <div style={{ marginTop: 10, borderRadius: 24, boxShadow: "0 20px 44px rgba(23,23,23,.16), inset 0 0 0 2px #EEEBE3", background: C.white, overflow: "hidden", transform: `scaleY(${open})`, transformOrigin: "50% 0%" }}>
            <div style={{ height: 76, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", borderBottom: "2px solid #F0EDE6", fontSize: 28, color: C.gray2 }}>
              <Icon name="search" size={26} color={C.gray2} stroke={2.4} />
              Search models...
            </div>
            {BRAINS.map((b, i) => (
              <div key={b.model} style={{ height: 108, display: "flex", alignItems: "center", gap: 18, padding: "0 24px", background: hot[i] ? "#F4F2EC" : C.white }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: b.color }} />
                <div style={{ fontSize: 36, fontWeight: 750, letterSpacing: "-0.02em" }}>{b.model}</div>
                <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.08em", color: C.gray }}>{b.maker.toUpperCase()}</div>
              </div>
            ))}
          </div>
        ) : null}
        {picked ? (
          <div style={{ marginTop: 34, transform: `translateY(${(1 - knowledge) * 40}px)`, opacity: clamp(knowledge * 2) }}>
            <div style={{ fontSize: 26, fontWeight: 650, marginBottom: 14 }}>Knowledge</div>
            {[
              ["globe", "Your website"],
              ["file", "Price list.pdf"],
              ["help", "Your FAQs"],
            ].map(([ic, t], i) => {
              const at = TEACH + 2 + i * 5;
              const ss = clamp(springAt(f, at, 30, 14, 190));
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, height: 72, opacity: clamp(ss * 2), transform: `translateX(${(1 - ss) * 50}px)` }}>
                  <div style={{ width: 50, height: 50, borderRadius: 16, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={ic as IconName} size={28} color={C.coral} stroke={2.3} />
                  </div>
                  <div style={{ flex: 1, fontSize: 32, fontWeight: 650 }}>{t}</div>
                  <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.green }}>READY</div>
                </div>
              );
            })}
          </div>
        ) : null}
        <Sheen at={OPTS[2] + 14} dur={20} opacity={0.5} />
      </div>
      {f >= OPTS[0] - 12 && f < OPTS[2] + 18 ? <Cursor x={cur.x} y={cur.y} press={f >= OPTS[2] + 8 && f < OPTS[2] + 14 ? 1 : 0} opacity={1 - tw(f, OPTS[2] + 12, OPTS[2] + 18, 0, 1, E.linear)} /> : null}
    </div>
  );
};

const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, COLLAPSE[0], COLLAPSE[0] + 8, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, transform: `translateY(${(1 - s) * -20}px)`, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: INK }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: C.coral, boxShadow: `0 0 0 ${5 + 3 * Math.sin(f * 0.15)}px rgba(217,87,89,.18)` }} />
      AI, EXPLAINED · 02
    </div>
  );
};

const H: React.FC<{ from: number; to: number; words: { t: string; at: number; hi?: boolean; br?: boolean }[]; size?: number }> = ({ from, to, words: w, size }) => <Kinetic from={from} to={to} size={size} color={INK} hi={C.coral} words={w} />;
const Headlines: React.FC = () => (
  <>
    <H from={T.VO.l02 - 1} to={T.VO.l03 - 9} words={[{ t: "Same", at: T.ws("l02", 0) }, { t: "thing,", at: T.ws("l02", 1), br: true }, { t: "different", at: T.ws("l02", 2) }, { t: "logo?", at: T.ws("l02", 3), hi: true }]} />
    <H from={T.VO.l03 - 1} to={T.VO.l04 - 9} size={120} words={[{ t: "Not", at: T.ws("l03", 0) }, { t: "quite.", at: T.ws("l03", 1), hi: true }]} />
    <H from={T.VO.l04 - 1} to={T.VO.l05 - 9} words={[{ t: "All", at: T.ws("l04", 0) }, { t: "three", at: T.ws("l04", 1) }, { t: "are", at: T.ws("l04", 2), br: true }, { t: "LLMs.", at: T.ws("l04", 3), hi: true }]} />
    <H from={T.VO.l05 - 1} to={T.VO.l06 - 9} words={[{ t: "They", at: T.ws("l05", 0) }, { t: "read", at: T.ws("l05", 1) }, { t: "the", at: T.ws("l05", 6), br: true }, { t: "internet.", at: T.ws("l05", 7), hi: true }]} />
    <H from={T.VO.l07 - 1} to={T.ws("l07", 7) - 9} words={[{ t: "Over", at: T.ws("l07", 2) }, { t: "and", at: T.ws("l07", 3) }, { t: "over,", at: T.ws("l07", 4), br: true }, { t: "really", at: T.ws("l07", 5) }, { t: "fast.", at: T.ws("l07", 6), hi: true }]} />
    <H from={T.ws("l07", 7) - 1} to={T.VO.l08 - 9} words={[{ t: "Sounds", at: T.ws("l07", 11) }, { t: "like", at: T.ws("l07", 12), br: true }, { t: "thinking.", at: T.ws("l07", 13), hi: true }]} />
    <H from={T.VO.l08 - 1} to={T.VO.l09 - 9} words={[{ t: "Three", at: T.ws("l08", 0) }, { t: "makers.", at: T.ws("l08", 4), hi: true }]} />
    <H from={T.VO.l09 - 1} to={T.VO.l10 - 9} words={[{ t: "What", at: T.ws("l09", 2) }, { t: "confuses", at: T.ws("l09", 3), br: true }, { t: "everyone:", at: T.ws("l09", 4), hi: true }]} />
    <H from={T.VO.l10 - 1} to={T.VO.l12 - 9} words={[{ t: "ChatGPT", at: T.ws("l10", 0) }, { t: "= app.", at: T.ws("l10", 3), br: true }, { t: "GPT", at: T.ws("l10", 4), hi: true }, { t: "= brain.", at: T.ws("l10", 7), hi: true }]} />
    <H from={T.VO.l12 - 1} to={TURNS - 12} words={[{ t: "Which", at: T.ws("l12", 1) }, { t: "brain", at: T.ws("l12", 2), br: true }, { t: "is", at: T.ws("l12", 3) }, { t: "best?", at: T.ws("l12", 5), hi: true }]} />
    <H from={TURNS - 10} to={T.VO.l13 - 9} words={[{ t: "They", at: T.ws("l12", 6) }, { t: "take", at: T.ws("l12", 7) }, { t: "turns.", at: T.ws("l12", 8), hi: true }]} />
    <H from={T.VO.l13 - 1} to={T.ws("l13", 7) - 9} words={[{ t: "Wrong", at: T.ws("l13", 5), hi: true }, { t: "question.", at: T.ws("l13", 6), hi: true }]} />
    <H from={T.ws("l13", 7) - 1} to={T.VO.l14 - 9} words={[{ t: "What", at: T.ws("l13", 7) }, { t: "does", at: T.ws("l13", 8) }, { t: "it", at: T.ws("l13", 9), br: true }, { t: "know", at: T.ws("l13", 13) }, { t: "about", at: T.ws("l13", 14) }, { t: "you?", at: T.ws("l13", 15), hi: true }]} />
    <H from={T.VO.l14 - 1} to={COLLAPSE[0]} words={[{ t: "Pick", at: T.ws("l14", 3) }, { t: "the", at: T.ws("l14", 4) }, { t: "brain.", at: T.ws("l14", 5), hi: true, br: true }, { t: "Teach", at: T.ws("l14", 11) }, { t: "it", at: T.ws("l14", 12) }, { t: "you.", at: T.ws("l14", 14), hi: true }]} />
  </>
);

export const ChatVsClaude: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT }}>
      <Paper f={f} />
      <Apps f={f} />
      <Acronym f={f} />
      <Reading f={f} />
      <Demo f={f} />
      <Makers f={f} />
      <Race f={f} />
      <Matters f={f} />
      <Picker f={f} />
      <Series f={f} />
      <Headlines />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("films/chatgpt-vs-claude/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  ...DEAL.map((d, i) => cue(d - 2, "whoosh", -8, `card ${i + 1} dealt`)),
  ...DEAL.map((d, i) => cue(d + 2, "snap", -3, `card ${i + 1} lands`)),
  cue(EQ, "draw", -8, "equals drawn"),
  cue(Q, "pop", -4, "?"),
  cue(NOT, "miss", -4, "not quite: struck out"),
  cue(MINUTE - 4, "pop", -6, "one minute sticky"),
  cue(LLM - 4, "whoosh", -8, "LLM"),
  ...WORDS3.map((w, i) => cue(w, "type", -8, `word ${i + 1}`)),
  cue(READ, "draw", -6, "the brain drawn"),
  cue(READ + 6, "flurry", -12, "pages fly in"),
  cue(TRICK - 4, "pop", -4, "the one trick"),
  cue(TYPE, "type", -5, "Thanks for your…"),
  ...CANDS.map((c, i) => cue(c, "blip", -5 - i, `candidate ${i + 1}`)),
  cue(PICK + 4, "check", -4, "order"),
  cue(FAST, "keys", -6, "typing fast"),
  cue(THINK - 4, "draw", -7, "thought cloud"),
  cue(THINK + 8, "shimmer", -9, "sparkles"),
  ...MAKERS.map((m, i) => cue(m, "pop", -5, `maker ${i + 1}`)),
  cue(APP - 4, "draw", -8, "the app bracket"),
  cue(XRAY, "glitch", -10, "x-ray"),
  cue(XRAY + 4, "data", -8, "the brain inside"),
  ...[0, 1, 2].map((i) => cue(ALL3 - 6 + i * 6, "data", -12, `x-ray ${i + 1}`)),
  cue(BEST - 6, "draw", -8, "chart axes"),
  cue(TURNS - 4, "whoosh", -10, "lines race"),
  cue(AHEAD, "ping", -6, "a new leader"),
  cue(WRONG - 2, "miss", -3, "wrong question: crossed out"),
  ...KNOWS.map((k, i) => cue(k - 2, "pop", -6, `sticky ${i + 1}`)),
  cue(WHERE, "blip", -6, "channels"),
  ...moments.move(BF - 4, "Brainfast card", -6),
  cue(T.ws("l14", 3), "click", -3, "open the picker"),
  ...OPTS.map((o, i) => cue(o, "tick", -6, `option ${i + 1}`)),
  cue(OPTS[2] + 10, "click", -2, "pick"),
  ...[0, 1, 2].map((i) => cue(TEACH + 2 + i * 5, "check", -8, `knowledge ${i + 1}`)),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DEAL, NOT, LLM, READ, TYPE, PICK, THINK, MAKERS, APP, XRAY, ALL3, BEST, WRONG, BF, HIT, CTA, URL, DUR };

export const CHATVSCLAUDE: FilmDef = {
  id: "ChatVsClaude",
  slug: "chatgpt-vs-claude",
  title: "ChatVsClaude",
  component: ChatVsClaude,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/chatgpt-vs-claude/mix.wav",
};
