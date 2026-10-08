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
import { Icon, IconName } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/edu-hall/vo/lines.json";
import words from "../../../../public/films/edu-hall/vo/words.json";

loadFonts();

/**
 * EDUCATION · ABOUT BRAINFAST: Fill the hall. A lecture hall seen from the
 * lectern: curved rows of empty seats. Ghost students flicker into the seats
 * with one question each (fees? scholarship? housing? deadline?), wait, and fade
 * out unanswered. The drop turns the lights on: an agent at the lectern answering
 * on the website, WhatsApp and Instagram. Programs, a campus tour and a call with
 * admissions land as cards. Signature: "every question answered is a seat
 * filled" — the hall fills seat by seat with real faces until it's full.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const ALMOST = w("l01", 3);
const QWORDS = [w("l02", 5), w("l02", 7), w("l02", 8), w("l02", 10)];
const NOBODY = w("l03", 1);
const DROP = w("l04", 0) - 2;
const UNI = w("l04", 3);
const CHANNELS = [w("l04", 17), w("l04", 18), w("l04", 20)];
const LANG = w("l04", 24);
const PROGRAMS = w("l05", 3);
const TOURS = w("l05", 6);
const CALLS = w("l05", 8);
const FOLLOWS = w("l05", 12);
const IN = w("l05", 18);
const EVERY = w("l06", 0);
const SEAT = w("l06", 5);
const FILLED = w("l06", 6);
const HIT = T.VO.l07 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l07", 2) + 4;
const URL = w("l07", T.nwords("l07") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l07") + 50);

const DARK = "#141A2E";
const WOOD = "#B9825A";
const SEAT_EMPTY = "#2C3550";
const SEAT_LIT = "#C9472E";
const ROWS = 6;
const FACES: FaceSpec[] = Object.values(PEOPLE);

type Seat = { x: number; y: number; s: number; r: number; i: number; k: number };
const SEATS: Seat[] = (() => {
  const out: Seat[] = [];
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    const n = 7 + r;
    const W = 600 + r * 76;
    const y0 = 820 + r * 130;
    const s = 62 + r * 9;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      out.push({ x: 540 + u * W, y: y0 - Math.abs(u) * u * 0 + u * u * 120, s, r, i, k: k++ });
    }
  }
  return out;
})();
// fill order: a deterministic shuffle so the hall fills from everywhere
const ORDER = [...SEATS].sort((a, b) => rnd(a.k * 3.3) - rnd(b.k * 3.3)).map((s) => s.k);
const GHOST_SEATS = [27, 38, 30, 50];
const QS = ["Fees?", "Scholarship?", "Housing?", "Deadline?"];

const SeatShape: React.FC<{ s: Seat; lit: number }> = ({ s, lit }) => (
  <div style={{ position: "absolute", left: s.x - s.s / 2, top: s.y - s.s * 0.2, width: s.s, height: s.s * 0.9, borderRadius: `${s.s * 0.28}px ${s.s * 0.28}px ${s.s * 0.12}px ${s.s * 0.12}px`, background: mixColor(SEAT_EMPTY, SEAT_LIT, lit), boxShadow: `inset 0 -${s.s * 0.18}px 0 rgba(0,0,0,.25)` }} />
);

const InfoCard: React.FC<{ at: number; out: number; y: number; icon: IconName; color: string; kicker: string; title: string; from: number }> = ({ at, out, y, icon, color, kicker, title, from }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at - 5, 30, 12, 170) * (1 - tw(f, out, out + 8, 0, 1, E.expoIn));
  if (s <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y, display: "flex", alignItems: "center", gap: 24, padding: "22px 28px", borderRadius: 30, background: "#FFFFFF", boxShadow: "0 24px 60px rgba(0,0,0,.35)", opacity: clamp(s * 2), transform: `translateX(${(1 - clamp(s)) * from}px)`, zIndex: 50 }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={54} color="#FFF" stroke={2.2} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.gray }}>{kicker}</div>
        <div style={{ fontSize: 42, fontWeight: 850, color: C.ink, letterSpacing: "-0.02em" }}>{title}</div>
      </div>
      <div style={{ width: 60, height: 60, borderRadius: 30, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${tw(f, at + 4, at + 12, 0, 1, E.backOut)})` }}><Icon name="check" size={36} color="#FFF" stroke={3.4} /></div>
    </div>
  );
};

export const EduHall: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const lights = tw(f, DROP - 2, DROP + 12, 0, 1, E.cubicInOut);
  // seats lit: a few after the drop, then the full fill on "every question answered is a seat filled"
  const litCount = Math.round(mix(0, 8, tw(f, LANG, IN, 0, 1, E.linear)) + mix(0, SEATS.length - 8, tw(f, EVERY, FILLED + 6, 0, 1, E.cubicIn)));
  const litAt = (k: number) => {
    const pos = ORDER.indexOf(k);
    if (pos < 8) return LANG + (pos / 8) * (IN - LANG);
    return EVERY + Math.pow((pos - 8) / (SEATS.length - 8), 1 / 1.6) * (FILLED + 6 - EVERY);
  };
  const hallScale = mix(1, 0.92, tw(f, PROGRAMS - 6, PROGRAMS + 6, 0, 1, E.cubicInOut)) * mix(1, 1.08, tw(f, EVERY - 4, FILLED + 10, 0, 1, E.cubicInOut));
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={150} size={78} width={980} align="center" color="#FFFFFF" hi="#FFB25C" words={ws} />;
  const hk = f < QWORDS[0] - 6 ? "a" : f < DROP - 2 ? "b" : f < PROGRAMS - 6 ? "c" : f < EVERY - 4 ? "d" : "e";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: mixColor(DARK, "#2A1E3A", lights) }}>
      {/* stage light */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 45% at 50% 30%, rgba(255,214,150,${0.32 * lights}) 0%, rgba(255,214,150,0) 70%)` }} />
      {/* spotlight cone from the top on the lectern */}
      <div style={{ position: "absolute", left: 540 - 300, top: -100, width: 600, height: 900, background: `linear-gradient(180deg, rgba(255,230,180,${0.22 * lights}), rgba(255,230,180,0))`, clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {hk === "a" ? headline("a", T.VO.l01, QWORDS[0] - 8, [{ t: "How many", at: w("l01", 0) }, { t: "students", at: w("l01", 2), br: true }, { t: "almost", at: ALMOST, hi: true }, { t: "applied?", at: w("l01", 4) }]) : null}
        {hk === "b" ? headline("b", QWORDS[0] - 4, DROP - 8, [{ t: "One question.", at: w("l02", 2) }, { t: "Nobody", at: NOBODY, hi: true, br: true }, { t: "answered.", at: w("l03", 2) }]) : null}
        {hk === "c" ? headline("c", DROP + 2, PROGRAMS - 10, [{ t: "Every future student,", at: w("l04", 12) }, { t: "answered.", at: CHANNELS[0], hi: true }]) : null}
        {hk === "d" ? headline("d", PROGRAMS - 4, EVERY - 8, [{ t: "Programs.", at: PROGRAMS }, { t: "Tours.", at: TOURS }, { t: "Calls.", at: CALLS, br: true }, { t: "Follow-ups.", at: FOLLOWS, hi: true }]) : null}
        {hk === "e" ? headline("e", EVERY - 2, HIT - 10, [{ t: "Every question answered", at: EVERY, br: true }, { t: "is a seat", at: w("l06", 3) }, { t: "filled.", at: FILLED, hi: true }]) : null}

        {/* the hall */}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${hallScale})`, transformOrigin: "50% 60%" }}>
          {/* lectern with the agent */}
          <div style={{ position: "absolute", left: 540 - 130, top: 520, width: 260, height: 170, borderRadius: "20px 20px 6px 6px", background: mixColor("#3A2C24", WOOD, lights), boxShadow: "0 20px 40px rgba(0,0,0,.4)" }}>
            {lights > 0.02 ? (
              <div style={{ position: "absolute", left: 130 - 60, top: -90, width: 120, height: 120, borderRadius: 34, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${springAt(f, DROP, 30, 10, 170)})`, boxShadow: `0 0 ${60 * lights}px rgba(255,140,120,.8)` }}><Mark height={70} color={C.cream} stroke={24} /></div>
            ) : null}
            <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: MONO, fontSize: 18, letterSpacing: "0.18em", color: "rgba(255,255,255,.75)" }}>ADMISSIONS</div>
          </div>
          {/* seats */}
          {SEATS.map((s) => {
            const at = litAt(s.k);
            const lit = tw(f, at, at + 6, 0, 1, E.quintOut);
            const face = f >= at ? springAt(f, at, 30, 11, 200) : 0;
            const ghostIdx = GHOST_SEATS.indexOf(s.k);
            const ghost = ghostIdx >= 0 ? tw(f, ALMOST - 6 + ghostIdx * 3, ALMOST + 4 + ghostIdx * 3, 0, 1, E.linear) * (1 - tw(f, NOBODY - 4, NOBODY + 14, 0, 1, E.linear)) : 0;
            return (
              <React.Fragment key={s.k}>
                <SeatShape s={s} lit={lit} />
                {face > 0.01 ? <div style={{ position: "absolute", left: s.x - s.s * 0.45, top: s.y - s.s * 0.95, transform: `scale(${clamp(face)})`, transformOrigin: "50% 100%" }}><Face p={FACES[s.k % FACES.length]} size={s.s * 0.9} /></div> : null}
                {ghost > 0.01 ? (
                  <>
                    <div style={{ position: "absolute", left: s.x - s.s * 0.45, top: s.y - s.s * 0.95, opacity: ghost * 0.55, filter: "grayscale(1) brightness(1.6)" }}><Face p={FACES[(s.k + 3) % FACES.length]} size={s.s * 0.9} /></div>
                    {f >= QWORDS[ghostIdx] - 4 ? (
                      <div style={{ position: "absolute", left: s.x - 20, top: s.y - s.s * 2.1, padding: "10px 18px", borderRadius: "20px 20px 20px 4px", background: f >= NOBODY ? "#5B6378" : "#FFFFFF", color: f >= NOBODY ? "#C9CEDA" : C.ink, fontSize: 30, fontWeight: 800, whiteSpace: "nowrap", opacity: ghost * tw(f, QWORDS[ghostIdx] - 4, QWORDS[ghostIdx] + 2, 0, 1, E.linear), transform: `scale(${tw(f, QWORDS[ghostIdx] - 4, QWORDS[ghostIdx] + 6, 0.5, 1, E.backOut)})`, transformOrigin: "0 100%" }}>
                        {QS[ghostIdx]}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        {/* unanswered timer */}
        {f >= NOBODY - 4 && f < DROP + 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1600, display: "flex", justifyContent: "center", opacity: tw(f, NOBODY - 4, NOBODY + 4, 0, 1, E.linear) * (1 - tw(f, DROP - 4, DROP + 2, 0, 1, E.linear)) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 28px", borderRadius: 999, background: "rgba(255,255,255,.08)", border: "2px solid rgba(255,255,255,.2)", color: "#C9CEDA", fontSize: 34, fontWeight: 750 }}>
              <Icon name="activity" size={34} color="#C9CEDA" stroke={2.2} /> No reply · {Math.min(3, 1 + Math.floor(Math.max(0, f - NOBODY) / 8))} days
            </div>
          </div>
        ) : null}

        {/* channels: website, WhatsApp, Instagram */}
        {f >= CHANNELS[0] - 6 && f < PROGRAMS + 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1600, display: "flex", justifyContent: "center", gap: 24, opacity: 1 - tw(f, PROGRAMS - 6, PROGRAMS + 2, 0, 1, E.linear) }}>
            {(["web", "whatsapp", "instagram"] as const).map((ch, i) => {
              const s = tw(f, CHANNELS[i] - 6, CHANNELS[i] + 4, 0, 1, E.backOut);
              return <div key={ch} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px 14px 14px", borderRadius: 999, background: "#FFFFFF", fontSize: 32, fontWeight: 800, color: C.ink, transform: `scale(${s})`, opacity: clamp(s * 2) }}><ChannelBadge ch={ch} size={50} />{ch === "web" ? "Website" : ch === "whatsapp" ? "WhatsApp" : "Instagram"}</div>;
            })}
          </div>
        ) : null}
        {f >= LANG - 4 && f < PROGRAMS ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1720, textAlign: "center", fontSize: 32, fontWeight: 750, color: "#FFE2B8", opacity: tw(f, LANG - 4, LANG + 4, 0, 1, E.linear) * (1 - tw(f, PROGRAMS - 6, PROGRAMS, 0, 1, E.linear)) }}>in each student's own language, day and night</div>
        ) : null}

        {/* l05: programs, tour, call, follow-up */}
        <InfoCard at={PROGRAMS} out={EVERY - 8} y={1300} icon="book" color="#5E6AD2" kicker="EVERY PROGRAM" title="Requirements, fees, start dates" from={-900} />
        <InfoCard at={TOURS} out={EVERY - 8} y={1450} icon="calendar" color="#1C9A83" kicker="CAMPUS TOUR BOOKED" title="Saturday · 11:00" from={900} />
        <InfoCard at={CALLS + 2} out={EVERY - 8} y={1600} icon="phone" color={C.coral} kicker="CALL WITH ADMISSIONS" title="Tuesday · 16:00" from={-900} />
        <InfoCard at={FOLLOWS + 2} out={EVERY - 8} y={1750} icon="send" color="#D4861C" kicker="FOLLOWED UP" title="Application submitted" from={900} />

        {/* the full hall */}
        {f >= FILLED ? <Sparkles x={80} y={600} w={920} h={900} at={FILLED} color="#FFD27A" size={46} seed={6} /> : null}
        {f >= EVERY ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1640, display: "flex", justifyContent: "center", opacity: tw(f, EVERY, EVERY + 6, 0, 1, E.linear) }}>
            <div style={{ padding: "16px 32px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "2px solid rgba(255,210,122,.6)", fontSize: 38, fontWeight: 850, color: "#FFE2B8", fontFamily: MONO }}>{Math.min(SEATS.length, litCount)} / {SEATS.length} seats filled</div>
          </div>
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/edu-hall/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

const fills = Array.from({ length: 10 }, (_, i) => EVERY + i * ((FILLED + 6 - EVERY) / 10));
export const SOUND: Cue[] = [
  cue(2, "hum", -14, "empty hall"),
  ...GHOST_SEATS.map((_, i) => cue(ALMOST - 6 + i * 3, "shimmer", -14, `ghost ${i + 1}`)),
  ...QWORDS.map((q, i) => cue(q - 4, "pop", -8, `question ${i + 1}`)),
  cue(NOBODY - 4, "sink", -7, "nobody answered"),
  cue(NOBODY + 10, "clock", -10, "days pass"),
  cue(DROP - 2, "poweron", -5, "lights on"),
  cue(DROP + 2, "swell", -8, "the agent at the lectern"),
  ...CHANNELS.map((c, i) => cue(c - 6, "pop", -8, `channel ${i + 1}`)),
  ...Array.from({ length: 4 }, (_, i) => cue(LANG + i * 10, "tap", -12, `seat ${i + 1}`)),
  cue(PROGRAMS - 5, "whoosh", -10, "programs"),
  cue(TOURS - 5, "whoosh", -10, "campus tour"),
  cue(TOURS + 4, "check", -6, "tour booked"),
  cue(CALLS - 3, "whoosh", -10, "call"),
  cue(CALLS + 6, "check", -6, "call booked"),
  cue(FOLLOWS - 3, "send", -8, "follow-up"),
  cue(FOLLOWS + 6, "chime", -6, "application submitted"),
  cue(EVERY - 4, "riser", -9, "the hall fills"),
  ...fills.map((t, i) => cue(t, "tap", -11, `seats filling ${i + 1}`)),
  cue(FILLED, "spark", -6, "full hall"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const EDUHALL: FilmDef = { id: "EduHall", slug: "edu-hall", title: "Education · Brainfast · Fill the hall", component: EduHall, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/edu-hall/mix.wav" };
