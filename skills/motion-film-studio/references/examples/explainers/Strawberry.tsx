import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, Stamp, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { AgentDot, CheckDisc, Icon, IconName } from "../../kit/ui";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/strawberry/vo/lines.json";
import words from "../../../../public/films/strawberry/vo/words.json";

loadFonts();

/**
 * WHY CAN'T AI COUNT THE R'S IN STRAWBERRY? — AI, explained · 05.
 * Wooden letter tiles on a candy-pink board: the AI sees tokens (chunks),
 * not letters — so exact things (counting, maths, dates) go to tools.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const Q_AT = w("l01", 0);
const A_AT = w("l01", 12);
const WRONG = w("l02", 0);
const TILES_AT = w("l04", 0);
const TOKENS = w("l05", 2);
const CHUNKS = w("l05", 3);
const SPLIT = w("l06", 0);
const TWO = w("l07", 4);
const TEN = w("l07", 7);
const NEVER = w("l08", 1);
const SHAKY = [w("l09", 10), w("l09", 11), w("l09", 12)];
const AGENT = w("l10", 4);
const TOOLS = [w("l11", 4), w("l11", 8), w("l11", 12)];
const TALK = w("l12", 0);
const COUNT = w("l12", 5);
const HIT = w("l13", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l13", i));
const CTA = w("l14", 0) - 2;
const URL = w("l14", T.nwords("l14") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l14") + 60);

const BG = "#FFE1E4";
const WOOD = "#F3DDB3";
const WOOD_D = "#C9A46A";
const INK = "#2B1B17";
const TOK = ["#B9A4FF", "#8FE3B5"];
const LETTERS = "strawberry".split("");
const TW = 80; // tile size
const GAPX = 6;
const ROWX = (1080 - (LETTERS.length * TW + (LETTERS.length - 1) * GAPX)) / 2;
const ROWY = 1010;

/** A wooden letter tile (Scrabble-like), with a 3D edge. */
const Tile: React.FC<{ ch: string; x: number; y: number; hi?: number; blur?: number; rot?: number; s?: number }> = ({ ch, x, y, hi = 0, blur = 0, rot = 0, s = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: TW, height: TW, transform: `rotate(${rot}deg) scale(${s})`, filter: blur > 0 ? `blur(${blur}px)` : undefined }}>
    <div style={{ position: "absolute", left: 0, top: 8, width: TW, height: TW, borderRadius: 14, background: WOOD_D }} />
    <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: mixColor(WOOD, "#FFB3B8", hi), boxShadow: `inset 0 2px 0 rgba(255,255,255,.6), 0 0 0 ${5 * hi}px ${C.coral}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 56, fontWeight: 800, color: mixColor(INK, C.coralDeep, hi), textTransform: "uppercase" }}>{ch}</div>
  </div>
);

/* ── the hook: a chat that gets it wrong ── */
const Hook: React.FC<{ f: number }> = ({ f }) => {
  if (f > TILES_AT + 6) return null;
  const out = tw(f, TILES_AT - 16, TILES_AT, 0, 1, E.expoIn);
  const q = clamp(springAt(f, Q_AT + 4, 30, 14, 190));
  const a = clamp(springAt(f, A_AT - 6, 30, 14, 190));
  return (
    <div style={{ position: "absolute", left: 90, top: 760, width: 900, transform: `translateY(${out * -900}px)`, opacity: 1 - out, fontFamily: FONT }}>
      <div style={{ borderRadius: 40, background: C.white, boxShadow: "0 40px 80px rgba(120,30,40,.18)", padding: "30px 32px 36px" }}>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: C.gray, marginBottom: 22 }}>ANY AI CHAT APP</div>
        <div style={{ display: "flex", justifyContent: "flex-end", transform: `scale(${mix(0.6, 1, q)})`, transformOrigin: "100% 100%", opacity: clamp(q * 2) }}>
          <div style={{ padding: "18px 26px", borderRadius: "32px 32px 8px 32px", background: "#5E6AD2", color: C.white, fontSize: 40, fontWeight: 600 }}>How many R's are in "strawberry"?</div>
        </div>
        {f >= A_AT - 8 ? (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginTop: 22, transform: `scale(${mix(0.6, 1, a)})`, transformOrigin: "0 100%", opacity: clamp(a * 2) }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: "#E7E3DC", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="sparkles" size={32} color={C.gray} stroke={2.2} />
            </div>
            <div style={{ padding: "18px 26px", borderRadius: "32px 32px 32px 8px", background: "#F1EFEA", color: C.ink, fontSize: 40, fontWeight: 600 }}>There are 2 R's in "strawberry" 🍓</div>
          </div>
        ) : null}
      </div>
      {f >= WRONG - 2 ? <Stamp at={WRONG} text="WRONG" x={640} y={330} rot={-10} size={120} /> : null}
    </div>
  );
};

/* ── the tiles → tokens ── */
const Tiles: React.FC<{ f: number }> = ({ f }) => {
  if (f < TILES_AT - 4 || f > SHAKY[0] - 4) return null;
  const out = tw(f, SHAKY[0] - 20, SHAKY[0] - 6, 0, 1, E.expoIn);
  const split = tw(f, SPLIT - 6, SPLIT + 10, 0, 1, E.expoInOut);
  const group = tw(f, TOKENS - 4, CHUNKS + 8, 0, 1, E.expoInOut);
  const blur = tw(f, NEVER, NEVER + 12, 0, 1, E.cubicInOut);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${out * 1100}px)`, opacity: 1 - out }}>
      {/* token containers */}
      {[0, 1].map((k) => {
        const from = k === 0 ? 0 : 5;
        const n = 5;
        const x0 = ROWX + from * (TW + GAPX) - 16 + (k === 1 ? 40 : -40) * split;
        const wdt = n * TW + (n - 1) * GAPX + 32;
        return (
          <div key={k} style={{ position: "absolute", left: x0, top: ROWY - 30, width: wdt, height: TW + 70, borderRadius: 30, background: TOK[k], opacity: group * 0.95, transform: `scale(${mix(0.9, 1, group)})`, boxShadow: `0 20px 40px ${TOK[k]}88` }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: -64, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: "0.12em", color: INK, opacity: tw(f, SPLIT + 4, SPLIT + 14, 0, 1, E.linear) }}>TOKEN {k + 1}</div>
          </div>
        );
      })}
      {LETTERS.map((ch, i) => {
        const at = TILES_AT + i * 2;
        const s = clamp(springAt(f, at, 30, 12, 200));
        const k = i < 5 ? 0 : 1;
        const x = ROWX + i * (TW + GAPX) + (k === 1 ? 40 : -40) * split;
        const isR = ch === "r";
        const hi = isR ? keys(f, [[WRONG + 6, 0], [WRONG + 12, 1], [TOKENS - 6, 1], [TOKENS, 0]], E.cubicInOut) : 0;
        const y = ROWY - (1 - s) * 400 + Math.sin(f * 0.08 + i) * 3;
        return <Tile key={i} ch={ch} x={x} y={y} hi={hi} blur={isR ? blur * 7 : 0} rot={(rnd(i * 4.1) - 0.5) * 6 * (1 - group)} s={mix(0.3, 1, s)} />;
      })}
      {/* the words on top of the tokens once they're chunks */}
      {group > 0.6 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: ROWY + 200, display: "flex", justifyContent: "center", gap: 80, opacity: tw(f, TWO - 4, TWO + 6, 0, 1, E.linear) }}>
          <div style={{ textAlign: "center", fontFamily: FONT }}>
            <div style={{ fontSize: 150, fontWeight: 900, color: C.coral, letterSpacing: "-0.05em", lineHeight: 1 }}>2</div>
            <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: "0.14em", color: INK }}>PIECES IT SEES</div>
          </div>
          <div style={{ textAlign: "center", fontFamily: FONT, opacity: tw(f, TEN - 4, TEN + 6, 0, 1, E.linear) }}>
            <div style={{ fontSize: 150, fontWeight: 900, color: "rgba(43,27,23,.3)", letterSpacing: "-0.05em", lineHeight: 1, textDecoration: "line-through", textDecorationColor: C.coral }}>10</div>
            <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: "0.14em", color: "rgba(43,27,23,.5)" }}>LETTERS</div>
          </div>
        </div>
      ) : null}
      {/* a second example: a sentence tokenized */}
      {f >= CHUNKS - 4 && f < SPLIT - 4 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: ROWY + 220, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", padding: "0 80px", opacity: tw(f, CHUNKS - 4, CHUNKS + 6, 0, 1, E.linear) * (1 - tw(f, SPLIT - 12, SPLIT - 4, 0, 1, E.linear)) }}>
          {["Thanks", " for", " your", " order", "!"].map((t, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: ["#FFD6A5", "#B9A4FF", "#8FE3B5", "#A0D8FF", "#FFB3C7"][i], fontFamily: MONO, fontSize: 40, color: INK, whiteSpace: "pre", transform: `scale(${clamp(springAt(f, CHUNKS + i * 3, 30, 12, 200))})` }}>{t}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/* ── shaky with exact stuff ── */
const SHAKYDEF: { icon: IconName; t: string; bad: string }[] = [
  { icon: "activity", t: "Counting", bad: "3 or 2?" },
  { icon: "card", t: "Maths", bad: "17 × 24 = 398?" },
  { icon: "calendar", t: "Dates", bad: "Fri the 31st?" },
];
const Shaky: React.FC<{ f: number }> = ({ f }) => {
  if (f < SHAKY[0] - 8 || f > TOOLS[0] - 2) return null;
  const toTools = tw(f, AGENT - 6, AGENT + 12, 0, 1, E.expoInOut);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - toTools }}>
      {SHAKYDEF.map((d, i) => {
        const s = clamp(springAt(f, SHAKY[i] - 4, 30, 12, 180));
        const wob = Math.sin(f * 0.5 + i * 2) * 3;
        return (
          <div key={d.t} style={{ position: "absolute", left: 90 + i * 310, top: 860, width: 280, height: 470, transform: `translateY(${(1 - s) * 300}px) rotate(${wob}deg)`, opacity: clamp(s * 2), borderRadius: 34, background: C.white, boxShadow: "0 30px 60px rgba(120,30,40,.16)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: FONT }}>
            <div style={{ width: 110, height: 110, borderRadius: 30, background: "#FFE1E4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={d.icon} size={60} color={C.coral} stroke={2.3} />
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, color: INK, letterSpacing: "-0.03em" }}>{d.t}</div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: C.coralDeep, textAlign: "center" }}>{d.bad}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ── the agent uses tools ── */
const TOOLDEF: { icon: IconName; t: string; q: string; a: string; color: string }[] = [
  { icon: "card", t: "Calculator", q: "12 cupcakes × $3.50?", a: "$42.00", color: "#5E6AD2" },
  { icon: "calendar", t: "Calendar", q: "Free on Friday?", a: "Fri 10:30 open", color: "#1C9A83" },
  { icon: "database", t: "Stock list", q: "Is it in stock?", a: "Yes · 14 left", color: "#D4861C" },
];
const Tools: React.FC<{ f: number }> = ({ f }) => {
  if (f < AGENT - 8 || f > HIT) return null;
  const inS = clamp(springAt(f, AGENT - 4, 30, 14, 160));
  const split = tw(f, TALK - 6, TALK + 10, 0, 1, E.expoInOut);
  const out = tw(f, HIT - 14, HIT - 2, 0, 1, E.expoIn);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `scale(${1 - 0.3 * out})`, transformOrigin: "540px 860px" }}>
      {/* the agent in the middle */}
      <div style={{ position: "absolute", left: 540 - 110, top: 640, width: 220, height: 220, transform: `scale(${mix(0.4, 1, inS)}) translateY(${-split * 60}px)`, opacity: clamp(inS * 2) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 110, boxShadow: `0 0 0 ${16 + 6 * Math.sin(f * 0.15)}px rgba(217,87,89,.15), 0 30px 60px rgba(217,87,89,.35)` }} />
        <AgentDot size={220} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 890, textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: "0.14em", color: INK, opacity: clamp(inS * 2) * (1 - split) }}>YOUR AI AGENT</div>
      {/* the tools */}
      {TOOLDEF.map((d, i) => {
        const s = clamp(springAt(f, TOOLS[i] - 4, 30, 13, 170));
        const ans = tw(f, TOOLS[i] + 10, TOOLS[i] + 18, 0, 1, E.expoOut);
        const y = 980 + i * 180;
        return (
          <div key={d.t} style={{ position: "absolute", left: 90, top: y, width: 900, height: 150, transform: `translateX(${(1 - s) * (i % 2 ? 900 : -900)}px)`, opacity: clamp(s * 2), borderRadius: 32, background: C.white, boxShadow: "0 20px 44px rgba(120,30,40,.14)", display: "flex", alignItems: "center", gap: 22, padding: "0 28px", boxSizing: "border-box", fontFamily: FONT }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: mixColor(d.color, "#FFFFFF", 0.85), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={d.icon} size={52} color={d.color} stroke={2.3} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: INK, letterSpacing: "-0.03em" }}>{d.t}</div>
              <div style={{ fontSize: 28, color: C.gray, marginTop: 2 }}>{d.q}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: ans, transform: `translateX(${(1 - ans) * 30}px)` }}>
              <div style={{ fontFamily: MONO, fontSize: 30, color: d.color, fontWeight: 600, whiteSpace: "nowrap" }}>{d.a}</div>
              <CheckDisc t={ans} size={46} bg={d.color} fg={C.white} />
            </div>
          </div>
        );
      })}
      {/* talking vs counting */}
      {split > 0 ? (
        <div style={{ position: "absolute", left: 90, top: 1540, width: 900, display: "flex", gap: 20, opacity: split }}>
          {[
            ["The AI", "does the talking", C.coral, TALK],
            ["The tools", "do the counting", INK, COUNT],
          ].map(([a, b, col, at]) => (
            <div key={a as string} style={{ flex: 1, borderRadius: 28, background: col as string, color: C.cream, padding: "22px 26px", fontFamily: FONT, transform: `scale(${clamp(springAt(f, at as number, 30, 12, 190))})` }}>
              <div style={{ fontSize: 48, fontWeight: 850, letterSpacing: "-0.03em" }}>{a}</div>
              <div style={{ fontSize: 36, opacity: 0.9 }}>{b}</div>
            </div>
          ))}
        </div>
      ) : null}
      {f >= TOOLS[2] + 18 ? <Sparkles x={90} y={980} w={900} h={520} at={TOOLS[2] + 20} color={C.coral} size={42} seed={3} /> : null}
    </div>
  );
};

const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, HIT - 14, HIT - 6, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: INK }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: C.coral }} />
      AI, EXPLAINED · 05
    </div>
  );
};

const H: React.FC<{ from: number; to: number; ws: { t: string; at: number; hi?: boolean; br?: boolean }[]; size?: number }> = ({ from, to, ws, size }) => <Kinetic from={from} to={to} size={size} color={INK} hi={C.coral} words={ws} />;
const Headlines: React.FC = () => (
  <>
    <H from={T.VO.l01} to={WRONG - 8} ws={[{ t: "How", at: w("l01", 3) }, { t: "many", at: w("l01", 4) }, { t: "R's", at: w("l01", 5), hi: true, br: true }, { t: "in", at: w("l01", 7) }, { t: "strawberry?", at: w("l01", 8), hi: true }]} />
    <H from={T.VO.l03 - 1} to={TILES_AT - 9} ws={[{ t: "So", at: w("l03", 0) }, { t: "smart…", at: w("l03", 5), br: true }, { t: "can't", at: w("l03", 6) }, { t: "count?", at: w("l03", 7), hi: true }]} />
    <H from={TILES_AT - 1} to={T.VO.l05 - 6} ws={[{ t: "AI", at: w("l04", 1) }, { t: "doesn't", at: w("l04", 2) }, { t: "read", at: w("l04", 3), br: true }, { t: "letters.", at: w("l04", 4), hi: true }]} />
    <H from={T.VO.l05 - 4} to={T.VO.l06 - 6} ws={[{ t: "It", at: w("l05", 0) }, { t: "reads", at: w("l05", 1) }, { t: "tokens.", at: w("l05", 2), hi: true, br: true }, { t: "Little", at: w("l05", 3) }, { t: "chunks.", at: w("l05", 4) }]} />
    <H from={T.VO.l06 - 4} to={NEVER - 8} size={120} ws={[{ t: "Straw", at: w("l06", 0) + 2, hi: true }, { t: "·", at: w("l06", 0) + 10 }, { t: "berry", at: w("l06", 0) + 16, hi: true }]} />
    <H from={NEVER - 4} to={T.VO.l09 - 8} ws={[{ t: "It", at: w("l08", 0) }, { t: "never", at: w("l08", 1) }, { t: "sees", at: w("l08", 3), br: true }, { t: "the", at: w("l08", 4) }, { t: "R's.", at: w("l08", 5), hi: true }]} />
    <H from={T.VO.l09 - 1} to={AGENT - 10} ws={[{ t: "Shaky", at: w("l09", 6), hi: true }, { t: "with", at: w("l09", 7), br: true }, { t: "exact", at: w("l09", 8) }, { t: "stuff.", at: w("l09", 9) }]} />
    <H from={AGENT - 6} to={T.VO.l12 - 8} ws={[{ t: "A", at: w("l10", 1) }, { t: "good", at: w("l10", 2) }, { t: "agent", at: w("l10", 4), br: true }, { t: "uses", at: w("l11", 1) }, { t: "tools.", at: w("l11", 2), hi: true }]} />
    <H from={T.VO.l12 - 6} to={HIT - 14} ws={[{ t: "AI", at: w("l12", 1) }, { t: "talks.", at: w("l12", 4), br: true }, { t: "Tools", at: w("l12", 6) }, { t: "count.", at: w("l12", 9), hi: true }]} />
  </>
);

export const Strawberry: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const day = tw(f, HIT - 1, HIT + 3, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: mixColor(BG, C.cream, day) }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(217,87,89,.12) 3px, transparent 3.5px)", backgroundSize: "44px 44px", opacity: 1 - day }} />
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: rnd(i * 3.3) * 1000, top: ((rnd(i * 7.1) * 1920 + f * (0.6 + rnd(i) * 0.6)) % 2100) - 100, fontSize: 60 + rnd(i) * 40, opacity: 0.35 * (1 - day), transform: `rotate(${f * 0.4 + i * 40}deg)` }}>🍓</div>
      ))}
      <Hook f={f} />
      <Tiles f={f} />
      <Shaky f={f} />
      <Tools f={f} />
      <Series f={f} />
      <Headlines />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/strawberry/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...moments.ask(Q_AT + 4, "the question"),
  ...moments.answer(A_AT - 6, "the wrong answer"),
  cue(WRONG, "impact", -6, "WRONG stamp", { kind: "hit" }),
  cue(WRONG + 8, "blip", -6, "the R's light up"),
  ...LETTERS.map((_, i) => cue(TILES_AT + i * 2, i % 2 ? "tick" : "snap", -10, `tile ${i + 1}`)),
  cue(TOKENS - 4, "swell", -8, "tokens group"),
  cue(CHUNKS + 2, "pop", -6, "sentence tokens"),
  cue(SPLIT, "whoosh", -4, "straw · berry"),
  cue(SPLIT + 4, "snap", -3, "split"),
  cue(TWO, "pop", -3, "2 pieces"),
  cue(TEN, "miss", -5, "not 10 letters"),
  cue(NEVER, "sink", -6, "the R's blur"),
  ...SHAKY.map((s, i) => cue(s - 2, "pop", -6, `shaky ${i + 1}`)),
  cue(AGENT - 4, "poweron", -6, "the agent"),
  ...TOOLS.map((t, i) => cue(t - 4, "whoosh", -9, `tool ${i + 1} in`)),
  ...TOOLS.map((t, i) => cue(t + 10, "check", -4, `tool ${i + 1} answers`)),
  cue(TALK, "pop", -4, "AI talks"),
  cue(COUNT, "pop", -4, "tools count"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { WRONG, TILES_AT, TOKENS, SPLIT, NEVER, AGENT, TOOLS, TALK, HIT, CTA, URL, DUR };

export const STRAWBERRY: FilmDef = { id: "Strawberry", slug: "strawberry", title: "Strawberry", component: Strawberry, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/strawberry/mix.wav" };
