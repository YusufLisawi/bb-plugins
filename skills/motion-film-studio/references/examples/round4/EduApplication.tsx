import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Confetti, Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon, IconName } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/edu-application/vo/lines.json";
import words from "../../../../public/films/edu-application/vo/words.json";

loadFonts();

/**
 * EDUCATION · USE CASE: Step 3 of 5. The university's application portal, a
 * five-step progress bar frozen on "Upload your transcript"; a cursor hovers,
 * leaves; "last activity" counts up to nine days and the page greys. Then the
 * agent writes to her by name on WhatsApp, answers the question that stopped her
 * (the scholarship is open until Friday), takes the transcript in the chat, adds
 * it to the application and books a call with admissions. Signature: the
 * progress bar is the spine — it comes back to life step by step until
 * SUBMITTED.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const UPLOAD = w("l01", 4);
const NOTHING = w("l02", 2);
const NINE = w("l02", 4);
const DROP = w("l03", 0) - 2;
const WROTE = w("l03", 5);
const NAME = w("l03", 9);
const STOPPED = w("l04", 5);
const SCHOLARSHIP = w("l04", 9);
const YES = w("l05", 0);
const FRIDAY = w("l05", 2);
const TOOK = w("l06", 1);
const ADDED = w("l06", 9);
const APPLICATION = w("l06", 13);
const BOOKED = w("l06", 15);
const THURSDAY = w("l06", 21);
const STEP5 = w("l07", 0);
const SUBMITTED = w("l07", 4);
const HIT = T.VO.l08 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l08", 2) + 4;
const URL = w("l08", T.nwords("l08") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l08") + 50);

const BG = "#F3F1FA";
const UNI = "#3A2E8C";
const LINA: FaceSpec = { ...PEOPLE.priya, name: "Lina" };
const STEPS: { label: string; icon: IconName }[] = [
  { label: "Profile", icon: "users" },
  { label: "Program", icon: "book" },
  { label: "Transcript", icon: "file" },
  { label: "Interview", icon: "phone" },
  { label: "Submit", icon: "send" },
];

const Msg: React.FC<{ at: number; me?: boolean; children: React.ReactNode }> = ({ at, me, children }) => {
  const f = useCurrentFrame();
  const g = tw(f, at - 4, at + 4, 0, 1, E.cubicInOut);
  if (g <= 0) return null;
  return (
    <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 780, marginTop: 12 * g, opacity: tw(f, at - 3, at + 3, 0, 1, E.linear), transform: `translateY(${(1 - g) * 24}px)`, padding: "16px 22px", borderRadius: me ? "28px 28px 8px 28px" : "28px 28px 28px 8px", background: me ? "#D9FDD3" : "#FFFFFF", boxShadow: "0 2px 0 rgba(0,0,0,.06)", fontSize: 36, lineHeight: 1.25, color: C.ink, flexShrink: 0 }}>{children}</div>
  );
};

export const EduApplication: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const grey = tw(f, NOTHING, NINE + 10, 0, 1, E.cubicInOut) * (1 - tw(f, DROP, DROP + 12, 0, 1, E.cubicInOut));
  const days = Math.max(1, Math.min(9, Math.floor(tw(f, NOTHING, NINE + 6, 1, 9.99, E.cubicIn))));
  // progress: 2 steps done at first; transcript done at ADDED; interview booked; submitted
  const done = (i: number) => (i < 2 ? 0 : i === 2 ? ADDED + 4 : i === 3 ? BOOKED + 6 : SUBMITTED);
  const fill = 0.5 + 0.25 * tw(f, ADDED, ADDED + 14, 0, 1, E.cubicInOut) + 0.25 * tw(f, BOOKED + 2, BOOKED + 16, 0, 1, E.cubicInOut) + 0.25 * tw(f, STEP5 - 2, SUBMITTED, 0, 1, E.cubicInOut);
  const chat = springAt(f, DROP + 2, 30, 14, 150) * (1 - tw(f, STEP5 - 6, STEP5 + 4, 0, 1, E.expoIn));
  const solo = 1 - tw(f, DROP - 4, DROP + 12, 0, 1, E.cubicInOut) * (1 - tw(f, STEP5 - 6, STEP5 + 8, 0, 1, E.cubicInOut));
  const cardScene = f < TOOK - 4 ? "upload" : f < STEP5 - 4 ? "progress" : "submitted";
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={110} size={70} width={980} align="center" color={UNI} hi={C.coral} words={ws} />;
  const hk = f < NOTHING - 2 ? "a" : f < DROP - 2 ? "b" : f < STEP5 - 4 ? "-" : "e";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: BG }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {hk === "a" ? headline("a", T.VO.l01, NOTHING - 8, [{ t: "Step 3 of 5.", at: w("l01", 0), hi: true }]) : null}
        {hk === "b" ? headline("b", NOTHING - 2, DROP - 8, [{ t: "Then nothing.", at: NOTHING }, { t: "For 9 days.", at: NINE, hi: true }]) : null}
        {hk === "e" ? headline("e", STEP5 - 2, HIT - 10, [{ t: "Step 5 of 5.", at: STEP5 }, { t: "Submitted.", at: SUBMITTED, hi: true }]) : null}

        {/* the portal */}
        <div style={{ position: "absolute", left: 50, right: 50, top: 230, transformOrigin: "50% 0", transform: `translateY(${solo * 300}px)`, borderRadius: 40, background: "#FFFFFF", boxShadow: "0 30px 80px rgba(58,46,140,.14)", overflow: "hidden", filter: grey > 0.01 ? `grayscale(${grey}) brightness(${1 - grey * 0.06})` : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 30px", background: UNI, color: "#FFF" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={32} color="#FFF" stroke={2.2} /></div>
            <div style={{ fontSize: 34, fontWeight: 850 }}>Northfield University · Apply</div>
            <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 22, opacity: 0.8 }}>Lina's application</div>
          </div>
          {/* stepper */}
          <div style={{ position: "relative", padding: "40px 60px 30px" }}>
            <div style={{ position: "absolute", left: 110, right: 110, top: 86, height: 10, borderRadius: 5, background: "#E7E4F4" }} />
            <div style={{ position: "absolute", left: 110, top: 86, height: 10, borderRadius: 5, background: f >= SUBMITTED ? C.green : C.coral, width: `calc((100% - 220px) * ${clamp((fill - 0.25) / 0.75 * 0.75 + 0.0)})` }} />
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {STEPS.map((s, i) => {
                const d = done(i);
                const isDone = i < 2 || f >= d;
                const cur = (i === 2 && f < ADDED + 4) || (i === 3 && f >= ADDED + 4 && f < BOOKED + 6) || (i === 4 && f >= BOOKED + 6 && f < SUBMITTED);
                const pop = i >= 2 && f >= d ? tw(f, d, d + 8, 1.4, 1, E.backOut) : 1;
                return (
                  <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 120 }}>
                    <div style={{ width: 92, height: 92, borderRadius: 46, background: isDone ? (f >= SUBMITTED ? C.green : C.coral) : "#FFFFFF", border: `5px solid ${isDone ? "transparent" : cur ? C.coral : "#D9D5EC"}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop * (cur ? 1 + 0.05 * Math.sin(f / 5) : 1)})`, boxShadow: cur ? `0 0 0 10px rgba(217,87,89,.12)` : "none" }}>
                      {isDone ? <Icon name="check" size={46} color="#FFF" stroke={3.4} /> : <Icon name={s.icon} size={40} color={cur ? C.coral : "#B5B0CC"} stroke={2.2} />}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: cur ? C.coral : "#6E6893" }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* the step's body */}
          <div style={{ padding: "10px 50px 44px", minHeight: 330 }}>
            {cardScene === "upload" ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: "#8A84AE" }}>STEP 3 OF 5</div>
                <div style={{ fontSize: 50, fontWeight: 850, color: UNI, marginTop: 6 }}>Upload your transcript</div>
                <div style={{ marginTop: 22, height: 170, borderRadius: 26, border: "4px dashed #CFC9EA", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "#8A84AE", fontSize: 32, fontWeight: 700 }}>
                  <Icon name="file" size={44} color="#8A84AE" stroke={2} /> Drop a PDF here
                </div>
              </>
            ) : cardScene === "progress" ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: "#8A84AE" }}>{f < BOOKED + 6 ? "STEP 3 OF 5" : "STEP 4 OF 5"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16, padding: "22px 26px", borderRadius: 26, background: "#F4F2FC", opacity: tw(f, ADDED, ADDED + 8, 0.4, 1, E.linear) }}>
                  <div style={{ width: 80, height: 96, borderRadius: 14, background: "#FFF", boxShadow: "0 6px 16px rgba(0,0,0,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: C.coral }}>PDF</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: C.ink }}>Transcript · Lina.pdf</div>
                    <div style={{ fontSize: 26, color: C.gray }}>{f >= ADDED + 4 ? "Added by the AI assistant from WhatsApp" : "Adding…"}</div>
                  </div>
                  {f >= ADDED + 4 ? <div style={{ width: 60, height: 60, borderRadius: 30, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${tw(f, ADDED + 4, ADDED + 12, 0, 1, E.backOut)})` }}><Icon name="check" size={36} color="#FFF" stroke={3.4} /></div> : null}
                </div>
                {f >= BOOKED - 2 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 14, padding: "22px 26px", borderRadius: 26, background: "#EAF6EF", opacity: tw(f, BOOKED - 2, BOOKED + 6, 0, 1, E.linear) }}>
                    <div style={{ width: 80, height: 80, borderRadius: 22, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" size={44} color="#FFF" stroke={2.2} /></div>
                    <div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: C.ink }}>Call with admissions</div>
                      <div style={{ fontSize: 26, color: C.gray }}>{f >= THURSDAY ? "Thursday · 15:00 · booked" : "Finding a slot…"}</div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20 }}>
                <div style={{ width: 150, height: 150, borderRadius: 75, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${tw(f, SUBMITTED - 2, SUBMITTED + 8, 0, 1, E.backOut)})`, boxShadow: "0 20px 50px rgba(46,156,106,.4)" }}><Icon name="check" size={90} color="#FFF" stroke={3.4} /></div>
                <div style={{ fontSize: 64, fontWeight: 900, color: UNI, marginTop: 20, letterSpacing: "-0.03em", opacity: tw(f, SUBMITTED - 2, SUBMITTED + 4, 0, 1, E.linear) }}>Application submitted</div>
                <div style={{ fontSize: 30, color: C.gray, marginTop: 8, opacity: tw(f, SUBMITTED + 4, SUBMITTED + 10, 0, 1, E.linear) }}>Scholarship · applied before Friday</div>
              </div>
            )}
          </div>
        </div>
        {/* the cursor that leaves, and the days counter */}
        {f < DROP ? (
          <div style={{ position: "absolute", left: mix(600, 1180, tw(f, UPLOAD + 10, NOTHING + 6, 0, 1, E.cubicIn)), top: mix(1150, 1300, tw(f, UPLOAD + 10, NOTHING + 6, 0, 1, E.cubicIn)), opacity: tw(f, 4, 12, 0, 1, E.linear) }}>
            <svg width={60} height={70} viewBox="0 0 24 28"><path d="M2 2 L2 22 L8 17 L12 26 L15 25 L11 16 L19 16 Z" fill="#171717" stroke="#FFF" strokeWidth={1.5} /></svg>
          </div>
        ) : null}
        {f >= NOTHING - 2 && f < DROP + 6 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1380, display: "flex", justifyContent: "center", opacity: tw(f, NOTHING - 2, NOTHING + 4, 0, 1, E.linear) * (1 - tw(f, DROP, DROP + 6, 0, 1, E.linear)) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "20px 34px", borderRadius: 30, background: "#FFFFFF", boxShadow: "0 16px 40px rgba(58,46,140,.12)" }}>
              <span style={{ fontSize: 30, color: C.gray, fontWeight: 700 }}>Last activity</span>
              <span style={{ fontSize: 76, fontWeight: 900, color: C.coral, fontFamily: MONO, transform: `scale(${1 + 0.08 * Math.max(0, Math.sin(f * 0.7))})`, display: "inline-block" }}>{days}</span>
              <span style={{ fontSize: 30, color: C.gray, fontWeight: 700 }}>days ago</span>
            </div>
          </div>
        ) : null}

        {/* the WhatsApp chat */}
        {chat > 0.01 ? (
          <div style={{ position: "absolute", left: 50, right: 50, top: 1000, height: 820, borderRadius: 40, background: "#EFE7DE", boxShadow: "0 -10px 60px rgba(58,46,140,.2)", opacity: clamp(chat * 2), transform: `translateY(${(1 - clamp(chat)) * 700}px)`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 26px", background: "#FFFFFF" }}>
              <ChannelBadge ch="whatsapp" size={52} />
              <div style={{ width: 64, height: 64, borderRadius: 32, background: UNI, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={34} color="#FFF" stroke={2.2} /></div>
              <div><div style={{ fontSize: 32, fontWeight: 850 }}>Northfield University</div><div style={{ fontSize: 22, color: C.gray }}>AI assistant · admissions</div></div>
              <div style={{ marginLeft: "auto" }}><Face p={LINA} size={60} /></div>
            </div>
            <div style={{ position: "absolute", left: 22, right: 22, top: 100, bottom: 22, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <Msg at={WROTE}>Hi Lina 👋 I saw your application stopped at the transcript. Can I help with anything?</Msg>
              <Msg at={STOPPED} me>Is the scholarship still open? 🙏</Msg>
              <Msg at={YES}>Yes! Applications for it close on <b>Friday</b>. You can still make it.</Msg>
              {f >= TOOK - 4 ? (
                <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 14, marginTop: 12, padding: "14px 18px", borderRadius: "24px 24px 8px 24px", background: "#D9FDD3", opacity: tw(f, TOOK - 4, TOOK + 2, 0, 1, E.linear), flexShrink: 0 }}>
                  <div style={{ width: 56, height: 68, borderRadius: 10, background: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: C.coral }}>PDF</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>Transcript.pdf</div>
                </div>
              ) : null}
              <Msg at={BOOKED}>Added to your application ✓ And I booked a call with admissions, <b>Thursday at 15:00</b>.</Msg>
            </div>
          </div>
        ) : null}
        <SystemCard at={ADDED - 6} doneAt={APPLICATION + 2} x={70} y={790} w={940} scale={0.92} system={{ label: "Admissions portal", icon: "file", color: UNI }} doing="Adding it to her application…" done="Transcript added" out={BOOKED - 4} />
        {f >= SUBMITTED - 2 ? <Confetti at={SUBMITTED - 2} x={540} y={900} n={70} /> : null}
        {f >= SUBMITTED ? <Sparkles x={140} y={500} w={800} h={800} at={SUBMITTED} color="#FFC94A" size={44} seed={9} /> : null}
        {f >= WROTE - 2 && f < STEP5 - 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 930, display: "flex", justifyContent: "center", opacity: tw(f, WROTE - 2, WROTE + 4, 0, 1, E.linear) * (1 - tw(f, STEP5 - 10, STEP5 - 4, 0, 1, E.linear)), zIndex: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px 12px 12px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 30, fontWeight: 850, transform: `scale(${tw(f, WROTE - 2, WROTE + 6, 0.6, 1, E.backOut)})` }}>
              <div style={{ width: 50, height: 50, borderRadius: 16, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={28} color="#FFF" stroke={26} /></div>
              {f >= NAME ? "Wrote to her, by name" : "The university's AI agent"}
            </div>
          </div>
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/edu-application/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(4, "click", -10, "cursor"),
  cue(UPLOAD, "tap", -10, "hover the dropzone"),
  cue(UPLOAD + 12, "whoosh", -14, "the cursor leaves"),
  cue(NOTHING - 2, "clock", -8, "days pass"),
  ...Array.from({ length: 4 }, (_, i) => cue(NOTHING + 4 + i * 6, "tick", -12, `day ${i + 2}`)),
  cue(NINE, "sink", -8, "nine days"),
  cue(DROP - 2, "swell", -7, "the agent"),
  cue(DROP + 2, "whoosh", -8, "chat slides up"),
  cue(WROTE - 3, "receive", -4, "hi Lina"),
  cue(STOPPED - 3, "send", -6, "the question"),
  cue(YES - 3, "receive", -4, "yes, until Friday"),
  cue(TOOK - 4, "send", -6, "transcript in the chat"),
  cue(ADDED - 6, "blip", -8, "portal"),
  cue(ADDED + 4, "check", -5, "transcript added"),
  cue(BOOKED - 3, "receive", -6, "call booked"),
  cue(BOOKED + 6, "pop", -8, "interview step"),
  cue(THURSDAY, "check", -7, "Thursday"),
  cue(STEP5 - 4, "whoosh", -9, "to step 5"),
  cue(SUBMITTED - 2, "impact", -6, "submitted"),
  cue(SUBMITTED, "spark", -6, "confetti"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const EDUAPPLICATION: FilmDef = { id: "EduApplication", slug: "edu-application", title: "Education · Use case · Step 3 of 5", component: EduApplication, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/edu-application/mix.wav" };
