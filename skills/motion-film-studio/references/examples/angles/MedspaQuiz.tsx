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
import { Face, FaceSpec } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/medspa-quiz/vo/lines.json";
import words from "../../../../public/films/medspa-quiz/vo/words.json";

loadFonts();

/**
 * ANGLE · Med spa: the beauty quiz. "What would you recommend for me?" becomes
 * a consultant-grade quiz in the chat: three swipe cards (goal · downtime ·
 * budget), each answered with a tap and flicked away, until the stack resolves
 * into a glowing "Your match" card built from the spa's own menu, with a
 * before/after slider from its gallery. Medical questions go to the nurse; the
 * consultation lands in the calendar.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const ASK = 2;
const HARDEST = w("l02", 2);
const DROP = w("l03", 0) - 2;
const CONSULT = w("l03", 8);
const THREE = w("l04", 2);
const QA = [
  { at: T.VO.l05, pick: w("l05", 2), q: "What's your goal?", opts: ["✨ Glow", "Smooth lines", "Clear skin"], sel: 0 },
  { at: T.VO.l06, pick: w("l06", 5), q: "How much downtime?", opts: ["None", "1–2 days", "A week"], sel: 0 },
  { at: T.VO.l07, pick: w("l07", 3), q: "Your budget?", opts: ["$", "$$", "$$$"], sel: 1 },
];
const MATCHES = w("l08", 2);
const MENU = w("l08", 7);
const FACIAL = w("l08", 9);
const BEFORE = w("l08", 14);
const MEDICAL = w("l09", 1);
const NURSE = w("l09", 6);
const BOOKED = w("l10", 4);
const HIT = T.VO.l11 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l11", 2) + 4;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 50);

const CLIENT: FaceSpec = { name: "Client", skin: "#D9A07A", hair: "#2A1B14", style: "waves", shirt: "#E27BA0", bg: "#FBE0EA" };
const NURSE_P: FaceSpec = { name: "Nurse", skin: "#8D5A3B", hair: "#1E1512", style: "bun", shirt: "#1C9A83", bg: "#DCF2EC" };
const GRAD = "linear-gradient(160deg, #FBE3EC 0%, #EFE3FA 50%, #FFE9DA 100%)";

/* one swipe card of the quiz */
const QuizCard: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const q = QA[i];
  const next = i < 2 ? QA[i + 1].at - 2 : MATCHES - 6;
  const enter = springAt(f, THREE + i * 3, 30, 13, 160);
  const picked = f >= q.pick;
  const fling = tw(f, next - 4, next + 10, 0, 1, E.expoIn);
  const nextOf = (k: number) => (k < 2 ? QA[k + 1].at - 2 : MATCHES - 6);
  const flung = [0, 1, 2].filter((k) => f >= nextOf(k) + 10).length;
  const depth = Math.max(0, i - flung);
  if (fling >= 1) return null;
  return (
    <div style={{ position: "absolute", left: 110, top: 640 + depth * 36, width: 860, height: 760, transform: `translate(${fling * 1200}px, ${fling * -120}px) rotate(${fling * 18 + depth * (i % 2 ? 2 : -2)}deg) scale(${mix(0.8, 1, clamp(enter)) * (1 - depth * 0.05)})`, opacity: clamp(enter * 2), zIndex: 20 - i, borderRadius: 48, background: C.white, boxShadow: "0 40px 90px rgba(150,90,120,.22)", padding: "56px 54px", fontFamily: FONT }}>
      <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: "#B06A8A" }}>QUESTION {i + 1} OF 3</div>
      <div style={{ marginTop: 18, fontSize: 76, fontWeight: 800, letterSpacing: "-0.04em", color: C.ink, lineHeight: 1 }}>{q.q}</div>
      <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 20 }}>
        {q.opts.map((o, k) => {
          const on = picked && k === q.sel;
          const pop = on ? 1 + 0.06 * Math.sin(clamp((f - q.pick) / 8) * Math.PI) : 1;
          return (
            <div key={o} style={{ padding: "26px 32px", borderRadius: 999, fontSize: 46, fontWeight: 700, background: on ? "linear-gradient(90deg,#E27BA0,#B388EB)" : "#F6F1F4", color: on ? "#FFF" : C.ink, transform: `scale(${pop})`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {o}
              {on ? <Icon name="check" size={40} color="#FFF" stroke={3} /> : null}
            </div>
          );
        })}
      </div>
      {picked && !(fling > 0) ? <div style={{ position: "absolute", right: 60, bottom: 50, fontFamily: MONO, fontSize: 22, color: C.gray2 }}>swipe →</div> : null}
    </div>
  );
};

/* the answer: a glowing match from the spa's menu, with before/after */
const Match: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, MATCHES - 2, 30, 12, 150);
  const ba = tw(f, BEFORE - 2, BEFORE + 22, 0.1, 0.7, E.cubicInOut);
  const menu = springAt(f, MENU - 2, 30, 12, 180);
  if (s <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 90, top: 520, width: 900, opacity: clamp(s * 2), transform: `scale(${mix(0.8, 1, clamp(s))})`, zIndex: 25, fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: -30, borderRadius: 80, background: "radial-gradient(circle, rgba(226,123,160,.35), rgba(226,123,160,0) 70%)", filter: "blur(10px)" }} />
      <div style={{ position: "relative", borderRadius: 48, background: C.white, boxShadow: "0 40px 90px rgba(150,90,120,.25)", padding: "44px 48px", overflow: "hidden" }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.16em", color: "#B06A8A" }}>✨ YOUR MATCH</div>
        <div style={{ marginTop: 10, fontSize: 70, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.02, color: C.ink, opacity: tw(f, FACIAL - 4, FACIAL + 4, 0.2, 1, E.linear) }}>Hydrating facial<br />+ LED</div>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          {["75 min", "no downtime", "within budget"].map((t) => <div key={t} style={{ padding: "10px 18px", borderRadius: 999, background: "#F6F1F4", fontSize: 28, fontWeight: 700 }}>{t}</div>)}
        </div>
        <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: "#F0E9FB", color: "#6B4FA8", fontSize: 24, fontWeight: 700, transform: `scale(${mix(0.6, 1, clamp(menu))})`, opacity: clamp(menu * 2), transformOrigin: "0 50%" }}>
          <Icon name="book" size={26} color="#6B4FA8" stroke={2.2} /> from your treatment menu
        </div>
        {/* before / after, from the gallery */}
        <div style={{ position: "relative", marginTop: 26, height: 300, borderRadius: 30, overflow: "hidden", opacity: tw(f, BEFORE - 6, BEFORE, 0, 1, E.linear) }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 40% 45%, #E8B49A 0%, #D39A80 60%, #C98E75 100%)" }}>
            {Array.from({ length: 28 }, (_, k) => <div key={k} style={{ position: "absolute", left: `${(k * 37) % 100}%`, top: `${(k * 53) % 100}%`, width: 10 + (k % 3) * 4, height: 10 + (k % 3) * 4, borderRadius: "50%", background: "rgba(160,80,60,.35)" }} />)}
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - ba) * 100}% 0 0)`, background: "radial-gradient(circle at 40% 40%, #FFE3D2 0%, #F6C7AE 55%, #EDB79D 100%)" }}>
            <div style={{ position: "absolute", left: "58%", top: "18%", width: 220, height: 90, borderRadius: "50%", background: "rgba(255,255,255,.45)", filter: "blur(18px)" }} />
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${ba * 100}%`, width: 6, marginLeft: -3, background: "#FFF", boxShadow: "0 0 20px rgba(0,0,0,.2)" }} />
          <div style={{ position: "absolute", left: 18, top: 16, padding: "6px 14px", borderRadius: 10, background: "rgba(0,0,0,.45)", color: "#FFF", fontSize: 22, fontWeight: 700 }}>After</div>
          <div style={{ position: "absolute", right: 18, top: 16, padding: "6px 14px", borderRadius: 10, background: "rgba(0,0,0,.45)", color: "#FFF", fontSize: 22, fontWeight: 700 }}>Before</div>
          <div style={{ position: "absolute", right: 18, bottom: 14, fontFamily: MONO, fontSize: 18, color: "#FFF" }}>FROM YOUR GALLERY</div>
        </div>
      </div>
    </div>
  );
};

export const MedspaQuiz: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const pastel = tw(f, DROP - 2, DROP + 10, 0, 1, E.cubicInOut);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const ask = springAt(f, ASK - 14, 30, 12, 170);
  const askUp = tw(f, DROP - 4, DROP + 8, 0, 1, E.expoInOut);
  const agent = springAt(f, DROP + 2, 30, 12, 170) * (1 - tw(f, THREE - 12, THREE, 0, 1, E.linear));
  const med = springAt(f, MEDICAL - 4, 30, 12, 180) * (1 - tw(f, BOOKED - 12, BOOKED - 4, 0, 1, E.linear));
  const matchOut = tw(f, MEDICAL - 8, MEDICAL + 2, 0, 1, E.expoInOut);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, background: GRAD, opacity: pastel }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* the hardest message */}
        <div style={{ position: "absolute", left: 70, right: 70, top: 780, transform: `translateY(${(1 - clamp(ask)) * 60 - askUp * 500}px)`, opacity: clamp(ask * 2) * (1 - askUp) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <ChannelBadge ch="whatsapp" size={64} />
            <Face p={CLIENT} size={64} />
            <div style={{ fontSize: 30, color: C.gray, fontWeight: 600 }}>new message</div>
          </div>
          <div style={{ padding: "32px 40px", borderRadius: "8px 44px 44px 44px", background: C.white, boxShadow: "0 30px 70px rgba(23,23,23,.14)", fontSize: 76, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.05, color: C.ink }}>What would you recommend for me? 🥺</div>
        </div>
        <Kinetic from={T.VO.l02} to={DROP - 6} y={420} size={78} width={960} align="center" color={C.ink} hi={C.coral} words={T.said("l02").map((x, i) => ({ ...x, hi: i === 2 || i === 3 }))} />
        {/* your best consultant */}
        {agent > 0.01 ? (
          <div style={{ position: "absolute", left: 540, top: 820, transform: `translate(-50%, 0) scale(${mix(0.6, 1, clamp(agent))})`, opacity: clamp(agent * 2), textAlign: "center" }}>
            <div style={{ width: 220, height: 220, borderRadius: 110, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 0 0 16px rgba(217,87,89,.15), 0 30px 60px rgba(217,87,89,.35)" }}>
              <Icon name="sparkles" size={110} color="#FFF" stroke={2} />
            </div>
            <div style={{ marginTop: 26, fontSize: 52, fontWeight: 800, color: C.ink }}>Your AI agent</div>
            <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: "#B06A8A", opacity: tw(f, CONSULT - 4, CONSULT + 4, 0, 1, E.linear) }}>CONSULTANT MODE</div>
          </div>
        ) : null}
        {f >= THREE - 4 && f < MATCHES + 4 ? <Kinetic from={THREE - 2} to={MATCHES - 8} y={230} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={[{ t: "3", at: THREE, hi: true }, { t: "easy", at: w("l04", 3) }, { t: "questions", at: w("l04", 4) }]} /> : null}
        {[2, 1, 0].map((i) => (f >= THREE - 2 ? <QuizCard key={i} f={f} i={i} /> : null))}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - matchOut, transform: `translateY(${-matchOut * 300}px)` }}>
          <Match f={f} />
        </div>
        {f >= MATCHES - 4 && f < MEDICAL - 6 ? <Kinetic from={MATCHES - 2} to={MEDICAL - 10} y={230} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={[{ t: "Matched", at: MATCHES }, { t: "to", at: w("l08", 5) }, { t: "your", at: w("l08", 6) }, { t: "menu", at: MENU, hi: true }]} /> : null}
        {/* medical → your nurse */}
        {med > 0.01 ? (
          <div style={{ position: "absolute", left: 90, right: 90, top: 520, opacity: clamp(med * 2), transform: `scale(${mix(0.85, 1, clamp(med))})`, borderRadius: 40, background: C.white, boxShadow: "0 30px 70px rgba(23,23,23,.14)", padding: "34px 40px", display: "flex", alignItems: "center", gap: 26 }}>
            <Face p={NURSE_P} size={130} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: C.gray }}>MEDICAL QUESTION?</div>
              <div style={{ fontSize: 50, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>Straight to your nurse <span style={{ fontSize: 44 }}>🩺</span></div>
              <div style={{ fontSize: 28, color: C.gray, opacity: tw(f, NURSE - 2, NURSE + 6, 0, 1, E.linear) }}>with the chat summary, so nobody asks twice</div>
            </div>
          </div>
        ) : null}
        <SystemCard at={BOOKED - 8} doneAt={BOOKED + 4} x={70} y={900} w={940} system={{ label: "Your calendar", icon: "calendar", color: "#1A73E8" }} doing="Finding a consultation slot…" done="Consultation booked" facts={["Thursday · 5:30 PM", "Hydrating facial + LED"]} />
        {f >= BOOKED + 10 ? <Sparkles x={120} y={900} w={840} h={200} at={BOOKED + 10} color="#E27BA0" size={36} seed={6} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.035} /> : null}
      {audio ? <Audio src={staticFile("films/medspa-quiz/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(1, "receive", -5, "the hardest message"),
  cue(DROP, "shimmer", -8, "consultant mode"),
  cue(DROP + 2, "pop", -6, "your agent"),
  ...[0, 1, 2].map((i) => cue(THREE + i * 3, "pop", -10, `card ${i + 1}`)),
  ...QA.map((q, i) => cue(q.pick, "tap", -4, `pick ${i + 1}`)),
  ...QA.map((q, i) => cue(i < 2 ? QA[i + 1].at - 4 : MATCHES - 10, "whoosh", -9, `swipe ${i + 1}`)),
  cue(MATCHES - 2, "learn", -6, "your match"),
  cue(MENU - 2, "pop", -9, "from your menu"),
  cue(BEFORE - 2, "draw", -12, "before/after slider"),
  cue(MEDICAL - 4, "whoosh", -10, "medical → nurse"),
  cue(NURSE, "ping", -8, "nurse"),
  cue(BOOKED - 8, "blip", -8, "connecting to the calendar"),
  cue(BOOKED + 4, "check", -5, "booked"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const MEDSPAQUIZ: FilmDef = { id: "MedspaQuiz", slug: "medspa-quiz", title: "Angle · Med spa · The beauty quiz", component: MedspaQuiz, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/medspa-quiz/mix.wav" };
