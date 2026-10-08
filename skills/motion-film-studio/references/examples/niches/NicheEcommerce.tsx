import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec } from "../../kit/people";
import { ChannelBadge, ToolCall } from "../../kit/agentic";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/niche-ecommerce/vo/lines.json";
import words from "../../../../public/films/niche-ecommerce/vo/words.json";

loadFonts();

/**
 * NICHE · E-commerce. World: the store's live catalog, a wall of product
 * tiles. Signature: the agent's tool call drops us into the catalog — the wall
 * filters itself (shoe → size → colour) until one tile rises: "3 left". Then
 * the product card with an add-on, an order looked up and tracked, and the
 * next-day WhatsApp follow-up for the shopper who didn't buy.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const Q = w("l01", 0) - 4;
const SCRIPT = w("l02", 0);
const STRIKE = w("l02", 5);
const DROP = w("l03", 0) - 2;
const CONNECT = w("l04", 1);
const SHOE = w("l04", 8);
const SIZE = w("l04", 10);
const COLOR = w("l04", 12);
const LEFT = w("l05", 0);
const PHOTO = w("l06", 1);
const SOCKS = w("l06", 14);
const WHERE = w("l07", 0);
const LOOKS = w("l08", 1);
const TRACK = w("l08", 7);
const NOTICKET = w("l08", 8);
const SHOPPER = w("l09", 2);
const DIDNT = w("l09", 8);
const NEXT = w("l10", 0);
const FOLLOW = w("l10", 4);
const WORKS = w("l11", 9);
const HIT = T.VO.l12 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l12", 2) + 4;
const URL = w("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 50);
const S1 = DROP; // → the catalog
const S2 = PHOTO - 8; // → the product card
const S3 = WHERE - 6; // → the order
const S4 = SHOPPER - 6; // → the follow-up
const S5 = w("l11", 0) - 6; // → it works with them

const MAYA: FaceSpec = { name: "Maya", skin: "#C98E68", hair: "#2A1B14", style: "long", shirt: "#E27BA0", bg: "#FBE0EA" };

/* ── products, drawn ── */
type Kind = "shoe" | "tee" | "cap" | "bag" | "socks";
const Product: React.FC<{ kind: Kind; color: string; size: number }> = ({ kind, color, size }) => {
  const sole = color === "#1C1C1E" ? "#F4F1EA" : "#FFFFFF";
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62">
      {kind === "shoe" ? (
        <>
          <path d="M6 40 C 6 30, 20 27, 32 25 L 44 13 C 49 8, 58 8, 62 15 L 70 26 C 80 28, 92 30, 95 37 L 95 44 L 6 44 Z" fill={color} />
          <path d="M5 43 L 96 43 L 96 49 C 70 52, 30 52, 5 49 Z" fill={sole} />
          <circle cx={46} cy={30} r={2.4} fill={sole} opacity={0.8} />
          <circle cx={54} cy={27} r={2.4} fill={sole} opacity={0.8} />
          <circle cx={62} cy={29} r={2.4} fill={sole} opacity={0.8} />
        </>
      ) : kind === "tee" ? (
        <path d="M30 8 L 42 4 C 45 10, 55 10, 58 4 L 70 8 L 84 22 L 74 30 L 68 26 L 68 58 L 32 58 L 32 26 L 26 30 L 16 22 Z" fill={color} />
      ) : kind === "cap" ? (
        <>
          <path d="M22 40 C 22 18, 70 14, 72 40 Z" fill={color} />
          <path d="M60 40 L 92 40 C 92 46, 70 48, 60 44 Z" fill={color} opacity={0.8} />
        </>
      ) : kind === "bag" ? (
        <>
          <path d="M34 20 C 34 6, 66 6, 66 20" fill="none" stroke={color} strokeWidth={5} />
          <rect x={22} y={20} width={56} height={38} rx={8} fill={color} />
        </>
      ) : (
        <>
          <path d="M34 6 L 50 6 L 50 36 L 66 44 C 72 48, 68 58, 60 56 L 36 48 C 32 46, 34 42, 34 38 Z" fill={color} />
          <rect x={34} y={6} width={16} height={6} fill="#FFFFFF" opacity={0.6} />
        </>
      )}
    </svg>
  );
};
const COLORS = ["#1C1C1E", "#E85D4A", "#3A7BD5", "#F2B544", "#7BC67E", "#B388EB", "#F4F1EA", "#FF8FB1"];
type Tile = { kind: Kind; color: string; name: string; size42: boolean; target?: boolean };
const COLS = 6, ROWS = 9;
const TILES: Tile[] = Array.from({ length: COLS * ROWS }, (_, i) => {
  const kinds: Kind[] = ["shoe", "tee", "cap", "bag", "socks", "shoe"];
  const kind = kinds[Math.floor(rnd(i * 3.3) * kinds.length)];
  const color = COLORS[Math.floor(rnd(i * 5.9 + 1) * COLORS.length)];
  return { kind, color, name: kind === "shoe" ? (rnd(i) > 0.5 ? "Runner 2" : "Court Lo") : kind, size42: rnd(i * 7.7 + 2) > 0.45 };
});
const TARGET = 3 * COLS + 2; // the black Runner 2, size 42
TILES[TARGET] = { kind: "shoe", color: "#1C1C1E", name: "Runner 2", size42: true, target: true };
// only the target passes every filter
TILES.forEach((t, i) => {
  if (i !== TARGET && t.kind === "shoe" && t.color === "#1C1C1E" && t.size42) t.size42 = false;
});

const Catalog: React.FC<{ f: number }> = ({ f }) => {
  const enter = springAt(f, S1, 30, 14, 110);
  const fShoe = tw(f, SHOE - 2, SHOE + 6, 0, 1, E.linear);
  const fSize = tw(f, SIZE - 2, SIZE + 6, 0, 1, E.linear);
  const fColor = tw(f, COLOR - 2, COLOR + 6, 0, 1, E.linear);
  const lift = springAt(f, LEFT - 2, 30, 11, 170);
  const tw_ = 160, th = 176, gap = 14;
  const gx = (1080 - (COLS * tw_ + (COLS - 1) * gap)) / 2, gy = 610;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F3F0EA", transform: `scale(${mix(1.25, 1, clamp(enter))})`, transformOrigin: "50% 45%", opacity: clamp(enter * 2) }}>
      <div style={{ position: "absolute", left: gx, top: gy - 70, fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.gray }}>YOUR CATALOG · LIVE</div>
      {TILES.map((t, i) => {
        const cx = i % COLS, cy = Math.floor(i / COLS);
        const out = Math.max(t.kind !== "shoe" ? fShoe : 0, !t.size42 ? fSize : 0, t.color !== "#1C1C1E" ? fColor : 0);
        const isT = !!t.target;
        const s = isT ? clamp(lift) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: gx + cx * (tw_ + gap), top: gy + cy * (th + gap), width: tw_, height: th, borderRadius: 18, background: C.white, boxShadow: isT && s > 0 ? `0 ${20 * s}px ${50 * s}px rgba(23,23,23,.3), 0 0 0 ${4 * s}px ${C.coral}` : "0 2px 6px rgba(23,23,23,.08)", opacity: 1 - 0.82 * out, transform: `scale(${1 + 0.35 * s}) translateY(${-30 * s}px)`, zIndex: isT ? 10 : 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, filter: out > 0.5 ? "grayscale(0.8)" : "none" }}>
            <Product kind={t.kind} color={t.color} size={120} />
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: FONT }}>{t.name}</div>
            {isT && s > 0.05 ? (
              <div style={{ position: "absolute", top: -18, right: -18, padding: "6px 12px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 20, fontWeight: 800, fontFamily: FONT, transform: `scale(${s})`, whiteSpace: "nowrap" }}>3 left</div>
            ) : null}
          </div>
        );
      })}
      {/* filter chips as they apply */}
      <div style={{ position: "absolute", left: gx, top: gy + ROWS * (th + gap) + 10, display: "flex", gap: 12, fontFamily: FONT }}>
        {[["👟 shoe", SHOE], ["size 42", SIZE], ["⚫ black", COLOR]].map(([t, at]) => {
          const c = springAt(f, (at as number) - 2, 30, 11, 190);
          return <div key={t as string} style={{ padding: "10px 20px", borderRadius: 999, background: C.ink, color: C.cream, fontSize: 28, fontWeight: 700, transform: `scale(${mix(0.4, 1, clamp(c))})`, opacity: clamp(c * 2) }}>{t as string}</div>;
        })}
      </div>
      {f >= LEFT + 4 ? <Sparkles x={gx + 2 * (tw_ + gap) - 40} y={gy + 3 * (th + gap) - 60} w={260} h={260} at={LEFT + 4} color={C.coral} size={30} seed={5} /> : null}
    </div>
  );
};

/* ── the conversation (Instagram DM) ── */
const DmCard: React.FC<{ children: React.ReactNode; y?: number }> = ({ children, y = 470 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, borderRadius: 40, background: C.white, boxShadow: "0 40px 90px rgba(23,23,23,.14)", overflow: "hidden", fontFamily: FONT }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 28px", borderBottom: "2px solid #F0EEE9" }}>
      <ChannelBadge ch="instagram" size={58} />
      <div>
        <div style={{ fontSize: 32, fontWeight: 750, color: C.ink }}>Stride Store</div>
        <div style={{ fontSize: 22, color: C.gray }}>Instagram · replies instantly</div>
      </div>
    </div>
    <div style={{ padding: "22px 26px 28px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
  </div>
);
const Msg: React.FC<{ f: number; at: number; me?: boolean; ai?: boolean; children: React.ReactNode; strike?: number }> = ({ f, at, me, ai, children, strike }) => {
  if (f < at) return null;
  const s = tw(f, at, at + 8, 0, 1, E.expoOut);
  const st = strike !== undefined ? tw(f, strike, strike + 8, 0, 1, E.cubicInOut) : 0;
  return (
    <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 820, opacity: s * (1 - 0.55 * st), transform: `translateY(${(1 - s) * 20}px)`, position: "relative" }}>
      <div style={{ padding: "18px 24px", borderRadius: me ? "30px 30px 8px 30px" : "30px 30px 30px 8px", background: me ? "linear-gradient(135deg,#7B5CFA,#C04BD8)" : "#EFEFEF", color: me ? "#FFF" : C.ink, fontSize: 38, lineHeight: 1.3 }}>
        {ai ? <div style={{ fontSize: 22, fontWeight: 700, color: C.coral, marginBottom: 4 }}>✨ AI assistant</div> : null}
        {children}
      </div>
      {st > 0 ? <div style={{ position: "absolute", left: -10, right: -10, top: "50%", height: 8, borderRadius: 4, background: C.coral, transform: `scaleX(${st}) rotate(-3deg)`, transformOrigin: "0 50%" }} /> : null}
    </div>
  );
};

const ProductCard: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, PHOTO, 30, 12, 170);
  const socks = springAt(f, SOCKS - 2, 30, 12, 180);
  return (
    <div style={{ opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 40}px)` }}>
      <div style={{ display: "flex", gap: 20, padding: 18, borderRadius: 28, background: "#F6F4EF" }}>
        <div style={{ width: 230, height: 190, borderRadius: 20, background: "linear-gradient(160deg,#FFFFFF,#E9E4DA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Product kind="shoe" color="#1C1C1E" size={200} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.ink }}>Runner 2</div>
          <div style={{ fontSize: 26, color: C.gray }}>Black · EU 42 · 3 left</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: C.ink, marginTop: 6 }}>$89</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 8, padding: "12px 22px", borderRadius: 999, background: C.ink, color: C.cream, fontSize: 26, fontWeight: 700 }}>Buy now ↗</div>
        </div>
      </div>
      {socks > 0.01 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, padding: "14px 18px", borderRadius: 22, background: C.coralTint, transform: `scale(${mix(0.85, 1, clamp(socks))})`, opacity: clamp(socks * 2), transformOrigin: "0 50%" }}>
          <div style={{ width: 90, height: 70, borderRadius: 14, background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Product kind="socks" color="#1C1C1E" size={80} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontFamily: MONO, color: C.coralDeep }}>PAIRS WELL WITH</div>
            <div style={{ fontSize: 30, fontWeight: 750, color: C.ink }}>Crew socks · 3-pack · $12</div>
          </div>
          <div style={{ padding: "10px 18px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 24, fontWeight: 800 }}>+ Add</div>
        </div>
      ) : null}
    </div>
  );
};

const Tracking: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, TRACK - 4, 30, 12, 170);
  const steps = ["Ordered", "Packed", "Shipped", "Out for delivery"];
  const prog = tw(f, TRACK - 2, TRACK + 16, 0, 3, E.cubicInOut);
  return (
    <div style={{ opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 40}px)`, padding: "20px 22px", borderRadius: 26, background: "#F6F4EF" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: C.gray, fontFamily: MONO }}>
        <span>ORDER #4821</span>
        <span>TRACKING</span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: "#E3DFD6", margin: "24px 18px 12px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(prog / 3) * 100}%`, borderRadius: 5, background: C.green }} />
        {steps.map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i / 3) * 100}%`, top: -9, width: 28, height: 28, marginLeft: -14, borderRadius: 14, background: prog >= i - 0.05 ? C.green : "#E3DFD6", border: "4px solid #F6F4EF", boxSizing: "border-box" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: C.ink, fontWeight: 650 }}>
        {steps.map((t) => (
          <span key={t} style={{ width: 170, textAlign: "center" }}>{t}</span>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 34, fontWeight: 800, color: C.ink }}>🚚 Arrives today, by 6 PM</div>
    </div>
  );
};

/* the next-day follow-up, on WhatsApp */
const FollowUp: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, S4 + 2, 30, 13, 150);
  const tl = (at: number) => tw(f, at, at + 8, 0, 1, E.expoOut);
  const bubble = springAt(f, FOLLOW - 2, 30, 12, 170);
  const reply = springAt(f, FOLLOW + 26, 30, 12, 180);
  const order = springAt(f, FOLLOW + 40, 30, 11, 190);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 440, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 80}px)`, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: C.ink }}>
        {[
          ["Tue 14:02", "link sent", SHOPPER],
          ["", "no purchase", DIDNT],
          ["Wed 10:00", "follow-up", NEXT],
        ].map(([a, b, at], i) => (
          <React.Fragment key={i}>
            <div style={{ opacity: tl(at as number), padding: "12px 18px", borderRadius: 16, background: i === 1 ? "#F2E4E0" : C.white, boxShadow: "0 8px 20px rgba(23,23,23,.08)", textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 20, color: C.gray }}>{a || "—"}</div>
              <div style={{ fontWeight: 750 }}>{b as string}</div>
            </div>
            {i < 2 ? <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#E0DBD1", opacity: tl(at as number) }} /> : null}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 40, borderRadius: 40, background: "#EFE7DE", padding: "26px 26px 30px", boxShadow: "0 40px 90px rgba(23,23,23,.14)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <ChannelBadge ch="whatsapp" size={54} />
          <div style={{ fontSize: 30, fontWeight: 750, color: C.ink }}>Stride Store</div>
          <div style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 999, background: "#25D366", color: "#FFF", fontSize: 22, fontWeight: 800 }}>↗ AUTOMATIC FOLLOW-UP</div>
        </div>
        {bubble > 0.01 ? (
          <div style={{ maxWidth: 820, padding: "18px 22px", borderRadius: "28px 28px 28px 8px", background: C.white, opacity: clamp(bubble * 2), transform: `translateY(${(1 - clamp(bubble)) * 30}px)` }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 150, height: 120, borderRadius: 16, background: "#F3F0EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Product kind="shoe" color="#1C1C1E" size={130} />
              </div>
              <div style={{ fontSize: 34, lineHeight: 1.3, color: C.ink }}>Hi Maya! The black Runner 2 in 42 is still here 👟 Only 2 left. Want me to hold a pair?</div>
            </div>
          </div>
        ) : null}
        {reply > 0.01 ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, opacity: clamp(reply * 2) }}>
            <div style={{ padding: "16px 22px", borderRadius: "28px 28px 8px 28px", background: "#D9FDD3", fontSize: 34, color: C.ink }}>yes!! 🙌</div>
          </div>
        ) : null}
        {order > 0.01 ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 18, transform: `scale(${mix(0.5, 1, clamp(order))})`, opacity: clamp(order * 2) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 26px", borderRadius: 999, background: C.green, color: "#FFF", fontSize: 32, fontWeight: 800 }}>
              <Icon name="check" size={32} color="#FFF" stroke={3} /> Order placed · $89
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const BEATLINES: { at: number; to: number; words: string[]; hi: number[] }[] = [
  { at: PHOTO, to: WHERE - 10, words: ["Sends", "it,", "suggests", "the", "socks"], hi: [2] },
  { at: WHERE + 4, to: S4 - 8, words: ["Looks", "up", "the", "order"], hi: [3] },
  { at: SHOPPER, to: S5 - 8, words: ["Follows", "up", "next", "day"], hi: [2, 3] },
];

export const NicheEcommerce: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const scene = f < S1 ? 0 : f < S2 ? 1 : f < S3 ? 2 : f < S4 ? 3 : f < S5 ? 4 : 5;
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const beat = BEATLINES.find((b) => f >= b.at - 4 && f <= b.to + 8);
  const works = springAt(f, S5, 30, 13, 150);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {scene === 0 ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 190, textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: "0.16em", color: C.gray }}>A REAL QUESTION, EVERY DAY</div>
            <DmCard>
              <Msg f={f} at={-20} me>
                <div style={{ width: 380, height: 250, borderRadius: 20, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <Product kind="shoe" color="#1C1C1E" size={300} />
                </div>
              </Msg>
              <Msg f={f} at={-10} me>Do you have these in black, size 42? 🖤</Msg>
              <Msg f={f} at={SCRIPT} strike={STRIKE}>
                <span style={{ color: "#777" }}>🤖 Thanks for your message! Please visit our website or email support.</span>
              </Msg>
            </DmCard>
            {f >= STRIKE ? <div style={{ position: "absolute", left: 0, right: 0, top: 1380, textAlign: "center", fontSize: 56, fontWeight: 800, color: C.coralDeep, opacity: tw(f, STRIKE, STRIKE + 6, 0, 1, E.linear), letterSpacing: "-0.03em" }}>a script. 🙄</div> : null}
          </>
        ) : null}
        {scene === 1 ? (
          <>
            <Catalog f={f} />
            <ToolCall at={CONNECT - 4} resultAt={LEFT - 2} x={70} y={150} w={940} tool="catalog.search" args={[["product", "Runner 2"], ["size", "42"], ["color", "black"]]} result="In stock · 3 left" out={S2 - 8} scale={0.86} />
          </>
        ) : null}
        {scene === 2 ? (
          <DmCard y={460}>
            <Msg f={f} at={S2 - 30} me>Do you have these in black, size 42? 🖤</Msg>
            <Msg f={f} at={PHOTO - 2} ai>Yes! 3 left in your size 👇</Msg>
            <ProductCard f={f} />
          </DmCard>
        ) : null}
        {scene === 3 ? (
          <>
            <DmCard y={460}>
              <Msg f={f} at={WHERE - 2} me>Where is my order? #4821</Msg>
              <Msg f={f} at={TRACK - 6} ai>It's out for delivery 🚚</Msg>
              <Tracking f={f} />
            </DmCard>
            <ToolCall at={LOOKS - 2} resultAt={TRACK - 6} x={70} y={1330} w={940} tool="orders.lookup" args={[["order", "#4821"]]} result="Out for delivery · today" out={S4 - 6} scale={0.86} label="TOOL CALL · NO TICKET" />
            {f >= NOTICKET ? <div style={{ position: "absolute", left: 540, top: 1760, transform: `translate(-50%, 0) scale(${mix(0.5, 1, tw(f, NOTICKET, NOTICKET + 8, 0, 1, E.backOut))})`, padding: "14px 28px", borderRadius: 999, background: C.ink, color: C.cream, fontSize: 32, fontWeight: 750, whiteSpace: "nowrap" }}>0 tickets · 0 waiting</div> : null}
          </>
        ) : null}
        {scene === 4 ? <FollowUp f={f} /> : null}
        {scene === 5 ? (
          <div style={{ position: "absolute", left: 60, right: 60, top: 520, transform: `translateY(${(1 - clamp(works)) * 80}px)`, opacity: clamp(works * 2), display: "flex", flexDirection: "column", gap: 22, fontFamily: MONO }}>
            {[
              ["catalog.search", "finds the product, the size, the stock"],
              ["orders.lookup", "answers “where's my order?”"],
              ["whatsapp.follow_up", "brings the shopper back"],
            ].map(([t, d], i) => {
              const c = springAt(f, S5 + 6 + i * 6, 30, 12, 180);
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 20, padding: "24px 28px", borderRadius: 26, background: "#131316", color: "#FFF", transform: `translateX(${(1 - clamp(c)) * -200}px)`, opacity: clamp(c * 2) }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: "#3DDC84", color: "#0B2A17", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 36, color: C.coralLight }}>{t}</div>
                    <div style={{ fontSize: 26, color: "#B9B4AA", fontFamily: FONT }}>{d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {scene === 2 || scene === 3 || scene === 4 ? (beat ? <Kinetic key={beat.at} from={beat.at} to={beat.to} y={200} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={beat.words.map((t, i) => ({ t, at: beat.at + i * 3, hi: beat.hi.includes(i) }))} /> : null) : null}
        {scene === 5 ? <Kinetic from={S5} to={HIT - 14} y={200} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={[{ t: "It", at: w("l11", 8) }, { t: "works", at: WORKS, hi: true }, { t: "with", at: w("l11", 10) }, { t: "them.", at: w("l11", 11), hi: true }]} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/niche-ecommerce/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(1, "send", -6, "the question"),
  cue(SCRIPT, "receive", -8, "the script bot"),
  cue(STRIKE, "draw", -10, "struck out"),
  cue(STRIKE + 2, "miss", -8, "a script"),
  cue(DROP, "dive", -6, "into the catalog"),
  cue(DROP + 2, "impact", -10, "the drop"),
  cue(CONNECT - 4, "data", -10, "tool call: catalog.search"),
  cue(SHOE - 2, "tick", -11, "filter: shoe"),
  cue(SIZE - 2, "tick", -11, "filter: size"),
  cue(COLOR - 2, "tick", -11, "filter: color"),
  cue(LEFT - 2, "snap", -5, "the tile rises"),
  cue(LEFT + 4, "check", -6, "3 left"),
  cue(S2, "whoosh", -9, "back to the chat"),
  cue(PHOTO, "receive", -4, "product card"),
  cue(SOCKS - 2, "pop", -6, "the socks"),
  cue(S3, "whoosh", -10, "next message"),
  cue(WHERE - 2, "send", -5, "where is my order?"),
  cue(LOOKS - 2, "data", -11, "tool call: orders.lookup"),
  cue(TRACK - 6, "receive", -5, "tracking"),
  cue(TRACK, "check", -8, "out for delivery"),
  cue(NOTICKET, "pop", -8, "0 tickets"),
  cue(S4, "whoosh", -9, "the next day"),
  cue(FOLLOW - 2, "send", -4, "the follow-up goes out"),
  cue(FOLLOW + 26, "receive", -6, "yes!!"),
  cue(FOLLOW + 40, "check", -5, "order placed"),
  cue(S5, "whoosh", -10, "it works with them"),
  ...[0, 1, 2].map((i) => cue(S5 + 6 + i * 6, "snap", -9, `tool ${i + 1}`)),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, S2, S3, S4, S5, HIT, CTA, URL, DUR };

export const NICHEECOMMERCE: FilmDef = { id: "NicheEcommerce", slug: "niche-ecommerce", title: "Niche · E-commerce", component: NicheEcommerce, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/niche-ecommerce/mix.wav" };
