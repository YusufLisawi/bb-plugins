import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/clinic-monday/vo/lines.json";
import words from "../../../../public/films/clinic-monday/vo/words.json";

loadFonts();

/**
 * ANGLE · Clinic: Monday, 8 AM. The front-desk phone rings with every line
 * blinking. Signature: the phone itself is the progress bar — once patients
 * message instead, it shrinks to the corner and its six line lights go out one
 * by one as the agent answers (insurance from the clinic's own policies), books
 * today's free slots and passes a prescription renewal to the doctor with a
 * summary. At 9:00 the phone is silent.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const RINGS = [w("l02", 3), w("l02", 5), w("l02", 7)];
const QS = [w("l03", 7), w("l03", 10), w("l04", 5)];
const DROP = w("l05", 0) - 2;
const MESSAGE = w("l05", 3);
const POLICIES = w("l06", 7);
const FINDS = w("l07", 0);
const BOOKS = w("l07", 8);
const RX = w("l08", 1);
const NEVER = w("l09", 1);
const PASSES = w("l10", 1);
const SUMMARY = w("l10", 10);
const NINE = w("l11", 1);
const QUIET = w("l11", 5);
const PATIENTS = w("l11", 13);
const HIT = T.VO.l12 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l12", 2) + 4;
const URL = w("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 50);
// the six line lights go out as things get handled
const OFF = [MESSAGE + 4, POLICIES + 4, BOOKS + 4, BOOKS + 12, SUMMARY + 4, NINE];

const PATIENT: FaceSpec = { name: "Omar", skin: "#B57A55", hair: "#1B1411", style: "short", beard: true, shirt: "#2B86CC", bg: "#DCEDFA" };

const DeskPhone: React.FC<{ f: number; size: number }> = ({ f, size }) => {
  const k = size / 600;
  const ringing = OFF.filter((o) => f < o).length;
  const shake = f < DROP ? Math.sin(f * 0.9) * 5 * (0.5 + 0.5 * Math.max(...RINGS.map((r) => 1 - clamp(Math.abs(f - r) / 8)))) : ringing > 0 ? Math.sin(f * 0.9) * 1.5 : 0;
  return (
    <div style={{ position: "relative", width: 600 * k, height: 460 * k, transform: `rotate(${shake}deg)` }}>
      <svg width={600 * k} height={460 * k} viewBox="0 0 600 460" style={{ position: "absolute", inset: 0 }}>
        <path d="M 90 170 L 510 170 L 570 430 C 572 446, 560 456, 544 456 L 56 456 C 40 456, 28 446, 30 430 Z" fill="#2B2B2E" />
        <path d="M 60 120 C 60 60, 170 40, 300 40 C 430 40, 540 60, 540 120 L 540 150 C 540 168, 520 176, 500 170 L 440 150 C 420 144, 410 130, 410 116 L 190 116 C 190 130, 180 144, 160 150 L 100 170 C 80 176, 60 168, 60 150 Z" fill="#1A1A1C" transform={f < DROP ? `translate(0 ${-Math.abs(Math.sin(f * 0.6)) * 8})` : ""} />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={150 + (i % 3) * 72} y={220 + Math.floor(i / 3) * 52} width={56} height={38} rx={10} fill="#3C3C40" />)}
      </svg>
      {Array.from({ length: 6 }, (_, i) => {
        const lit = f < OFF[i];
        const blink = lit ? 0.35 + 0.65 * clamp(0.5 + Math.sin(f * 0.45 + i * 1.3) * 1.6) : 0;
        return <div key={i} style={{ position: "absolute", left: (400 + (i % 2) * 64) * k, top: (220 + Math.floor(i / 2) * 58) * k, width: 44 * k, height: 32 * k, borderRadius: 8 * k, background: lit ? `rgba(255,70,60,${blink})` : "#3C3C40", boxShadow: lit && blink > 0.5 ? `0 0 ${20 * k}px rgba(255,70,60,.9)` : "none" }} />;
      })}
    </div>
  );
};

export const ClinicMonday: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const shrink = tw(f, DROP - 2, DROP + 12, 0, 1, E.expoInOut) * (1 - tw(f, NINE - 10, NINE + 6, 0, 1, E.expoInOut));
  const px = mix(540, 200, shrink), py = mix(960, 260, shrink), ps = mix(1, 0.42, shrink);
  const calm = tw(f, DROP, DROP + 20, 0, 1, E.linear);
  const act2 = f >= DROP - 2 && f < NINE - 6;
  const policy = springAt(f, w("l06", 3), 30, 12, 170) * (1 - tw(f, FINDS - 6, FINDS, 0, 1, E.linear));
  const rx = springAt(f, RX - 2, 30, 12, 170) * (1 - tw(f, NINE - 12, NINE - 4, 0, 1, E.linear));
  const never = springAt(f, NEVER - 2, 30, 11, 190);
  const hand = springAt(f, PASSES - 2, 30, 12, 170);
  const waiting = OFF.filter((o) => f < o).length;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, #FFE3DE 0%, rgba(255,227,222,0) 60%)", opacity: 1 - calm }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* the clock */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", opacity: 1 - shrink }}>
          <div style={{ fontFamily: MONO, fontSize: 32, letterSpacing: "0.2em", color: C.gray }}>{f < NINE - 10 ? "MONDAY" : "MONDAY"}</div>
          <div style={{ fontSize: 170, fontWeight: 800, letterSpacing: "-0.05em", color: C.ink, lineHeight: 1 }}>{f < NINE - 10 ? "8:00" : "9:00"}<span style={{ fontSize: 80 }}> AM</span></div>
        </div>
        {/* the phone: center, then the corner, then center again (silent) */}
        <div style={{ position: "absolute", left: px, top: py, transform: `translate(-50%, -50%) scale(${ps})`, zIndex: 10 }}>
          <DeskPhone f={f} size={640} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 510, textAlign: "center", fontSize: 44, fontWeight: 800, color: waiting ? C.coralDeep : C.green, opacity: 1 - shrink }}>
            {waiting ? `${waiting} line${waiting === 1 ? "" : "s"} waiting` : "✓ 0 waiting"}
          </div>
        </div>
        {shrink > 0.5 ? (
          <div style={{ position: "absolute", left: 360, top: 222, padding: "14px 26px", borderRadius: 999, background: waiting ? C.coralTint : C.greenTint, color: waiting ? C.coralDeep : C.green, fontSize: 38, fontWeight: 800, whiteSpace: "nowrap", opacity: tw(f, DROP + 6, DROP + 12, 0, 1, E.linear) }}>
            {waiting ? `${waiting} line${waiting === 1 ? "" : "s"} waiting` : "✓ 0 waiting"}
          </div>
        ) : null}
        {/* the three things everyone calls about */}
        {f < DROP + 8
          ? ["An appointment today?", "Opening hours?", "Do you take my insurance?"].map((t, i) => {
              const s = springAt(f, QS[i] - 4, 30, 12, 180);
              if (s <= 0.001) return null;
              return (
                <div key={t} style={{ position: "absolute", left: [80, 520, 140][i], top: [1290, 1420, 1560][i], transform: `scale(${mix(0.5, 1, clamp(s))}) rotate(${[-3, 2, -1][i]}deg)`, opacity: clamp(s * 2) * (1 - tw(f, DROP, DROP + 8, 0, 1, E.linear)), padding: "22px 30px", borderRadius: 999, background: C.white, boxShadow: "0 16px 40px rgba(23,23,23,.14)", fontSize: 42, fontWeight: 750, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 14 }}>
                  <Icon name="phone" size={36} color={C.coral} stroke={2.4} /> {t}
                </div>
              );
            })
          : null}
        {act2 ? <Kinetic from={DROP} to={w("l06", 0) - 4} y={430} size={96} width={960} align="center" color={C.ink} hi={C.coral} words={T.said("l05").map((x, i) => ({ ...x, hi: i === 3 }))} /> : null}
        {act2 && f >= w("l06", 0) - 6 ? (
          <Kinetic key={f < FINDS - 6 ? "p" : f < RX - 6 ? "c" : "r"} from={f < FINDS - 6 ? w("l06", 0) - 2 : f < RX - 6 ? FINDS - 4 : RX - 4} to={f < FINDS - 6 ? FINDS - 10 : f < RX - 6 ? RX - 10 : NINE - 12} y={430} size={84} width={960} align="center" color={C.ink} hi={C.coral}
            words={f < FINDS - 6 ? [{ t: "From", at: w("l06", 4) }, { t: "your", at: w("l06", 5) }, { t: "own", at: w("l06", 6), hi: true }, { t: "policies", at: POLICIES, hi: true }] : f < RX - 6 ? [{ t: "Today's", at: w("l07", 1) }, { t: "slots,", at: w("l07", 3) }, { t: "booked", at: BOOKS, hi: true }] : [{ t: "Never", at: NEVER, hi: true }, { t: "decides.", at: w("l09", 2) }, { t: "Passes", at: PASSES }, { t: "it", at: w("l10", 2) }, { t: "on.", at: w("l10", 6), hi: true }]} />
        ) : null}
        {/* insurance: answered from the clinic's own policies */}
        {policy > 0.01 ? (
          <div style={{ position: "absolute", left: 60, width: 800, top: 700, opacity: clamp(policy * 2), transform: `translateY(${(1 - clamp(policy)) * 60}px) scale(1.2)`, transformOrigin: "0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <ChannelBadge ch="whatsapp" size={56} />
              <Face p={PATIENT} size={56} />
              <div style={{ padding: "18px 26px", borderRadius: "8px 32px 32px 32px", background: C.white, fontSize: 40, fontWeight: 700, boxShadow: "0 12px 30px rgba(23,23,23,.1)" }}>Do you take my insurance?</div>
            </div>
            <div style={{ marginLeft: 70, padding: "22px 28px", borderRadius: "32px 8px 32px 32px", background: C.coralTint, fontSize: 40, lineHeight: 1.3 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.coral }}>✨ AI assistant</div>
              Yes, we accept most major plans. Just bring your card on the day 🙂
              <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: C.white, fontSize: 24, fontWeight: 700, color: "#2B5E9C", opacity: tw(f, POLICIES - 4, POLICIES + 4, 0, 1, E.linear) }}>
                <Icon name="file" size={24} color="#2B5E9C" stroke={2.2} /> from your insurance policy
              </div>
            </div>
          </div>
        ) : null}
        {/* today's free slots, straight from the calendar */}
        <SystemCard at={FINDS - 4} doneAt={BOOKS + 2} x={70} y={720} w={940} scale={1.05} system={{ label: "Your calendar", icon: "calendar", color: "#1A73E8" }} doing="Finding today's free slots…" done="Booked for today" facts={["11:15 taken", "16:30 · Omar ✓"]} out={RX - 6} />
        {/* a prescription renewal: never decided by the agent */}
        {rx > 0.01 ? (
          <div style={{ position: "absolute", left: 60, width: 800, top: 660, opacity: clamp(rx * 2), transform: "scale(1.2)", transformOrigin: "0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Face p={PEOPLE.eleanor} size={70} />
              <div style={{ padding: "18px 26px", borderRadius: "8px 32px 32px 32px", background: C.white, fontSize: 40, fontWeight: 700, boxShadow: "0 12px 30px rgba(23,23,23,.1)" }}>Can you renew my prescription?</div>
            </div>
            {never > 0.01 ? (
              <div style={{ marginTop: 30, display: "inline-flex", alignItems: "center", gap: 16, padding: "20px 32px", borderRadius: 999, background: C.ink, color: C.cream, fontSize: 44, fontWeight: 800, transform: `scale(${mix(0.5, 1, clamp(never))})`, opacity: clamp(never * 2) }}>
                <Icon name="lock" size={42} color={C.cream} stroke={2.4} /> The agent never decides that
              </div>
            ) : null}
            {hand > 0.01 ? (
              <div style={{ marginTop: 30, borderRadius: 36, background: C.white, boxShadow: "0 30px 70px rgba(23,23,23,.14)", padding: "28px 32px", opacity: clamp(hand * 2), transform: `translateY(${(1 - clamp(hand)) * 60}px)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 90, height: 90, borderRadius: 26, background: "#DCF2EC", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="stethoscope" size={52} color={C.green} stroke={2.2} /></div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: C.gray }}>SENT TO THE DOCTOR</div>
                    <div style={{ fontSize: 40, fontWeight: 800 }}>Prescription renewal</div>
                  </div>
                </div>
                <div style={{ marginTop: 18, padding: "16px 20px", borderRadius: 18, background: "#F6F4EF", fontSize: 32, lineHeight: 1.35, opacity: tw(f, SUMMARY - 6, SUMMARY + 4, 0, 1, E.linear) }}>
                  <b>Summary:</b> same medication as last time, no new symptoms reported. Needs your approval.
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {/* 9:00 — quiet, and patients again */}
        {f >= PATIENTS - 8 ? (
          <div style={{ position: "absolute", left: 540, top: 1450, transform: `translate(-50%, 0) scale(${tw(f, PATIENTS - 8, PATIENTS + 4, 0.5, 1, E.backOut)})`, display: "flex", alignItems: "center", gap: 20, padding: "18px 30px", borderRadius: 999, background: C.white, boxShadow: "0 16px 40px rgba(23,23,23,.1)", fontSize: 40, fontWeight: 750, whiteSpace: "nowrap" }}>
            <Face p={PEOPLE.grace} size={70} /> Front desk, with patients again 🙂
          </div>
        ) : null}
        {f >= QUIET ? <Sparkles x={300} y={700} w={480} h={420} at={QUIET} color={C.green} size={34} seed={5} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/clinic-monday/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "ring", -4, "the phone"),
  ...RINGS.map((r, i) => cue(r - 2, "ring", -5 - i, `rings ${i + 1}`)),
  ...QS.map((q, i) => cue(q - 4, "pop", -9, `question ${i + 1}`)),
  cue(DROP, "impact", -9, "now they just message"),
  cue(DROP + 2, "zoom", -10, "the phone to the corner"),
  cue(w("l06", 3), "receive", -5, "insurance answered"),
  cue(POLICIES - 4, "pop", -9, "from your policy"),
  cue(FINDS - 4, "blip", -8, "connecting to the calendar"),
  cue(BOOKS + 2, "check", -5, "booked"),
  cue(RX - 2, "receive", -6, "prescription?"),
  cue(NEVER - 2, "seal", -6, "never decides"),
  cue(PASSES - 2, "whoosh", -10, "to the doctor"),
  cue(SUMMARY, "ping", -7, "summary sent"),
  ...OFF.map((o, i) => cue(o, "tick", -13, `line ${i + 1} off`)),
  cue(NINE - 8, "zoom", -10, "the phone, silent"),
  cue(QUIET, "shimmer", -9, "quiet"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const CLINICMONDAY: FilmDef = { id: "ClinicMonday", slug: "clinic-monday", title: "Angle · Clinic · Monday 8 AM", component: ClinicMonday, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/clinic-monday/mix.wav" };
