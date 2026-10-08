import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { AgentDot, CheckDisc, Icon } from "../../kit/ui";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/dice/vo/lines.json";
import words from "../../../../public/films/dice/vo/words.json";

loadFonts();

/**
 * WHY DOES AI GIVE DIFFERENT ANSWERS? — AI, explained · 07. Game night on a
 * sunny table: the AI rolls dice to pick each next word. Randomness = creative
 * (great for a poem, bad for your opening hours). There's a dial — and in
 * Brainfast it's the real "Response Style" slider: Focused ↔ Creative.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const ASK1 = w("l01", 0);
const ASK2 = w("l01", 6);
const DIFF = w("l01", 12);
const BROKEN = w("l02", 2);
const NOPE = w("l03", 0);
const ROLL = w("l03", 2);
const LIST = w("l04", 7);
const PICKS = [w("l05", 2), w("l05", 6), w("l05", 9)];
const CREATIVE = w("l06", 9);
const POEM = w("l07", 3);
const HOURS = w("l08", 5);
const DIAL = w("l09", 3);
const DC = w("l09", 4);
const DF = w("l09", 6);
const TURN = w("l10", 4);
const FOCUSED = w("l10", 7);
const INSTR = w("l10", 12);
const INFO = w("l10", 16);
const SAME = [w("l11", 0), w("l11", 2), w("l11", 4)];
const HIT = w("l12", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l12", i));
const CTA = w("l13", 0) - 2;
const URL = w("l13", T.nwords("l13") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l13") + 60);

const SUN = "#FFD84D";
const INK = "#1D1A16";
const RED = "#E4473F";

/* ── a 3D die ── */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};
const FACE_ROT: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const Face: React.FC<{ n: number; size: number; tf: string; hot?: boolean }> = ({ n, size, tf, hot }) => (
  <div style={{ position: "absolute", width: size, height: size, transform: tf, borderRadius: size * 0.18, background: hot ? "#FFF6F0" : "#FFFFFF", boxShadow: `inset 0 0 ${size * 0.12}px rgba(0,0,0,.12)`, backfaceVisibility: "hidden" }}>
    {PIPS[n].map(([x, y], i) => (
      <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: size * 0.17, height: size * 0.17, marginLeft: -size * 0.085, marginTop: -size * 0.085, borderRadius: "50%", background: n === 1 ? RED : INK }} />
    ))}
  </div>
);
const Die: React.FC<{ size: number; face: number; roll: number; spin?: number; x: number; y: number; tilt?: number }> = ({ size, face, roll, spin = 2, x, y, tilt = 0 }) => {
  const [rx0, ry0] = FACE_ROT[face];
  const rx = rx0 - 20 + 360 * spin * (1 - roll);
  const ry = ry0 + 25 + 360 * (spin + 1) * (1 - roll);
  const h = size / 2;
  return (
    <div style={{ position: "absolute", left: x - h, top: y - h, width: size, height: size, perspective: 1600 }}>
      <div style={{ position: "absolute", left: -h * 0.2, top: size * 0.9, width: size * 1.4, height: size * 0.3, borderRadius: "50%", background: "rgba(80,50,0,.25)", filter: "blur(10px)" }} />
      <div style={{ position: "relative", width: size, height: size, transformStyle: "preserve-3d", transform: `rotateZ(${tilt}deg) rotateX(${rx}deg) rotateY(${ry}deg)` }}>
        <Face n={1} size={size} tf={`translateZ(${h}px)`} />
        <Face n={6} size={size} tf={`rotateY(180deg) translateZ(${h}px)`} />
        <Face n={2} size={size} tf={`rotateY(90deg) translateZ(${h}px)`} />
        <Face n={5} size={size} tf={`rotateY(-90deg) translateZ(${h}px)`} />
        <Face n={3} size={size} tf={`rotateX(90deg) translateZ(${h}px)`} />
        <Face n={4} size={size} tf={`rotateX(-90deg) translateZ(${h}px)`} />
      </div>
    </div>
  );
};

/* ── the hook: same question, two answers ── */
const Hook: React.FC<{ f: number }> = ({ f }) => {
  if (f > NOPE + 10) return null;
  const out = tw(f, NOPE - 10, NOPE + 6, 0, 1, E.expoIn);
  const card = (i: number, at: number, ans: string) => {
    const s = clamp(springAt(f, at, 30, 14, 170));
    const a = clamp(springAt(f, at + 14, 30, 14, 190));
    const wob = f >= BROKEN - 4 && f < NOPE ? Math.sin(f * 0.9 + i * 2) * 2.5 : 0;
    return (
      <div key={i} style={{ position: "absolute", left: 70, top: 660 + i * 540, width: 940, transform: `translateX(${(1 - s) * (i ? 1 : -1) * 1100 + out * (i ? 1 : -1) * 1200}px) rotate(${(i ? 1.5 : -1.5) + wob}deg)`, borderRadius: 38, background: C.white, boxShadow: "0 30px 60px rgba(120,80,0,.22)", padding: "26px 30px", fontFamily: FONT }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.gray, marginBottom: 16 }}>ASK #{i + 1}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ padding: "16px 24px", borderRadius: "30px 30px 8px 30px", background: "#5E6AD2", color: C.white, fontSize: 40, fontWeight: 600 }}>What time do you close on Sunday?</div>
        </div>
        {f >= at + 12 ? (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginTop: 18, transform: `scale(${mix(0.6, 1, a)})`, transformOrigin: "0 100%", opacity: clamp(a * 2) }}>
            <div style={{ width: 58, height: 58, borderRadius: 29, background: "#EFEBE2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="sparkles" size={30} color={C.gray} stroke={2.2} />
            </div>
            <div style={{ padding: "16px 24px", borderRadius: "30px 30px 30px 8px", background: "#F3F0EA", color: INK, fontSize: 46, fontWeight: 700, boxShadow: f >= DIFF ? `0 0 0 5px ${RED}` : "none" }}>{ans}</div>
          </div>
        ) : null}
      </div>
    );
  };
  return (
    <>
      {card(0, 2, "We close at 6 PM!")}
      {card(1, ASK2, "Sundays we're open until 5.")}
      {f >= DIFF ? (
        <div style={{ position: "absolute", left: 540, top: 1135, transform: `translate(-50%, -50%) scale(${keys(f, [[DIFF, 0], [DIFF + 5, 1.2], [DIFF + 10, 1]], E.cubicInOut)}) rotate(-6deg)`, opacity: 1 - out, padding: "6px 40px", background: RED, color: C.white, fontFamily: FONT, fontSize: 120, fontWeight: 900, borderRadius: 16, whiteSpace: "nowrap" }}>≠</div>
      ) : null}
    </>
  );
};

/* ── rolling dice + the next-word list ── */
const OPTIONS = [
  { t: "6 PM", p: 58 },
  { t: "5 PM", p: 27 },
  { t: "7 PM", p: 15 },
];
const Rolling: React.FC<{ f: number }> = ({ f }) => {
  if (f < NOPE - 4 || f > POEM - 2) return null;
  const out = tw(f, CREATIVE + 10, POEM - 4, 0, 1, E.expoIn);
  const inS = clamp(springAt(f, ROLL - 6, 30, 12, 150));
  const firstRoll = tw(f, ROLL - 8, ROLL + 14, 0, 1, E.expoOut);
  // each "pick" re-rolls the die and it lands on 1, 2, then 3
  const rollK = PICKS.findIndex((p, i) => f < (PICKS[i + 1] ?? 1e9) && f >= p - 14);
  const pickIdx = f < PICKS[0] - 14 ? -1 : rollK;
  const roll = pickIdx >= 0 ? tw(f, PICKS[pickIdx] - 14, PICKS[pickIdx] + 2, 0, 1, E.expoOut) : firstRoll;
  const face = pickIdx >= 0 ? pickIdx + 1 : 5;
  const list = clamp(springAt(f, T.VO.l04 + 4, 30, 14, 170));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateY(${out * -200}px)` }}>
      <Die size={300} face={face} roll={roll} x={540 + (1 - inS) * 700} y={740} tilt={-8 + Math.sin(f * 0.05) * 3} />
      {f >= T.VO.l04 ? (
        <div style={{ position: "absolute", left: 80, top: 1030, width: 920, transform: `translateY(${(1 - list) * 300}px)`, opacity: clamp(list * 2), borderRadius: 38, background: C.white, boxShadow: "0 30px 60px rgba(120,80,0,.22)", padding: "28px 34px", fontFamily: FONT }}>
          <div style={{ fontSize: 50, fontWeight: 800, color: INK, letterSpacing: "-0.03em" }}>
            "We close at <span style={{ display: "inline-block", minWidth: 150, borderBottom: `6px solid ${RED}`, color: RED }}>{pickIdx >= 0 && roll > 0.9 ? OPTIONS[pickIdx].t : ""}</span>"
          </div>
          <div style={{ marginTop: 20 }}>
            {OPTIONS.map((o, i) => {
              const hot = pickIdx === i ? tw(f, PICKS[i] - 2, PICKS[i] + 6, 0, 1, E.expoOut) : 0;
              const bar = tw(f, LIST + i * 4, LIST + i * 4 + 16, 0, o.p, E.expoOut);
              return (
                <div key={o.t} style={{ display: "flex", alignItems: "center", gap: 20, height: 96, padding: "0 14px", borderRadius: 22, background: hot > 0 ? mixColor("#FFFFFF", "#FFF1C2", hot) : "transparent" }}>
                  <div style={{ width: 54, height: 54, borderRadius: 14, background: INK, color: SUN, fontFamily: MONO, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                  <div style={{ width: 150, fontSize: 44, fontWeight: 800, color: INK }}>{o.t}</div>
                  <div style={{ flex: 1, height: 30, borderRadius: 15, background: "#F1ECE0", overflow: "hidden" }}>
                    <div style={{ width: `${bar}%`, height: "100%", borderRadius: 15, background: i === 0 ? RED : "#C9BFA8" }} />
                  </div>
                  <div style={{ width: 100, textAlign: "right", fontFamily: MONO, fontSize: 34, color: INK }}>{Math.round(bar)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {f >= CREATIVE - 4 ? <Sparkles x={200} y={560} w={680} h={400} at={CREATIVE - 2} color="#FFFFFF" size={56} seed={7} /> : null}
    </div>
  );
};

/* ── great for a poem, not for your hours ── */
const PoemHours: React.FC<{ f: number }> = ({ f }) => {
  if (f < POEM - 12 || f > DIAL - 4) return null;
  const out = tw(f, DIAL - 16, DIAL - 4, 0, 1, E.expoIn);
  const p = clamp(springAt(f, POEM - 10, 30, 13, 170));
  const h = clamp(springAt(f, T.VO.l08, 30, 13, 170));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      <div style={{ position: "absolute", left: 80, top: 700, width: 920, transform: `rotate(-2deg) translateX(${(1 - p) * -1100}px)`, borderRadius: 34, background: "#FFF9EC", boxShadow: "0 24px 50px rgba(120,80,0,.2)", padding: "30px 36px", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36, fontWeight: 800, color: INK }}>
          <Icon name="sparkles" size={40} color="#D4861C" stroke={2.3} /> A poem
          <div style={{ marginLeft: "auto", padding: "6px 16px", borderRadius: 999, background: "#DDF5E6", color: C.green, fontFamily: MONO, fontSize: 22 }}>GREAT ✓</div>
        </div>
        <div style={{ fontSize: 46, fontStyle: "italic", color: "#5B4A2E", lineHeight: 1.35, marginTop: 14 }}>
          Sprinkles like stars on a
          <br />
          buttercream sky…
        </div>
      </div>
      {f >= T.VO.l08 - 2 ? (
        <div style={{ position: "absolute", left: 80, top: 1180, width: 920, transform: `rotate(2deg) translateX(${(1 - h) * 1100}px)`, borderRadius: 34, background: C.white, boxShadow: "0 24px 50px rgba(120,80,0,.2)", padding: "30px 36px", fontFamily: FONT }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36, fontWeight: 800, color: INK }}>
            <Icon name="calendar" size={40} color={RED} stroke={2.3} /> Your opening hours
            <div style={{ marginLeft: "auto", padding: "6px 16px", borderRadius: 999, background: "#FDE3E1", color: RED, fontFamily: MONO, fontSize: 22 }}>NOT GREAT ✕</div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            {["Sun 6 PM", "Sun 5 PM", "Sun 7 PM", "closed?"].map((t, i) => (
              <div key={t} style={{ padding: "12px 20px", borderRadius: 16, background: "#F3F0EA", fontSize: 34, fontWeight: 700, color: INK, transform: `rotate(${(rnd(i * 3.3) - 0.5) * 10}deg) scale(${clamp(springAt(f, HOURS - 6 + i * 4, 30, 11, 200))})` }}>{t}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* ── the dial → the real Response Style slider ── */
const Dial: React.FC<{ f: number }> = ({ f }) => {
  if (f < DIAL - 8) return null;
  const inS = clamp(springAt(f, DIAL - 6, 30, 13, 150));
  const out = tw(f, HIT - 16, HIT - 2, 0, 1, E.expoIn);
  const toFocus = tw(f, TURN - 4, FOCUSED + 6, 0, 1, E.expoInOut);
  const ang = keys(f, [[DIAL, -20], [DC, 70], [DF, -70], [DF + 20, 60]], E.cubicInOut) * (1 - toFocus) + -110 * toFocus;
  const shrink = tw(f, FOCUSED + 8, INSTR - 6, 0, 1, E.expoInOut);
  const same = SAME.map((a) => clamp(springAt(f, a - 4, 30, 13, 180)));
  const slider = clamp(springAt(f, TURN, 30, 14, 170));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, fontFamily: FONT }}>
      {/* the big knob */}
      <div style={{ position: "absolute", left: 540 - 220, top: 620, width: 440, height: 440, transform: `scale(${mix(0.4, 1, inS) * mix(1, 0.55, shrink)}) translateY(${shrink * -260}px)`, opacity: clamp(inS * 2) }}>
        <svg width={440} height={440} viewBox="-220 -220 440 440" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: 23 }, (_, i) => {
            const a = ((-135 + i * (270 / 22)) * Math.PI) / 180;
            return <line key={i} x1={Math.sin(a) * 200} y1={-Math.cos(a) * 200} x2={Math.sin(a) * (i % 11 === 0 ? 170 : 184)} y2={-Math.cos(a) * (i % 11 === 0 ? 170 : 184)} stroke={INK} strokeWidth={i % 11 === 0 ? 8 : 4} strokeLinecap="round" />;
          })}
        </svg>
        <div style={{ position: "absolute", left: 60, top: 60, width: 320, height: 320, borderRadius: 160, background: "radial-gradient(circle at 35% 30%, #4A443C, #1D1A16 70%)", boxShadow: "0 30px 60px rgba(80,50,0,.45), inset 0 4px 0 rgba(255,255,255,.15)", transform: `rotate(${ang}deg)` }}>
          <div style={{ position: "absolute", left: 150, top: 22, width: 20, height: 90, borderRadius: 10, background: SUN }} />
        </div>
        <div style={{ position: "absolute", left: -150, top: 390, fontSize: 44, fontWeight: 900, color: INK, opacity: 0.35 + 0.65 * toFocus }}>FOCUSED</div>
        <div style={{ position: "absolute", right: -150, top: 390, fontSize: 44, fontWeight: 900, color: INK, opacity: 1 - 0.65 * toFocus }}>CREATIVE</div>
      </div>
      {/* the product's own control */}
      {f >= TURN - 2 ? (
        <div style={{ position: "absolute", left: 80, top: 1000, width: 920, transform: `translateY(${(1 - slider) * 400}px)`, opacity: clamp(slider * 2), borderRadius: 34, background: C.white, boxShadow: "0 30px 60px rgba(120,80,0,.22)", padding: "28px 34px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <AgentDot size={54} />
            <div style={{ fontSize: 38, fontWeight: 800, color: INK }}>Response Style</div>
          </div>
          <div style={{ fontSize: 28, color: C.gray, marginTop: 8 }}>Control how creative vs. consistent your AI's responses are</div>
          <div style={{ position: "relative", height: 16, borderRadius: 8, background: "#EEE9DD", marginTop: 34 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${mix(70, 12, toFocus)}%`, borderRadius: 8, background: C.coral }} />
            <div style={{ position: "absolute", left: `${mix(70, 12, toFocus)}%`, top: -16, width: 48, height: 48, marginLeft: -24, borderRadius: 24, background: C.white, boxShadow: `0 4px 12px rgba(0,0,0,.25), 0 0 0 4px ${C.coral}` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 30, fontWeight: 700, color: INK }}>
            <span style={{ color: toFocus > 0.5 ? C.coral : C.gray }}>Focused</span>
            <span style={{ color: toFocus > 0.5 ? C.gray : C.coral }}>Creative</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            {[
              ["file", "Instructions: always use the hours below", INSTR],
              ["calendar", "Hours.pdf · Sun 10–5", INFO],
            ].map(([ic, t, at]) => (
              <div key={t as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 16, background: "#FFF6DA", fontSize: 26, fontWeight: 700, color: INK, transform: `scale(${clamp(springAt(f, (at as number) - 4, 30, 12, 190))})`, transformOrigin: "0 50%" }}>
                <Icon name={ic as "file"} size={26} color="#D4861C" stroke={2.4} />
                {t as string}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* same question, same answer */}
      {SAME.map((a, i) =>
        f >= a - 6 ? (
          <div key={i} style={{ position: "absolute", left: 80 + i * 20, top: 1560 + i * 26, width: 880, transform: `translateY(${(1 - same[i]) * 300}px)`, opacity: clamp(same[i] * 2), display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", borderRadius: 26, background: C.white, boxShadow: "0 16px 34px rgba(120,80,0,.2)", zIndex: 3 - i }}>
            <AgentDot size={52} />
            <div style={{ flex: 1, fontSize: 32, fontWeight: 700, color: INK }}>We close at 5 PM on Sundays.</div>
            <CheckDisc t={tw(f, a, a + 8, 0, 1, E.cubicInOut)} size={46} bg={C.green} fg={C.white} />
          </div>
        ) : null,
      )}
    </div>
  );
};

const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, HIT - 14, HIT - 6, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: INK }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: RED }} />
      AI, EXPLAINED · 07
    </div>
  );
};

const H: React.FC<{ from: number; to: number; ws: { t: string; at: number; hi?: boolean; br?: boolean }[]; size?: number }> = ({ from, to, ws, size }) => <Kinetic from={from} to={to} size={size} color={INK} hi={RED} words={ws} />;
const Headlines: React.FC = () => (
  <>
    <H from={T.VO.l01} to={T.VO.l02 - 8} ws={[{ t: "Same", at: w("l01", 4) }, { t: "question,", at: w("l01", 5), br: true }, { t: "two", at: w("l01", 11) }, { t: "answers?", at: w("l01", 12), hi: true }]} />
    <H from={T.VO.l02 - 1} to={NOPE - 8} ws={[{ t: "Is", at: w("l02", 0) }, { t: "it", at: w("l02", 1) }, { t: "broken?", at: w("l02", 2), hi: true }]} />
    <H from={NOPE - 1} to={T.VO.l04 - 8} ws={[{ t: "Nope.", at: w("l03", 0), br: true }, { t: "It's", at: w("l03", 1) }, { t: "rolling", at: w("l03", 2), hi: true }, { t: "dice.", at: w("l03", 3), hi: true }]} />
    <H from={T.VO.l04 - 1} to={T.VO.l06 - 8} ws={[{ t: "It", at: w("l04", 0) }, { t: "picks", at: w("l04", 1) }, { t: "the", at: w("l04", 2), br: true }, { t: "next", at: w("l04", 3) }, { t: "word.", at: w("l04", 4), hi: true }]} />
    <H from={T.VO.l06 - 1} to={POEM - 12} ws={[{ t: "Randomness", at: w("l06", 4), br: true }, { t: "=", at: w("l06", 5) }, { t: "creative.", at: w("l06", 9), hi: true }]} />
    <H from={POEM - 10} to={DIAL - 10} ws={[{ t: "Great", at: w("l07", 0) }, { t: "for", at: w("l07", 1) }, { t: "a", at: w("l07", 2) }, { t: "poem.", at: w("l07", 3), br: true }, { t: "Not", at: w("l08", 0) }, { t: "your", at: w("l08", 4) }, { t: "hours.", at: w("l08", 6), hi: true }]} />
    <H from={DIAL - 8} to={T.VO.l10 - 8} ws={[{ t: "There's", at: w("l09", 1) }, { t: "a", at: w("l09", 2) }, { t: "dial.", at: w("l09", 3), hi: true }]} />
    <H from={T.VO.l10 - 1} to={T.VO.l11 - 8} ws={[{ t: "Turn", at: w("l10", 4) }, { t: "it", at: w("l10", 5) }, { t: "to", at: w("l10", 6), br: true }, { t: "focused.", at: w("l10", 7), hi: true }]} />
    <H from={T.VO.l11 - 1} to={HIT - 14} ws={[{ t: "Same", at: w("l11", 0) }, { t: "answer.", at: w("l11", 3), br: true }, { t: "Every", at: w("l11", 4) }, { t: "time.", at: w("l11", 5), hi: true }]} />
  </>
);

export const Dice: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const day = tw(f, HIT - 1, HIT + 3, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: mixColor(SUN, C.cream, day) }}>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.14) 0 40px, rgba(255,255,255,0) 40px 80px)", backgroundPosition: `${f * 0.6}px 0`, opacity: 1 - day }} />
      <Hook f={f} />
      <Rolling f={f} />
      <PoemHours f={f} />
      <Dial f={f} />
      <Series f={f} />
      <Headlines />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("films/dice/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...moments.ask(ASK1, "ask 1"),
  ...moments.answer(ASK1 + 14, "answer 1"),
  ...moments.ask(ASK2, "ask 2"),
  ...moments.answer(ASK2 + 14, "answer 2"),
  cue(DIFF, "miss", -3, "different!"),
  cue(BROKEN - 4, "glitch", -8, "is it broken?"),
  cue(NOPE - 6, "whoosh", -6, "cards away"),
  cue(ROLL - 6, "flip", -2, "the die rolls"),
  cue(ROLL + 6, "snap", -4, "the die lands"),
  cue(LIST, "data", -9, "options"),
  ...PICKS.map((p, i) => cue(p - 12, "flip", -4, `roll ${i + 1}`)),
  ...PICKS.map((p, i) => cue(p, "snap", -4, `pick ${i + 1}`)),
  cue(CREATIVE - 2, "shimmer", -7, "creative"),
  cue(POEM - 8, "whoosh", -7, "poem card"),
  cue(POEM + 2, "check", -5, "great"),
  cue(T.VO.l08, "whoosh", -7, "hours card"),
  cue(HOURS, "miss", -3, "not great"),
  cue(DIAL - 6, "poweron", -5, "the dial"),
  cue(DC, "click", -3, "creative"),
  cue(DF, "click", -3, "focused"),
  cue(TURN, "swell", -7, "turn it"),
  cue(FOCUSED + 2, "click", 0, "focused"),
  cue(INSTR - 4, "pop", -6, "instructions"),
  cue(INFO - 4, "pop", -6, "real info"),
  ...SAME.map((a, i) => cue(a, "check", -4, `same answer ${i + 1}`)),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DIFF, NOPE, ROLL, PICKS, POEM, DIAL, TURN, SAME, HIT, CTA, URL, DUR };

export const DICE: FilmDef = { id: "Dice", slug: "dice", title: "Dice", component: Dice, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/dice/mix.wav" };
