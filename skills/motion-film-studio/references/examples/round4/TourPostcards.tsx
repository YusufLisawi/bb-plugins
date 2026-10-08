import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon, IconName } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/tour-postcards/vo/lines.json";
import words from "../../../../public/films/tour-postcards/vo/words.json";

loadFonts();

/**
 * TOURISM · ABOUT BRAINFAST: Postcards. Guests' questions arrive as postcards
 * from everywhere (airmail borders, scenic stamps, a face and a handwritten
 * question), stacking on a warm desk. Signature: on "answers every one" a coral
 * ANSWERED postmark slams onto each card and every card flips to its reply. Then
 * luggage tags (rooms, rates, tours), the backs of three postcards as results
 * (tour booked, upgrade accepted, guest saved), a hand-over to the front desk,
 * and a pull-back on a wall of postcards, every one postmarked.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const EVERY = w("l01", 7);
const QS = [w("l02", 0), w("l03", 0), w("l04", 0), w("l05", 0)];
const DROP = w("l06", 0) - 2;
const ANSWERS = w("l06", 12);
const LANG = w("l06", 17);
const NIGHT = w("l06", 20);
const KNOWS = w("l07", 0);
const TAGS = [w("l07", 3), w("l07", 5), w("l07", 8)];
const RESULTS = [w("l08", 1), w("l08", 6), w("l08", 8)];
const HUMAN = w("l09", 5);
const HANDS = w("l09", 7);
const WALL = w("l10", 0) - 4;
const ANSWERED = w("l10", 2);
const HIT = T.VO.l11 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l11", 2) + 4;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 50);

const DESK = "#F2E7D6";
const AIR_RED = "#D9414A";
const AIR_BLUE = "#2F5DA8";
const INK_PEN = "#24336B";

type Scene = { sky: [string, string]; sun: string; sea: string; land?: string };
const SCENES: Scene[] = [
  { sky: ["#FFB37A", "#FF7E6B"], sun: "#FFE7A3", sea: "#2E86AB", land: "#F4D29C" },
  { sky: ["#9FD6F2", "#5BB3E0"], sun: "#FFF4C2", sea: "#1D6FA3", land: "#7BBF6A" },
  { sky: ["#C9B6F2", "#8E7CD8"], sun: "#FFE1F0", sea: "#3B4E9E" },
  { sky: ["#FFD27A", "#F6A04D"], sun: "#FFF3D1", sea: "#0E8A8A", land: "#E8C07A" },
];

type Card = { p: FaceSpec; name: string; q: string; a: string; scene: number };
const CARDS: Card[] = [
  { p: PEOPLE.maya, name: "Maya", q: "Is breakfast included?", a: "Yes! Breakfast is 7 to 10:30, and it's included 🙂", scene: 0 },
  { p: PEOPLE.ken, name: "Ken", q: "Can I check in early?", a: "Your room is ready from 11 AM. See you then!", scene: 1 },
  { p: PEOPLE.aisha, name: "Aisha", q: "Do you do airport pickup?", a: "We do! Pickup booked for your 3:40 PM landing ✓", scene: 2 },
  { p: PEOPLE.tom, name: "Tom", q: "Is the boat tour still on?", a: "Yes, the 10 AM boat tour is on ⛵", scene: 3 },
];

/** a little scenic illustration: sky gradient, sun, sea waves, optional hills */
const Scenic: React.FC<{ s: Scene; w: number; h: number }> = ({ s, w: W, h: H }) => (
  <svg width={W} height={H} viewBox="0 0 300 200" preserveAspectRatio="none" style={{ display: "block" }}>
    <defs>
      <linearGradient id={`sky${s.sun}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={s.sky[0]} />
        <stop offset="1" stopColor={s.sky[1]} />
      </linearGradient>
    </defs>
    <rect width="300" height="200" fill={`url(#sky${s.sun})`} />
    <circle cx="205" cy="92" r="34" fill={s.sun} />
    {s.land ? <path d="M0 132 C 60 96, 120 110, 170 128 C 220 146, 260 118, 300 124 L 300 200 L 0 200 Z" fill={s.land} /> : null}
    <path d="M0 146 C 40 138, 80 154, 120 146 C 160 138, 200 154, 240 146 C 270 140, 290 148, 300 146 L 300 200 L 0 200 Z" fill={s.sea} />
    <path d="M0 168 C 40 160, 80 176, 120 168 C 160 160, 200 176, 240 168 C 270 162, 290 170, 300 168" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="4" />
    <path d="M30 186 C 70 178, 110 194, 150 186 C 190 178, 230 194, 270 186" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="3" />
  </svg>
);

/** postage stamp with a perforated edge */
const PostStamp: React.FC<{ s: Scene; size: number }> = ({ s, size }) => (
  <div style={{ width: size, height: size * 1.2, padding: size * 0.07, background: "#FFFDF8", boxShadow: "0 2px 6px rgba(0,0,0,.15)",
    WebkitMaskImage: `radial-gradient(circle at ${size * 0.05}px ${size * 0.05}px, transparent ${size * 0.035}px, #000 ${size * 0.04}px)`, WebkitMaskSize: `${size * 0.1}px ${size * 0.1}px`, WebkitMaskPosition: `-${size * 0.05}px -${size * 0.05}px` }}>
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}><Scenic s={s} w={size * 0.86} h={size * 1.06} /></div>
  </div>
);

/** the ANSWERED postmark: a double ring + wavy cancellation lines, slammed */
const Postmark: React.FC<{ at: number; x: number; y: number; size?: number; rot?: number; time?: string }> = ({ at, x, y, size = 200, rot = -14, time = "DAY & NIGHT" }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = keys(f, [[at, 2.3], [at + 5, 0.93], [at + 10, 1]], E.cubicInOut);
  const o = tw(f, at, at + 3, 0, 0.92, E.linear);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size * 2, height: size, transform: `translate(-25%, -50%) rotate(${rot}deg) scale(${s})`, opacity: o, color: C.coral, pointerEvents: "none", zIndex: 40 }}>
      <svg width={size * 2} height={size} viewBox="0 0 400 200" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx="100" cy="100" r="88" fill="none" stroke={C.coral} strokeWidth="9" />
        <circle cx="100" cy="100" r="70" fill="none" stroke={C.coral} strokeWidth="4" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M200 ${58 + i * 28} C 230 ${46 + i * 28}, 260 ${70 + i * 28}, 290 ${58 + i * 28} C 320 ${46 + i * 28}, 350 ${70 + i * 28}, 390 ${58 + i * 28}`} fill="none" stroke={C.coral} strokeWidth="7" strokeLinecap="round" />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ fontSize: size * 0.125, fontWeight: 900, letterSpacing: "0.02em" }}>ANSWERED</div>
        <div style={{ fontFamily: MONO, fontSize: size * 0.075, letterSpacing: "0.12em", marginTop: size * 0.03 }}>{time}</div>
      </div>
    </div>
  );
};

/** a postcard: airmail border, scenic picture, stamp, face + handwritten question; flips to the reply */
const Postcard: React.FC<{ c: Card; w: number; flip: number; lite?: boolean }> = ({ c, w: W, flip, lite }) => {
  const H = W * 0.64;
  const s = SCENES[c.scene];
  const border: React.CSSProperties = {
    position: "absolute", inset: 0, borderRadius: W * 0.03, padding: W * 0.018,
    background: `repeating-linear-gradient(135deg, ${AIR_RED} 0 ${W * 0.03}px, #FFFDF8 ${W * 0.03}px ${W * 0.045}px, ${AIR_BLUE} ${W * 0.045}px ${W * 0.075}px, #FFFDF8 ${W * 0.075}px ${W * 0.09}px)`,
    backfaceVisibility: "hidden", boxShadow: lite ? "0 8px 18px rgba(70,45,20,.18)" : "0 30px 60px rgba(70,45,20,.22)",
  };
  return (
    <div style={{ position: "relative", width: W, height: H, ...(lite ? {} : { transformStyle: "preserve-3d" as const, transform: `perspective(${W * 3}px) rotateY(${flip * 180}deg)` }) }}>
      {/* front */}
      <div style={border}>
        <div style={{ width: "100%", height: "100%", borderRadius: W * 0.018, background: "#FFFDF8", display: "flex", overflow: "hidden" }}>
          <div style={{ width: "46%", height: "100%" }}><Scenic s={s} w={W * 0.46} h={H} /></div>
          <div style={{ flex: 1, position: "relative", padding: `${W * 0.04}px ${W * 0.035}px` }}>
            <div style={{ position: "absolute", right: W * 0.03, top: W * 0.03 }}>{lite ? <div style={{ width: W * 0.11, height: W * 0.132, background: SCENES[(c.scene + 2) % 4].sky[1], border: `${W * 0.008}px solid #FFFDF8` }} /> : <PostStamp s={SCENES[(c.scene + 2) % 4]} size={W * 0.11} />}</div>
            <div style={{ display: "flex", alignItems: "center", gap: W * 0.018, marginTop: W * 0.01 }}>
              <Face p={c.p} size={W * 0.085} />
              <div style={{ fontSize: W * 0.032, fontWeight: 700, color: C.gray }}>from {c.name}</div>
            </div>
            <div style={{ marginTop: W * 0.04, fontSize: W * 0.056, lineHeight: 1.18, fontStyle: "italic", fontWeight: 560, color: INK_PEN, letterSpacing: "-0.01em" }}>{c.q}</div>
            {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: W * 0.035, right: W * 0.035, bottom: W * (0.05 + i * 0.045), height: 2, background: "rgba(36,51,107,.14)" }} />)}
          </div>
        </div>
      </div>
      {/* back: the reply */}
      {lite ? null : <div style={{ ...border, transform: "rotateY(180deg)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: W * 0.018, background: "#FFFDF8", padding: `${W * 0.045}px ${W * 0.05}px`, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: W * 0.02 }}>
            <div style={{ width: W * 0.085, height: W * 0.085, borderRadius: W * 0.024, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={W * 0.05} color={C.cream} stroke={26} /></div>
            <div>
              <div style={{ fontSize: W * 0.034, fontWeight: 800, color: C.ink }}>Your AI agent</div>
              <div style={{ fontSize: W * 0.026, color: C.gray }}>to {c.name} · in their own language</div>
            </div>
          </div>
          <div style={{ marginTop: W * 0.03, fontSize: W * 0.062, lineHeight: 1.2, fontWeight: 650, color: C.ink, letterSpacing: "-0.015em" }}>{c.a}</div>
        </div>
      </div>}
    </div>
  );
};

/** a luggage tag tied with a string */
const LuggageTag: React.FC<{ at: number; x: number; y: number; icon: IconName; label: string; sub: string; color: string; rot: number }> = ({ at, x, y, icon, label, sub, color, rot }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at - 4, 30, 9, 160);
  if (s <= 0.001) return null;
  const swing = Math.sin((f - at) / 9) * 3 * Math.exp(-(f - at) / 40);
  return (
    <div style={{ position: "absolute", left: x, top: y, transformOrigin: "50% -60px", transform: `translateY(${(1 - clamp(s)) * -320}px) rotate(${rot + swing}deg)`, opacity: clamp(s * 2) }}>
      <svg width={300} height={70} style={{ position: "absolute", left: 0, top: -64 }}><path d="M150 70 C 150 40, 150 20, 150 0" stroke="#8B6B47" strokeWidth="4" fill="none" /></svg>
      <div style={{ width: 300, height: 420, background: color, borderRadius: "34px 34px 26px 26px", clipPath: "polygon(22% 0, 78% 0, 100% 12%, 100% 100%, 0 100%, 0 12%)", padding: "70px 30px 30px", boxShadow: "0 24px 50px rgba(70,45,20,.25)", display: "flex", flexDirection: "column", alignItems: "center", color: "#FFF" }}>
        <div style={{ position: "absolute", top: 26, width: 34, height: 34, borderRadius: 17, background: DESK, boxShadow: "inset 0 2px 4px rgba(0,0,0,.25)" }} />
        <div style={{ width: 120, height: 120, borderRadius: 34, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 20 }}><Icon name={icon} size={70} color="#FFF" stroke={2.2} /></div>
        <div style={{ fontSize: 58, fontWeight: 850, marginTop: 30, letterSpacing: "-0.03em" }}>{label}</div>
        <div style={{ fontSize: 26, opacity: 0.85, marginTop: 8, textAlign: "center" }}>{sub}</div>
      </div>
    </div>
  );
};

/** the back of a postcard as a result card */
const ResultCard: React.FC<{ at: number; y: number; icon: IconName; color: string; kicker: string; title: string; meta: string; from: number }> = ({ at, y, icon, color, kicker, title, meta, from }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at - 5, 30, 12, 170);
  if (s <= 0.001) return null;
  const ok = tw(f, at + 6, at + 14, 0, 1, E.backOut);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: y, height: 250, borderRadius: 30, background: "#FFFDF8", boxShadow: "0 26px 60px rgba(70,45,20,.2)", display: "flex", alignItems: "center", gap: 30, padding: "0 40px",
      transform: `translateX(${(1 - clamp(s)) * from}px) rotate(${(1 - clamp(s)) * (from > 0 ? 6 : -6)}deg)`, opacity: clamp(s * 2) }}>
      <div style={{ width: 130, height: 130, borderRadius: 36, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={70} color="#FFF" stroke={2.2} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.gray }}>{kicker}</div>
        <div style={{ fontSize: 50, fontWeight: 850, letterSpacing: "-0.03em", color: C.ink, lineHeight: 1.1, marginTop: 6 }}>{title}</div>
        <div style={{ fontSize: 30, color: C.gray, marginTop: 6 }}>{meta}</div>
      </div>
      <div style={{ width: 70, height: 70, borderRadius: 35, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ok})` }}><Icon name="check" size={42} color="#FFF" stroke={3.4} /></div>
    </div>
  );
};

export const TourPostcards: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  // the four question cards: stack → fan into a 2×2 grid at the drop → leave at KNOWS
  const fan = tw(f, DROP - 2, DROP + 18, 0, 1, E.quintOut);
  const cardsOut = tw(f, KNOWS - 10, KNOWS + 2, 0, 1, E.expoIn);
  const tagsOut = tw(f, RESULTS[0] - 12, RESULTS[0] - 2, 0, 1, E.expoIn);
  const resOut = tw(f, HUMAN - 10, HUMAN, 0, 1, E.expoIn);
  const handOut = tw(f, WALL - 6, WALL + 4, 0, 1, E.expoIn);
  const wall = tw(f, WALL - 2, ANSWERED + 20, 0, 1, E.quintOut);
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={130} size={78} width={980} align="center" color={C.ink} hi={C.coral} words={ws} />;
  const hk = f < QS[0] - 2 ? "a" : f < DROP ? "-" : f < KNOWS - 4 ? "b" : f < RESULTS[0] - 6 ? "c" : f < HUMAN - 6 ? "d" : f < WALL - 4 ? "e" : "f";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: DESK }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 60%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* headlines */}
        {hk === "a" ? headline("a", T.VO.l01, QS[0] - 8, [{ t: "Every", at: w("l01", 0) }, { t: "day,", at: w("l01", 1) }, { t: "guests", at: w("l01", 2) }, { t: "write", at: w("l01", 3), br: true }, { t: "from", at: w("l01", 6) }, { t: "everywhere.", at: EVERY, hi: true }]) : null}
        {hk === "b" ? headline("b", DROP + 2, KNOWS - 10, [{ t: "Answered.", at: ANSWERS, hi: true, br: true }, { t: "In their own language.", at: LANG - 4, br: true }, { t: "Day and night.", at: NIGHT - 4 }]) : null}
        {hk === "c" ? headline("c", KNOWS - 2, RESULTS[0] - 10, [{ t: "It", at: KNOWS }, { t: "knows", at: w("l07", 1) }, { t: "your", at: w("l07", 2) }, { t: "hotel.", at: TAGS[0], hi: true }]) : null}
        {hk === "d" ? headline("d", RESULTS[0] - 4, HUMAN - 10, [{ t: "Books.", at: RESULTS[0], hi: true }, { t: "Upgrades.", at: RESULTS[1], hi: true }, { t: "Remembers.", at: RESULTS[2], hi: true }]) : null}
        {hk === "e" ? headline("e", HUMAN - 4, WALL - 8, [{ t: "Needs", at: w("l09", 3) }, { t: "a human?", at: HUMAN, hi: true, br: true }, { t: "Hands", at: HANDS }, { t: "over.", at: w("l09", 8) }]) : null}
        {hk === "f" ? headline("f", WALL, HIT - 10, [{ t: "Every", at: WALL + 2 }, { t: "postcard,", at: w("l10", 1), br: true }, { t: "answered.", at: ANSWERED, hi: true }]) : null}

        {/* l01: small postcards drifting in from everywhere */}
        {f < QS[0] + 20
          ? [0, 1, 2, 3, 4, 5].map((i) => {
              const at = T.VO.l01 - 10 + i * 9;
              const s = springAt(f, at, 30, 14, 90);
              const from = [[-700, 300], [800, 200], [-600, 1300], [700, 1500], [0, 2200], [900, 900]][i];
              const to = [[110, 470], [600, 430], [80, 1180], [610, 1240], [350, 1500], [640, 820]][i];
              const fade = 1 - tw(f, QS[0] - 6, QS[0] + 10, 0, 1, E.cubicIn);
              return (
                <div key={i} style={{ position: "absolute", left: mix(from[0] + to[0], to[0], clamp(s)), top: mix(from[1], to[1], clamp(s)), transform: `rotate(${(i % 2 ? 8 : -9) + Math.sin(f / 30 + i) * 2}deg) scale(${0.5 * fade + 0.0001})`, transformOrigin: "0 0", opacity: fade }}>
                  <Postcard c={CARDS[i % 4]} w={640} flip={0} />
                </div>
              );
            })
          : null}

        {/* l02–l06: the four questions stack, fan out, get postmarked and flip */}
        {cardsOut < 1
          ? CARDS.map((c, i) => {
              const s = springAt(f, QS[i] - 6, 30, 13, 150);
              if (s <= 0.001) return null;
              const depth = QS.filter((q, j) => j > i && f >= q - 6).length;
              const stackX = 540 - 400 + (i % 2 ? 18 : -18);
              const stackY = 760 + depth * -26 + (1 - clamp(s)) * 900;
              const gx = 70 + (i % 2) * 480, gy = 560 + Math.floor(i / 2) * 560;
              const x = mix(stackX, gx, fan), y = mix(stackY, gy, fan);
              const sc = mix(1 - depth * 0.03, 470 / 800, fan);
              const rot = mix((i % 2 ? 4 : -5) * (1 - clamp(s)) + (i % 2 ? 3 : -3), i % 2 ? 2 : -2, fan);
              const flip = tw(f, LANG - 6 + i * 4, LANG + 8 + i * 4, 0, 1, E.cubicInOut);
              return (
                <div key={c.name} style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${sc}) translateY(${cardsOut * -1400}px)`, transformOrigin: "0 0", zIndex: 10 + i, opacity: clamp(s * 3) }}>
                  <Postcard c={c} w={800} flip={flip} />
                </div>
              );
            })
          : null}
        {cardsOut < 1
          ? [0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", inset: 0, transform: `translateY(${cardsOut * -1400}px)`, zIndex: 30 }}>
              <Postmark at={ANSWERS - 2 + i * 3} x={70 + (i % 2) * 480 + 300} y={560 + Math.floor(i / 2) * 560 + 220} size={150} rot={-14 + i * 6} time={["07:02", "23:48", "03:15", "05:51"][i]} />
            </div>)
          : null}
        {f >= ANSWERS && f < KNOWS ? <Sparkles x={120} y={480} w={840} h={980} at={ANSWERS + 4} color="#FFC861" size={42} seed={3} /> : null}

        {/* l07: luggage tags — rooms, rates, tours */}
        {f >= KNOWS - 6 && tagsOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${tagsOut * -1500}px)` }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 440, height: 8, background: "#8B6B47", borderRadius: 4, opacity: tw(f, KNOWS - 6, KNOWS, 0, 1, E.linear) }} />
            <LuggageTag at={TAGS[0]} x={60} y={570} icon="bed" label="Rooms" sub="types, views, extras" color={C.coral} rot={-6} />
            <LuggageTag at={TAGS[1]} x={390} y={540} icon="card" label="Rates" sub="seasons, offers" color={AIR_BLUE} rot={3} />
            <LuggageTag at={TAGS[2]} x={720} y={580} icon="sun" label="Tours" sub="times, pickups, seats" color="#0E8A8A" rot={7} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center", opacity: tw(f, TAGS[2] + 4, TAGS[2] + 12, 0, 1, E.linear) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 30px", borderRadius: 999, background: "#FFFDF8", boxShadow: "0 16px 40px rgba(70,45,20,.15)", fontSize: 34, fontWeight: 750, color: C.ink }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={30} color={C.cream} stroke={26} /></div>
                Your agent knows it all
              </div>
            </div>
          </div>
        ) : null}

        {/* l08: three results on the backs of postcards */}
        {f >= RESULTS[0] - 6 && resOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - resOut, transform: `translateY(${resOut * -200}px)` }}>
            <ResultCard at={RESULTS[0]} y={540} icon="calendar" color="#0E8A8A" kicker="TOUR BOOKED" title="Boat tour · Sat 10:00" meta="2 guests · pickup at the lobby" from={-900} />
            <ResultCard at={RESULTS[1]} y={850} icon="sparkles" color={C.coral} kicker="UPGRADE ACCEPTED" title="Sea-view room" meta="offered, accepted, confirmed" from={900} />
            <ResultCard at={RESULTS[2]} y={1160} icon="userPlus" color={AIR_BLUE} kicker="GUEST SAVED" title="Maya · 2 adults" meta="arrives Friday · loves sunsets" from={-900} />
          </div>
        ) : null}

        {/* l09: hand-over to the front desk */}
        {f >= HUMAN - 6 && handOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - handOut }}>
            {(() => {
              const p = tw(f, HANDS - 4, HANDS + 16, 0, 1, E.cubicInOut);
              const s = springAt(f, HUMAN - 6, 30, 12, 160);
              return (
                <>
                  <div style={{ position: "absolute", left: 70, top: 720, width: 300, height: 300, borderRadius: 80, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${clamp(s)})`, boxShadow: "0 24px 60px rgba(217,87,89,.35)" }}><Mark height={170} color={C.cream} stroke={24} /></div>
                  <div style={{ position: "absolute", left: 710, top: 720, transform: `scale(${clamp(s)})` }}>
                    <Face p={PEOPLE.omar} size={300} />
                  </div>
                  <div style={{ position: "absolute", left: 70, top: 1050, width: 300, textAlign: "center", fontSize: 38, fontWeight: 750, color: C.ink }}>Your agent</div>
                  <div style={{ position: "absolute", left: 690, top: 1050, width: 340, textAlign: "center", fontSize: 38, fontWeight: 750, color: C.ink }}>Omar · front desk</div>
                  <div style={{ position: "absolute", left: mix(250, 560, p), top: mix(800, 560, p) - Math.sin(p * Math.PI) * 160, transform: `rotate(${mix(-8, 6, p)}deg) scale(0.42)`, transformOrigin: "0 0" }}>
                    <Postcard c={{ ...CARDS[1], q: "Can you arrange a birthday cake for my wife?" }} w={800} flip={0} />
                  </div>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 1200, display: "flex", justifyContent: "center", opacity: tw(f, HANDS + 14, HANDS + 22, 0, 1, E.linear) }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 30px", borderRadius: 999, background: C.greenTint, color: C.green, fontSize: 34, fontWeight: 800 }}>
                      <Icon name="check" size={34} color={C.green} stroke={3.2} /> Handed over, with the whole conversation
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}

        {/* l10: the wall — every postcard, postmarked */}
        {f >= WALL - 2 ? (
          <div style={{ position: "absolute", left: 540, top: 1060, transform: `translate(-50%, -50%) scale(${mix(1.25, 0.92, wall)})`, opacity: tw(f, WALL - 2, WALL + 6, 0, 1, E.linear) }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 240px)", gap: 22 }}>
              {Array.from({ length: 16 }, (_, i) => {
                const at = WALL + 2 + ((i * 7) % 16) * 1.6;
                const pm = f >= at;
                return (
                  <div key={i} style={{ position: "relative", transform: `rotate(${((i * 37) % 9) - 4}deg)` }}>
                    <Postcard c={CARDS[i % 4]} w={240} flip={0} lite />
                    {pm ? <div style={{ position: "absolute", right: -6, top: 30, width: 94, height: 94, borderRadius: 47, border: `5px solid ${C.coral}`, color: C.coral, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, transform: `rotate(-14deg) scale(${keys(f, [[at, 2], [at + 4, 0.92], [at + 8, 1]], E.cubicInOut)})`, background: "rgba(255,253,248,.6)" }}>ANSWERED</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {f >= ANSWERED ? <Sparkles x={80} y={600} w={920} h={900} at={ANSWERED} color="#FFC861" size={46} seed={8} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/tour-postcards/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "birds", -12, "seaside morning"),
  ...[0, 1, 2, 3, 4, 5].map((i) => cue(T.VO.l01 - 10 + i * 9, "paper", -10, `postcard ${i + 1} drifts in`)),
  ...QS.map((q, i) => cue(q - 6, "flip", -6, `question card ${i + 1} lands`)),
  cue(DROP - 2, "whoosh", -6, "cards fan out"),
  ...[0, 1, 2, 3].map((i) => cue(ANSWERS - 2 + i * 3, "seal", -3, `postmark ${i + 1}`)),
  cue(ANSWERS + 4, "spark", -8, "sparkles"),
  ...[0, 1, 2, 3].map((i) => cue(LANG - 6 + i * 4, "flip", -9, `card ${i + 1} flips to the reply`)),
  cue(KNOWS - 8, "whoosh", -9, "cards fly off"),
  ...TAGS.map((t, i) => cue(t - 4, "swell", -12, `luggage tag ${i + 1}`)),
  ...TAGS.map((t, i) => cue(t + 2, "tick", -9, `tag ${i + 1} settles`)),
  ...RESULTS.map((r, i) => cue(r - 5, "whoosh", -11, `result ${i + 1}`)),
  ...RESULTS.map((r, i) => cue(r + 6, "check", -5, `result ${i + 1} confirmed`)),
  cue(HUMAN - 6, "pop", -7, "agent + front desk"),
  cue(HANDS - 4, "paper", -6, "postcard handed over"),
  cue(HANDS + 14, "chime", -7, "handed over"),
  cue(WALL - 2, "zoom", -8, "the wall"),
  ...Array.from({ length: 6 }, (_, i) => cue(WALL + 2 + i * 4, "tap", -10, `wall postmark ${i + 1}`)),
  cue(ANSWERED, "shimmer", -6, "every postcard answered"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const TOURPOSTCARDS: FilmDef = { id: "TourPostcards", slug: "tour-postcards", title: "Tourism · Brainfast · Postcards", component: TourPostcards, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/tour-postcards/mix.wav" };
