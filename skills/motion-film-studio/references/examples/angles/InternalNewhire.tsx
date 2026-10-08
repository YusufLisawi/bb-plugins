import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Stamp, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, wrapLines } from "../../kit/type";
import { ChannelGlyph, Icon, IconName } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { SystemCard } from "../../kit/systems";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/internal-newhire/vo/lines.json";
import words from "../../../../public/films/internal-newhire/vo/words.json";

loadFonts();

/**
 * ANGLE · Internal: the new hire's notebook. DAY 1 — five questions written
 * down one by one, and a Slack draft to the manager ("Sorry, me again 😅…")
 * that gets stamped 10TH QUESTION TODAY and deleted. The drop opens Slack: the
 * company's AI agent appears under Apps, has read the handbook and every
 * policy, answers in seconds, links the right form from the HR portal and
 * passes anything personal to HR privately. DAY 5 — every box ticked, and she
 * is the one explaining the expense policy to the next new person.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const NEWJOB = w("l01", 2);
const QS = [w("l02", 0), w("l03", 0), w("l04", 0), w("l05", 0), w("l06", 0)];
const DRAFT = w("l07", 0) - 4;
const TENTH = w("l07", 10) - 2;
const DROP = w("l08", 0) - 2;
const AGENT = w("l08", 5);
const OPEN = w("l08", 9);
const TRAINED = w("l08", 11);
const HANDBOOK = w("l08", 14);
const POLICY = w("l08", 17);
const ASK1 = w("l09", 0) - 8;
const ANS1 = w("l09", 1);
const LINKS = w("l09", 4);
const SENDS = w("l09", 9);
const HR = w("l09", 13);
const DAY5 = w("l10", 0) - 4;
const EXPLAIN = w("l10", 5);
const EXPENSE = w("l10", 7);
const HIT = T.VO.l11 - 14;
const TAG = [w("l11", 0), w("l11", 1), w("l11", 2), w("l11", 4), w("l11", 6)];
const CTA = w("l11", 7) - 2;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 50);

const PAPER = "#FBF7EE";
const PEN = "#24408E";
const AUB = "#3F0E40";
const ME: FaceSpec = { ...PEOPLE.aisha, name: "Aisha" };
const QUESTIONS = ["Where is everything?", "How do I book time off?", "Who approves my laptop?", "Is there parking?", "What's the expense limit?"];
const DRAFT_TXT = "Sorry, me again 😅 quick question about";

/** the notebook page, DAY n, with the questions written on the ruled lines */
const Notebook: React.FC<{ day: 1 | 5; from: number }> = ({ day, from }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, background: PAPER }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 128px, #D9E3F0 128px 131px)", backgroundPosition: "0 18px" }} />
      <div style={{ position: "absolute", left: 128, top: 0, bottom: 0, width: 3, background: "#EBA3A3" }} />
      {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ position: "absolute", left: 40, top: 150 + i * 200, width: 44, height: 44, borderRadius: 22, background: "#E7E0D2", boxShadow: "inset 0 4px 8px rgba(0,0,0,.18)" }} />)}
      <div style={{ position: "absolute", left: 170, top: 150, display: "flex", alignItems: "baseline", gap: 26, color: PEN }}>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-0.05em", fontStyle: "italic", opacity: tw(f, from, from + 6, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, from, from + 10, 0, 1, E.expoOut)) * 30}px)` }}>Day {day}</div>
        <div style={{ fontSize: 56, fontStyle: "italic", fontWeight: 500, opacity: tw(f, day === 1 ? NEWJOB - 4 : from + 4, day === 1 ? NEWJOB + 4 : from + 12, 0, 1, E.linear) }}>{day === 1 ? "new job 😬" : "easy 😎"}</div>
      </div>
      {QUESTIONS.map((q, i) => {
        const at = day === 1 ? QS[i] : from - 30;
        const p = tw(f, at - 3, at + 12, 0, 1, E.linear);
        const check = day === 5 ? tw(f, from + 6 + i * 4, from + 14 + i * 4, 0, 1, E.backOut) : 0;
        return (
          <div key={q} style={{ position: "absolute", left: 170, top: 420 + i * 131, height: 128, display: "flex", alignItems: "center", gap: 26 }}>
            <div style={{ width: 58, height: 58, borderRadius: 12, border: `4px solid ${PEN}`, opacity: clamp(p * 3), display: "flex", alignItems: "center", justifyContent: "center", background: check > 0 ? `rgba(46,156,106,${0.15 * check})` : undefined }}>
              {check > 0 ? <div style={{ transform: `scale(${check})` }}><Icon name="check" size={44} color={C.green} stroke={4} /></div> : null}
            </div>
            <div style={{ fontSize: 58, fontStyle: "italic", fontWeight: 560, color: PEN, clipPath: `inset(-20px ${(1 - p) * 100}% -20px 0)`, textDecoration: check > 0.6 ? "line-through" : "none", textDecorationColor: "rgba(36,64,142,.45)" }}>{q}</div>
          </div>
        );
      })}
    </div>
  );
};

/** a Slack-style message: square avatar, name, text; grows to its real height (+ `add` rows [px, at] that appear later) */
const SMsg: React.FC<{ at: number; who: "me" | "agent" | FaceSpec; name: string; text: string; w: number; add?: [number, number][]; time?: string; children?: React.ReactNode }> = ({ at, who, name, text, w: W, add = [], time = "9:41", children }) => {
  const f = useCurrentFrame();
  const g = tw(f, at - 4, at + 4, 0, 1, E.cubicInOut);
  if (g <= 0) return null;
  const h = Math.max(76, 42 + wrapLines(text, 40, 400, W - 96) * 52) * g + add.reduce((a, [px, t]) => a + px * tw(f, t - 4, t + 4, 0, 1, E.cubicInOut), 0);
  return (
    <div style={{ flexShrink: 0, display: "flex", gap: 20, height: h, overflow: "hidden", marginTop: 30 * g, opacity: tw(f, at - 3, at + 3, 0, 1, E.linear) }}>
      {who === "agent" ? (
        <div style={{ width: 76, height: 76, borderRadius: 18, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Mark height={42} color={C.cream} stroke={26} /></div>
      ) : (
        <div style={{ width: 76, height: 76, borderRadius: 18, overflow: "hidden", flexShrink: 0 }}><Face p={who === "me" ? ME : who} size={76} /></div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, height: 42 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: C.ink }}>{name}</span>
          {who === "agent" ? <span style={{ padding: "2px 10px", borderRadius: 6, background: "#EDE9E1", fontSize: 20, fontWeight: 800, color: C.gray }}>APP</span> : null}
          <span style={{ fontSize: 22, color: C.gray2 }}>{time}</span>
        </div>
        <div style={{ fontSize: 40, lineHeight: "52px", color: C.ink }}>{text}</div>
        {children}
      </div>
    </div>
  );
};

const Chip: React.FC<{ at: number; icon: IconName; color: string; children: React.ReactNode }> = ({ at, icon, color, children }) => {
  const f = useCurrentFrame();
  const s = tw(f, at - 3, at + 7, 0, 1, E.backOut);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 20px 10px 12px", borderRadius: 18, background: C.white, boxShadow: "inset 0 0 0 2px #E7E3DA", transform: `scale(${s})`, opacity: clamp(s * 2), fontSize: 30, fontWeight: 700, color: C.ink }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={26} color="#FFF" stroke={2.4} /></div>
      {children}
    </div>
  );
};

export const InternalNewhire: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  // notebook leaves at the drop, the DAY 5 page slides back up over Slack
  const nbOut = tw(f, DROP - 2, DROP + 10, 0, 1, E.expoIn);
  const d5 = tw(f, DAY5 - 2, DAY5 + 12, 0, 1, E.expoOut);
  // the draft to the manager: typed, stamped, deleted
  const typed = Math.round(tw(f, DRAFT + 6, TENTH - 6, 0, DRAFT_TXT.length, E.linear));
  const deleted = Math.round(tw(f, TENTH + 12, DROP - 6, 0, DRAFT_TXT.length, E.cubicIn));
  const draftTxt = DRAFT_TXT.slice(0, Math.max(0, typed - deleted));
  const draft = springAt(f, DRAFT, 30, 13, 170);
  // Slack
  const slack = springAt(f, DROP + 2, 30, 14, 150) * (1 - tw(f, DAY5 - 4, DAY5 + 6, 0, 1, E.expoIn));
  const dm = tw(f, OPEN - 2, OPEN + 8, 0, 1, E.expoOut);
  const room = tw(f, SENDS - 4, SENDS + 8, 0, 1, E.quintOut);
  const tap = f >= OPEN - 8 && f < OPEN + 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: "#F1EEE8" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* ── DAY 1: the notebook ── */}
        {nbOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${nbOut * 1920}px) rotate(${nbOut * 6}deg)` }}>
            <Notebook day={1} from={T.VO.l01} />
            {draft > 0.01 ? (
              <div style={{ position: "absolute", left: 70, right: 70, top: 1200, borderRadius: 36, background: C.white, boxShadow: "0 30px 80px rgba(23,23,23,.2)", padding: "26px 30px", opacity: clamp(draft * 2), transform: `translateY(${(1 - clamp(draft)) * 120}px)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                  <ChannelGlyph ch="slack" size={44} />
                  <div style={{ fontSize: 30, color: C.gray }}>Message to</div>
                  <Face p={PEOPLE.ken} size={52} />
                  <div style={{ fontSize: 32, fontWeight: 800 }}>Ken · your manager</div>
                </div>
                <div style={{ minHeight: 150, borderRadius: 22, boxShadow: "inset 0 0 0 2px #E2DED5", padding: "20px 24px", fontSize: 42, color: C.ink }}>
                  {draftTxt}
                  <span style={{ display: "inline-block", width: 4, height: 46, marginLeft: 3, verticalAlign: "-0.15em", background: Math.floor(f / 8) % 2 ? C.ink : "transparent" }} />
                </div>
              </div>
            ) : null}
            <Stamp at={TENTH} text="10TH QUESTION TODAY" x={540} y={1390} rot={-7} size={72} color="#D23B3B" />
          </div>
        ) : null}

        {/* ── Slack: the company's agent ── */}
        {slack > 0.01 ? (
          <>
            <Kinetic key={f < ASK1 - 6 ? "a" : "b"} from={f < ASK1 - 6 ? DROP + 4 : ASK1 - 4} to={f < ASK1 - 6 ? ASK1 - 12 : DAY5 - 8} y={110} size={70} width={1000} align="center" color={C.ink} hi={C.coral}
              words={f < ASK1 - 6
                ? [{ t: "An", at: AGENT }, { t: "AI agent,", at: w("l08", 6), hi: true }, { t: "right", at: w("l08", 8), br: true }, { t: "inside", at: OPEN }, { t: "Slack.", at: w("l08", 10), hi: true }]
                : [{ t: "Answers", at: ANS1 }, { t: "in seconds.", at: w("l09", 3), hi: true, br: true }, { t: "Links", at: LINKS }, { t: "forms.", at: w("l09", 7), hi: true }, { t: "Loops in", at: SENDS }, { t: "HR.", at: HR, hi: true }]} />
            <div style={{ position: "absolute", left: 40, right: 40, top: 330, bottom: 60, borderRadius: 48, background: C.white, overflow: "hidden", boxShadow: "0 40px 100px rgba(23,23,23,.2)", opacity: clamp(slack * 2), transform: `translateY(${(1 - clamp(slack)) * 160}px) scale(${mix(0.92, 1, clamp(slack))})` }}>
              <div style={{ height: 130, background: AUB, display: "flex", alignItems: "center", gap: 20, padding: "0 34px" }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}><ChannelGlyph ch="slack" size={46} /></div>
                <div>
                  <div style={{ fontSize: 38, fontWeight: 800, color: "#FFF" }}>{dm > 0.5 ? "Company assistant" : "Your company"}</div>
                  <div style={{ fontSize: 24, color: "rgba(255,255,255,.7)" }}>{dm > 0.5 ? "AI agent · knows every policy" : "Slack workspace"}</div>
                </div>
              </div>
              {/* channel list */}
              <div style={{ position: "absolute", left: 0, right: 0, top: 130, bottom: 0, padding: "30px 40px", transform: `translateX(${-dm * 100}%)` }}>
                {["general", "random", "announcements", "design-team"].map((c) => <div key={c} style={{ fontSize: 40, color: C.gray, padding: "16px 0" }}># {c}</div>)}
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.gray2, marginTop: 30 }}>APPS</div>
                {f >= AGENT - 4 ? (
                  <div style={{ marginTop: 14, marginLeft: -20, padding: "16px 20px", borderRadius: 20, display: "flex", alignItems: "center", gap: 18, background: tap ? "#F6E2E2" : "transparent", transform: `translateX(${(1 - tw(f, AGENT - 4, AGENT + 6, 0, 1, E.expoOut)) * -200}px)` }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={34} color={C.cream} stroke={26} /></div>
                    <div style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>Company assistant</div>
                    <div style={{ padding: "4px 14px", borderRadius: 999, background: C.coral, color: "#FFF", fontSize: 22, fontWeight: 800 }}>NEW</div>
                  </div>
                ) : null}
              </div>
              {/* the DM */}
              {dm > 0 ? (
                <div style={{ position: "absolute", left: 0, right: 0, top: 130, bottom: 0, padding: `0 36px ${140 + 460 * (1 - tw(f, ASK1 - 4, ANS1 + 12, 0, 1, E.cubicInOut)) + room * 420}px`, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", transform: `translateX(${(1 - dm) * 100}%)`, background: C.white }}>
                  <SMsg at={OPEN + 8} who="agent" name="Company assistant" w={928} text="Hi Aisha 👋 I've read the handbook and every policy. Ask me anything." add={[[76, HANDBOOK], [76, POLICY + 2]]}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                      <Chip at={HANDBOOK} icon="book" color="#5E6AD2">Handbook</Chip>
                      <Chip at={POLICY - 6} icon="sun" color="#D4861C">Time off</Chip>
                      <Chip at={POLICY - 2} icon="card" color="#1C9A83">Expenses</Chip>
                      <Chip at={POLICY + 2} icon="laptop" color="#2B86CC">IT & equipment</Chip>
                    </div>
                  </SMsg>
                  <SMsg at={ASK1} who="me" name="Aisha" w={928} text="How do I book time off?" />
                  <SMsg at={ANS1} who="agent" name="Company assistant" w={928} text="You have 22 days this year 🌴 Here's the form:" add={[[42, ANS1], [120, LINKS]]}>
                    <div style={{ height: 42, display: "flex", alignItems: "flex-end" }}><span style={{ fontFamily: MONO, fontSize: 24, lineHeight: "30px", color: C.green, background: C.greenTint, padding: "2px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>answered in 2 s</span></div>
                    {f >= LINKS - 4 ? (
                      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 18, padding: "18px 22px", borderRadius: 24, boxShadow: "inset 0 0 0 2px #E7E3DA", opacity: tw(f, LINKS - 4, LINKS + 2, 0, 1, E.linear), transform: `scale(${tw(f, LINKS - 4, LINKS + 6, 0.85, 1, E.backOut)})`, transformOrigin: "0 50%" }}>
                        <div style={{ width: 70, height: 70, borderRadius: 18, background: "#7B55C7", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="file" size={40} color="#FFF" stroke={2.2} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 34, lineHeight: "40px", fontWeight: 800 }}>Time-off request</div>
                          <div style={{ fontSize: 24, lineHeight: "30px", color: C.gray }}>Your HR portal · takes 1 minute</div>
                        </div>
                        <div style={{ padding: "12px 22px", borderRadius: 14, background: C.ink, color: "#FFF", fontSize: 26, fontWeight: 800 }}>Open form</div>
                      </div>
                    ) : null}
                  </SMsg>
                  <SMsg at={SENDS - 10} who="me" name="Aisha" w={928} text="Who can I talk to about something personal?" />
                </div>
              ) : null}
              {dm > 0 ? <div style={{ position: "absolute", left: 30, right: 30, bottom: 26, height: 84, borderRadius: 22, boxShadow: "inset 0 0 0 2px #E2DED5", display: "flex", alignItems: "center", padding: "0 28px", fontSize: 32, color: C.gray2, background: C.white, transform: `translateX(${(1 - dm) * 100}%)` }}>Message Company assistant</div> : null}
            </div>
            <SystemCard at={SENDS} doneAt={HR + 2} x={70} y={1400} w={940} system={{ label: "HR team", icon: "lock", color: "#7B55C7" }} doing="Passing it to HR, privately…" done="HR will reach out today" facts={["Private 🔒"]} out={DAY5 - 8} />
          </>
        ) : null}

        {/* ── DAY 5 ── */}
        {d5 > 0 ? (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - d5) * 1920}px)` }}>
            <Notebook day={5} from={DAY5 + 4} />
            {f >= EXPLAIN - 10 ? (
              <div style={{ position: "absolute", left: 60, right: 60, top: 1130, borderRadius: 36, background: C.white, boxShadow: "0 30px 80px rgba(23,23,23,.18)", padding: "8px 30px 34px", opacity: tw(f, EXPLAIN - 10, EXPLAIN - 4, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, EXPLAIN - 10, EXPLAIN, 0, 1, E.expoOut)) * 80}px)` }}>
                <SMsg at={EXPLAIN - 8} who={{ ...PEOPLE.jonas, name: "Jonas" }} name="Jonas (new)" w={900} text="What's the expense limit? 😅" />
                <SMsg at={EXPENSE - 2} who="me" name="Aisha" w={900} text="Easy, it's in the expense policy. Or just ask the assistant 😉" />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" tagline={["Put", "an", "AI agent", "on your", "team."]} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/internal-newhire/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(T.VO.l01, "paper", -6, "notebook page"),
  cue(NEWJOB - 4, "draw", -10, "new job"),
  ...QS.map((q, i) => cue(q - 3, "draw", -8, `question ${i + 1}`)),
  cue(DRAFT, "whoosh", -12, "draft to the manager"),
  cue(DRAFT + 6, "type", -10, "typing"),
  cue(TENTH, "seal", -3, "10th question stamp"),
  cue(TENTH + 12, "keys", -11, "deleting"),
  cue(DROP - 2, "whoosh", -5, "page flies off"),
  cue(DROP + 2, "poweron", -7, "Slack"),
  cue(AGENT - 4, "notif", -5, "the agent appears"),
  cue(OPEN - 8, "tap", -6, "open the DM"),
  cue(OPEN + 5, "receive", -6, "hi Aisha"),
  cue(HANDBOOK - 3, "pop", -9, "handbook"),
  ...[POLICY - 6, POLICY - 2, POLICY + 2].map((a, i) => cue(a - 3, "pop", -10, `policy ${i + 1}`)),
  cue(ASK1 - 3, "send", -7, "time off?"),
  cue(ANS1 - 3, "receive", -5, "answered in seconds"),
  cue(LINKS - 4, "click", -6, "the form link"),
  cue(SENDS - 13, "send", -7, "something personal"),
  cue(SENDS, "blip", -8, "HR handoff"),
  cue(HR + 2, "check", -5, "HR will reach out"),
  cue(DAY5 - 2, "paper", -4, "DAY 5 page"),
  ...QUESTIONS.map((_, i) => cue(DAY5 + 10 + i * 4, "tick", -10, `tick ${i + 1}`)),
  cue(EXPLAIN - 11, "receive", -7, "Jonas asks"),
  cue(EXPENSE - 5, "send", -6, "she explains"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const INTERNALNEWHIRE: FilmDef = { id: "InternalNewhire", slug: "internal-newhire", title: "Angle · Internal · The new hire's notebook", component: InternalNewhire, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/internal-newhire/mix.wav" };
