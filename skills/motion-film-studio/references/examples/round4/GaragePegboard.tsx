import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon, IconName } from "../../kit/ui";
import { ChannelBadge } from "../../kit/agentic";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/garage-pegboard/vo/lines.json";
import words from "../../../../public/films/garage-pegboard/vo/words.json";

loadFonts();

/**
 * AUTO REPAIR · ABOUT BRAINFAST: The pegboard. A workshop wall: a perforated
 * pegboard with painted tool outlines, and below it a car with the mechanic's
 * legs sticking out from under it while the phone on the toolbox piles up
 * messages. The drop hangs a new tool on the board — the agent — and every job
 * it takes over snaps into its outline like a tool going home: book the service,
 * explain what's included, send the quote, "your car is ready", the next-service
 * reminder. Signature: the outlines fill one by one until the board is full and
 * the phone reads 0 unanswered.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const HANDS = w("l01", 7);
const CAR = w("l01", 10);
const MECHANIC = w("l02", 3);
const DROP = w("l03", 0) - 2;
const ANSWERS = w("l03", 8);
const CH = [w("l03", 12), w("l03", 14), w("l03", 16)];
const JOBS = [w("l04", 1), w("l04", 4), w("l04", 8), w("l05", 7), w("l05", 9)];
const TEAM = w("l06", 1);
const REST = w("l06", 10);
const HIT = T.VO.l07 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l07", 2) + 4;
const URL = w("l07", T.nwords("l07") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l07") + 50);

const BOARD = "#D8C6A6";
const HOLE = "rgba(60,40,20,.28)";
const PAINT = "rgba(60,40,20,.35)";
const ORANGE = "#F07A2B";

const SLOTS: { x: number; y: number; icon: IconName; label: string; result: string; color: string }[] = [
  { x: 80, y: 360, icon: "calendar", label: "Book the service", result: "Tue · 9:00 booked", color: "#1C9A83" },
  { x: 390, y: 360, icon: "file", label: "What's included", result: "Oil, filters, 30-point check", color: "#5E6AD2" },
  { x: 700, y: 360, icon: "card", label: "Send the quote", result: "Quote sent ✓", color: "#D4861C" },
  { x: 230, y: 760, icon: "check", label: "Car is ready", result: "\"Your car is ready 🚗\"", color: C.coral },
  { x: 540, y: 760, icon: "activity", label: "Next service", result: "Reminder in 6 months", color: "#2B86CC" },
];

const Slot: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const s = SLOTS[i];
  const at = JOBS[i];
  const snap = springAt(f, at - 6, 30, 11, 200);
  const W = 290, H = 330;
  return (
    <div style={{ position: "absolute", left: s.x, top: s.y, width: W, height: H }}>
      {/* the painted outline */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 40, border: `6px dashed ${PAINT}` }} />
      <div style={{ position: "absolute", left: W / 2 - 14, top: -18, width: 28, height: 28, borderRadius: 14, background: "#6B6B6B", boxShadow: "inset 0 -3px 0 rgba(0,0,0,.3)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H - 96, padding: "0 18px", textAlign: "center", fontSize: 26, lineHeight: 1.15, fontWeight: 800, color: "rgba(60,40,20,.55)", fontFamily: MONO }}>{s.label.toUpperCase()}</div>
      {/* the tool: snaps in from below */}
      {snap > 0.01 ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: 40, background: s.color, boxShadow: "0 18px 40px rgba(60,40,20,.35)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 18, opacity: clamp(snap * 3), transform: `translateY(${(1 - clamp(snap)) * 700}px) rotate(${(1 - clamp(snap)) * (i % 2 ? 14 : -14)}deg)` }}>
          <div style={{ width: 120, height: 120, borderRadius: 34, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={70} color="#FFF" stroke={2.3} /></div>
          <div style={{ fontSize: 34, fontWeight: 850, color: "#FFF", textAlign: "center", lineHeight: 1.05 }}>{s.label}</div>
          <div style={{ padding: "8px 14px", borderRadius: 14, background: "rgba(255,255,255,.95)", fontSize: 22, fontWeight: 800, color: C.ink, textAlign: "center", opacity: tw(f, at + 6, at + 12, 0, 1, E.linear), transform: `scale(${tw(f, at + 6, at + 14, 0.6, 1, E.backOut)})` }}>{s.result}</div>
        </div>
      ) : null}
    </div>
  );
};

export const GaragePegboard: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const pending = f < ANSWERS ? Math.min(7, Math.floor(tw(f, 6, MECHANIC + 6, 0, 7.9, E.linear))) : Math.max(0, 7 - Math.floor((f - ANSWERS) / 3));
  const buzz = pending > 0 && f < ANSWERS ? Math.sin(f * 0.9) * 4 * (Math.floor(f / 18) % 2) : 0;
  const agent = springAt(f, DROP, 30, 10, 170);
  const full = f >= JOBS[4] + 10;
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={130} size={74} width={980} align="center" color="#3B2A1A" hi={ORANGE} words={ws} />;
  const hk = f < MECHANIC - 4 ? "a" : f < DROP - 2 ? "b" : f < JOBS[0] - 6 ? "c" : f < TEAM - 4 ? "-" : "e";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: BOARD }}>
      {/* the pegboard holes */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${HOLE} 6px, transparent 7px)`, backgroundSize: "56px 56px", backgroundPosition: "28px 28px" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 20%, rgba(255,240,210,.45) 0%, rgba(255,240,210,0) 60%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {hk === "a" ? headline("a", T.VO.l01, MECHANIC - 8, [{ t: "Answering a message", at: w("l01", 2), br: true }, { t: "with your hands", at: HANDS }, { t: "under a car?", at: CAR, hi: true }]) : null}
        {hk === "b" ? headline("b", MECHANIC - 4, DROP - 6, [{ t: "Neither has", at: w("l02", 0) }, { t: "your mechanic.", at: MECHANIC, hi: true }]) : null}
        {hk === "c" ? headline("c", DROP + 2, JOBS[0] - 10, [{ t: "A new tool", at: DROP + 4 }, { t: "for your garage.", at: w("l03", 3), hi: true }]) : null}
        {hk === "e" ? headline("e", TEAM - 2, HIT - 10, [{ t: "Hands on the cars.", at: TEAM, br: true }, { t: "Your agent", at: w("l06", 8) }, { t: "handles the rest.", at: REST, hi: true }]) : null}

        {/* outlines + tools */}
        {SLOTS.map((_, i) => <Slot key={i} i={i} />)}

        {/* the agent, hung on the board */}
        {agent > 0.01 ? (
          <div style={{ position: "absolute", left: 850, top: 760, width: 170, height: 330, transformOrigin: "50% -20px", transform: `rotate(${Math.sin((f - DROP) / 7) * 8 * Math.exp(-(f - DROP) / 30)}deg) translateY(${(1 - clamp(agent)) * -600}px)` }}>
            <div style={{ position: "absolute", left: 71, top: -18, width: 28, height: 28, borderRadius: 14, background: "#6B6B6B" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 40, background: C.coral, boxShadow: `0 18px 40px rgba(60,40,20,.35), 0 0 ${full ? 50 : 0}px rgba(240,122,43,.6)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <Mark height={80} color={C.cream} stroke={24} />
              <div style={{ fontSize: 26, fontWeight: 850, color: "#FFF", textAlign: "center", lineHeight: 1.1 }}>Your AI<br />agent</div>
            </div>
          </div>
        ) : null}
        {full ? <Sparkles x={60} y={330} w={960} h={800} at={JOBS[4] + 10} color="#FFE2A8" size={46} seed={12} /> : null}

        {/* the floor: car, mechanic's legs, toolbox + phone */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 1180, bottom: 0, background: "linear-gradient(180deg, #5A4B3C 0%, #3E342A 100%)" }} />
        <svg width={1080} height={700} viewBox="0 0 1080 700" style={{ position: "absolute", left: 0, top: 1150 }}>
          {/* car body */}
          <path d="M120 300 C 150 220, 260 200, 330 200 L 420 130 C 450 110, 640 105, 700 130 L 800 200 C 900 205, 960 230, 970 290 L 975 340 C 975 360, 960 370, 940 370 L 140 370 C 120 370, 110 355, 112 335 Z" fill="#2F6FB5" />
          <path d="M440 145 L 560 140 L 560 200 L 400 200 Z" fill="#BFE0F5" />
          <path d="M585 140 L 690 145 L 770 200 L 585 200 Z" fill="#BFE0F5" />
          <circle cx="280" cy="375" r="62" fill="#1E1E1E" /><circle cx="280" cy="375" r="26" fill="#9A9A9A" />
          <circle cx="810" cy="375" r="62" fill="#1E1E1E" /><circle cx="810" cy="375" r="26" fill="#9A9A9A" />
          {/* creeper + the mechanic's legs out from under the car (left side) */}
          <rect x="120" y="436" width="330" height="18" rx="9" fill="#E0592B" />
          <circle cx="150" cy="458" r="10" fill="#222" /><circle cx="420" cy="458" r="10" fill="#222" />
          <path d={`M 440 410 L 230 ${412 + Math.sin(f / 7) * 3}`} stroke="#3E6FA8" strokeWidth={46} strokeLinecap="round" />
          <path d={`M 440 432 L 210 ${440 + Math.sin(f / 7 + 1.2) * 4}`} stroke="#4A7DBA" strokeWidth={46} strokeLinecap="round" />
          <rect x={196} y={384 + Math.sin(f / 7) * 3} width="60" height="54" rx="14" fill="#2B2B2B" />
          <rect x={176} y={414 + Math.sin(f / 7 + 1.2) * 4} width="60" height="54" rx="14" fill="#2B2B2B" />
          {/* toolbox (right) */}
          <rect x="800" y="430" width="240" height="160" rx="16" fill="#C9302C" />
          <rect x="800" y="480" width="240" height="8" fill="#9E2421" /><rect x="800" y="530" width="240" height="8" fill="#9E2421" />
        </svg>
        {/* the phone on the toolbox */}
        <div style={{ position: "absolute", left: 860, top: 1440, width: 150, height: 150, transform: `rotate(${8 + buzz}deg)` }}>
          <div style={{ width: 120, height: 150, borderRadius: 22, background: "#171717", padding: 8 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 16, background: pending ? "#2A3942" : "#1F3D2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChannelBadge ch="whatsapp" size={52} />
            </div>
          </div>
          <div style={{ position: "absolute", right: -10, top: -18, minWidth: 56, height: 56, borderRadius: 28, padding: "0 12px", background: pending ? "#E5484D" : C.green, color: "#FFF", fontSize: 30, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pending ? 1 + 0.08 * Math.abs(Math.sin(f / 4)) : 1})` }}>{pending ? pending : <Icon name="check" size={30} color="#FFF" stroke={3.4} />}</div>
        </div>
        {/* channel chips after the drop */}
        {f >= CH[0] - 6 && f < JOBS[0] + 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1100, display: "flex", justifyContent: "center", gap: 18, opacity: 1 - tw(f, JOBS[0] - 4, JOBS[0] + 2, 0, 1, E.linear), zIndex: 20 }}>
            {(["whatsapp", "web", "instagram"] as const).map((ch, i) => {
              const s = tw(f, CH[i] - 6, CH[i] + 4, 0, 1, E.backOut);
              return <div key={ch} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 22px 12px 12px", borderRadius: 999, background: "#FFFFFF", fontSize: 30, fontWeight: 800, color: C.ink, transform: `scale(${s})`, boxShadow: "0 10px 24px rgba(0,0,0,.2)" }}><ChannelBadge ch={ch} size={46} />{ch === "web" ? "Website" : ch === "whatsapp" ? "WhatsApp" : "Instagram"}</div>;
            })}
          </div>
        ) : null}
        {f >= ANSWERS && f < JOBS[0] + 6 ? (
          <div style={{ position: "absolute", right: 250, top: 1460, padding: "12px 22px", borderRadius: 999, background: C.green, color: "#FFF", fontSize: 30, fontWeight: 850, opacity: tw(f, ANSWERS, ANSWERS + 6, 0, 1, E.linear) * (1 - tw(f, JOBS[0], JOBS[0] + 6, 0, 1, E.linear)) }}>Every customer answered ✓</div>
        ) : null}
        {f >= TEAM - 2 ? (
          <div style={{ position: "absolute", left: 120, top: 1660, padding: "12px 22px", borderRadius: 999, background: "rgba(255,255,255,.92)", color: "#3B2A1A", fontSize: 30, fontWeight: 850, opacity: tw(f, TEAM - 2, TEAM + 6, 0, 1, E.linear) }}>🔧 hands still on the car</div>
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/garage-pegboard/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "hum", -14, "workshop"),
  ...Array.from({ length: 6 }, (_, i) => cue(10 + i * 14, "buzz", -10, `phone buzz ${i + 1}`)),
  cue(HANDS, "clock", -12, "wrench ratchet"),
  cue(MECHANIC + 2, "notif", -7, "another message"),
  cue(DROP - 2, "swell", -6, "the drop"),
  cue(DROP + 4, "flip", -6, "agent hangs on the board"),
  cue(ANSWERS, "check", -6, "every customer answered"),
  ...CH.map((c, i) => cue(c - 6, "pop", -8, `channel ${i + 1}`)),
  ...JOBS.map((j, i) => cue(j - 6, "whoosh", -10, `tool ${i + 1} flies in`)),
  ...JOBS.map((j, i) => cue(j - 1, "snap", -5, `tool ${i + 1} snaps home`)),
  ...JOBS.map((j, i) => cue(j + 6, "tick", -9, `result ${i + 1}`)),
  cue(JOBS[4] + 10, "shimmer", -6, "the board is full"),
  cue(TEAM - 2, "pop", -9, "hands on the car"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const GARAGEPEGBOARD: FilmDef = { id: "GaragePegboard", slug: "garage-pegboard", title: "Auto repair · Brainfast · The pegboard", component: GaragePegboard, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/garage-pegboard/mix.wav" };
