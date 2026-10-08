import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, mixColor, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, wrapLines } from "../../kit/type";
import { Icon, IconName } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/school-groupchat/vo/lines.json";
import words from "../../../../public/films/school-groupchat/vo/words.json";

loadFonts();

/**
 * ANGLE · School: the parents' group chat. Night mode, 38 members, the same
 * message every evening — "Does anyone know…?" — and a red counter of
 * different answers climbing with every reply. The drop turns night into
 * morning: one school agent that actually knows, answering from the school
 * calendar and the letters sent home. The same answer lands on six parents'
 * phones and the counter comes back as "1 answer". A sick child is logged into
 * the attendance sheet, and the teachers ask it too (templates, rooms,
 * deadlines): outside and inside the school.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const NIGHT = w("l02", 2);
const Q0 = w("l02", 6);
const Q1 = w("l03", 0);
const Q2 = w("l04", 0);
const Q3 = w("l05", 0);
const DROP = w("l06", 0) - 2;
const ASK = w("l06", 5);
const KNOWS = w("l06", 9);
const ANSWER = w("l07", 1) - 2;
const CAL = w("l07", 5);
const LETTER = w("l07", 8);
const SAME = w("l08", 0);
const EVERY = w("l08", 3);
const SICK = w("l09", 0);
const LOGS = w("l09", 4);
const SHEET = w("l09", 11);
const TEACH = w("l10", 1);
const ASKS = [w("l10", 5), w("l10", 6), w("l10", 7)];
const HIT = T.VO.l11 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l11", 2) + 4;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 50);

const WA_DARK = "#0B141A";
const DAY = "#EAF3F8";
const SCHOOL = "#2B6CB0";

type GM = { p: FaceSpec; name: string; color: string; text: string; at: number; answer?: boolean; q?: boolean };
const P = PEOPLE;
const GROUP: GM[] = [
  { p: P.tom, name: "Tom", color: "#53BDEB", text: "Good evening everyone 👋", at: T.VO.l01 + 8 },
  { p: P.maya, name: "Maya", color: "#F7A1C4", text: "Has anyone seen a blue jumper? 🧥", at: w("l01", 4) - 4 },
  { p: P.omar, name: "Omar", color: "#FFB347", text: "👍", at: w("l01", 6) },
  { p: P.dana, name: "Dana", color: "#A5D6A7", text: "Does anyone know…", at: Q0 - 4 },
  { p: P.aisha, name: "Aisha", color: "#FFD166", text: "Does anyone know if there's school tomorrow? 🤔", at: Q1 - 3, q: true },
  { p: P.ken, name: "Ken", color: "#7FDBCA", text: "I think so?", at: w("l03", 5), answer: true },
  { p: P.lucia, name: "Lucía", color: "#FF8A80", text: "No, it's a training day", at: w("l03", 6) + 4, answer: true },
  { p: P.jonas, name: "Jonas", color: "#FFB347", text: "which day??", at: Q2 - 10 },
  { p: P.priya, name: "Priya", color: "#B39DDB", text: "When is the parents' meeting?", at: Q2 - 2, q: true },
  { p: P.grace, name: "Grace", color: "#F7A1C4", text: "Thursday 7pm", at: w("l04", 3), answer: true },
  { p: P.wei, name: "Wei", color: "#53BDEB", text: "I thought Tuesday 😅", at: w("l04", 4) + 3, answer: true },
  { p: P.marcus, name: "Marcus", color: "#A5D6A7", text: "What do they need for the trip?", at: Q3 - 2, q: true },
  { p: P.ines, name: "Inês", color: "#FFD166", text: "Packed lunch and a hat?", at: w("l05", 3), answer: true },
  { p: P.tom, name: "Tom", color: "#53BDEB", text: "Check the letter", at: w("l05", 6) - 2, answer: true },
  { p: P.marcus, name: "Marcus", color: "#A5D6A7", text: "Which letter 😭", at: w("l05", 6) + 12 },
];
const ANSWERS = GROUP.filter((m) => m.answer).map((m) => m.at);

/** a group message, dark mode, grows in from the bottom */
const GMsg: React.FC<{ m: GM }> = ({ m }) => {
  const f = useCurrentFrame();
  const g = tw(f, m.at - 4, m.at + 4, 0, 1, E.cubicInOut);
  if (g <= 0) return null;
  const h = 12 + 34 + wrapLines(m.text, 40, 400, 716) * 49 + 14;
  return (
    <div style={{ flexShrink: 0, height: h * g, marginTop: 14 * g, overflow: g < 1 ? "hidden" : "visible", display: "flex", alignItems: "flex-end", gap: 14, opacity: tw(f, m.at - 3, m.at + 3, 0, 1, E.linear) }}>
      <Face p={m.p} size={62} />
      <div style={{ boxSizing: "border-box", maxWidth: 760, padding: "12px 22px 14px", borderRadius: "8px 28px 28px 28px", background: m.q ? "#2A3942" : "#202C33", boxShadow: m.q ? "inset 0 0 0 3px rgba(255,209,102,.5)" : undefined }}>
        <div style={{ fontSize: 26, lineHeight: "34px", fontWeight: 700, color: m.color }}>{m.name}</div>
        <div style={{ fontSize: 40, color: "#E9EDEF", lineHeight: "49px" }}>{m.text}</div>
      </div>
    </div>
  );
};

/** light chat bubble for the day side */
const Bub: React.FC<{ at: number; me?: boolean; ai?: boolean; text: string; size?: number }> = ({ at, me, ai, text, size = 46 }) => {
  const f = useCurrentFrame();
  const g = tw(f, at - 4, at + 4, 0, 1, E.cubicInOut);
  if (g <= 0) return null;
  const lh = Math.round(size * 1.25);
  const h = 14 + (ai ? 30 : 0) + wrapLines(text, size, 400, 776) * lh + 16;
  return (
    <div style={{ flexShrink: 0, boxSizing: "border-box", alignSelf: me ? "flex-end" : "flex-start", maxWidth: 820, height: h * g, overflow: g < 1 ? "hidden" : "visible", marginTop: 14 * g, opacity: tw(f, at - 3, at + 3, 0, 1, E.linear), padding: "14px 22px 16px", borderRadius: me ? "28px 28px 8px 28px" : "28px 28px 28px 8px", background: me ? "#D9FDD3" : C.white, boxShadow: "0 2px 0 rgba(23,23,23,.06)", fontSize: size, lineHeight: `${lh}px`, color: C.ink }}>
      {ai ? <div style={{ fontSize: 22, lineHeight: "28px", fontWeight: 700, color: C.coral, marginBottom: 2 }}>✨ AI assistant</div> : null}
      {text}
    </div>
  );
};

const ChatCard: React.FC<{ y: number; inAt: number; out: number; title: string; sub: string; children: React.ReactNode }> = ({ y, inAt, out, title, sub, children }) => {
  const f = useCurrentFrame();
  if (f < inAt - 2 || f > out + 12) return null;
  const s = springAt(f, inAt, 30, 14, 160) * (1 - tw(f, out, out + 10, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 80}px) scale(${mix(0.94, 1, clamp(s))})`, transformOrigin: "50% 0", borderRadius: 44, background: "#EFE7DE", boxShadow: "0 40px 90px rgba(23,23,23,.16)", padding: "24px 26px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{ width: 70, height: 70, borderRadius: 35, background: SCHOOL, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="book" size={38} color="#FFF" stroke={2.2} /></div>
        <div>
          <div style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{title}</div>
          <div style={{ fontSize: 24, color: C.gray }}>{sub}</div>
        </div>
        <div style={{ marginLeft: "auto" }}><ChannelBadge ch="whatsapp" size={52} /></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
};

const SourceTile: React.FC<{ at: number; icon: IconName; color: string; label: string; sub: string }> = ({ at, icon, color, label, sub }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at - 4, 30, 12, 180);
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, padding: "20px 22px", borderRadius: 30, background: C.white, boxShadow: "0 20px 50px rgba(23,23,23,.12)", opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 40}px) scale(${mix(0.85, 1, clamp(s))})` }}>
      <div style={{ width: 84, height: 84, borderRadius: 24, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={46} color="#FFF" stroke={2.2} /></div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{label}</div>
        <div style={{ fontSize: 27, color: C.gray, marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
};

const MiniPhone: React.FC<{ p: FaceSpec; at: number; x: number; y: number }> = ({ p, at, x, y }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at, 30, 12, 190);
  const ok = tw(f, EVERY + 2, EVERY + 10, 0, 1, E.backOut);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 300, height: 400, borderRadius: 44, background: "#171717", padding: 10, opacity: clamp(s * 2), transform: `scale(${mix(0.6, 1, clamp(s))})`, boxShadow: "0 24px 60px rgba(23,23,23,.25)" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 36, background: "#EFE7DE", padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Face p={p} size={74} />
        <div style={{ fontSize: 22, fontWeight: 700, color: C.gray, marginTop: 6 }}>{p.name}'s phone</div>
        <div style={{ marginTop: 16, alignSelf: "stretch", padding: "12px 14px", borderRadius: "20px 20px 20px 6px", background: C.white, fontSize: 25, lineHeight: 1.2, color: C.ink }}>
          No school tomorrow 🙂 <b>Training day.</b>
        </div>
        <div style={{ marginTop: 14, width: 54, height: 54, borderRadius: 27, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ok})` }}>
          <Icon name="check" size={32} color="#FFF" stroke={3.2} />
        </div>
      </div>
    </div>
  );
};

const ROSTER: [string, string][] = [["Adam", "Present"], ["Lina", "Present"], ["Noah", "Present"], ["Sam", "Absent · sick"]];

export const SchoolGroupchat: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const day = tw(f, DROP - 2, DROP + 10, 0, 1, E.cubicInOut);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const nAns = ANSWERS.filter((a) => f >= a).length;
  const chatOut = tw(f, DROP - 4, DROP + 8, 0, 1, E.expoIn);
  const big = tw(f, Q0 - 2, Q0 + 6, 0, 1, E.expoOut) * (1 - tw(f, Q1 - 8, Q1 - 2, 0, 1, E.cubicIn));
  const counterPop = (a: number) => tw(f, a, a + 6, 1.25, 1, E.quintOut);
  const lastAns = [...ANSWERS].reverse().find((a) => f >= a) ?? -99;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: mixColor(WA_DARK, DAY, day) }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* ── NIGHT: the parents' group chat ── */}
        {chatOut < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - chatOut, transform: `translateY(${chatOut * 200}px) scale(${1 - chatOut * 0.08})`, filter: chatOut > 0 ? `blur(${chatOut * 8}px)` : undefined }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 230, background: "#1F2C34", display: "flex", alignItems: "flex-end", padding: "0 40px 30px", gap: 22 }}>
              <div style={{ width: 96, height: 96, borderRadius: 48, background: "#2A3942", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 }}>🎒</div>
              <div>
                <div style={{ fontSize: 44, fontWeight: 800, color: "#E9EDEF" }}>Class 3B · Parents</div>
                <div style={{ fontSize: 28, color: "#8696A0" }}>38 members · {f >= NIGHT ? "21:47 🌙" : "Tom, Maya, Omar, Dana…"}</div>
              </div>
            </div>
            <div style={{ position: "absolute", left: 40, right: 40, top: 250, bottom: 150, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
              {GROUP.map((m, i) => <GMsg key={i} m={m} />)}
            </div>
            <div style={{ position: "absolute", left: 30, right: 30, bottom: 40, height: 90, borderRadius: 45, background: "#1F2C34", display: "flex", alignItems: "center", padding: "0 34px", fontSize: 32, color: "#8696A0" }}>Message</div>
            {/* the counter of different answers */}
            {f >= ANSWERS[0] - 2 ? (
              <div style={{ position: "absolute", right: 40, top: 262, padding: "14px 24px", borderRadius: 999, background: "#E5484D", color: "#FFF", fontSize: 32, fontWeight: 800, transform: `scale(${counterPop(lastAns) * tw(f, ANSWERS[0] - 2, ANSWERS[0] + 4, 0, 1, E.backOut)})`, boxShadow: "0 12px 30px rgba(229,72,77,.45)", zIndex: 5 }}>
                {nAns} different answer{nAns === 1 ? "" : "s"} 🤯
              </div>
            ) : null}
            {big > 0.01 ? (
              <div style={{ position: "absolute", inset: 0, background: `rgba(11,20,26,${0.75 * big})`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6 }}>
                <div style={{ textAlign: "center", color: "#FFF", fontSize: 130, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1, transform: `scale(${mix(1.25, 1, big)})`, opacity: big }}>
                  Does anyone<br />know<span style={{ color: "#FFD166" }}>?</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── DAY: one agent that actually knows ── */}
        {f >= DROP - 2 && f < SAME - 2 ? (
          <Kinetic from={DROP} to={SAME - 10} y={140} size={78} width={960} align="center" color={C.ink} hi={SCHOOL}
            words={[{ t: "One", at: w("l06", 4) }, { t: "AI", at: w("l06", 5) }, { t: "agent", at: w("l06", 6) }, { t: "that", at: w("l06", 7), br: true }, { t: "actually", at: w("l06", 8), hi: true }, { t: "knows.", at: KNOWS, hi: true }]} />
        ) : null}
        <ChatCard y={400} inAt={DROP + 4} out={SAME - 10} title="Greenfield School" sub="AI assistant · answers 24/7">
          <Bub at={ASK} me text="Is there school tomorrow?" />
          <Bub at={ANSWER} ai text="No school tomorrow 🙂 It's a teacher training day. Classes restart Wednesday at 8:30." />
        </ChatCard>
        {f >= CAL - 6 && f < SAME ? (
          <div style={{ position: "absolute", left: 60, right: 60, top: 1080, opacity: 1 - tw(f, SAME - 10, SAME - 2, 0, 1, E.linear) }}>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.gray, marginBottom: 18, textAlign: "center" }}>ANSWERED FROM</div>
            <div style={{ display: "flex", gap: 24 }}>
              <SourceTile at={CAL} icon="calendar" color={SCHOOL} label="School calendar" sub="Tue · training day" />
              {f >= LETTER - 6 ? <SourceTile at={LETTER} icon="mail" color="#D4861C" label="Letters home" sub="All 24 this year" /> : null}
            </div>
          </div>
        ) : null}

        {/* same answer for every parent */}
        {f >= SAME - 4 && f < SICK - 2 ? (
          <>
            <Kinetic from={SAME - 2} to={SICK - 10} y={150} size={84} width={960} align="center" color={C.ink} hi={C.green}
              words={[{ t: "Same", at: SAME, hi: true }, { t: "answer.", at: w("l08", 1), hi: true, br: true }, { t: "Every", at: EVERY }, { t: "parent.", at: w("l08", 4) }]} />
            {[P.aisha, P.ken, P.lucia, P.priya, P.wei, P.marcus].map((p, i) => (
              <MiniPhone key={p.name} p={p} at={SAME - 2 + i * 3} x={45 + (i % 3) * 335} y={470 + Math.floor(i / 3) * 440} />
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, top: 1400, display: "flex", justifyContent: "center", opacity: tw(f, EVERY + 6, EVERY + 12, 0, 1, E.linear) * (1 - tw(f, SICK - 10, SICK - 2, 0, 1, E.linear)) }}>
              <div style={{ padding: "18px 34px", borderRadius: 999, background: C.green, color: "#FFF", fontSize: 44, fontWeight: 800, transform: `scale(${tw(f, EVERY + 6, EVERY + 14, 0.6, 1, E.backOut)})` }}>1 answer ✓</div>
            </div>
          </>
        ) : null}

        {/* sick child → attendance sheet */}
        <ChatCard y={240} inAt={SICK - 6} out={TEACH - 10} title="Greenfield School" sub="AI assistant · answers 24/7">
          <Bub at={SICK - 2} me text="Sam has a fever 🤒 He'll stay home today." />
          <Bub at={LOGS} ai text="Get well soon, Sam 💛 I've logged his absence." />
        </ChatCard>
        <SystemCard at={LOGS - 2} doneAt={SHEET} x={70} y={850} w={940} system={{ label: "Attendance sheet", icon: "file", color: "#1E8E3E" }} doing="Logging the absence…" done="Absence logged" facts={["Sam · Class 3B", "Today · sick ✓"]} out={TEACH - 10} />
        {f >= LOGS + 4 && f < TEACH ? (
          <div style={{ position: "absolute", left: 70, right: 70, top: 1300, borderRadius: 28, overflow: "hidden", background: C.white, boxShadow: "0 20px 50px rgba(23,23,23,.1)", opacity: tw(f, LOGS + 4, LOGS + 12, 0, 1, E.linear) * (1 - tw(f, TEACH - 10, TEACH, 0, 1, E.linear)) }}>
            <div style={{ display: "flex", background: "#1E8E3E", color: "#FFF", fontSize: 26, fontWeight: 800, padding: "14px 28px" }}><span style={{ flex: 1 }}>Class 3B · today</span><span>Status</span></div>
            {ROSTER.map(([n, st], i) => {
              const isNew = i === ROSTER.length - 1;
              const g = isNew ? tw(f, SHEET - 2, SHEET + 6, 0, 1, E.quintOut) : 1;
              return (
                <div key={n} style={{ display: "flex", fontSize: 32, padding: `${14 * g}px 28px`, height: 70 * g, overflow: "hidden", borderTop: "2px solid #EEF2EE", background: isNew ? mixColor("#FFFFFF", "#E6F4EA", g) : C.white, fontWeight: isNew ? 800 : 500, color: C.ink }}>
                  <span style={{ flex: 1 }}>{n}</span><span style={{ color: isNew ? "#C0392B" : C.green }}>{st}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* teachers ask it too */}
        {f >= TEACH - 8 ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: tw(f, TEACH - 8, TEACH, 0, 1, E.linear) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 30px 14px 14px", borderRadius: 999, background: C.white, boxShadow: "0 14px 40px rgba(23,23,23,.1)" }}>
                <Face p={P.eleanor} size={80} />
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: SCHOOL }}>INSIDE THE SCHOOL</div>
                  <div style={{ fontSize: 36, fontWeight: 800 }}>Teachers ask it too</div>
                </div>
              </div>
            </div>
            {[
              { q: "A template for the trip letter?", a: "Here it is, ready to fill in", icon: "file" as IconName, color: "#5E6AD2" },
              { q: "Is a room free at 2 PM?", a: "Room 12 is free at 2 PM", icon: "home" as IconName, color: "#1C9A83" },
              { q: "When are report cards due?", a: "Friday · I'll remind you Thursday", icon: "calendar" as IconName, color: C.coral },
            ].map((c, i) => {
              const s = springAt(f, ASKS[i] - 6, 30, 12, 180);
              return (
                <div key={c.q} style={{ position: "absolute", left: 70, right: 70, top: 440 + i * 340, padding: "28px 30px", borderRadius: 36, background: C.white, boxShadow: "0 24px 60px rgba(23,23,23,.12)", opacity: clamp(s * 2), transform: `translateX(${(1 - clamp(s)) * (i % 2 ? 120 : -120)}px) rotate(${(1 - clamp(s)) * (i % 2 ? 4 : -4)}deg)` }}>
                  <div style={{ fontSize: 34, color: C.gray, marginBottom: 14 }}>“{c.q}”</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 76, height: 76, borderRadius: 22, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={c.icon} size={42} color="#FFF" stroke={2.2} /></div>
                    <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.1 }}>{c.a}</div>
                  </div>
                </div>
              );
            })}
          </>
        ) : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/school-groupchat/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...GROUP.map((m, i) => cue(m.at - 3, i % 2 ? "receive" : "notif", m.answer ? -9 : -7, `group: ${m.name}`)),
  cue(Q0 - 2, "impact", -8, "does anyone know?"),
  ...ANSWERS.map((a, i) => cue(a, "tick", -12, `answer ${i + 1}`)),
  cue(DROP - 2, "whoosh", -6, "night to morning"),
  cue(DROP + 4, "poweron", -7, "the school agent"),
  cue(ASK - 3, "send", -7, "is there school tomorrow?"),
  cue(ANSWER - 3, "receive", -5, "the answer"),
  cue(CAL - 4, "pop", -7, "school calendar"),
  cue(LETTER - 4, "pop", -7, "letters home"),
  ...[0, 1, 2, 3, 4, 5].map((i) => cue(SAME - 2 + i * 3, "tap", -12, `phone ${i + 1}`)),
  cue(EVERY + 2, "check", -5, "same answer"),
  cue(EVERY + 6, "chime", -7, "1 answer"),
  cue(SICK - 5, "send", -7, "sick"),
  cue(LOGS - 3, "receive", -6, "logged"),
  cue(SHEET - 2, "check", -5, "attendance sheet"),
  cue(TEACH - 8, "whoosh", -10, "teachers"),
  ...ASKS.map((a, i) => cue(a - 6, "pop", -6, `teacher answer ${i + 1}`)),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const SCHOOLGROUPCHAT: FilmDef = { id: "SchoolGroupchat", slug: "school-groupchat", title: "Angle · School · The parents' group chat", component: SchoolGroupchat, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/school-groupchat/mix.wav" };
