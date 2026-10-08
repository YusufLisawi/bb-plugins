import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Confetti, Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { AgentDot, Icon } from "../../kit/ui";
import { Face, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/comic/vo/lines.json";
import words from "../../../../public/films/comic/vo/words.json";

loadFonts();

/**
 * THE CAKE — a vertical comic (webtoon). The camera scrolls down the page
 * panel by panel: Maya asks two bakeries the same question at 11 PM. One
 * leaves her on "Seen"; the other has Brainfast: BOOM, answered, booked.
 * The owner sleeps through it all.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const ASK = w("l03", 0);
const SEEN = w("l04", 3);
const NOTHING = w("l04", 4);
const WAITS = [w("l05", 1), w("l05", 3)];
const ORDERS = w("l05", 5);
const B2 = w("l06", 0);
const BF = w("l06", 4);
const BOOM = w("l07", 0);
const ANS = w("l07", 1);
const BOOKED = w("l07", 4);
const CARD = w("l07", 8);
const HAPPY1 = w("l08", 1);
const HAPPY2 = w("l08", 4);
const OWNER = w("l09", 2);
const ASLEEP = w("l09", 4);
const HIT = w("l10", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l10", i));
const CTA = w("l11", 0) - 2;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 60);

const INK = "#111111";
const PAPER = "#FFF6E0";
const YEL = "#FFD23F";
const BLUE = "#3A86FF";
const NIGHT = "#1F2A5A";

/* ── the page ── */
const HEIGHTS = [800, 700, 760, 940, 660, 720];
const GUT = 44;
const TOPS = HEIGHTS.map((_, i) => 60 + HEIGHTS.slice(0, i).reduce((a, h) => a + h + GUT, 0));
const CENTER = HEIGHTS.map((h, i) => TOPS[i] + h / 2);
const MOVES = [ASK + 50, T.VO.l05 - 12, T.VO.l06 - 14, T.VO.l08 - 12, T.VO.l09 - 8];
const camY = (f: number) => {
  const k: [number, number][] = [[0, TOPS[0] - 520], [T.VO.l01 - 4, TOPS[0] - 520], [T.VO.l01 + 12, CENTER[0] - 960]];
  MOVES.forEach((m, i) => {
    k.push([m, CENTER[i] - 960 + 20]);
    k.push([m + 16, CENTER[i + 1] - 960]);
  });
  return keys(f, k, E.expoInOut);
};

const halftone = (color: string, dot = "rgba(0,0,0,.12)", size = 16): React.CSSProperties => ({ background: color, backgroundImage: `radial-gradient(circle, ${dot} 2.4px, transparent 2.8px)`, backgroundSize: `${size}px ${size}px` });

const Panel: React.FC<{ i: number; bg: React.CSSProperties; children: React.ReactNode }> = ({ i, bg, children }) => (
  <div style={{ position: "absolute", left: 40, top: TOPS[i], width: 1000, height: HEIGHTS[i], boxSizing: "border-box", border: `9px solid ${INK}`, overflow: "hidden", ...bg }}>{children}</div>
);

/** Yellow caption box (narration). */
const CapBox: React.FC<{ f: number; at: number; x: number; y: number; children: React.ReactNode; rot?: number }> = ({ f, at, x, y, children, rot = -2 }) => {
  const s = clamp(springAt(f, at, 30, 13, 200));
  if (f < at - 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${mix(0.5, 1, s)})`, transformOrigin: "0 0", opacity: clamp(s * 2), padding: "12px 22px", background: YEL, border: `6px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}`, fontFamily: FONT, fontSize: 44, fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.01em", color: INK, whiteSpace: "nowrap", zIndex: 5 }}>
      {children}
    </div>
  );
};

/** Speech bubble with a tail. */
const Speech: React.FC<{ f: number; at: number; x: number; y: number; w: number; children: React.ReactNode; tail?: "left" | "right"; size?: number }> = ({ f, at, x, y, w: ww, children, tail = "left", size = 46 }) => {
  const s = clamp(springAt(f, at, 30, 12, 200));
  if (f < at - 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: ww, transform: `scale(${mix(0.3, 1, s)})`, transformOrigin: tail === "left" ? "10% 100%" : "90% 100%", opacity: clamp(s * 2), zIndex: 4 }}>
      <div style={{ position: "relative", padding: "22px 28px", background: "#FFFFFF", border: `6px solid ${INK}`, borderRadius: 60, fontFamily: FONT, fontSize: size, fontWeight: 800, lineHeight: 1.12, color: INK, textAlign: "center" }}>
        {children}
        <svg width={70} height={60} style={{ position: "absolute", bottom: -52, [tail === "left" ? "left" : "right"]: 60 } as React.CSSProperties}>
          <path d={tail === "left" ? "M 6 0 L 30 54 L 52 0" : "M 18 0 L 40 54 L 64 0"} fill="#FFFFFF" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <rect x={0} y={-8} width={70} height={10} fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
};

/** A comic sound effect with a starburst. */
const Burst: React.FC<{ f: number; at: number; x: number; y: number; text: string; size?: number; fill?: string; color?: string }> = ({ f, at, x, y, text, size = 1, fill = YEL, color = C.coral }) => {
  if (f < at - 1) return null;
  const s = keys(f, [[at, 0], [at + 5, 1.25], [at + 10, 0.95], [at + 14, 1]], E.cubicInOut);
  const n = 14;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 150 : 230;
    return `${260 + Math.cos(a) * r * 1.15},${200 + Math.sin(a) * r * 0.8}`;
  }).join(" ");
  return (
    <div style={{ position: "absolute", left: x - 260 * size, top: y - 200 * size, width: 520 * size, height: 400 * size, transform: `scale(${s}) rotate(-6deg)`, zIndex: 6 }}>
      <svg width={520 * size} height={400 * size} viewBox="0 0 520 400" style={{ position: "absolute", inset: 0 }}>
        <polygon points={pts} fill={fill} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 120 * size, fontWeight: 900, fontStyle: "italic", color, WebkitTextStroke: `${6 * size}px ${INK}`, letterSpacing: "-0.03em" }}>{text}</div>
    </div>
  );
};

/** A phone in comic style showing a chat. */
const ComicPhone: React.FC<{ x: number; y: number; scale?: number; rot?: number; children: React.ReactNode; shop: string; good?: boolean }> = ({ x, y, scale = 1, rot = 0, children, shop, good }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 420, height: 640, transform: `rotate(${rot}deg) scale(${scale})`, transformOrigin: "50% 50%", borderRadius: 56, background: INK, padding: 16, boxSizing: "border-box", boxShadow: `10px 10px 0 rgba(0,0,0,.25)` }}>
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 42, background: "#F4F1EA", overflow: "hidden", fontFamily: FONT }}>
      <div style={{ height: 96, background: good ? C.coral : "#9A948A", color: "#FFF", display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
        {good ? <AgentDot size={52} /> : <div style={{ width: 52, height: 52, borderRadius: 26, background: "#CFC9BE" }} />}
        <div style={{ fontSize: 28, fontWeight: 800 }}>{shop}</div>
      </div>
      <div style={{ position: "absolute", left: 16, right: 16, top: 116, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  </div>
);
const Msg: React.FC<{ me?: boolean; s: number; children: React.ReactNode }> = ({ me, s, children }) => (
  <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 320, padding: "14px 18px", borderRadius: 26, background: me ? BLUE : "#FFFFFF", color: me ? "#FFF" : INK, border: `4px solid ${INK}`, fontSize: 28, fontWeight: 700, lineHeight: 1.18, transform: `scale(${mix(0.5, 1, clamp(s))})`, transformOrigin: me ? "100% 100%" : "0 100%", opacity: clamp(s * 2) }}>{children}</div>
);

const Moon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 150, height: 150, borderRadius: 75, overflow: "hidden", boxShadow: `inset 0 0 0 6px ${INK}` }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 75, background: "#FFF1B8" }} />
    <div style={{ position: "absolute", left: 50, top: -14, width: 150, height: 150, borderRadius: 75, background: NIGHT, boxShadow: `0 0 0 6px ${INK}` }} />
  </div>
);

const Page: React.FC<{ f: number }> = ({ f }) => {
  const maya = PEOPLE.maya;
  const s = (at: number) => clamp(springAt(f, at, 30, 13, 190));
  const clock = ["11:05 PM", "11:40 PM", "12:30 AM"];
  const tick = f < WAITS[0] ? 0 : f < WAITS[1] ? 1 : 2;
  return (
    <>
      {/* the page's title */}
      <div style={{ position: "absolute", left: 0, right: 0, top: TOPS[0] - 470, textAlign: "center", fontFamily: FONT }}>
        <div style={{ display: "inline-block", transform: `rotate(-3deg) scale(${mix(0.6, 1, s(2))})`, opacity: clamp(s(2) * 2), padding: "18px 40px", background: C.coral, border: `8px solid ${INK}`, boxShadow: `12px 12px 0 ${INK}`, fontSize: 100, fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 1, color: "#FFFFFF", WebkitTextStroke: `3px ${INK}` }}>THE LATE-NIGHT<br />CAKE</div>
        <div style={{ marginTop: 34, fontFamily: MONO, fontSize: 30, letterSpacing: "0.2em", color: INK, opacity: clamp(s(8) * 2) }}>A VERY SHORT COMIC · EP. 1</div>
      </div>
      {/* P1: Meet Maya, 11 PM, the question */}
      <Panel i={0} bg={halftone(NIGHT, "rgba(255,255,255,.07)")}>
        <Moon x={760} y={70} />
        <div style={{ position: "absolute", left: 60, top: 300, transform: `translateY(${(1 - s(10)) * 200}px)` }}>
          <Face p={maya} size={380} ring={INK} />
        </div>
        <div style={{ position: "absolute", left: 520, top: 440, width: 150, height: 250, borderRadius: 26, background: INK, transform: "rotate(10deg)", boxShadow: `0 0 40px rgba(120,180,255,${0.5 * s(ASK - 10)})` }}>
          <div style={{ position: "absolute", inset: 10, borderRadius: 18, background: "#9CC6FF" }} />
        </div>
        <CapBox f={f} at={T.VO.l01 - 2} x={40} y={40}>MEET MAYA.</CapBox>
        <CapBox f={f} at={w("l02", 1) - 2} x={40} y={130} rot={1}>11:00 PM</CapBox>
        <Speech f={f} at={ASK - 2} x={400} y={210} w={520} tail="left" size={44}>Can I get a birthday cake by Saturday?</Speech>
      </Panel>

      {/* P2: Bakery No. 1 — seen, nothing */}
      <Panel i={1} bg={halftone("#D9D2C3")}>
        <CapBox f={f} at={w("l04", 0) - 4} x={40} y={40}>BAKERY NO. 1</CapBox>
        <ComicPhone x={80} y={40} scale={0.95} rot={-3} shop="Crumb & Co.">
          <Msg me s={s(w("l04", 0))}>Can I get a birthday cake by Saturday?</Msg>
          {f >= SEEN ? <div style={{ alignSelf: "flex-end", fontSize: 24, fontWeight: 800, color: "#777", opacity: s(SEEN) }}>Seen 11:02 PM</div> : null}
        </ComicPhone>
        {f >= NOTHING ? (
          <div style={{ position: "absolute", left: 560, top: 250, transform: `scale(${mix(0.5, 1, s(NOTHING))}) rotate(4deg)`, opacity: clamp(s(NOTHING) * 2), fontFamily: FONT, fontSize: 70, fontWeight: 900, fontStyle: "italic", color: "#FFFFFF", WebkitTextStroke: `4px ${INK}`, textAlign: "center", lineHeight: 1 }}>
            *crickets*
          </div>
        ) : null}
        {f >= NOTHING ? (
          <div style={{ position: "absolute", left: 600, top: 380, display: "flex", gap: 18, opacity: s(NOTHING + 6) }}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ width: 36, height: 36, borderRadius: 18, background: INK, opacity: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(f * 0.3 - k)) }} />
            ))}
          </div>
        ) : null}
      </Panel>

      {/* P3: waits, and waits, orders elsewhere */}
      <Panel i={2} bg={halftone("#BFD7FF")}>
        <div style={{ position: "absolute", left: 60, top: 150 }}>
          <Face p={maya} size={300} ring={INK} />
        </div>
        <div style={{ position: "absolute", left: 250, top: 150, width: 46, height: 62, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "#9CD3FF", border: `5px solid ${INK}`, opacity: f >= WAITS[1] ? 1 : 0 }} />
        <div style={{ position: "absolute", left: 470, top: 70, width: 440, height: 170, borderRadius: 30, background: "#FFFFFF", border: `7px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: MONO, fontSize: 64, fontWeight: 700, color: INK }}>
          <Icon name="activity" size={56} color={INK} stroke={2.6} />
          {clock[tick]}
        </div>
        <CapBox f={f} at={WAITS[0] - 2} x={470} y={280} rot={2}>WAITS…</CapBox>
        <CapBox f={f} at={WAITS[1] - 2} x={560} y={370} rot={-2}>…AND WAITS.</CapBox>
        {f >= ORDERS - 2 ? (
          <div style={{ position: "absolute", left: 60, top: 500, width: 880, height: 190, transform: `translateX(${(1 - s(ORDERS)) * 900}px) rotate(-2deg)`, borderRadius: 26, background: "#FFFFFF", border: `7px solid ${INK}`, display: "flex", alignItems: "center", gap: 24, padding: "0 30px", boxSizing: "border-box", fontFamily: FONT }}>
            <Icon name="bag" size={80} color={INK} stroke={2.4} />
            <div>
              <div style={{ fontSize: 46, fontWeight: 900, color: INK }}>Ordered somewhere else.</div>
              <div style={{ fontFamily: MONO, fontSize: 26, color: "#555", marginTop: 4 }}>ANOTHER BAKERY · SAT 10:00</div>
            </div>
          </div>
        ) : null}
      </Panel>

      {/* P4: Bakery No. 2 has Brainfast — BOOM */}
      <Panel i={3} bg={halftone("#FFE6DE", "rgba(217,87,89,.16)")}>
        <CapBox f={f} at={B2 - 2} x={40} y={40}>BAKERY NO. 2 HAS BRAINFAST.</CapBox>
        {f >= BF - 2 ? (
          <div style={{ position: "absolute", left: 800, top: 40, width: 150, height: 150, borderRadius: 40, background: C.coral, border: `7px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.3, 1, s(BF))}) rotate(8deg)` }}>
            <Mark height={86} color={C.cream} stroke={24} />
          </div>
        ) : null}
        <ComicPhone x={80} y={200} scale={1.05} rot={-2} shop="Petit Four" good>
          <Msg me s={s(B2 + 4)}>Can I get a birthday cake by Saturday?</Msg>
          {f >= ANS - 2 ? <Msg s={s(ANS)}>Yes! Saturday 10:00 works. Want a card with it?</Msg> : null}
        </ComicPhone>
        {f >= BOOKED - 2 ? (
          <div style={{ position: "absolute", left: 540, top: 470, width: 400, transform: `translateX(${(1 - s(BOOKED)) * 500}px) rotate(3deg)`, borderRadius: 26, background: "#FFFFFF", border: `7px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}`, padding: "20px 22px", fontFamily: FONT }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 36, fontWeight: 900, color: INK }}>
              <Icon name="calendar" size={40} color={C.coral} stroke={2.6} /> Cake booked
            </div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: "#444", marginTop: 6 }}>SAT 10:00 · CHOCOLATE</div>
            {f >= CARD - 2 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "10px 16px", borderRadius: 14, background: YEL, border: `4px solid ${INK}`, fontSize: 28, fontWeight: 800, transform: `scale(${mix(0.4, 1, s(CARD))})`, transformOrigin: "0 50%" }}>
                <svg width={30} height={28} viewBox="0 0 24 22"><path d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z" fill={C.coral} stroke={INK} strokeWidth={2} /></svg>
                + birthday card
              </div>
            ) : null}
          </div>
        ) : null}
        <Burst f={f} at={BOOM} x={700} y={330} text="BOOM!" size={0.95} />
      </Panel>

      {/* P5: happy + happy */}
      <Panel i={4} bg={halftone(YEL, "rgba(217,87,89,.2)")}>
        <div style={{ position: "absolute", left: 480, top: 0, width: 9, height: HEIGHTS[4], background: INK }} />
        <div style={{ position: "absolute", left: 90, top: 150, transform: `scale(${mix(0.6, 1, s(HAPPY1 - 6))}) rotate(-4deg)` }}>
          <Face p={maya} size={300} ring={INK} />
        </div>
        {[0, 1, 2].map((k) => (f >= HAPPY1 ? <div key={k} style={{ position: "absolute", left: 90 + k * 110, top: 90 - Math.sin(f * 0.12 + k) * 12, fontSize: 70, color: C.coral, transform: `scale(${s(HAPPY1 + k * 3)})` }}><svg width={60} height={56} viewBox="0 0 24 22"><path d="M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z" fill={C.coral} stroke={INK} strokeWidth={2} /></svg></div> : null))}
        <CapBox f={f} at={HAPPY1 - 4} x={40} y={500} rot={-2}>MAYA: HAPPY.</CapBox>
        {/* the cake */}
        <div style={{ position: "absolute", left: 580, top: 170, transform: `scale(${mix(0.6, 1, s(HAPPY2 - 8))})` }}>
          <div style={{ position: "absolute", left: 0, top: 150, width: 320, height: 150, borderRadius: 20, background: "#7A4A2E", border: `7px solid ${INK}` }} />
          <div style={{ position: "absolute", left: 30, top: 60, width: 260, height: 110, borderRadius: 16, background: "#F7C7D8", border: `7px solid ${INK}` }} />
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ position: "absolute", left: 90 + k * 60, top: 0, width: 16, height: 66, borderRadius: 6, background: "#FFFFFF", border: `4px solid ${INK}` }}>
              <div style={{ position: "absolute", left: -6, top: -34 + Math.sin(f * 0.4 + k) * 2, width: 20, height: 28, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "#FFB020", border: `3px solid ${INK}` }} />
            </div>
          ))}
        </div>
        <CapBox f={f} at={HAPPY2 - 4} x={520} y={500} rot={2}>BAKERY: HAPPY.</CapBox>
        {f >= HAPPY2 ? <Confetti at={HAPPY2} x={500} y={200} n={50} colors={[C.coral, BLUE, "#FFFFFF", INK, YEL]} /> : null}
      </Panel>

      {/* P6: the owner, still asleep */}
      <Panel i={5} bg={halftone(NIGHT, "rgba(255,255,255,.07)")}>
        <Moon x={90} y={70} />
        {/* bed */}
        <div style={{ position: "absolute", left: 240, top: 380, width: 560, height: 200, borderRadius: 30, background: "#E8E1D3", border: `8px solid ${INK}` }} />
        <div style={{ position: "absolute", left: 250, top: 300, width: 560, height: 160, borderRadius: "90px 90px 20px 20px", background: C.coral, border: `8px solid ${INK}` }} />
        <div style={{ position: "absolute", left: 190, top: 260, width: 170, height: 110, borderRadius: 40, background: "#FFFFFF", border: `8px solid ${INK}` }} />
        <div style={{ position: "absolute", left: 225, top: 205, width: 120, height: 120, borderRadius: 60, background: "#E8B894", border: `7px solid ${INK}`, transform: "rotate(-12deg)" }}>
          <div style={{ position: "absolute", left: -8, top: -10, width: 124, height: 58, borderRadius: "60px 60px 10px 10px", background: "#6B3A22", borderBottom: `6px solid ${INK}` }} />
          <svg width={120} height={120} style={{ position: "absolute", left: -7, top: -7 }}>
            <path d="M 34 70 Q 44 78 54 70 M 68 70 Q 78 78 88 70" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
          </svg>
        </div>
        {["Z", "Z", "Z"].map((z, k) => (
          <div key={k} style={{ position: "absolute", left: 320 + k * 60, top: 180 - k * 60 - ((f * 1.2 + k * 20) % 40), fontFamily: FONT, fontSize: 60 + k * 16, fontWeight: 900, color: "#FFFFFF", WebkitTextStroke: `4px ${INK}`, opacity: f >= OWNER ? 1 : 0 }}>{z}</div>
        ))}
        {/* the nightstand phone, quietly busy */}
        <div style={{ position: "absolute", left: 820, top: 420, width: 130, height: 150, background: "#8A5A34", border: `7px solid ${INK}`, borderRadius: 10 }} />
        <div style={{ position: "absolute", left: 845, top: 330, width: 84, height: 120, borderRadius: 16, background: INK, boxShadow: `0 0 ${30 + 10 * Math.sin(f * 0.3)}px rgba(217,87,89,.8)` }}>
          <div style={{ position: "absolute", inset: 7, borderRadius: 10, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark height={40} color={C.cream} stroke={26} />
          </div>
        </div>
        <CapBox f={f} at={OWNER - 6} x={40} y={600} rot={-1}>THE OWNER? STILL ASLEEP.</CapBox>
      </Panel>
    </>
  );
};

export const ComicCake: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const y = camY(f);
  const out = tw(f, HIT - 14, HIT, 0, 1, E.expoIn);
  const boom = keys(f, [[BOOM - 1, 0], [BOOM + 2, 1], [BOOM + 12, 0]], E.cubicInOut);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: PAPER }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(0,0,0,.06) 2px, transparent 2.5px)", backgroundSize: "22px 22px" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, transformOrigin: `540px ${y + 960}px`, transform: `translateY(${-y}px) scale(${(1 + 0.03 * boom) * (1 - 0.9 * out)})`, opacity: 1 - tw(out, 0.6, 1, 0, 1, E.linear) }}>
        <Page f={f} />
      </div>
      {f >= BOOM ? <Sparkles x={200} y={700} w={700} h={500} at={BOOM + 2} color={C.coral} size={50} seed={5} /> : null}
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/comic/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  cue(T.VO.l01 - 2, "pop", -4, "MEET MAYA"),
  cue(w("l02", 1) - 2, "pop", -6, "11 PM"),
  cue(ASK - 2, "send", -3, "the question"),
  ...MOVES.map((m, i) => cue(m + 8, "whoosh", -7, `scroll ${i + 1}`)),
  cue(SEEN, "blip", -6, "seen"),
  cue(NOTHING, "miss", -4, "crickets"),
  cue(WAITS[0], "clock", -6, "waits"),
  cue(WAITS[1], "tick", -5, "and waits"),
  cue(ORDERS, "whoosh", -6, "ordered elsewhere"),
  cue(B2 - 2, "pop", -5, "bakery no. 2"),
  cue(BF, "spark", -6, "Brainfast"),
  cue(BOOM - 2, "suck", -2, "into the boom"),
  cue(BOOM, "impact", 0, "BOOM!"),
  cue(BOOM + 2, "spark", -4, "sparkles"),
  ...moments.answer(ANS, "answered"),
  ...moments.land(BOOKED, "cake booked"),
  cue(CARD, "pop", -4, "card added"),
  cue(HAPPY1, "shimmer", -8, "hearts"),
  cue(HAPPY2, "flurry", -8, "confetti"),
  cue(OWNER, "night", -2, "night"),
  cue(ASLEEP, "blip", -10, "zzz"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { ASK, SEEN, B2, BOOM, BOOKED, HAPPY1, OWNER, HIT, CTA, URL, DUR };

export const COMICCAKE: FilmDef = {
  id: "ComicCake",
  slug: "comic",
  title: "ComicCake",
  component: ComicCake,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/comic/mix.wav",
};
