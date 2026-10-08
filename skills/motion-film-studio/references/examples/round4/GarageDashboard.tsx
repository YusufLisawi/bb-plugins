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
import { Icon } from "../../kit/ui";
import { Face, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/garage-dashboard/vo/lines.json";
import words from "../../../../public/films/garage-dashboard/vo/words.json";

loadFonts();

/**
 * AUTO REPAIR · EXPLAINED: What does that orange light mean? (AI vision)
 * A night dashboard with gauges and one orange warning light pulsing. The
 * customer photographs it (shutter flash) and sends it to the garage. Then the
 * explainer, in three moves: the agent LOOKS (a scan grid finds the lit symbol),
 * RECOGNISES it (the crop flies into a grid of warning symbols and lights its
 * match), and CHECKS YOUR GUIDE (the workshop's own page, "steady" highlighted).
 * The answer, the booking, and a hand-off: it explains and books; the mechanic
 * decides. No music: dashboard chimes, the shutter, scanner sweeps.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const ORANGE_W = w("l01", 3);
const SEND = w("l02", 6);
const PHOTO = w("l02", 10);
const DROP = w("l03", 0) - 2;
const VISION = w("l03", 6);
const LOOKS = w("l04", 1);
const RECOG = w("l04", 5);
const SYMBOL = w("l04", 7);
const CHECKS = w("l04", 9);
const GUIDE = w("l04", 13);
const STEADY = w("l05", 2);
const FLASHING = w("l05", 4);
const SAFE = w("l05", 5);
const BOOK = w("l05", 9);
const THURSDAY = w("l06", 0);
const BOOKED = w("l06", 3);
const NEVER = w("l07", 1);
const MECHANIC = w("l07", 6);
const EXPLAINS = w("l07", 8);
const DECIDE = w("l07", 14);
const HIT = T.VO.l08 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l08", 2) + 4;
const URL = w("l08", T.nwords("l08") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l08") + 50);

const NIGHT = "#0C1018";
const AMBER = "#FF9F1C";

/** warning-light symbols, drawn in a 60×60 box */
const SYM: Record<string, (c: string) => React.ReactNode> = {
  engine: (c) => <path d="M8 26 h6 v-6 h10 v-5 h14 v5 h6 l6 6 v4 h4 v-4 h4 v14 h-4 v-4 h-4 v6 l-4 4 h-24 l-4 -4 h-8 z" fill="none" stroke={c} strokeWidth={4} strokeLinejoin="round" />,
  oil: (c) => <><path d="M6 34 l10 -8 h22 l14 -6 l-6 14 h-40 z" fill="none" stroke={c} strokeWidth={4} strokeLinejoin="round" /><path d="M52 36 q2 6 0 8" stroke={c} strokeWidth={4} fill="none" /></>,
  battery: (c) => <><rect x="8" y="18" width="44" height="28" rx="3" fill="none" stroke={c} strokeWidth={4} /><path d="M16 14 v4 M44 14 v4 M16 32 h8 M40 28 v8 M36 32 h8" stroke={c} strokeWidth={4} /></>,
  temp: (c) => <><path d="M30 8 v26" stroke={c} strokeWidth={5} strokeLinecap="round" /><circle cx="30" cy="40" r="7" fill={c} /><path d="M10 50 q5 -4 10 0 q5 4 10 0 q5 -4 10 0 q5 4 10 0" stroke={c} strokeWidth={4} fill="none" /></>,
  tire: (c) => <><path d="M14 46 q-6 -14 4 -28 h24 q10 14 4 28" fill="none" stroke={c} strokeWidth={4} /><path d="M30 22 v14 M30 41 v2" stroke={c} strokeWidth={5} strokeLinecap="round" /></>,
  brake: (c) => <><circle cx="30" cy="30" r="16" fill="none" stroke={c} strokeWidth={4} /><path d="M10 16 q-6 14 0 28 M50 16 q6 14 0 28 M30 22 v10 M30 37 v2" stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" /></>,
  abs: (c) => <><circle cx="30" cy="30" r="18" fill="none" stroke={c} strokeWidth={4} /><text x="30" y="36" textAnchor="middle" fontSize="15" fontWeight="900" fill={c} fontFamily="DM Sans">ABS</text></>,
  airbag: (c) => <><circle cx="22" cy="14" r="5" fill={c} /><path d="M18 22 l-4 18 h10 l4 12 M40 30 a10 10 0 1 0 0.1 0" stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" /></>,
};
const ORDER = ["oil", "battery", "temp", "tire", "engine", "brake", "abs", "airbag"];
const Sym: React.FC<{ k: string; size: number; color: string; glow?: number }> = ({ k, size, color, glow = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" style={{ overflow: "visible" }}>
    {glow > 0.01 ? <circle cx="30" cy="30" r="34" fill={`rgba(255,159,28,${0.28 * glow})`} /> : null}
    {SYM[k](color)}
  </svg>
);

/** the dashboard: two gauges + the warning-light strip */
const Dashboard: React.FC<{ pulse: number; scale?: number }> = ({ pulse, scale = 1 }) => {
  const f = useCurrentFrame();
  const needle = (base: number, wob: number) => base + Math.sin(f / 13) * wob;
  const gauge = (cxp: number, label: string, ang: number) => (
    <g transform={`translate(${cxp} 210)`}>
      <circle r="150" fill="#141B26" stroke="#2A3445" strokeWidth="6" />
      {Array.from({ length: 13 }, (_, i) => {
        const a = (-220 + i * 22) * (Math.PI / 180);
        return <line key={i} x1={Math.cos(a) * 118} y1={Math.sin(a) * 118} x2={Math.cos(a) * 138} y2={Math.sin(a) * 138} stroke={i > 9 ? "#E5484D" : "#9FB3C8"} strokeWidth={i % 2 ? 3 : 6} />;
      })}
      <line x1="0" y1="0" x2={Math.cos((ang * Math.PI) / 180) * 110} y2={Math.sin((ang * Math.PI) / 180) * 110} stroke="#FF6B4A" strokeWidth="7" strokeLinecap="round" />
      <circle r="14" fill="#2A3445" />
      <text y="80" textAnchor="middle" fontSize="22" fill="#6E8297" fontFamily="DM Mono" letterSpacing="3">{label}</text>
    </g>
  );
  return (
    <svg width={1000 * scale} height={560 * scale} viewBox="0 0 1000 560">
      <rect x="0" y="0" width="1000" height="560" rx="60" fill="#0F151F" />
      {gauge(260, "RPM ×1000", needle(-150, 4))}
      {gauge(740, "KM/H", needle(-200, 2))}
      <g transform="translate(110 420)">
        {ORDER.map((k, i) => (
          <g key={k} transform={`translate(${i * 100} 0)`}>
            <Sym k={k} size={60} color={k === "engine" ? `rgba(255,159,28,${0.35 + 0.65 * pulse})` : "#252E3B"} glow={k === "engine" ? pulse : 0} />
          </g>
        ))}
      </g>
    </svg>
  );
};

export const GarageDashboard: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  const flash = tw(f, PHOTO - 2, PHOTO, 0, 1, E.linear) * (1 - tw(f, PHOTO, PHOTO + 6, 0, 1, E.linear));
  const dashOut = tw(f, DROP - 6, DROP + 6, 0, 1, E.expoIn);
  const explainOut = tw(f, STEADY - 8, STEADY, 0, 1, E.expoIn);
  const headline = (k: string, from: number, to: number, ws: KWord[], y = 170) => <Kinetic key={k} from={from} to={to} y={y} size={76} width={980} align="center" color="#F4F1E8" hi={AMBER} words={ws} />;
  const hk = f < SEND - 6 ? "a" : f < DROP - 2 ? "-" : f < LOOKS - 4 ? "b" : f < STEADY - 6 ? "-" : f < NEVER - 4 ? "-" : "e";
  // explainer steps
  const step = f < RECOG - 2 ? 0 : f < CHECKS - 2 ? 1 : 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: NIGHT }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 45%, rgba(255,159,28,${0.12 * pulse * (1 - dashOut)}) 0%, rgba(255,159,28,0) 55%)` }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: "0.2em", color: "#6E8297" }}>AI, EXPLAINED · FOR GARAGES</div>
        {hk === "a" ? headline("a", T.VO.l01, SEND - 10, [{ t: "What does that", at: w("l01", 0) }, { t: "orange light", at: ORANGE_W, hi: true, br: true }, { t: "mean?", at: w("l01", 5) }]) : null}
        {hk === "b" ? headline("b", DROP + 2, LOOKS - 8, [{ t: "An AI agent", at: w("l03", 2) }, { t: "with vision.", at: VISION, hi: true }]) : null}
        {hk === "e" ? headline("e", NEVER - 2, HIT - 10, [{ t: "It explains.", at: EXPLAINS }, { t: "It books.", at: w("l07", 9), br: true }, { t: "Your team", at: w("l07", 12) }, { t: "decides.", at: DECIDE, hi: true }]) : null}

        {/* the dashboard */}
        {dashOut < 1 ? (
          <div style={{ position: "absolute", left: 40, top: 520, opacity: 1 - dashOut, transform: `scale(${mix(1, 0.8, dashOut)})`, transformOrigin: "50% 30%" }}>
            <Dashboard pulse={pulse} />
          </div>
        ) : null}
        {/* the phone takes a photo */}
        {f >= SEND - 10 && dashOut < 1 ? (
          <div style={{ position: "absolute", left: 300, top: mix(1950, 1150, tw(f, SEND - 10, SEND + 4, 0, 1, E.quintOut)), width: 480, height: 700, borderRadius: 64, background: "#171717", padding: 16, boxShadow: "0 -20px 60px rgba(0,0,0,.6)", opacity: 1 - dashOut }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 50, background: "#000", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: -260, top: -170, transform: "scale(0.9)", transformOrigin: "0 0" }}><Dashboard pulse={pulse} /></div>
              <div style={{ position: "absolute", left: 60, right: 60, top: 60, bottom: 160, border: "3px solid rgba(255,255,255,.6)", borderRadius: 20 }} />
              <div style={{ position: "absolute", left: "50%", bottom: 40, width: 96, height: 96, marginLeft: -48, borderRadius: 48, border: "6px solid #FFF", background: f >= PHOTO - 2 ? "#FFF" : "transparent" }} />
              <div style={{ position: "absolute", inset: 0, background: "#FFF", opacity: flash }} />
            </div>
          </div>
        ) : null}

        {/* the explainer: LOOKS · RECOGNISES · CHECKS YOUR GUIDE */}
        {f >= DROP && explainOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - explainOut }}>
            {/* step chips */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", gap: 14 }}>
              {["1 · Looks", "2 · Recognises", "3 · Checks your guide"].map((t, i) => {
                const on = f >= [LOOKS, RECOG, CHECKS][i] - 4;
                return <div key={t} style={{ padding: "12px 22px", borderRadius: 999, background: on ? (step === i ? AMBER : "#2A3445") : "#161D29", color: on ? (step === i ? "#1B1203" : "#C9D3DE") : "#4A5668", fontSize: 28, fontWeight: 850, transform: `scale(${step === i && on ? 1.06 : 1})` }}>{t}</div>;
              })}
            </div>
            {/* 1: the photo + scanning grid */}
            <div style={{ position: "absolute", left: 90, top: 450, width: 900, height: 500, borderRadius: 40, overflow: "hidden", background: "#000", transform: `scale(${step === 0 ? 1 : 0.5}) translate(${step === 0 ? 0 : -460}px, ${step === 0 ? 0 : -60}px)`, transformOrigin: "0 0", transition: "none" }}>
              <div style={{ position: "absolute", left: -50, top: -30, transform: "scale(0.95)", transformOrigin: "0 0" }}><Dashboard pulse={0.9} /></div>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,159,28,.18) 2px, transparent 2px), linear-gradient(90deg, rgba(255,159,28,.18) 2px, transparent 2px)", backgroundSize: "60px 60px", opacity: tw(f, LOOKS - 4, LOOKS + 4, 0, 1, E.linear) }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: mix(-40, 520, ((f - LOOKS) % 30) / 30), height: 40, background: "linear-gradient(180deg, rgba(255,159,28,0), rgba(255,159,28,.5), rgba(255,159,28,0))", opacity: f >= LOOKS && f < RECOG ? 1 : 0 }} />
              {f >= LOOKS + 6 ? <div style={{ position: "absolute", left: 425, top: 360, width: 92, height: 92, border: `5px solid ${AMBER}`, borderRadius: 14, transform: `scale(${tw(f, LOOKS + 6, LOOKS + 14, 1.8, 1, E.expoOut)})`, boxShadow: `0 0 30px ${AMBER}` }} /> : null}
            </div>
            {/* 2: the symbol grid — the match lights up */}
            {f >= RECOG - 4 ? (
              <div style={{ position: "absolute", left: 90, right: 90, top: step === 1 ? 760 : 700, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, opacity: tw(f, RECOG - 4, RECOG + 4, 0, 1, E.linear), transform: `scale(${step === 2 ? 0.7 : 1})`, transformOrigin: "100% 0" }}>
                {ORDER.map((k, i) => {
                  const match = k === "engine" && f >= SYMBOL;
                  const scan = f >= RECOG && f < SYMBOL && Math.floor((f - RECOG) / 2) % 8 === i;
                  return (
                    <div key={k} style={{ height: 170, borderRadius: 28, background: match ? "#2A1E0A" : "#141B26", border: `4px solid ${match ? AMBER : scan ? "#4A5668" : "#202A38"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transform: `scale(${match ? tw(f, SYMBOL, SYMBOL + 8, 1.25, 1.06, E.backOut) : 1})` }}>
                      <Sym k={k} size={80} color={match ? AMBER : "#6E8297"} glow={match ? 1 : 0} />
                      {match ? <div style={{ fontSize: 24, fontWeight: 850, color: AMBER }}>Check engine</div> : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {/* 3: your workshop's guide */}
            {f >= CHECKS - 4 ? (
              <div style={{ position: "absolute", left: 70, right: 70, top: 1180, padding: "28px 32px", borderRadius: 32, background: "#FFFDF6", boxShadow: "0 30px 70px rgba(0,0,0,.5)", opacity: tw(f, CHECKS - 4, CHECKS + 4, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, CHECKS - 4, CHECKS + 8, 0, 1, E.expoOut)) * 100}px)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Icon name="book" size={40} color={C.coral} stroke={2.3} />
                  <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: C.gray }}>YOUR WORKSHOP GUIDE · WARNING LIGHTS</div>
                </div>
                <div style={{ fontSize: 40, fontWeight: 850, color: C.ink, marginTop: 14 }}>Check engine light</div>
                {[["Steady", "Safe to drive · inspect within 7 days"], ["Flashing", "Stop driving · call the garage"]].map(([a, b], i) => (
                  <div key={a} style={{ position: "relative", display: "flex", gap: 16, marginTop: 14, fontSize: 32, color: "#33465C" }}>
                    {i === 0 ? <div style={{ position: "absolute", left: -10, top: -2, height: 46, width: `${tw(f, GUIDE - 2, GUIDE + 10, 0, 104, E.cubicInOut)}%`, background: "rgba(255,200,64,.55)", borderRadius: 8 }} /> : null}
                    <b style={{ position: "relative", width: 160 }}>{a}</b><span style={{ position: "relative" }}>{b}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* the answer + booking */}
        {f >= STEADY - 6 && f < NEVER + 4 ? (
          <div style={{ position: "absolute", left: 50, right: 50, top: 300, borderRadius: 40, background: "#EFE7DE", padding: "20px 24px 26px", opacity: tw(f, STEADY - 6, STEADY + 2, 0, 1, E.linear) * (1 - tw(f, NEVER - 4, NEVER + 4, 0, 1, E.linear)) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <ChannelBadge ch="whatsapp" size={50} />
              <div style={{ fontSize: 32, fontWeight: 850 }}>Hillside Garage</div>
              <div style={{ marginLeft: "auto" }}><Face p={PEOPLE.dana} size={56} /></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: "24px 24px 8px 24px", background: "#D9FDD3" }}>
                <div style={{ width: 200, height: 112, borderRadius: 14, overflow: "hidden", position: "relative", background: "#000" }}><div style={{ position: "absolute", left: -10, top: -12, transform: "scale(0.21)", transformOrigin: "0 0" }}><Dashboard pulse={0.9} /></div></div>
                <div style={{ fontSize: 32 }}>What's this light? 😬</div>
              </div>
              <div style={{ alignSelf: "flex-start", maxWidth: 860, padding: "18px 24px", borderRadius: "24px 24px 24px 8px", background: "#FFF", fontSize: 36, lineHeight: 1.28, color: C.ink }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.coral }}>✨ AI assistant</div>
                That's the <b>check engine</b> light. It's <b>steady</b>, not flashing, so it's <b>safe to drive</b>. Let's have it inspected this week.
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  {[["Steady", STEADY], ["Not flashing", FLASHING], ["Safe to drive", SAFE]].map(([t, at]) => (
                    <div key={t as string} style={{ padding: "6px 14px", borderRadius: 12, background: C.greenTint, color: C.green, fontSize: 24, fontWeight: 800, transform: `scale(${tw(f, (at as number) - 2, (at as number) + 6, 0, 1, E.backOut)})` }}>{t} ✓</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <SystemCard at={BOOK - 4} doneAt={BOOKED} x={70} y={1220} w={940} system={{ label: "Workshop calendar", icon: "calendar", color: "#1C9A83" }} doing="Finding a slot this week…" done="Thursday · 9:00 · booked" facts={["Inspection", "Dana's car"]} out={NEVER - 4} />
        {f >= BOOKED ? <Sparkles x={120} y={1180} w={840} h={400} at={BOOKED} color="#FFD27A" size={40} seed={7} /> : null}

        {/* l07: the mechanic decides */}
        {f >= NEVER - 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: tw(f, NEVER - 4, NEVER + 4, 0, 1, E.linear) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
              <div style={{ width: 230, height: 230, borderRadius: 64, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${springAt(f, NEVER - 4, 30, 12, 170)})` }}><Mark height={130} color={C.cream} stroke={24} /></div>
              <div style={{ fontSize: 80, color: "#4A5668" }}>→</div>
              <div style={{ transform: `scale(${springAt(f, MECHANIC - 4, 30, 12, 170)})` }}><Face p={PEOPLE.marcus} size={230} /></div>
            </div>
            <div style={{ display: "flex", gap: 40, fontSize: 34, fontWeight: 800, color: "#C9D3DE" }}><span>Your agent</span><span style={{ marginLeft: 120 }}>Marcus · mechanic</span></div>
            <div style={{ marginTop: 30, padding: "20px 34px", borderRadius: 999, background: "#1C2633", border: `3px solid ${AMBER}`, color: "#F4F1E8", fontSize: 36, fontWeight: 850, opacity: tw(f, MECHANIC, MECHANIC + 8, 0, 1, E.linear) }}>Diagnosis stays with your mechanic</div>
          </div>
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/garage-dashboard/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "hum", -12, "engine idle"),
  cue(ORANGE_W - 4, "ping", -6, "warning chime"),
  cue(ORANGE_W + 20, "ping", -10, "warning chime 2"),
  cue(SEND - 10, "whoosh", -10, "phone rises"),
  cue(PHOTO - 2, "click", -2, "shutter"),
  cue(PHOTO + 2, "send", -7, "photo sent"),
  cue(DROP - 2, "swell", -7, "AI with vision"),
  cue(LOOKS - 4, "data", -8, "scan grid"),
  cue(LOOKS + 6, "focus", -6, "symbol found"),
  cue(RECOG - 4, "pop", -10, "symbol grid"),
  ...Array.from({ length: 5 }, (_, i) => cue(RECOG + i * 2, "tick", -14, `scan ${i + 1}`)),
  cue(SYMBOL, "check", -5, "match: check engine"),
  cue(CHECKS - 4, "paper", -6, "the workshop guide"),
  cue(GUIDE - 2, "draw", -7, "highlight: steady"),
  cue(STEADY - 6, "receive", -5, "the answer"),
  ...[STEADY, FLASHING, SAFE].map((a, i) => cue(a - 2, "pop", -10, `chip ${i + 1}`)),
  cue(BOOK - 4, "blip", -8, "calendar"),
  cue(BOOKED, "check", -5, "booked"),
  cue(NEVER - 4, "whoosh", -9, "hand-off"),
  cue(MECHANIC - 4, "pop", -8, "the mechanic"),
  cue(DECIDE, "chime", -7, "your team decides"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const GARAGEDASHBOARD: FilmDef = { id: "GarageDashboard", slug: "garage-dashboard", title: "Auto repair · Explained · The orange light", component: GarageDashboard, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/garage-dashboard/mix.wav" };
