import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Odometer, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import { Product } from "../../kit/products";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/ec-black-friday/vo/lines.json";
import words from "../../../../public/films/ec-black-friday/vo/words.json";

loadFonts();

/**
 * ANGLE · E-commerce: Black Friday. 9 AM, a black screen and a storm of 400
 * messages. On "your AI agent answers every single one" the night flips to
 * cream and every bubble gets its tick. Signature: a giant shopping bag at the
 * bottom of the frame that fills up as the agent sells — the jacket, the belt
 * it suggested, the closest match for a sold-out pair — with the orders
 * counter printed on the bag rolling to 200 by noon.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const COUNT = w("l01", 4);
const QS = [T.VO.l02 - 2, T.VO.l03 - 2, T.VO.l04 - 2];
const DROP = w("l05", 0) - 2;
const EVERY = w("l05", 4);
const CHECKS = w("l06", 1);
const STOCK = w("l06", 7);
const BELT = w("l07", 2);
const LINK = w("l07", 10);
const SOLD = w("l08", 0);
const MATCH = w("l08", 5);
const INSTOCK = w("l08", 9);
const NOON = w("l09", 1);
const ORDERS = w("l09", 2);
const COFFEE = w("l09", 12);
const HIT = T.VO.l10 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l10", 2) + 4;
const URL = w("l10", T.nwords("l10") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l10") + 50);

const QUESTIONS: { t: string; ch: "instagram" | "whatsapp" | "web" }[] = [
  { t: "Is the discount on the black one?", ch: "instagram" },
  { t: "Do you ship this week?", ch: "whatsapp" },
  { t: "Is there a medium left?", ch: "web" },
];

/* the storm: 400 little messages piling up behind everything */
const Storm: React.FC<{ f: number; flip: number }> = ({ f, flip }) => {
  const n = Math.round(tw(f, COUNT - 6, DROP, 20, 110, E.cubicIn));
  return (
    <>
      {Array.from({ length: 110 }, (_, i) => {
        if (i >= n) return null;
        const x = 30 + rnd(i * 3.1) * 980, y = 520 + rnd(i * 7.3) * 1300;
        const wd = 90 + rnd(i * 1.7) * 120;
        const done = flip > 0 && f >= DROP + 4 + (i % 24);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: wd, height: 34, borderRadius: 17, background: done ? C.greenTint : mix(0, 1, flip) > 0.5 ? "#EDE8DF" : "rgba(255,255,255,.12)", opacity: 0.8, display: "flex", alignItems: "center", paddingLeft: 10 }}>
            {done ? <Icon name="check" size={20} color={C.green} stroke={3} /> : null}
          </div>
        );
      })}
    </>
  );
};

/* the signature: a giant bag that fills as the agent sells */
type Drop = { kind: "jacket" | "belt" | "sneaker"; color: string; at: number };
const DROPS: Drop[] = [
  { kind: "jacket", color: "#1C1C1E", at: LINK + 2 },
  { kind: "belt", color: "#6B4A2E", at: LINK + 8 },
  { kind: "sneaker", color: "#E9DCC8", at: INSTOCK + 6 },
];
const Bag: React.FC<{ f: number }> = ({ f }) => {
  const rise = springAt(f, DROP + 4, 30, 14, 120);
  const bounce = DROPS.reduce((b, d) => b + 12 * Math.sin(clamp((f - d.at - 14) / 8) * Math.PI) * (f > d.at + 14 ? 1 : 0), 0);
  const bx = 540, top = 1330;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `translateY(${(1 - clamp(rise)) * 700}px)` }}>
      {DROPS.map((d, i) => {
        if (f < d.at) return null;
        const t = tw(f, d.at, d.at + 16, 0, 1, E.cubicIn);
        if (t >= 1) return null;
        const x0 = [300, 540, 780][i];
        return (
          <div key={i} style={{ position: "absolute", left: mix(x0, bx, t) - 110, top: mix(760, top + 30, t) - 110, transform: `rotate(${(1 - t) * (i - 1) * 20}deg) scale(${mix(1, 0.7, t)})`, zIndex: 5 }}>
            <Product kind={d.kind} color={d.color} size={220} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: bx - 330, top: top + bounce, width: 660, height: 620, zIndex: 6 }}>
        <svg width={660} height={200} style={{ position: "absolute", left: 0, top: -150 }}>
          <path d="M 190 190 C 190 40, 470 40, 470 190" fill="none" stroke="#1A1A1A" strokeWidth={22} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, borderRadius: "30px 30px 60px 60px", background: `linear-gradient(180deg, ${C.coral} 0%, ${C.coralDeep} 100%)`, boxShadow: "0 40px 90px rgba(191,68,71,.35), inset 0 18px 0 rgba(255,255,255,.12)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", color: "#FFF", fontFamily: MONO, fontSize: 30, letterSpacing: "0.2em" }}>ORDERS TODAY</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center", color: "#FFF", fontSize: 190, fontWeight: 800, letterSpacing: "-0.04em" }}>
            {f >= ORDERS - 4 ? <Odometer value={200} from={3} at={ORDERS - 4} dur={24} /> : <span>{f >= LINK + 16 ? (f >= INSTOCK + 20 ? 3 : 2) : 0}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const EcBlackFriday: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const flip = tw(f, DROP - 3, DROP + 6, 0, 1, E.expoInOut);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const qUp = tw(f, CHECKS - 10, CHECKS + 4, 0, 1, E.expoInOut);
  const head = tw(f, DROP - 2, DROP + 8, 0, 1, E.expoInOut); // the title leaves as the answers start
  const card = springAt(f, BELT - 12, 30, 12, 170) * (1 - tw(f, SOLD - 8, SOLD, 0, 1, E.expoIn));
  const sold = springAt(f, SOLD - 2, 30, 12, 170) * (1 - tw(f, NOON - 8, NOON, 0, 1, E.expoIn));
  const swap = tw(f, MATCH - 2, MATCH + 10, 0, 1, E.expoInOut);
  const coffee = springAt(f, COFFEE - 6, 30, 11, 180);
  const ink = flip > 0.5 ? C.ink : C.cream;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, background: "#0B0B0C", clipPath: `circle(${mix(1500, 0, flip)}px at 540px 960px)` }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        <Storm f={f} flip={flip} />
        {/* hook: BLACK FRIDAY · 9:00 · 400 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", opacity: 1 - head, transform: `translateY(${-head * 200}px)` }}>
          <div style={{ display: "inline-flex", gap: 14, alignItems: "center", padding: "10px 22px", borderRadius: 999, background: flip > 0.5 ? C.ink : C.coral, color: "#FFF", fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em" }}>
            <Icon name="activity" size={30} color="#FFF" stroke={2.4} /> 9:00 AM
          </div>
          <div style={{ marginTop: 14, fontSize: 150, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 0.9, color: ink }}>
            BLACK
            <br />
            <span style={{ color: C.coral }}>FRIDAY</span>
          </div>
          <div style={{ marginTop: 18, fontSize: 64, fontWeight: 800, color: ink, letterSpacing: "-0.03em" }}>
            {Math.round(tw(f, 0, COUNT + 2, 12, 400, E.cubicIn))} messages
          </div>
        </div>
        {/* three of the 400, each answered after the flip */}
        {QUESTIONS.map((q, i) => {
          const s = springAt(f, QS[i], 30, 12, 180);
          if (s <= 0.001) return null;
          const tick = f >= EVERY - 4 + i * 4;
          return (
            <div key={i} style={{ position: "absolute", left: [60, 170, 110][i], top: 820 + i * 150 - head * 300, display: "flex", alignItems: "center", gap: 16, transform: `scale(${mix(0.7, 1, clamp(s))})`, transformOrigin: "0 50%", opacity: clamp(s * 2) * (1 - qUp), zIndex: 8 }}>
              <ChannelBadge ch={q.ch} size={70} />
              <div style={{ padding: "20px 28px", borderRadius: 999, background: C.white, boxShadow: "0 16px 40px rgba(0,0,0,.2)", fontSize: 42, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{q.t}</div>
              {tick ? <div style={{ padding: "10px 18px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 26, fontWeight: 800, transform: `scale(${tw(f, EVERY - 4 + i * 4, EVERY + 4 + i * 4, 0.3, 1, E.backOut)})` }}>✓ answered</div> : null}
            </div>
          );
        })}
        {/* the agent checks the store — plain words, no code */}
        <SystemCard at={CHECKS - 4} doneAt={STOCK + 4} x={70} y={260} w={940} system={{ label: "Your store", icon: "bag", color: "#2B86CC" }} doing="Checking sizes and stock…" done="In stock, ready to ship" facts={["Black jacket · M", "−30% applied", "12 left"]} out={SOLD - 10} />
        {/* the product card, with the belt it goes with */}
        {card > 0.01 ? (
          <div style={{ position: "absolute", left: 70, width: 940, top: 760, opacity: clamp(card * 2), transform: `translateY(${(1 - clamp(card)) * 80}px)`, display: "flex", gap: 20 }}>
            <div style={{ flex: 1.3, borderRadius: 30, background: C.white, boxShadow: "0 24px 60px rgba(23,23,23,.14)", padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 170, height: 170, borderRadius: 22, background: "#F3F0EA", display: "flex", alignItems: "center", justifyContent: "center" }}><Product kind="jacket" color="#1C1C1E" size={150} /></div>
              <div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>Black jacket</div>
                <div style={{ fontSize: 26, color: C.gray }}>Size M</div>
                <div style={{ fontSize: 38, fontWeight: 800, marginTop: 4 }}><s style={{ color: C.gray2, fontSize: 28 }}>$120</s> $84</div>
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: 30, background: C.coralTint, padding: 20, opacity: tw(f, BELT - 4, BELT + 4, 0, 1, E.linear), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Product kind="belt" color="#6B4A2E" size={120} />
              <div style={{ fontFamily: MONO, fontSize: 20, color: C.coralDeep }}>GOES WITH IT</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>Leather belt</div>
            </div>
          </div>
        ) : null}
        {f >= LINK - 4 && f < SOLD - 6 ? (
          <div style={{ position: "absolute", left: 540, top: 1030, transform: `translate(-50%, 0) scale(${tw(f, LINK - 4, LINK + 4, 0.4, 1, E.backOut)})`, display: "flex", alignItems: "center", gap: 12, padding: "18px 34px", borderRadius: 999, background: C.ink, color: C.cream, fontSize: 36, fontWeight: 800, zIndex: 9 }}>
            Checkout link <Icon name="arrowUpRight" size={34} color={C.cream} stroke={2.6} />
          </div>
        ) : null}
        {/* sold out → the closest match */}
        {sold > 0.01 ? (
          <div style={{ position: "absolute", left: 140, width: 800, top: 420, opacity: clamp(sold * 2), transform: `scale(${mix(0.85, 1, clamp(sold))})`, display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, height: 360, borderRadius: 30, background: C.white, boxShadow: "0 24px 60px rgba(23,23,23,.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: mix(1, 0.45, swap), transform: `scale(${mix(1, 0.9, swap)})` }}>
              <Product kind="sneaker" color="#BDB6AA" accent="#ECE7DE" size={220} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>White runner · 42</div>
              <div style={{ position: "absolute", top: 18, right: 18, padding: "8px 16px", borderRadius: 10, background: C.ink, color: "#FFF", fontFamily: MONO, fontSize: 22 }}>SOLD OUT</div>
            </div>
            <div style={{ fontSize: 60, color: C.coral, opacity: swap }}>→</div>
            <div style={{ position: "relative", flex: 1, height: 360, borderRadius: 30, background: C.white, boxShadow: `0 24px 60px rgba(23,23,23,.16), 0 0 0 ${5 * swap}px ${C.coral}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: swap, transform: `translateX(${(1 - swap) * 60}px)` }}>
              <Product kind="sneaker" color="#E9DCC8" accent="#FFFFFF" size={220} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>Cream runner · 42</div>
              <div style={{ position: "absolute", top: 18, right: 18, padding: "8px 16px", borderRadius: 10, background: C.green, color: "#FFF", fontSize: 22, fontWeight: 800, opacity: tw(f, INSTOCK - 4, INSTOCK + 2, 0, 1, E.linear) }}>✓ In stock</div>
            </div>
          </div>
        ) : null}
        <Bag f={f} />
        {/* noon, and the first coffee */}
        {f >= NOON - 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", opacity: tw(f, NOON - 4, NOON + 4, 0, 1, E.linear) }}>
            <div style={{ display: "inline-flex", gap: 14, alignItems: "center", padding: "10px 22px", borderRadius: 999, background: C.ink, color: "#FFF", fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em" }}>
              <Icon name="sun" size={30} color="#FFF" stroke={2.4} /> 12:00 PM
            </div>
          </div>
        ) : null}
        {coffee > 0.01 ? (
          <div style={{ position: "absolute", left: 540, top: 700, transform: `translate(-50%, 0) scale(${mix(0.5, 1, clamp(coffee))})`, opacity: clamp(coffee * 2), textAlign: "center" }}>
            <div style={{ fontSize: 160 }}>☕</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>Team: still on coffee #1</div>
          </div>
        ) : null}
        {f >= ORDERS + 18 ? <Sparkles x={220} y={1400} w={640} h={260} at={ORDERS + 18} color="#FFE3A3" size={40} seed={4} /> : null}
        <Kinetic from={DROP} to={CHECKS - 12} y={170} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={[{ t: "Answers", at: w("l05", 3) }, { t: "every", at: EVERY, hi: true }, { t: "single", at: w("l05", 5), hi: true }, { t: "one.", at: w("l05", 6) }]} />
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/ec-black-friday/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(COUNT - 6, "flurry", -8, "400 messages"),
  cue(COUNT - 6, "data", -12, "counter"),
  ...QS.map((q, i) => cue(q, "receive", -6, `question ${i + 1}`)),
  cue(DROP, "impact", -8, "the flip"),
  cue(DROP, "suck", -12, "night → day"),
  ...[0, 1, 2].map((i) => cue(EVERY - 4 + i * 4, "check", -9, `answered ${i + 1}`)),
  cue(DROP + 6, "whoosh", -10, "the bag rises"),
  cue(CHECKS - 4, "blip", -8, "connecting to the store"),
  cue(STOCK + 4, "check", -6, "in stock"),
  cue(BELT - 4, "pop", -7, "goes with it"),
  cue(LINK - 4, "pop", -5, "checkout link"),
  cue(LINK + 2 + 14, "snap", -6, "into the bag"),
  cue(LINK + 8 + 14, "snap", -7, "into the bag"),
  cue(SOLD - 2, "miss", -7, "sold out"),
  cue(MATCH - 2, "whoosh", -10, "the closest match"),
  cue(INSTOCK, "check", -7, "in stock"),
  cue(INSTOCK + 6 + 14, "snap", -6, "into the bag"),
  cue(NOON - 4, "tick", -9, "noon"),
  cue(ORDERS - 4, "data", -9, "200 orders"),
  cue(COFFEE - 6, "pop", -6, "coffee #1"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const ECBLACKFRIDAY: FilmDef = { id: "EcBlackFriday", slug: "ec-black-friday", title: "Angle · E-commerce · Black Friday", component: EcBlackFriday, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/ec-black-friday/mix.wav" };
