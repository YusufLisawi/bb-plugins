import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { SystemCard } from "../../kit/systems";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/tour-raincheck/vo/lines.json";
import words from "../../../../public/films/tour-raincheck/vo/words.json";

loadFonts();

/**
 * TOURISM · USE CASE: Rain check. 05:45, a dark harbour in the rain, a split-flap
 * departures board: SUNRISE BOAT 06:00. Signature: the board itself tells the
 * story — every change the agent makes clatters across the flaps (RAIN ⚠ →
 * TOMORROW 06:00 · MOVED; AFTERNOON BOAT 2 SEATS → 1 SEAT · BOOKED). Fourteen
 * guests about to type are answered first (forecast, schedule, a message to all
 * 14), a refund goes to the team, and the sky turns to sunrise while the guide
 * sleeps in.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const SIX = w("l02", 6);
const POURING = w("l02", 9);
const FOURTEEN = w("l03", 0);
const DROP = w("l04", 0) - 2;
const FIRST = w("l04", 5);
const FORECAST = w("l05", 3);
const MOVED = w("l05", 7);
const SCHEDULE = w("l05", 10);
const WROTE = w("l05", 12);
const TOMORROW = w("l05", 16);
const REFUND = w("l06", 2);
const PASSES = w("l06", 5);
const AFTERNOON = w("l07", 2);
const SEATS = w("l07", 4);
const BOOKED = w("l07", 7);
const GUIDE = w("l08", 1);
const NEVER = w("l08", 7);
const HIT = T.VO.l09 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l09", 2) + 4;
const URL = w("l09", T.nwords("l09") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l09") + 50);

const NIGHT = "#0B1726";
const DAWN_TOP = "#F6B48B";
const DAWN_BOT = "#FBE3C6";
const AMBER = "#FFC23D";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:·";

/** one split-flap cell; flips through random letters until it settles at `settle` */
const Flap: React.FC<{ ch: string; settle: number; start: number; size: number; color?: string }> = ({ ch, settle, start, size, color = "#F4F1E8" }) => {
  const f = useCurrentFrame();
  const flipping = f >= start && f < settle;
  const shown = flipping ? CHARS[Math.floor(rnd(Math.floor(f) * 13.1 + settle) * CHARS.length)] : ch;
  const W = size * 0.72, H = size;
  return (
    <div style={{ position: "relative", width: W, height: H, borderRadius: size * 0.08, background: "#1B2533", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.4)", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 500, fontSize: size * 0.7, color, transform: flipping ? `scaleY(${0.82 + 0.18 * Math.abs(Math.cos(f * 1.3))})` : undefined }}>{shown === " " ? "" : shown}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 - 1, height: 2, background: "rgba(0,0,0,.65)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: H / 2, background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0))" }} />
    </div>
  );
};

/** a row of flaps; text changes at the given frames (each change clatters left→right) */
const FlapText: React.FC<{ states: [number, string][]; n: number; size: number; color?: string; gap?: number }> = ({ states, n, size, color, gap = 4 }) => {
  const f = useCurrentFrame();
  let idx = 0;
  for (let i = 0; i < states.length; i++) if (f >= states[i][0]) idx = i;
  const [at, txt] = states[idx];
  const prevAt = at;
  return (
    <div style={{ display: "flex", gap }}>
      {Array.from({ length: n }, (_, k) => {
        const ch = (txt[k] ?? " ").toUpperCase();
        const settle = prevAt + 6 + k * 1.5;
        return <Flap key={k} ch={ch} start={idx === 0 && at <= 0 ? -1 : prevAt} settle={settle} size={size} color={color} />;
      })}
    </div>
  );
};

const Rain: React.FC<{ amount: number }> = ({ amount }) => {
  const f = useCurrentFrame();
  if (amount <= 0.01) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: amount }}>
      {Array.from({ length: 110 }, (_, i) => {
        const x = rnd(i * 3.7) * 1180 - 50;
        const sp = 38 + rnd(i * 9.1) * 30;
        const y = ((rnd(i * 1.3) * 1920 + f * sp) % 2100) - 120;
        return <line key={i} x1={x} y1={y} x2={x - 10} y2={y + 70} stroke="rgba(170,200,235,.45)" strokeWidth={2.4} strokeLinecap="round" />;
      })}
    </svg>
  );
};

const GUESTS: FaceSpec[] = [PEOPLE.maya, PEOPLE.ken, PEOPLE.aisha, PEOPLE.tom, PEOPLE.lucia, PEOPLE.omar, PEOPLE.grace, PEOPLE.eleanor, PEOPLE.dana, PEOPLE.priya, PEOPLE.jonas, PEOPLE.wei, PEOPLE.marcus, PEOPLE.ines];

export const TourRaincheck: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const dawn = tw(f, GUIDE - 10, NEVER + 10, 0, 1, E.cubicInOut);
  const rain = mix(tw(f, 0, POURING, 0.35, 1, E.cubicIn), 0, dawn);
  const warm = tw(f, DROP - 2, DROP + 10, 0, 1, E.quintOut);
  const guestsOut = tw(f, REFUND - 10, REFUND - 2, 0, 1, E.expoIn);
  const cardsOut = tw(f, REFUND - 10, REFUND - 2, 0, 1, E.expoIn);
  const chatOut = tw(f, AFTERNOON - 8, AFTERNOON, 0, 1, E.expoIn);
  const headline = (k: string, from: number, to: number, ws: KWord[], color = "#F4F1E8") => <Kinetic key={k} from={from} to={to} y={1680} size={70} width={980} align="center" color={color} hi={AMBER} words={ws} />;
  const hk = f < FOURTEEN - 2 ? "a" : f < DROP - 2 ? "b" : f < FORECAST - 4 ? "c" : f < GUIDE - 4 ? "-" : "e";
  const inform = (i: number) => WROTE + 2 + i * 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: `linear-gradient(180deg, ${mixColor(NIGHT, DAWN_TOP, dawn)} 0%, ${mixColor("#15263B", DAWN_BOT, dawn)} 100%)` }}>
      {/* sun at dawn */}
      <div style={{ position: "absolute", left: 540 - 220, top: mix(1900, 1450, dawn), width: 440, height: 440, borderRadius: 220, background: "radial-gradient(circle, #FFE7A8 0%, #FFC977 45%, rgba(255,201,119,0) 70%)", opacity: dawn }} />
      <Rain amount={rain * (1 - out)} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* clock */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", justifyContent: "center", gap: 10, transform: `scale(${mix(1.25, 1, tw(f, 0, 30, 0, 1, E.expoOut))})` }}>
          <FlapText n={5} size={150} gap={10} color={AMBER} states={[[-1, "05:45"], [GUIDE - 2, "06:00"]]} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 350, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: "0.3em", color: mixColor("#8DA3BD", "#7A4A2E", dawn) }}>HARBOUR · TOUR DEPARTURES</div>

        {/* the board */}
        <div style={{ position: "absolute", left: 50, right: 50, top: 420, padding: "30px 28px", borderRadius: 30, background: "#0F1A27", boxShadow: `0 40px 90px rgba(0,0,0,.45), 0 0 0 4px ${mixColor("#22324A", AMBER, warm * 0.55)}` }}>
          {[
            { t: [[-1, "06:00"], [TOMORROW - 2, "06:00"]] as [number, string][], name: [[-1, "SUNRISE BOAT"]] as [number, string][], st: [[-1, "ON TIME"], [POURING - 4, "RAIN·WAIT"], [MOVED - 2, "TOMORROW"]] as [number, string][], c: (f >= MOVED ? AMBER : f >= POURING - 4 ? "#FF7A6B" : "#8FE3A6") },
            { t: [[-1, "10:00"]] as [number, string][], name: [[-1, "OLD TOWN WALK"]] as [number, string][], st: [[-1, "ON TIME"]] as [number, string][], c: "#8FE3A6" },
            { t: [[-1, "15:00"]] as [number, string][], name: [[-1, "SUNSET BOAT"]] as [number, string][], st: [[-1, "2 SEATS"], [BOOKED - 2, "BOOKED ✓"]] as [number, string][], c: f >= BOOKED ? "#8FE3A6" : AMBER },
          ].map((r, i) => {
            const glow = i === 0 ? tw(f, MOVED - 2, MOVED + 30, 1, 0, E.linear) * (f >= MOVED - 2 ? 1 : 0) : i === 2 ? tw(f, AFTERNOON - 2, BOOKED + 30, 1, 0, E.linear) * (f >= AFTERNOON - 2 ? 1 : 0) : 0;
            return (
              <div key={i} style={{ padding: "14px 10px", borderRadius: 18, marginTop: i ? 12 : 0, background: `rgba(255,194,61,${0.16 * glow})` }}>
                <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                  <FlapText n={5} size={64} states={r.t} color={AMBER} />
                  <FlapText n={13} size={64} states={r.name} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <FlapText n={10} size={56} states={r.st} color={r.c} />
                </div>
              </div>
            );
          })}
        </div>

        {/* l03: fourteen guests about to type */}
        {f >= FOURTEEN - 6 && guestsOut < 1 ? (
          <div style={{ position: "absolute", left: 40, right: 40, top: 1170, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 26, opacity: 1 - guestsOut }}>
            {GUESTS.map((p, i) => {
              const s = tw(f, FOURTEEN - 6 + i * 1.2, FOURTEEN + 4 + i * 1.2, 0, 1, E.backOut);
              const ok = f >= inform(i);
              return (
                <div key={i} style={{ position: "relative", display: "flex", justifyContent: "center", transform: `scale(${s})` }}>
                  <Face p={p} size={110} />
                  <div style={{ position: "absolute", right: 0, top: -14, padding: "6px 12px", borderRadius: 16, background: ok ? "#2E9C6A" : "#FFFFFF", color: ok ? "#FFF" : "#33465C", fontSize: 22, fontWeight: 800, display: "flex", gap: 4, alignItems: "center", transform: ok ? `scale(${tw(f, inform(i), inform(i) + 6, 1.4, 1, E.backOut)})` : undefined }}>
                    {ok ? <Icon name="check" size={20} color="#FFF" stroke={3.4} /> : [0, 1, 2].map((d) => <span key={d} style={{ width: 8, height: 8, borderRadius: 4, background: "#33465C", opacity: 0.3 + 0.7 * Math.abs(Math.sin(f / 5 + d)) }} />)}
                  </div>
                </div>
              );
            })}
            <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: 6, fontSize: 40, fontWeight: 850, color: f >= WROTE ? "#8FE3A6" : "#F4F1E8" }}>
              {f >= WROTE ? `Message sent to ${Math.min(14, Math.max(0, Math.floor((f - WROTE - 2) / 2) + 1))} of 14 guests` : f >= DROP ? "" : "14 guests, about to type…"}
            </div>
          </div>
        ) : null}

        {/* l04: the agent got there first */}
        {f >= DROP - 2 && f < FORECAST + 10 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1580, display: "flex", justifyContent: "center", opacity: tw(f, DROP - 2, DROP + 4, 0, 1, E.linear) * (1 - tw(f, FORECAST, FORECAST + 8, 0, 1, E.linear)) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 30px 16px 16px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 38, fontWeight: 850, transform: `scale(${tw(f, DROP - 2, DROP + 8, 0.6, 1, E.backOut)})`, boxShadow: "0 20px 50px rgba(217,87,89,.45)" }}>
              <div style={{ width: 70, height: 70, borderRadius: 22, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={40} color="#FFF" stroke={26} /></div>
              Your AI agent got there first
            </div>
          </div>
        ) : null}

        {/* l05: forecast + schedule */}
        {cardsOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - cardsOut }}>
            <SystemCard at={FORECAST - 6} doneAt={FORECAST + 6} x={70} y={1560} w={940} system={{ label: "Weather forecast", icon: "sun", color: "#2F6FB5" }} doing="Checking the forecast…" done="Storm until 9 AM" out={MOVED - 4} />
            <SystemCard at={MOVED - 4} doneAt={SCHEDULE + 2} x={70} y={1560} w={940} system={{ label: "Tour schedule", icon: "calendar", color: "#1E8E3E" }} doing="Reading your schedule…" done="Moved to tomorrow, 06:00" facts={["Same pickup", "14 guests"]} out={REFUND - 10} />
          </div>
        ) : null}

        {/* l06: a refund → to the team */}
        {f >= REFUND - 8 && chatOut < 1 ? (
          <div style={{ position: "absolute", left: 60, right: 60, top: 1260, opacity: 1 - chatOut, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { at: REFUND - 6, me: true, text: "Can I get a refund instead?" },
              { at: PASSES, me: false, text: "Of course. I've passed your request to our team 🙏" },
            ].map((m, i) => {
              const s = springAt(f, m.at - 4, 30, 12, 170);
              return s > 0.01 ? (
                <div key={i} style={{ alignSelf: m.me ? "flex-start" : "flex-end", maxWidth: 820, padding: "20px 26px", borderRadius: m.me ? "30px 30px 30px 8px" : "30px 30px 8px 30px", background: m.me ? "#FFFFFF" : "#DCF7E3", fontSize: 40, color: C.ink, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 30}px)` }}>{m.text}</div>
              ) : null;
            })}
            {f >= PASSES + 8 ? (
              <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px 10px 10px", borderRadius: 999, background: "rgba(255,255,255,.95)", fontSize: 30, fontWeight: 800, color: "#1F3C5B", opacity: tw(f, PASSES + 8, PASSES + 14, 0, 1, E.linear) }}>
                <Face p={PEOPLE.grace} size={52} /> Grace · bookings team ✓
              </div>
            ) : null}
          </div>
        ) : null}

        {/* l07: the afternoon tour, booked */}
        {f >= AFTERNOON - 6 && f < GUIDE + 6 ? (
          <div style={{ position: "absolute", left: 60, right: 60, top: 1260, display: "flex", flexDirection: "column", gap: 16, opacity: 1 - tw(f, GUIDE - 6, GUIDE + 2, 0, 1, E.linear) }}>
            {[
              { at: AFTERNOON - 4, me: true, text: "Is there a later tour today?" },
              { at: SEATS, me: false, text: "Sunset boat at 15:00 has 2 seats left. Booked for you ✓" },
            ].map((m, i) => {
              const s = springAt(f, m.at - 4, 30, 12, 170);
              return s > 0.01 ? <div key={i} style={{ alignSelf: m.me ? "flex-start" : "flex-end", maxWidth: 820, padding: "20px 26px", borderRadius: m.me ? "30px 30px 30px 8px" : "30px 30px 8px 30px", background: m.me ? "#FFFFFF" : "#DCF7E3", fontSize: 40, color: C.ink, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 30}px)` }}>{m.text}</div> : null;
            })}
          </div>
        ) : null}

        {/* l08: sunrise — the guide sleeps in */}
        {f >= GUIDE - 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1220, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: tw(f, GUIDE - 4, GUIDE + 6, 0, 1, E.linear) }}>
            <div style={{ position: "relative" }}>
              <Face p={PEOPLE.jonas} size={200} />
              <div style={{ position: "absolute", right: -70, top: -20, fontSize: 64, transform: `translateY(${Math.sin(f / 10) * 8}px)` }}>💤</div>
            </div>
            <div style={{ padding: "14px 28px", borderRadius: 999, background: "rgba(255,255,255,.9)", fontSize: 34, fontWeight: 800, color: "#7A4A2E" }}>Your guide, still asleep</div>
            <div style={{ padding: "14px 28px", borderRadius: 999, background: "#2E9C6A", fontSize: 34, fontWeight: 800, color: "#FFF", opacity: tw(f, NEVER - 4, NEVER + 4, 0, 1, E.linear), transform: `scale(${tw(f, NEVER - 4, NEVER + 6, 0.6, 1, E.backOut)})` }}>All 14 guests informed ✓</div>
          </div>
        ) : null}
        {f >= NEVER ? <Sparkles x={120} y={1050} w={840} h={500} at={NEVER} color="#FFE7A8" size={44} seed={4} /> : null}

        {/* captions */}
        {hk === "a" ? headline("a", T.VO.l01, FOURTEEN - 8, [{ t: "05:45.", at: w("l01", 0), hi: true }, { t: "The tour", at: w("l02", 2), br: true }, { t: "leaves at six.", at: SIX }, { t: "It's pouring.", at: POURING, hi: true }]) : null}
        {hk === "b" ? <Kinetic key="b" from={FOURTEEN - 2} to={DROP - 8} y={1680} size={70} width={980} align="center" color="#F4F1E8" hi={AMBER} words={[{ t: "14 guests", at: FOURTEEN, hi: true }, { t: "about to message.", at: w("l03", 3) }]} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/tour-raincheck/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(0, "night", -10, "rain ambience"),
  cue(2, "flurry", -9, "clock flaps"),
  cue(POURING - 4, "flurry", -7, "status flips: rain"),
  ...Array.from({ length: 5 }, (_, i) => cue(FOURTEEN - 6 + i * 3, "pop", -12, `guest ${i + 1}`)),
  cue(FOURTEEN + 6, "type", -12, "everyone typing"),
  cue(DROP - 2, "swell", -6, "the agent got there first"),
  cue(DROP + 2, "poweron", -7, "agent"),
  cue(FORECAST - 6, "blip", -9, "forecast"),
  cue(FORECAST + 6, "check", -7, "storm till 9"),
  cue(MOVED - 2, "flurry", -5, "board: TOMORROW"),
  cue(SCHEDULE + 2, "check", -6, "schedule moved"),
  ...Array.from({ length: 7 }, (_, i) => cue(WROTE + 2 + i * 4, "send", -12, `message ${i * 2 + 1}`)),
  cue(WROTE + 30, "chime", -7, "14 of 14"),
  cue(TOMORROW - 2, "flurry", -9, "06:00"),
  cue(REFUND - 10, "receive", -6, "refund request"),
  cue(PASSES - 3, "send", -6, "passed to the team"),
  cue(PASSES + 8, "check", -8, "Grace"),
  cue(AFTERNOON - 8, "receive", -6, "later tour?"),
  cue(SEATS - 3, "send", -6, "2 seats left"),
  cue(BOOKED - 2, "flurry", -6, "board: BOOKED"),
  cue(BOOKED + 4, "check", -5, "booked"),
  cue(GUIDE - 10, "swell", -8, "sunrise"),
  cue(GUIDE - 2, "flurry", -8, "06:00"),
  cue(GUIDE + 4, "birds", -10, "morning"),
  cue(NEVER - 4, "chime", -6, "all informed"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const TOURRAINCHECK: FilmDef = { id: "TourRaincheck", slug: "tour-raincheck", title: "Tourism · Use case · Rain check", component: TourRaincheck, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/tour-raincheck/mix.wav" };
