import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, Stamp, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { Mark } from "../../brand/Mark";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/garage-repair/vo/lines.json";
import words from "../../../../public/films/garage-repair/vo/words.json";

loadFonts();

/**
 * AUTO REPAIR · USE CASE: The repair order. A car rolls onto a lift on Monday
 * at 8; under it the mechanic finds worn brake pads (a glowing disc callout).
 * The garage's agent sends the customer the photo and a quote card with an
 * Approve button; "Yes, go ahead" — approved in the chat. At 16:00 the lift
 * lowers and the message every customer waits for goes out: your car is ready.
 * Six months later, a friendly reminder. Signature: the repair-order ticket at
 * the bottom is the spine of the film — every line updates as it happens,
 * ending stamped READY FOR PICKUP.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const COMES = w("l01", 7);
const UNDER = w("l02", 0);
const WORN = w("l02", 5);
const DROP = w("l03", 0) - 2;
const SENDS = w("l03", 4);
const PHOTO = w("l03", 8);
const QUOTE = w("l03", 11);
const REPLACE = w("l04", 0);
const YES = w("l05", 0);
const APPROVED = w("l05", 3);
const FOUR = w("l06", 1);
const READY = w("l06", 13);
const SIX = w("l07", 1);
const REMINDER = w("l07", 6);
const NEXT = w("l07", 10);
const HIT = T.VO.l08 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l08", 2) + 4;
const URL = w("l08", T.nwords("l08") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l08") + 50);

const BG = "#EEF1F4";
const STEEL = "#3A4656";
const AMBER = "#F2A321";
const DANA: FaceSpec = { ...PEOPLE.dana, name: "Dana" };

const Car: React.FC<{ shine?: number }> = ({ shine = 0 }) => (
  <svg width={760} height={300} viewBox="0 0 760 300" style={{ overflow: "visible" }}>
    <path d="M30 170 C 60 110, 160 95, 230 95 L 300 40 C 330 22, 470 20, 520 40 L 600 95 C 690 100, 735 125, 740 175 L 742 215 C 742 232, 730 240, 712 240 L 50 240 C 32 240, 24 228, 26 212 Z" fill={C.coral} />
    <path d="M320 52 L 410 48 L 410 100 L 290 100 Z" fill="#CFE6F4" /><path d="M432 48 L 510 52 L 575 100 L 432 100 Z" fill="#CFE6F4" />
    <circle cx="170" cy="245" r="52" fill="#1E1E1E" /><circle cx="170" cy="245" r="24" fill="#9A9A9A" />
    <circle cx="600" cy="245" r="52" fill="#1E1E1E" /><circle cx="600" cy="245" r="24" fill="#9A9A9A" />
    {shine > 0 ? <path d={`M ${100 + shine * 560} 90 L ${140 + shine * 560} 90 L ${60 + shine * 560} 240 L ${20 + shine * 560} 240 Z`} fill="rgba(255,255,255,.5)" /> : null}
  </svg>
);

const BrakeDisc: React.FC<{ size: number; worn: number }> = ({ size, worn }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="#9AA3AE" /><circle cx="50" cy="50" r="30" fill="#7D8794" /><circle cx="50" cy="50" r="12" fill="#5A6370" />
    {Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(a) * 21} cy={50 + Math.sin(a) * 21} r="3.5" fill="#3E4652" />; })}
    <rect x="70" y="22" width="18" height="56" rx="6" fill={worn > 0.5 ? "#E5484D" : "#2B2B2B"} />
    <rect x="84" y={22 + worn * 10} width="6" height={56 - worn * 20} rx="2" fill="#6A4B2E" />
  </svg>
);

export const GarageRepair: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const lift = tw(f, COMES - 6, COMES + 18, 0, 1, E.cubicInOut) * (1 - tw(f, FOUR - 4, FOUR + 14, 0, 1, E.cubicInOut));
  const carIn = tw(f, 4, COMES, 0, 1, E.quintOut);
  const sceneOut = Math.max(tw(f, DROP - 4, DROP + 8, 0, 1, E.cubicInOut) * (1 - tw(f, FOUR - 6, FOUR + 6, 0, 1, E.cubicInOut)), tw(f, SIX - 6, SIX + 4, 0, 1, E.cubicInOut));
  const chat = springAt(f, DROP + 2, 30, 14, 150) * (1 - tw(f, FOUR - 8, FOUR, 0, 1, E.expoIn));
  const chat2 = springAt(f, READY - 6, 30, 14, 150);
  const clock = f < FOUR - 2 ? "MON · 08:00" : f < SIX - 2 ? "MON · 16:00" : "6 MONTHS LATER";
  const clockPop = f >= FOUR - 2 && f < FOUR + 6 ? tw(f, FOUR - 2, FOUR + 6, 1.25, 1, E.backOut) : f >= SIX - 2 && f < SIX + 6 ? tw(f, SIX - 2, SIX + 6, 1.25, 1, E.backOut) : 1;
  const brakeState = f < WORN ? "pending" : f < APPROVED ? "await" : f < FOUR ? "approved" : "done";
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={110} size={70} width={980} align="center" color={STEEL} hi={C.coral} words={ws} />;
  const hk = f < UNDER - 4 ? "a" : f < DROP - 2 ? "b" : "-";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: BG }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(90deg, rgba(58,70,86,.05) 2px, transparent 2px)", backgroundSize: "120px 120px" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {hk === "a" ? headline("a", T.VO.l01, UNDER - 8, [{ t: "A routine", at: w("l01", 11) }, { t: "service.", at: w("l01", 12), hi: true }]) : null}
        {hk === "b" ? headline("b", UNDER - 4, DROP - 6, [{ t: "Worn", at: WORN, hi: true }, { t: "brake pads.", at: w("l02", 6), hi: true }]) : null}
        {/* the clock */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 240, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 30px", borderRadius: 999, background: STEEL, color: "#FFF", fontFamily: MONO, fontSize: 34, letterSpacing: "0.1em", transform: `scale(${clockPop})` }}>
            <Icon name={f < SIX - 2 ? "activity" : "calendar"} size={32} color={AMBER} stroke={2.4} /> {clock}
          </div>
        </div>

        {/* the workshop: car on a lift */}
        {sceneOut < 1 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 360, height: 760, opacity: 1 - sceneOut, transform: `scale(${mix(1, 0.85, sceneOut)})` }}>
            <div style={{ position: "absolute", left: 150, top: 600, width: 780, height: 26, borderRadius: 8, background: "#C9CFD6" }} />
            {[260, 820].map((x) => <div key={x} style={{ position: "absolute", left: x - 16, top: 600 - lift * 230, width: 32, height: lift * 230 + 10, background: AMBER, borderRadius: 6 }} />)}
            <div style={{ position: "absolute", left: 160, top: 576 - lift * 230, width: 760, height: 24, borderRadius: 8, background: STEEL }} />
            <div style={{ position: "absolute", left: mix(-800, 160, carIn), top: 290 - lift * 230 }}><Car shine={f >= READY - 6 ? tw(f, READY - 6, READY + 14, 0, 1, E.cubicInOut) : 0} /></div>
            {/* mechanic under the car */}
            {f >= UNDER - 6 && f < DROP + 6 ? (
              <div style={{ position: "absolute", left: 420, top: 520, transform: `scale(${springAt(f, UNDER - 6, 30, 12, 170)})` }}><Face p={PEOPLE.marcus} size={140} /></div>
            ) : null}
            {f >= WORN - 4 && f < DROP + 6 ? (
              <div style={{ position: "absolute", left: 640, top: 380, display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 30, background: "#FFF", boxShadow: "0 20px 50px rgba(58,70,86,.25)", transform: `scale(${tw(f, WORN - 4, WORN + 6, 0.4, 1, E.backOut)})`, transformOrigin: "0 100%" }}>
                <div style={{ borderRadius: 60, boxShadow: `0 0 0 ${8 + 4 * Math.sin(f / 4)}px rgba(229,72,77,.25)` }}><BrakeDisc size={130} worn={1} /></div>
                <div style={{ fontSize: 32, fontWeight: 850, color: "#C0392B", lineHeight: 1.1 }}>Brake pads<br />worn</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* the chat: photo + quote + approval */}
        {chat > 0.01 ? (
          <div style={{ position: "absolute", left: 50, right: 50, top: 340, height: 1060, borderRadius: 44, background: "#EFE7DE", boxShadow: "0 30px 80px rgba(58,70,86,.22)", opacity: clamp(chat * 2), transform: `translateY(${(1 - clamp(chat)) * 300}px)`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 26px", background: "#FFF" }}>
              <ChannelBadge ch="whatsapp" size={50} />
              <div style={{ width: 60, height: 60, borderRadius: 18, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={34} color={C.cream} stroke={26} /></div>
              <div><div style={{ fontSize: 32, fontWeight: 850 }}>Hillside Garage</div><div style={{ fontSize: 22, color: C.gray }}>AI assistant</div></div>
              <div style={{ marginLeft: "auto" }}><Face p={DANA} size={60} /></div>
            </div>
            <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {f >= SENDS - 4 ? (
                <div style={{ alignSelf: "flex-start", padding: 14, borderRadius: "26px 26px 26px 8px", background: "#FFF", opacity: tw(f, SENDS - 4, SENDS + 2, 0, 1, E.linear), maxWidth: 760 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.coral, marginBottom: 6 }}>✨ AI assistant</div>
                  <div style={{ fontSize: 34, lineHeight: 1.25 }}>Hi Dana 👋 During your service, Marcus found your front brake pads are worn.</div>
                  {f >= PHOTO - 4 ? (
                    <div style={{ marginTop: 12, height: 220, borderRadius: 18, background: "linear-gradient(160deg, #3A4656, #1E252E)", display: "flex", alignItems: "center", justifyContent: "center", opacity: tw(f, PHOTO - 4, PHOTO + 2, 0, 1, E.linear) }}><BrakeDisc size={190} worn={1} /></div>
                  ) : null}
                </div>
              ) : null}
              {f >= QUOTE - 4 ? (
                <div style={{ alignSelf: "flex-start", width: 720, padding: "20px 24px", borderRadius: 26, background: "#FFF", boxShadow: "0 8px 24px rgba(0,0,0,.08)", opacity: tw(f, QUOTE - 4, QUOTE + 2, 0, 1, E.linear), transform: `scale(${tw(f, QUOTE - 4, QUOTE + 6, 0.85, 1, E.backOut)})`, transformOrigin: "0 0" }}>
                  <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.gray }}>QUOTE · REPAIR ORDER #2417</div>
                  <div style={{ display: "flex", alignItems: "baseline", marginTop: 8 }}>
                    <div style={{ fontSize: 38, fontWeight: 850, color: C.ink }}>Replace front brake pads</div>
                    <div style={{ marginLeft: "auto", fontSize: 44, fontWeight: 900, color: C.ink, fontFamily: MONO }}>180</div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
                    <div style={{ flex: 1, padding: "16px 0", borderRadius: 18, textAlign: "center", fontSize: 32, fontWeight: 850, color: "#FFF", background: f >= APPROVED ? C.green : C.ink, transform: `scale(${f >= APPROVED ? tw(f, APPROVED, APPROVED + 8, 1.15, 1, E.backOut) : 1})` }}>{f >= APPROVED ? "Approved ✓" : "Approve"}</div>
                    <div style={{ flex: 1, padding: "16px 0", borderRadius: 18, textAlign: "center", fontSize: 32, fontWeight: 800, color: C.ink, background: "#EEF0F3", opacity: f >= APPROVED ? 0.4 : 1 }}>Call me</div>
                  </div>
                </div>
              ) : null}
              {f >= YES - 4 ? <div style={{ alignSelf: "flex-end", padding: "16px 24px", borderRadius: "26px 26px 8px 26px", background: "#D9FDD3", fontSize: 38, opacity: tw(f, YES - 4, YES + 2, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, YES - 4, YES + 4, 0, 1, E.expoOut)) * 30}px)` }}>Yes, go ahead 👍</div> : null}
            </div>
          </div>
        ) : null}

        {/* 16:00 — your car is ready; then the reminder */}
        {chat2 > 0.01 ? (
          <div style={{ position: "absolute", left: 50, right: 50, top: f < SIX - 4 ? 1040 : mix(1040, 380, tw(f, SIX - 4, SIX + 8, 0, 1, E.cubicInOut)), opacity: clamp(chat2 * 2), display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ alignSelf: "flex-start", maxWidth: 900, padding: "20px 26px", borderRadius: "28px 28px 28px 8px", background: "#FFF", boxShadow: "0 16px 40px rgba(58,70,86,.15)", fontSize: 40, lineHeight: 1.25, transform: `scale(${mix(0.85, 1, clamp(chat2))})`, transformOrigin: "0 0" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.coral }}>✨ Hillside Garage · 16:00</div>
              Your car is ready! 🚗 Pick it up any time until 18:00.
            </div>
            {f >= REMINDER - 6 ? (
              <div style={{ alignSelf: "flex-start", maxWidth: 900, padding: "20px 26px", borderRadius: "28px 28px 28px 8px", background: "#FFF", boxShadow: "0 16px 40px rgba(58,70,86,.15)", fontSize: 40, lineHeight: 1.25, opacity: tw(f, REMINDER - 6, REMINDER, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, REMINDER - 6, REMINDER + 4, 0, 1, E.expoOut)) * 40}px)` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.coral }}>✨ Hillside Garage · 6 months later</div>
                Hi Dana 👋 Time for your next service. Tuesday at 9 works?
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  {["Tuesday 9:00", "Another day"].map((t, i) => <div key={t} style={{ padding: "10px 18px", borderRadius: 14, background: i ? "#EEF0F3" : C.ink, color: i ? C.ink : "#FFF", fontSize: 26, fontWeight: 800 }}>{t}</div>)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {f >= READY ? <Sparkles x={100} y={500} w={880} h={500} at={READY} color="#FFD27A" size={44} seed={3} /> : null}
        {f >= REMINDER - 8 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
            <SystemCard at={REMINDER - 4} doneAt={NEXT} x={70} y={900} w={940} system={{ label: "Service reminders", icon: "send", color: "#2B86CC" }} doing="Checking who's due this week…" done="Reminder sent on schedule" facts={["Dana · 6 months", "Every customer, automatically ✓"]} />
          </div>
        ) : null}

        {/* the repair order — the spine */}
        <div style={{ position: "absolute", left: 50, right: 50, top: 1440, padding: "22px 30px", borderRadius: 30, background: "#FFFDF6", boxShadow: "0 24px 60px rgba(58,70,86,.18)", border: "2px solid #E3DFD2", transform: `translateY(${(1 - tw(f, 6, 24, 0, 1, E.quintOut)) * 500}px)` }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: C.gray }}>REPAIR ORDER #2417 · DANA · ROUTINE SERVICE</div>
          </div>
          {[
            { t: "Oil & filter", st: f >= COMES + 20 ? "done" : "pending" },
            { t: "30-point check", st: f >= UNDER ? "done" : "pending" },
            { t: "Front brake pads", st: brakeState },
            { t: "Next service reminder", st: f >= REMINDER ? "done" : f >= READY ? "set" : "pending" },
          ].map((r) => (
            <div key={r.t} style={{ display: "flex", alignItems: "center", marginTop: 12, fontSize: 32, color: C.ink, fontWeight: 650 }}>
              <span>{r.t}</span>
              <span style={{ marginLeft: "auto", padding: "4px 14px", borderRadius: 10, fontSize: 24, fontWeight: 850, background: r.st === "await" ? "#FFF1D6" : r.st === "pending" ? "#EEF0F3" : r.st === "set" ? "#E7EEFB" : C.greenTint, color: r.st === "await" ? "#B36B00" : r.st === "pending" ? C.gray : r.st === "set" ? "#2B5DB5" : C.green }}>
                {r.st === "await" ? "awaiting approval" : r.st === "approved" ? "approved ✓" : r.st === "done" ? "done ✓" : r.st === "set" ? "in 6 months" : "—"}
              </span>
            </div>
          ))}
        </div>
        {f >= READY - 2 && f < SIX - 2 ? <Stamp at={READY - 2} text="READY FOR PICKUP" x={700} y={1560} rot={-8} size={64} color={C.green} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/garage-repair/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "hum", -13, "workshop"),
  cue(4, "whoosh", -9, "car rolls in"),
  cue(COMES - 6, "riser", -9, "the lift rises"),
  cue(COMES + 18, "impact", -12, "lift stops"),
  cue(8, "paper", -10, "repair order"),
  cue(COMES + 20, "tick", -9, "oil done"),
  cue(UNDER, "tick", -9, "check done"),
  cue(UNDER - 6, "pop", -9, "mechanic"),
  cue(WORN - 4, "miss", -6, "worn brake pads"),
  cue(DROP - 2, "swell", -7, "the agent"),
  cue(SENDS - 4, "receive", -5, "message to Dana"),
  cue(PHOTO - 4, "pop", -8, "the photo"),
  cue(QUOTE - 4, "paper", -7, "the quote"),
  cue(YES - 4, "send", -5, "yes, go ahead"),
  cue(APPROVED, "check", -4, "approved"),
  cue(FOUR - 4, "clock", -7, "16:00"),
  cue(FOUR, "sink", -9, "the lift lowers"),
  cue(READY - 6, "receive", -4, "your car is ready"),
  cue(READY - 2, "seal", -5, "READY FOR PICKUP"),
  cue(READY, "shimmer", -7, "the car shines"),
  cue(SIX - 2, "flip", -7, "6 months later"),
  cue(REMINDER - 6, "notif", -5, "reminder"),
  cue(NEXT, "chime", -7, "next service"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const GARAGEREPAIR: FilmDef = { id: "GarageRepair", slug: "garage-repair", title: "Auto repair · Use case · The repair order", component: GarageRepair, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/garage-repair/mix.wav" };
