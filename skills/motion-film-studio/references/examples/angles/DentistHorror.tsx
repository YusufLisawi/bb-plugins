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
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/dentist-horror/vo/lines.json";
import words from "../../../../public/films/dentist-horror/vo/words.json";

loadFonts();

/**
 * ANGLE · Dentist: a horror-trailer parody. Black frame, grain, a flickering
 * serif title card — SATURDAY NIGHT. 11:52 PM. — a tooth that cracks on
 * "Crack", a CLOSED sign in a dying light. "Just kidding": the film snaps to a
 * bright mint clinic chat. The agent asks, reads the photo, sends the clinic's
 * own emergency advice, books Monday 8:00 and alerts the dentist on call. The
 * scariest part of the night: the popcorn.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const TIME = w("l01", 2);
const CRACK = w("l02", 0);
const BROKEN = w("l03", 1);
const CLOSED = w("l03", 7);
const KIDDING = w("l04", 0) - 2;
const OPEN = w("l05", 5);
const ASKS = w("l06", 1);
const PHOTO = w("l06", 7);
const ADVICE = w("l07", 5);
const STEPS = [w("l08", 0), w("l08", 1), w("l08", 3)];
const BOOKS = w("l09", 1);
const MONDAY = w("l09", 6);
const ALERTS = w("l09", 10);
const SCARIEST = w("l10", 1);
const POPCORN = w("l11", 1);
const HIT = T.VO.l12 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l12", 2) + 4;
const URL = w("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 50);
const FLICKS = [22, 47, 71, 124, 158, 196];
const SERIF = 'Georgia, "DejaVu Serif", "Liberation Serif", serif';
const MINT = "#E3F4EE";

const Tooth: React.FC<{ size: number; crack: number; glow?: number }> = ({ size, crack, glow = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M22 18 C 22 8, 40 6, 50 12 C 60 6, 78 8, 78 18 C 80 34, 74 46, 72 60 C 70 80, 64 94, 58 94 C 52 94, 54 70, 50 70 C 46 70, 48 94, 42 94 C 36 94, 30 80, 28 60 C 26 46, 20 34, 22 18 Z" fill="#F6F2EA" stroke="#D8D0C2" strokeWidth={2} />
    <path d="M 44 10 L 52 24 L 46 34 L 55 46 L 49 58" fill="none" stroke="#3A2A20" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - crack} />
  </svg>
);

export const DentistHorror: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const horror = f < KIDDING;
  const snap = tw(f, KIDDING, KIDDING + 6, 0, 1, E.expoOut);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const flicker = horror ? 1 - 0.55 * Math.max(0, ...FLICKS.map((k) => clamp(1 - Math.abs(f - k) / 3))) : 1;
  const crack = tw(f, CRACK - 2, CRACK + 6, 0, 1, E.expoOut);
  const shake = f >= CRACK - 2 && f < CRACK + 12 ? Math.sin((f - CRACK + 2) * 1.1) * 16 * (1 - (f - CRACK + 2) / 14) : 0;
  const chat = springAt(f, ASKS - 6, 30, 13, 160) * (1 - tw(f, BOOKS - 8, BOOKS, 0, 1, E.expoIn));
  const pop = springAt(f, POPCORN - 4, 30, 11, 170);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: horror ? "#050505" : MINT }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {horror ? (
          <div style={{ position: "absolute", inset: 0, opacity: flicker, transform: `translate(${shake}px, ${shake * 0.5}px)` }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, rgba(120,10,10,.35) 0%, rgba(0,0,0,0) 60%)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 260, textAlign: "center", fontFamily: SERIF, color: "#EDE6DA", letterSpacing: "0.18em" }}>
              <div style={{ fontSize: 58, opacity: tw(f, 2, 14, 0, 1, E.linear) }}>SATURDAY NIGHT.</div>
              <div style={{ fontSize: 120, marginTop: 10, color: "#D4302F", opacity: tw(f, TIME - 4, TIME + 4, 0, 1, E.linear) }}>11:52 PM</div>
            </div>
            <div style={{ position: "absolute", left: 540 - 420, top: 960 - 420, width: 840, height: 840, borderRadius: 420, background: "radial-gradient(circle, rgba(255,50,50,.55) 0%, rgba(255,50,50,.18) 35%, rgba(255,50,50,0) 62%)", opacity: crack }} />
            <div style={{ position: "absolute", left: 540, top: 960, transform: `translate(-50%, -50%) scale(${1 + 0.06 * crack})` }}>
              <Tooth size={560} crack={crack} glow={crack} />
            </div>
            {f >= CRACK - 2 ? <div style={{ position: "absolute", left: 0, right: 0, top: 1260, textAlign: "center", fontFamily: SERIF, fontSize: 90, color: "#EDE6DA", letterSpacing: "0.3em", opacity: tw(f, CRACK - 2, CRACK + 2, 0, 1, E.linear) * (1 - tw(f, BROKEN, BROKEN + 6, 0, 1, E.linear)) }}>CRACK.</div> : null}
            {f >= w("l03", 5) - 2 ? (
              <div style={{ position: "absolute", left: 540, top: 1360, transform: `translate(-50%, 0) rotate(${Math.sin(f * 0.15) * 4}deg)`, transformOrigin: "50% -60px", padding: "26px 50px", border: "6px solid #D4302F", borderRadius: 14, color: "#D4302F", fontFamily: SERIF, fontSize: 80, letterSpacing: "0.2em", opacity: tw(f, w("l03", 5) - 2, CLOSED, 0, 1, E.linear) * (1 - 0.7 * Math.max(0, ...[CLOSED + 8, CLOSED + 22].map((k) => clamp(1 - Math.abs(f - k) / 3)))) }}>CLOSED</div>
            ) : null}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 60% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.95) 100%)" }} />
          </div>
        ) : null}
        {/* just kidding — the agent is open */}
        {!horror && f < ASKS + 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", transform: `scale(${mix(1.3, 1, snap)})` }}>
            <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: "-0.04em", color: C.ink }}>Just kidding.</div>
            <div style={{ marginTop: 40, display: "inline-flex", alignItems: "center", gap: 20, padding: "24px 40px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 54, fontWeight: 800, opacity: tw(f, OPEN - 8, OPEN, 0, 1, E.linear) }}>
              <span style={{ width: 26, height: 26, borderRadius: 13, background: "#7CF0A8", boxShadow: "0 0 18px #7CF0A8" }} /> Your AI agent is open
            </div>
          </div>
        ) : null}
        {/* the chat: what happened, the photo, the clinic's own advice */}
        {chat > 0.01 ? (
          <div style={{ position: "absolute", left: 50, right: 50, top: 400, opacity: clamp(chat * 2), transform: `translateY(${(1 - clamp(chat)) * 100}px)`, borderRadius: 44, background: "#EFE7DE", boxShadow: "0 40px 90px rgba(23,23,23,.16)", padding: "26px 26px 34px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <ChannelBadge ch="whatsapp" size={56} />
              <div style={{ fontSize: 32, fontWeight: 800, color: C.ink }}>Bright Smile Dental</div>
              <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 24, color: C.gray }}>23:53</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ alignSelf: "flex-start", padding: "16px 22px", borderRadius: "28px 28px 28px 8px", background: C.white, fontSize: 38 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.coral }}>✨ AI assistant</div>
                Oh no! What happened? Can you send a photo?
              </div>
              {true ? (
                <div style={{ alignSelf: "flex-end", padding: 14, borderRadius: "28px 28px 8px 28px", background: "#D9FDD3", opacity: tw(f, PHOTO - 10, PHOTO - 4, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, PHOTO - 10, PHOTO - 2, 0, 1, E.expoOut)) * 30}px)`, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 220, height: 170, borderRadius: 18, background: "linear-gradient(160deg,#F2B8A8,#D98A7A)", display: "flex", alignItems: "center", justifyContent: "center" }}><Tooth size={140} crack={1} /></div>
                  <div style={{ fontSize: 34, maxWidth: 300 }}>bit into something hard 😩</div>
                </div>
              ) : null}
              {true ? (
                <div style={{ alignSelf: "flex-start", maxWidth: 860, padding: "18px 22px", borderRadius: "28px 28px 28px 8px", background: C.white, opacity: tw(f, ADVICE - 8, ADVICE - 2, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, ADVICE - 8, ADVICE, 0, 1, E.expoOut)) * 30}px)` }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>Thanks for the photo 🙏 For tonight:</div>
                  {["💧 Rinse with warm water", "🧊 Cold compress on the cheek", "🥛 Keep the piece in milk"].map((t, i) => (
                    <div key={t} style={{ fontSize: 38, lineHeight: "58px", fontWeight: 700, height: 58, opacity: tw(f, STEPS[i] - 4, STEPS[i] + 2, 0, 1, E.linear), transform: `translateX(${(1 - tw(f, STEPS[i] - 4, STEPS[i] + 4, 0, 1, E.expoOut)) * 30}px)` }}>{t}</div>
                  ))}
                  <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: MINT, fontSize: 24, fontWeight: 700, color: "#1E7A5A" }}>
                    <Icon name="file" size={24} color="#1E7A5A" stroke={2.2} /> from your clinic's emergency protocol
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {/* booked + the dentist on call alerted */}
        <SystemCard at={BOOKS - 6} doneAt={MONDAY + 4} x={70} y={560} w={940} scale={1.05} system={{ label: "Your calendar", icon: "calendar", color: "#1E9E8A" }} doing="Finding the first emergency slot…" done="Monday · 8:00 · booked" facts={["Emergency slot", "First one of the week ✓"]} out={SCARIEST - 8} />
        {f >= ALERTS - 2 && f < SCARIEST - 6 ? (
          <div style={{ position: "absolute", left: 70, right: 70, top: 1180, display: "flex", alignItems: "center", gap: 20, padding: "22px 28px", borderRadius: 32, background: C.white, boxShadow: "0 20px 50px rgba(23,23,23,.12)", opacity: tw(f, ALERTS - 2, ALERTS + 6, 0, 1, E.linear) }}>
            <Icon name="phone" size={50} color={C.coral} stroke={2.2} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: C.gray }}>DENTIST ON CALL · NOTIFIED</div>
              <div style={{ fontSize: 34, fontWeight: 750 }}>Leo · broken tooth · photo + summary attached</div>
            </div>
          </div>
        ) : null}
        {/* the scariest part: the popcorn */}
        {f >= SCARIEST - 6 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center" }}>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.035em", color: C.ink, opacity: tw(f, SCARIEST - 6, SCARIEST + 2, 0, 1, E.linear) }}>The scariest part<br />of the night?</div>
            {pop > 0.01 ? (
              <div style={{ marginTop: 40, transform: `scale(${mix(0.4, 1, clamp(pop))}) rotate(${Math.sin(clamp((f - POPCORN) / 10) * Math.PI) * 10}deg)` }}>
                <div style={{ fontSize: 300, lineHeight: 1 }}>🍿</div>
                <div style={{ fontSize: 80, fontWeight: 800, color: C.coral, letterSpacing: "-0.03em" }}>The popcorn.</div>
              </div>
            ) : null}
          </div>
        ) : null}
        {f >= POPCORN ? <Sparkles x={240} y={800} w={600} h={500} at={POPCORN} color="#F2B544" size={40} seed={9} /> : null}
        {!horror && f >= ASKS - 6 && f < SCARIEST - 8 ? (
          <Kinetic key={f < BOOKS - 6 ? "a" : "b"} from={f < BOOKS - 6 ? ASKS - 4 : BOOKS - 4} to={f < BOOKS - 6 ? BOOKS - 10 : SCARIEST - 12} y={200} size={80} width={960} align="center" color={C.ink} hi={C.coral}
            words={f < BOOKS - 6 ? [{ t: "Your", at: w("l07", 2) }, { t: "clinic's", at: w("l07", 3) }, { t: "own", at: w("l07", 4), hi: true }, { t: "advice", at: ADVICE, hi: true }] : [{ t: "Booked.", at: BOOKS, hi: true }, { t: "Dentist", at: ALERTS }, { t: "alerted.", at: w("l09", 13), hi: true }]} />
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={horror ? 0.12 : 0.04} /> : null}
      {audio ? <Audio src={staticFile("films/dentist-horror/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "hum", -10, "horror drone"),
  cue(TIME - 4, "impact", -10, "11:52 PM"),
  cue(CRACK - 2, "snap", 0, "CRACK"),
  cue(CRACK - 1, "impact", -4, "crack hit"),
  cue(CLOSED - 4, "flip", -6, "the sign swings"),
  cue(KIDDING - 1, "scratch", -3, "just kidding"),
  cue(KIDDING + 2, "pop", -6, "lights on"),
  cue(OPEN - 8, "check", -7, "the agent is open"),
  cue(ASKS - 6, "receive", -5, "what happened?"),
  cue(PHOTO - 10, "send", -6, "the photo"),
  cue(ADVICE - 8, "receive", -5, "emergency advice"),
  ...STEPS.map((s, i) => cue(s - 4, "tick", -11, `step ${i + 1}`)),
  cue(BOOKS - 6, "blip", -8, "connecting to the calendar"),
  cue(MONDAY + 4, "check", -5, "Monday 8:00"),
  cue(ALERTS - 2, "ping", -6, "dentist alerted"),
  cue(SCARIEST - 6, "whoosh", -10, "the scariest part"),
  cue(POPCORN - 4, "pop", -3, "the popcorn"),
  cue(POPCORN, "spark", -8, "sparkles"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { KIDDING, HIT, CTA, URL, DUR };

export const DENTISTHORROR: FilmDef = { id: "DentistHorror", slug: "dentist-horror", title: "Angle · Dentist · The horror trailer", component: DentistHorror, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/dentist-horror/mix.wav" };
