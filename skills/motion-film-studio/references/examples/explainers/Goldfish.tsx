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
import { AgentDot, CheckDisc, Icon, IconName } from "../../kit/ui";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/goldfish/vo/lines.json";
import words from "../../../../public/films/goldfish/vo/words.json";

loadFonts();

/**
 * WHY DOES AI FORGET? — AI, explained · 06. Underwater: the context window is a
 * fishbowl. Messages drop in; when it's full the oldest spill out (the nut
 * allergy from the hook!). Bigger bowls still fill. A good agent keeps your
 * business in a library (the knowledge base) and grabs just the page it needs.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const FORGOT = w("l01", 11);
const RUDE = w("l02", 0);
const WINDOW = w("l03", 3);
const BOWL = w("l04", 5);
const FILL = [w("l05", 0), w("l05", 9), w("l05", 11), w("l05", 13)];
const FULL = w("l06", 4);
const SPILL = w("l06", 8);
const GONE = w("l06", 12);
const BIGGER = w("l07", 3);
const LIMIT = w("l07", 10);
const LEAVE = w("l08", 7);
const LIBRARY = w("l09", 5);
const KB = w("l09", 7);
const QUESTION = w("l10", 1);
const GRABS = w("l10", 4);
const PAGES = w("l10", 7);
const SAFE = w("l10", 10);
const HIT = w("l11", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l11", i));
const CTA = w("l12", 0) - 2;
const URL = w("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 60);

const DEEP = "#08233A";
const SEA = "#0E4466";
const INK = C.ink;

/* ── the hook: a long chat that forgets ── */
const HOOKMSGS: { me?: boolean; t: string; at: number; alert?: boolean }[] = [
  { me: true, t: "Hi! I'm Sam. Heads up: I'm allergic to nuts 🥜", at: 18 },
  { t: "Noted, Sam! What can I get you today?", at: 30 },
  { me: true, t: "Do you do birthday cakes?", at: 40 },
  { t: "We do! Chocolate, vanilla or red velvet.", at: 46 },
  { me: true, t: "How big is the medium one?", at: 52 },
  { t: "It serves 10–12 people.", at: 57 },
  { me: true, t: "Can you write a name on it?", at: 62 },
  { t: "Of course! Up to 20 letters.", at: 66 },
  { me: true, t: "And delivery on Saturday?", at: 70 },
  { t: "Yes, from 9 AM.", at: 74 },
  { me: true, t: "Great. Which dessert do you recommend?", at: 80 },
  { t: "Our almond praline cake! 🥜", at: FORGOT + 4, alert: true },
];
const Hook: React.FC<{ f: number }> = ({ f }) => {
  if (f > BOWL + 4) return null;
  const inS = clamp(springAt(f, 6, 30, 15, 150));
  const out = tw(f, BOWL - 20, BOWL - 4, 0, 1, E.expoIn);
  const shown = HOOKMSGS.filter((m) => f >= m.at);
  const ROW = 92;
  const scroll = Math.max(0, shown.length * ROW - 760);
  const scrollS = keys(f, HOOKMSGS.map((m, i) => [m.at, Math.max(0, (i + 1) * ROW - 760)] as [number, number]), E.cubicInOut);
  const up = tw(f, FORGOT + 10, FORGOT + 30, 0, 1, E.expoInOut) * (scroll > 0 ? 1 : 0);
  const frame = tw(f, WINDOW - 8, WINDOW + 6, 0, 1, E.expoOut);
  return (
    <div style={{ position: "absolute", left: 90, top: 620, width: 900, height: 1000, transform: `translateY(${(1 - inS) * 1200 + out * 1300}px)`, fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 44, background: "#F6F3EE", boxShadow: "0 50px 100px rgba(0,0,0,.45)", overflow: "hidden" }}>
        <div style={{ height: 110, display: "flex", alignItems: "center", gap: 16, padding: "0 30px", background: C.white, borderBottom: "2px solid #ECE8E0" }}>
          <div style={{ width: 62, height: 62, borderRadius: 31, background: "#E7E3DC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="sparkles" size={32} color={C.gray} stroke={2.2} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 750 }}>AI chat</div>
        </div>
        <div style={{ position: "absolute", left: 26, right: 26, top: 130, bottom: 20, overflow: "hidden" }}>
          <div style={{ transform: `translateY(${-mix(scrollS, 0, up)}px)` }}>
            {HOOKMSGS.map((m, i) => {
              if (f < m.at) return null;
              const s = clamp(springAt(f, m.at, 30, 14, 200));
              const hot = m.alert ? 1 : i === 0 ? tw(f, FORGOT + 12, FORGOT + 20, 0, 1, E.expoOut) : 0;
              return (
                <div key={i} style={{ height: ROW, display: "flex", justifyContent: m.me ? "flex-end" : "flex-start", alignItems: "center" }}>
                  <div style={{ padding: "14px 22px", borderRadius: m.me ? "26px 26px 8px 26px" : "26px 26px 26px 8px", background: m.me ? "#5E6AD2" : C.white, color: m.me ? C.white : INK, fontSize: 30, fontWeight: 600, whiteSpace: "nowrap", transform: `scale(${mix(0.6, 1, s)})`, transformOrigin: m.me ? "100% 100%" : "0 100%", opacity: clamp(s * 2), boxShadow: hot > 0 ? `0 0 0 ${6 * hot}px ${C.coral}` : m.me ? "none" : "inset 0 0 0 2px #ECE8E0" }}>{m.t}</div>
                </div>
              );
            })}
          </div>
        </div>
        {f >= FORGOT + 6 ? (
          <div style={{ position: "absolute", right: 30, bottom: 60, transform: `rotate(-8deg) scale(${keys(f, [[FORGOT + 6, 2.4], [FORGOT + 11, 0.94], [FORGOT + 15, 1]], E.cubicInOut)})`, padding: "10px 26px", border: `7px solid ${C.coral}`, borderRadius: 16, color: C.coral, fontSize: 64, fontWeight: 900, background: "rgba(255,255,255,.85)" }}>FORGOT?!</div>
        ) : null}
      </div>
      {/* the context window bracket */}
      {frame > 0 ? (
        <div style={{ position: "absolute", inset: -18, borderRadius: 56, border: `6px dashed ${mixColor("#7FD6FF", "#FFFFFF", 0.2)}`, opacity: frame, transform: `scale(${mix(1.08, 1, frame)})` }}>
          <div style={{ position: "absolute", left: 40, top: -30, padding: "6px 18px", borderRadius: 12, background: "#7FD6FF", color: DEEP, fontFamily: MONO, fontSize: 26, letterSpacing: "0.12em" }}>CONTEXT WINDOW</div>
        </div>
      ) : null}
    </div>
  );
};

/* ── the fishbowl ── */
type Item = { t: string; kind: "msg" | "reply" | "doc"; at: number };
const KCOL: Record<Item["kind"], string> = { msg: "#8FB8FF", reply: "#FFB3AE", doc: "#FFD27A" };
const IT = (t: string, kind: Item["kind"], at: number): Item => ({ t, kind, at });
const ITEMS: Item[] = [
  IT("Allergic to nuts 🥜", "msg", FILL[0] + 2),
  IT("Birthday cake?", "msg", FILL[0] + 10),
  IT("We do! 3 flavours", "reply", FILL[0] + 18),
  IT("Medium size?", "msg", FILL[0] + 26),
  IT("Serves 10–12", "reply", FILL[0] + 34),
  IT("Name on it?", "msg", FILL[1] - 4),
  IT("Up to 20 letters", "reply", FILL[2] - 4),
  IT("Menu.pdf", "doc", FILL[3] - 6),
  IT("Price list.pdf", "doc", FILL[3] + 2),
  IT("Delivery Sat?", "msg", FILL[3] + 12),
];
const MORE: Item[] = [
  IT("Gift card?", "msg", BIGGER + 14),
  IT("Yes, any amount", "reply", BIGGER + 20),
  IT("Hours.pdf", "doc", BIGGER + 26),
  IT("Gluten-free?", "msg", BIGGER + 32),
  IT("Two options", "reply", BIGGER + 38),
  IT("Pickup at 5?", "msg", LIMIT - 20),
  IT("Booked 5 PM", "reply", LIMIT - 14),
  IT("Policies.pdf", "doc", LIMIT - 8),
];
const ALL = [...ITEMS, ...MORE];
const EVICT = [SPILL - 4, SPILL + 6, LIMIT + 4, LIMIT + 10];
const CX = 540;
const CY = 1250;

const Bowl: React.FC<{ f: number }> = ({ f }) => {
  if (f < BOWL - 10) return null;
  const inS = clamp(springAt(f, BOWL - 8, 30, 13, 150));
  const grow = tw(f, BIGGER - 6, BIGGER + 12, 0, 1, E.expoInOut);
  const side = tw(f, LEAVE - 8, LIBRARY - 4, 0, 1, E.expoInOut);
  const out = tw(f, HIT - 16, HIT - 2, 0, 1, E.expoIn);
  const R = mix(360, 420, grow);
  const full = Math.max(keys(f, [[FULL - 2, 0], [FULL + 3, 1], [SPILL + 20, 0]], E.cubicInOut), keys(f, [[LIMIT - 4, 0], [LIMIT + 1, 1], [LIMIT + 22, 0]], E.cubicInOut));
  const bx = mix(CX, 290, side);
  const sc = mix(1, 0.56, side) * mix(0.5, 1, inS) * (1 - 0.3 * out);
  // evictions
  const evicted = (i: number) => (i < EVICT.length ? tw(f, EVICT[i], EVICT[i] + 24, 0, 1, E.linear) : 0);
  const shiftBefore = (i: number) => EVICT.reduce((a, e, k) => a + (k < i ? tw(f, e + 6, e + 16, 0, 1, E.cubicInOut) : 0), 0);
  const cap = grow > 0.5 ? 12 : 10;
  const water = clamp(ALL.filter((it) => f >= it.at).length / cap) * (1 - 0.2 * (EVICT.filter((e) => f > e).length / 4));
  // fish swims
  const fx = Math.sin(f * 0.04) * R * 0.45;
  const fy = -R * 0.55 + Math.sin(f * 0.07) * 20;
  const fdir = Math.cos(f * 0.04) > 0 ? 1 : -1;
  return (
    <div style={{ position: "absolute", left: bx, top: CY, transform: `scale(${sc})`, opacity: clamp(inS * 2) * (1 - out) }}>
      {/* glass + water */}
      <svg width={R * 2 + 40} height={R * 2 + 60} viewBox={`${-R - 20} ${-R - 40} ${R * 2 + 40} ${R * 2 + 60}`} style={{ position: "absolute", left: -R - 20, top: -R - 40, overflow: "visible" }}>
        <defs>
          <clipPath id="bowlclip">
            <path d={`M ${-R * 0.55} ${-R * 0.82} C ${-R * 1.25} ${-R * 0.4}, ${-R * 1.15} ${R * 0.95}, 0 ${R} C ${R * 1.15} ${R * 0.95}, ${R * 1.25} ${-R * 0.4}, ${R * 0.55} ${-R * 0.82} Z`} />
          </clipPath>
        </defs>
        <g clipPath="url(#bowlclip)">
          <rect x={-R * 1.3} y={R - water * R * 1.7} width={R * 2.6} height={R * 2} fill="rgba(90,200,255,.22)" />
          <path d={`M ${-R * 1.3} ${R - water * R * 1.7} Q ${-R * 0.6} ${R - water * R * 1.7 - 10 * Math.sin(f * 0.1)}, 0 ${R - water * R * 1.7} T ${R * 1.3} ${R - water * R * 1.7}`} stroke="rgba(200,240,255,.6)" strokeWidth={4} fill="none" />
        </g>
        <path d={`M ${-R * 0.55} ${-R * 0.82} C ${-R * 1.25} ${-R * 0.4}, ${-R * 1.15} ${R * 0.95}, 0 ${R} C ${R * 1.15} ${R * 0.95}, ${R * 1.25} ${-R * 0.4}, ${R * 0.55} ${-R * 0.82}`} fill="rgba(255,255,255,.06)" stroke={mixColor("#D8F1FF", "#FF6B6B", full)} strokeWidth={10 + 6 * full} strokeLinecap="round" />
        <ellipse cx={0} cy={-R * 0.82} rx={R * 0.55} ry={R * 0.1} fill="none" stroke={mixColor("#D8F1FF", "#FF6B6B", full)} strokeWidth={8 + 6 * full} />
        <path d={`M ${-R * 0.72} ${-R * 0.35} C ${-R * 0.9} ${R * 0.05}, ${-R * 0.8} ${R * 0.45}, ${-R * 0.55} ${R * 0.65}`} stroke="rgba(255,255,255,.45)" strokeWidth={12} fill="none" strokeLinecap="round" />
      </svg>
      {/* the goldfish (the AI) */}
      <div style={{ position: "absolute", left: fx - 50, top: fy - 30, width: 100, height: 60, transform: `scaleX(${fdir})`, zIndex: 3 }}>
        <svg width={100} height={60} viewBox="0 0 100 60">
          <path d="M 70 30 L 98 10 L 92 30 L 98 50 Z" fill="#FF9E3D" />
          <ellipse cx={42} cy={30} rx={34} ry={22} fill="#FF8A1F" />
          <path d="M 38 10 Q 48 0 58 12" fill="#FFB25C" />
          <circle cx={22} cy={25} r={5} fill="#1B1B1B" />
          <circle cx={23.5} cy={23.5} r={1.6} fill="#FFFFFF" />
        </svg>
      </div>
      {/* items */}
      {ALL.map((it, i) => {
        if (f < it.at - 12) return null;
        const drop = tw(f, it.at - 12, it.at, 0, 1, E.cubicIn);
        const slot = i - shiftBefore(i);
        const row = Math.floor(slot / 2);
        const col = Math.round(slot) % 2;
        const tx = (col === 0 ? -1 : 1) * R * 0.4;
        const ty = R * 0.8 - row * 80;
        const y = mix(-R - 260, ty, drop);
        const ev = evicted(i);
        const ex = tx + ev * (i % 2 ? 1 : -1) * R * 1.4;
        const ey = y - Math.sin(Math.PI * Math.min(1, ev * 1.6)) * R * 0.9 + (ev > 0.6 ? (ev - 0.6) * R * 3 : 0);
        const o = ev > 0 ? 1 - tw(ev, 0.7, 1, 0, 1, E.linear) : 1;
        return (
          <div key={i} style={{ position: "absolute", left: ex - 145, top: ey - 34, width: 290, height: 68, borderRadius: 20, background: KCOL[it.kind], boxShadow: i === 0 ? `0 0 0 ${5 * keys(f, [[SPILL - 10, 0], [SPILL - 4, 1], [GONE + 10, 1], [GONE + 20, 0]], E.cubicInOut)}px ${C.coral}` : "0 6px 12px rgba(0,0,0,.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT, fontSize: 29, fontWeight: 700, color: INK, whiteSpace: "nowrap", opacity: o, transform: `rotate(${(rnd(i * 3.1) - 0.5) * 8 + ev * 60 * (i % 2 ? 1 : -1)}deg)`, zIndex: 2 }}>
            {it.kind === "doc" ? <Icon name="file" size={24} color={INK} stroke={2.4} /> : null}
            {it.t}
          </div>
        );
      })}
      {/* labels */}
      <div style={{ position: "absolute", left: -200, width: 400, top: R + 30, textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: "0.14em", color: "#BFE6FF" }}>{grow > 0.5 ? "BIGGER BOWL" : "CONTEXT WINDOW"}</div>
      {full > 0.1 ? <div style={{ position: "absolute", left: -140, width: 280, top: -R - 150, textAlign: "center", fontFamily: FONT, fontSize: 60, fontWeight: 900, color: "#FF8A80", opacity: full, transform: `scale(${mix(0.6, 1, full)})` }}>FULL</div> : null}
      {f >= GONE - 2 && f < GONE + 30 ? <div style={{ position: "absolute", left: R * 0.35, top: -R - 150, fontFamily: FONT, fontSize: 56, fontWeight: 900, color: "#FF8A80", opacity: tw(f, GONE - 2, GONE + 6, 0, 1, E.linear) * (1 - tw(f, GONE + 20, GONE + 30, 0, 1, E.linear)), transform: "rotate(-8deg)" }}>gone.</div> : null}
    </div>
  );
};

/* ── the library (the knowledge base) ── */
const BOOKS: { t: string; c: string; icon: IconName }[] = [
  { t: "Menu", c: "#FF8A80", icon: "book" },
  { t: "Allergens", c: "#FFD27A", icon: "help" },
  { t: "Prices", c: "#8FE3B5", icon: "card" },
  { t: "Hours", c: "#8FB8FF", icon: "calendar" },
  { t: "Policies", c: "#C6A8FF", icon: "file" },
  { t: "FAQ", c: "#FFB3AE", icon: "help" },
];
const Library: React.FC<{ f: number }> = ({ f }) => {
  if (f < LIBRARY - 14) return null;
  const inS = clamp(springAt(f, LIBRARY - 12, 30, 14, 150));
  const out = tw(f, HIT - 16, HIT - 2, 0, 1, E.expoIn);
  const pull = tw(f, GRABS - 4, GRABS + 10, 0, 1, E.expoOut);
  const fly = tw(f, PAGES - 6, PAGES + 14, 0, 1, E.expoInOut);
  const q = clamp(springAt(f, QUESTION - 4, 30, 14, 190));
  const ans = clamp(springAt(f, SAFE - 20, 30, 14, 190));
  const X = 590;
  const Y = 760;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      <div style={{ position: "absolute", left: X, top: Y, width: 420, transform: `translateX(${(1 - inS) * 600}px)`, fontFamily: FONT }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: "#FFE3A3", marginBottom: 60, opacity: tw(f, KB - 4, KB + 6, 0, 1, E.linear) }}>YOUR KNOWLEDGE BASE</div>
        {[0, 1].map((shelf) => (
          <div key={shelf} style={{ position: "relative", height: 250 }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 22, borderRadius: 6, background: "#8A5A34", boxShadow: "0 10px 20px rgba(0,0,0,.4)" }} />
            {BOOKS.slice(shelf * 3, shelf * 3 + 3).map((b, k) => {
              const idx = shelf * 3 + k;
              const hot = idx === 1 ? pull * 0.7 : 0;
              return (
                <div key={b.t} style={{ position: "absolute", left: 10 + k * 136, bottom: 22, width: 120, height: 210, borderRadius: "10px 10px 4px 4px", background: b.c, transform: `translateY(${-hot * 60}px) rotate(${(k - 1) * 2}deg)`, boxShadow: hot > 0 ? `0 0 ${30 * hot}px #FFE3A3` : "0 6px 12px rgba(0,0,0,.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <Icon name={b.icon} size={40} color={INK} stroke={2.3} />
                  <div style={{ fontSize: 24, fontWeight: 800, color: INK, writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.04em" }}>{b.t}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* the question arrives in the (small) bowl */}
      {f >= QUESTION - 6 ? (
        <div style={{ position: "absolute", left: 80, top: 640, width: 440, transform: `scale(${mix(0.5, 1, q)})`, transformOrigin: "0 100%", opacity: clamp(q * 2), padding: "16px 22px", borderRadius: "26px 26px 26px 8px", background: "#5E6AD2", color: C.white, fontFamily: FONT, fontSize: 30, fontWeight: 650, lineHeight: 1.25 }}>
          Does the praline cake have nuts?
        </div>
      ) : null}
      {/* the page flies from the Allergens book to the bowl */}
      {fly > 0 && fly < 1 ? (
        <div style={{ position: "absolute", left: mix(X + 146 + 60, 300, fly), top: mix(Y + 90, 1120, fly) - Math.sin(Math.PI * fly) * 200, transform: `translate(-50%, -50%) rotate(${fly * -20}deg) scale(${mix(1, 0.7, fly)})`, width: 150, height: 190, borderRadius: 10, background: "#FFF9EC", boxShadow: "0 16px 30px rgba(0,0,0,.4)", padding: 14, boxSizing: "border-box", fontFamily: FONT }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>Allergens</div>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} style={{ height: 6, borderRadius: 3, background: k === 1 ? "#FF8A80" : "#DDD5C4", marginTop: 12, width: `${[90, 70, 85, 60][k]}%` }} />
          ))}
        </div>
      ) : null}
      {f >= SAFE - 22 ? (
        <div style={{ position: "absolute", left: 90, top: 1500, width: 900, transform: `translateY(${(1 - ans) * 80}px)`, opacity: clamp(ans * 2), display: "flex", gap: 16, alignItems: "flex-end", fontFamily: FONT }}>
          <AgentDot size={80} />
          <div style={{ flex: 1, padding: "20px 26px", borderRadius: "30px 30px 30px 8px", background: C.cream, color: INK, fontSize: 32, fontWeight: 600, lineHeight: 1.28, boxShadow: "0 20px 40px rgba(0,0,0,.35)" }}>
            It does, it has almonds. Try our lemon tart, it's nut-free 🍋
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, padding: "6px 14px", borderRadius: 10, background: "#FFF1CC", fontFamily: MONO, fontSize: 18, color: "#8A5A00", letterSpacing: "0.06em" }}>SOURCE · ALLERGENS</div>
          </div>
          <CheckDisc t={tw(f, SAFE, SAFE + 10, 0, 1, E.cubicInOut)} size={56} bg={C.green} fg={C.white} />
        </div>
      ) : null}
      {f >= SAFE ? <Sparkles x={90} y={1500} w={900} h={180} at={SAFE + 4} color="#FFE3A3" size={42} seed={4} /> : null}
    </div>
  );
};

const Water: React.FC<{ f: number }> = ({ f }) => {
  const day = tw(f, HIT - 1, HIT + 3, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ background: mixColor(DEEP, C.cream, day) }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${SEA} 0%, ${DEEP} 70%)`, opacity: 1 - day }} />
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{ position: "absolute", left: 120 + k * 260 + Math.sin(f * 0.01 + k) * 40, top: -200, width: 120, height: 1500, transform: `rotate(${12 + k * 3}deg)`, background: "linear-gradient(180deg, rgba(160,220,255,.16), rgba(160,220,255,0))", opacity: (0.6 + 0.4 * Math.sin(f * 0.03 + k * 2)) * (1 - day), filter: "blur(10px)" }} />
      ))}
      {Array.from({ length: 26 }, (_, i) => {
        const r = 6 + rnd(i * 2.2) * 14;
        const x = rnd(i * 5.3) * 1080 + Math.sin(f * 0.05 + i) * 12;
        const y = 1960 - (((rnd(i * 9.1) * 2100) + f * (1.6 + rnd(i) * 2.2)) % 2100);
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, border: "2px solid rgba(200,240,255,.45)", background: "rgba(200,240,255,.08)", opacity: 1 - day }} />;
      })}
    </AbsoluteFill>
  );
};

const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, HIT - 14, HIT - 6, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: C.cream }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: "#FF8A1F" }} />
      AI, EXPLAINED · 06
    </div>
  );
};

const H: React.FC<{ from: number; to: number; ws: { t: string; at: number; hi?: boolean; br?: boolean }[]; hi?: string }> = ({ from, to, ws, hi = "#FFB25C" }) => <Kinetic from={from} to={to} color={C.cream} hi={hi} words={ws} />;
const Headlines: React.FC = () => (
  <>
    <H from={T.VO.l01} to={RUDE - 8} ws={[{ t: "Why", at: w("l01", 0) }, { t: "did", at: w("l01", 2) }, { t: "it", at: w("l01", 9) }, { t: "forget?", at: w("l01", 11), hi: true }]} />
    <H from={RUDE - 1} to={T.VO.l03 - 8} ws={[{ t: "It's", at: w("l02", 0) }, { t: "not", at: w("l02", 1) }, { t: "being", at: w("l02", 2), br: true }, { t: "rude.", at: w("l02", 3), hi: true }]} />
    <H from={T.VO.l03 - 1} to={T.VO.l04 - 8} hi="#7FD6FF" ws={[{ t: "It", at: w("l03", 0) }, { t: "has", at: w("l03", 1) }, { t: "a", at: w("l03", 2), br: true }, { t: "context", at: w("l03", 3), hi: true }, { t: "window.", at: w("l03", 4), hi: true }]} />
    <H from={T.VO.l04 - 1} to={T.VO.l06 - 8} ws={[{ t: "Think", at: w("l04", 0) }, { t: "of", at: w("l04", 1) }, { t: "it", at: w("l04", 2), br: true }, { t: "as", at: w("l04", 3) }, { t: "a", at: w("l04", 4) }, { t: "fishbowl.", at: w("l04", 5), hi: true }]} />
    <H from={T.VO.l06 - 1} to={T.VO.l07 - 8} hi="#FF8A80" ws={[{ t: "When", at: w("l06", 0) }, { t: "it's", at: w("l06", 1) }, { t: "full,", at: w("l06", 4), hi: true, br: true }, { t: "the", at: w("l06", 5) }, { t: "oldest", at: w("l06", 6) }, { t: "spills.", at: w("l06", 8), hi: true }]} />
    <H from={T.VO.l07 - 1} to={T.VO.l08 - 8} ws={[{ t: "Bigger", at: w("l07", 3), hi: true }, { t: "bowls.", at: w("l07", 4), br: true }, { t: "Still", at: w("l07", 5) }, { t: "a", at: w("l07", 9) }, { t: "limit.", at: w("l07", 10), hi: true }]} />
    <H from={T.VO.l08 + 2} to={T.VO.l09 - 6} ws={[{ t: "Don't", at: w("l08", 4) }, { t: "keep", at: w("l08", 5) }, { t: "it", at: w("l08", 6), br: true }, { t: "in", at: w("l08", 8) }, { t: "the", at: w("l08", 9) }, { t: "bowl.", at: w("l08", 10), hi: true }]} />
    <H from={T.VO.l09 - 4} to={QUESTION - 8} hi="#FFE3A3" ws={[{ t: "Keep", at: w("l09", 1) }, { t: "it", at: w("l09", 2) }, { t: "in", at: w("l09", 3) }, { t: "a", at: w("l09", 4), br: true }, { t: "library.", at: w("l09", 5), hi: true }]} />
    <H from={QUESTION - 6} to={HIT - 14} hi="#FFE3A3" ws={[{ t: "Grabs", at: w("l10", 4) }, { t: "just", at: w("l10", 5), br: true }, { t: "the", at: w("l10", 6) }, { t: "page", at: w("l10", 7), hi: true }, { t: "it", at: w("l10", 8) }, { t: "needs.", at: w("l10", 9), hi: true }]} />
  </>
);

export const Goldfish: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT }}>
      <Water f={f} />
      <Hook f={f} />
      <Bowl f={f} />
      <Library f={f} />
      <Series f={f} />
      <Headlines />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("films/goldfish/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...HOOKMSGS.map((m, i) => cue(m.at, m.me ? "send" : "receive", -9 - (i % 3), `chat ${i + 1}`)),
  cue(FORGOT + 6, "impact", -6, "FORGOT?!", { kind: "hit" }),
  cue(FORGOT + 12, "miss", -4, "the allergy lights up"),
  cue(WINDOW - 6, "draw", -8, "context window frame"),
  cue(BOWL - 20, "whoosh", -7, "chat away"),
  cue(BOWL - 6, "glassify", -6, "the fishbowl"),
  cue(BOWL, "poweron", -10, "bowl"),
  ...ALL.map((it, i) => cue(it.at, "pop", -10 - (i % 3), `item ${i + 1} drops in`)),
  cue(FULL, "buzz", -6, "full"),
  cue(SPILL - 4, "whoosh", -6, "spills"),
  cue(GONE, "sink", -4, "gone"),
  cue(BIGGER - 6, "swell", -6, "bigger bowl"),
  cue(LIMIT, "buzz", -6, "still a limit"),
  cue(LEAVE - 6, "whoosh", -7, "bowl moves aside"),
  cue(LIBRARY - 10, "whoosh", -7, "the library"),
  cue(KB, "shimmer", -10, "knowledge base"),
  ...moments.ask(QUESTION - 4, "question"),
  cue(GRABS, "flip", -3, "grabs the book"),
  cue(PAGES, "whoosh", -8, "the page flies"),
  cue(SAFE - 20, "receive", -2, "right answer"),
  cue(SAFE, "check", -3, "nothing spills"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { FORGOT, WINDOW, BOWL, FULL, SPILL, BIGGER, LIMIT, LIBRARY, QUESTION, SAFE, HIT, CTA, URL, DUR };

export const GOLDFISH: FilmDef = { id: "Goldfish", slug: "goldfish", title: "Goldfish", component: Goldfish, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/goldfish/mix.wav" };
