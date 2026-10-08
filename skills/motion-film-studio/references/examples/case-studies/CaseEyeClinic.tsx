import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Odometer, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, Letters } from "../../kit/type";
import { Icon, Phone, PHONE } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { Banner, MailIcon } from "../../kit/screenrec";
import { AR, LMsg, WaDay } from "../../kit/chat";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/case-eye-clinic/vo/lines.json";
import words from "../../../../public/films/case-eye-clinic/vo/words.json";

loadFonts();

/**
 * CASE STUDY — the eye clinic (a real Brainfast customer, kept anonymous).
 * World: an optometrist's eye chart. Every chapter is read off the chart, and
 * the film moves like an eye exam: each chapter change is a lens click (the
 * picture blurs behind a phoropter ring and snaps back into focus). The hook
 * reads the chart's smallest line through a magnifier: "the receptionist
 * isn't a person". The results are the clinic's real numbers (prod, aggregate,
 * May–Sep 2026), including its real hour-by-hour message curve.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

/* beats */
const R1 = w("l01", 0);
const R2 = w("l01", 1);
const R3 = w("l01", 3);
const RAB = w("l01", 5); // "clinic"
const MAG = w("l02", 2);
const NOT = w("l02", 3);
const CASE = T.VO.l03 - 4;
const REAL = w("l03", 3);
const BF = w("l03", 4);
const CLINIC = T.VO.l04 - 4;
const DOCS = w("l04", 0);
const LANGS = [w("l04", 5), w("l04", 6), w("l04", 7), w("l04", 8)]; // "in their own language"
const VOICE = w("l04", 11);
const NEEDS = T.VO.l05 - 4;
const Q = [w("l05", 8), w("l05", 10), w("l05", 13)];
const TURN = w("l06", 0) - 2; // the drop
const AIREC = w("l06", 5);
const ASK = w("l07", 1);
const ONEQ = w("l07", 2);
const VN = w("l08", 1);
const ROUTE = w("l09", 1);
const RIGHT = w("l09", 6);
const LINK = w("l09", 9);
const NEVER = w("l10", 1);
const UNSURE = w("l11", 0);
const HANDS = w("l11", 5);
const RES = T.VO.l12 - 4;
const MAY = w("l12", 0);
const PAT = w("l12", 3);
const VNS = w("l12", 6);
const ONEIN4 = w("l13", 3);
const NIGHT = w("l13", 9);
const HIT = w("l14", 0) - 16;
const TAG = [0, 1, 2, 3, 4].map((i) => w("l14", i));
const CTA = w("l15", 0) - 2;
const URL = w("l15", T.nwords("l15") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l15") + 50);
const LENS = [CASE, CLINIC, NEEDS, TURN, RES]; // chapter changes = lens clicks

/* real data: patient messages by local hour (Africa/Casablanca), May–Sep 2026 */
const HOURS = [387, 337, 107, 95, 26, 22, 39, 109, 239, 762, 1428, 1841, 1642, 1788, 1841, 1594, 1387, 1185, 1003, 797, 942, 990, 737, 641];
const DOCTORS: { p: FaceSpec; role: string; lane: string }[] = [
  { p: PEOPLE.tom, role: "Surgery & cornea", lane: "< 7 days" },
  { p: PEOPLE.grace, role: "Retina & glaucoma", lane: "10–15 days" },
  { p: PEOPLE.ken, role: "Glasses & kids", lane: "3+ weeks" },
];
const SNELLEN = ["6/60", "6/36", "6/24", "6/18", "6/12", "6/9", "6/6"];

/* ── the eye chart ── */
const Row: React.FC<{ top: number; size: number; at: number; text?: string; i?: number; color?: string; track?: number; children?: React.ReactNode }> = ({ top, size, at, text, i, color = C.ink, track = 0.1, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center" }}>
    {i !== undefined ? <div style={{ position: "absolute", left: 40, top: size * 0.5 - 12, fontFamily: MONO, fontSize: 22, color: C.gray2 }}>{SNELLEN[i]}</div> : null}
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: `${track}em`, lineHeight: 1.08, color, whiteSpace: "nowrap" }}>{children ?? <Letters text={text ?? ""} at={at} stagger={1.1} dur={10} />}</div>
  </div>
);
const ChartCard: React.FC<{ top?: number; height?: number; duo?: boolean; children: React.ReactNode }> = ({ top = 250, height = 1320, duo = true, children }) => (
  <div style={{ position: "absolute", left: 60, top, width: 960, height, borderRadius: 40, background: C.white, boxShadow: "0 40px 90px rgba(23,23,23,.12), inset 0 0 0 2px #EEEBE3", overflow: "hidden" }}>
    {children}
    {duo ? (
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 60, height: 110, borderRadius: 12, overflow: "hidden", display: "flex" }}>
        {["#E0413F", "#2E9C6A"].map((bg) => (
          <div key={bg} style={{ flex: 1, background: bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ width: 44, height: 44, borderRadius: 22, border: "7px solid #111" }} />
            ))}
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

/** hook chart: rows type in on the voice; then we lean in to read the smallest line */
const HOOK_EYE = { x: 540, y: 250 + 869 }; // the two tiny rows
const HookChart: React.FC<{ f: number }> = ({ f }) => {
  // lean in: the smallest line comes to the centre of the frame at 3.4×
  const t = tw(f, MAG - 8, MAG + 10, 0, 1, E.expoInOut);
  const z = mix(1, 3.4, t);
  const cx = mix(540, HOOK_EYE.x, t), cy = mix(960, HOOK_EYE.y, t);
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${540 - cx * z}px, ${960 - cy * z}px) scale(${z})` }}>
      <ChartCard>
        <Row top={70} size={230} at={R1} i={0} track={0.02}>
          <Odometer value={15000} from={0} at={R1} dur={22} />
        </Row>
        <Row top={380} size={88} at={R2} i={1} text="WHATSAPP" />
        <Row top={492} size={88} at={R2 + 6} text="REPLIES" />
        <Row top={640} size={62} at={R3} i={2} text="ONE EYE CLINIC" track={0.1} />
        <Row top={752} size={36} at={RAB + 4} i={3} text="SINCE MAY 2026" />
        <Row top={850} size={24} at={MAG - 26} i={4} text="THE RECEPTIONIST" track={0.14} />
        <Row top={888} size={24} at={MAG - 22} text="ISN'T A PERSON." track={0.14} color={f >= NOT + 4 ? C.coral : C.ink} />
      </ChartCard>
      {f >= NOT + 4 ? <Sparkles x={HOOK_EYE.x - 150} y={HOOK_EYE.y} w={300} h={40} at={NOT + 4} color={C.coral} size={12} seed={3} /> : null}
    </div>
  );
};

/** "This is a real Brainfast case." — the case file */
const CaseFile: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, CASE + 2, 30, 13, 150);
  const real = springAt(f, REAL, 30, 12, 170);
  const bf = springAt(f, BF, 30, 12, 170);
  return (
    <div style={{ position: "absolute", left: 70, top: 560, width: 940, transform: `translateY(${(1 - clamp(s)) * 80}px)`, opacity: clamp(s * 1.5) }}>
      <div style={{ display: "inline-block", padding: "16px 30px", borderRadius: "24px 24px 0 0", background: C.coral, color: C.white, fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em" }}>CASE STUDY</div>
      <div style={{ borderRadius: "0 36px 36px 36px", background: C.white, boxShadow: "0 40px 90px rgba(23,23,23,.14), inset 0 0 0 2px #EEEBE3", padding: "56px 56px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 120, borderRadius: 34, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="eye" size={70} color={C.coral} stroke={2.2} />
          </div>
          <div style={{ padding: "12px 24px", borderRadius: 999, background: C.greenTint, color: C.green, fontFamily: MONO, fontSize: 26, letterSpacing: "0.08em", transform: `scale(${mix(0.6, 1, clamp(real))})`, opacity: clamp(real * 2) }}>✓ REAL CLIENT</div>
        </div>
        <div style={{ marginTop: 36, fontSize: 118, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.98, color: C.ink }}>The eye clinic</div>
        <div style={{ marginTop: 22, fontSize: 40, color: C.gray, lineHeight: 1.3 }}>3 doctors · on WhatsApp · kept anonymous</div>
        <div style={{ marginTop: 40, height: 2, background: "#EEEBE3" }} />
        <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 20, fontSize: 42, fontWeight: 700, color: C.ink, opacity: clamp(bf * 2), transform: `translateX(${(1 - clamp(bf)) * 40}px)` }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark height={48} color={C.cream} stroke={26} />
          </div>
          Built on Brainfast
        </div>
      </div>
      {f >= BF ? <Sparkles x={40} y={880} w={700} h={120} at={BF + 2} color={C.coral} size={36} seed={9} /> : null}
    </div>
  );
};

/** the clinic: three doctors, three languages, voice notes */
const Voice: React.FC<{ f: number; at: number; dur: string; w?: number }> = ({ f, at, dur, w: W = 520 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, width: W }}>
    <div style={{ width: 70, height: 70, borderRadius: 35, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={26} height={30} viewBox="0 0 26 30"><path d="M3 2 L 24 15 L 3 28 Z" fill="#FFF" /></svg>
    </div>
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, height: 60 }}>
      {Array.from({ length: 30 }, (_, k) => {
        const h = 12 + 40 * Math.abs(Math.sin(k * 1.7) * Math.cos(k * 0.6));
        const lit = f >= at && (f - at) * 0.9 > k;
        return <div key={k} style={{ flex: 1, height: h, borderRadius: 3, background: lit ? "#25D366" : "#B7C4BD" }} />;
      })}
    </div>
    <div style={{ fontSize: 28, color: "#667", fontFamily: FONT }}>{dur}</div>
  </div>
);
const Clinic: React.FC<{ f: number }> = ({ f }) => {
  // any language: no labels, no country — just patients writing the way they write
  const bubbles: { at: number; tag: string; text: string; rtl?: boolean }[] = [
    { at: LANGS[0], tag: "", text: "I need an appointment" },
    { at: LANGS[1], tag: "", text: "Necesito una cita" },
    { at: LANGS[2], tag: "", text: "Je voudrais un rendez-vous" },
    { at: LANGS[3], tag: "", text: "أريد موعدًا من فضلك", rtl: true },
  ];
  const v = springAt(f, VOICE - 2, 30, 12, 160);
  return (
    <>
      <div style={{ position: "absolute", left: 60, right: 60, top: 250, display: "flex", gap: 24 }}>
        {DOCTORS.map((d, i) => {
          const s = springAt(f, DOCS + i * 5, 30, 12, 170);
          return (
            <div key={i} style={{ flex: 1, height: 400, borderRadius: 34, background: C.white, boxShadow: "0 24px 60px rgba(23,23,23,.1), inset 0 0 0 2px #EEEBE3", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 36, transform: `translateY(${(1 - clamp(s)) * 60}px) scale(${mix(0.85, 1, clamp(s))})`, opacity: clamp(s * 2) }}>
              <Face p={d.p} size={170} />
              <div style={{ marginTop: 22, fontSize: 38, fontWeight: 800, color: C.ink }}>Doctor {i + 1}</div>
              <div style={{ marginTop: 6, fontSize: 27, color: C.gray, textAlign: "center", padding: "0 14px" }}>{d.role}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 720, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.coral, opacity: tw(f, LANGS[0] - 6, LANGS[0], 0, 1, E.linear) }}>IN THEIR OWN LANGUAGE</div>
        {bubbles.map((b, i) => {
          const s = springAt(f, b.at - 2, 30, 12, 170);
          return (
            <div key={i} style={{ alignSelf: i % 2 ? "flex-end" : "flex-start", opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 40}px) scale(${mix(0.9, 1, clamp(s))})`, transformOrigin: i % 2 ? "100% 100%" : "0 100%" }}>
              <div dir={b.rtl ? "rtl" : undefined} style={{ padding: "24px 32px", borderRadius: 34, background: C.white, boxShadow: "0 16px 40px rgba(23,23,23,.1)", fontSize: 50, fontWeight: 600, color: C.ink, fontFamily: b.rtl ? AR : FONT }}>{b.text}</div>
            </div>
          );
        })}
        <div style={{ alignSelf: "flex-end", opacity: clamp(v * 2), transform: `translateY(${(1 - clamp(v)) * 40}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: C.coral, marginBottom: 8, textAlign: "right" }}>VOICE NOTE</div>
          <div style={{ padding: "24px 30px", borderRadius: 34, background: "#D9FDD3", boxShadow: "0 16px 40px rgba(23,23,23,.1)" }}>
            <Voice f={f} at={VOICE} dur="0:14" />
          </div>
        </div>
      </div>
    </>
  );
};

/** "every message needs the same three things" — read off the chart */
const Needs: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: "0.16em", color: C.coral }}>EVERY MESSAGE NEEDS</div>
    <ChartCard top={420} height={1100}>
      <Row top={120} size={90} at={Q[0]} i={0} text="WHAT'S WRONG?" track={0.04} />
      <Row top={360} size={78} at={Q[1]} i={1} text="HOW URGENT?" track={0.06} />
      <Row top={570} size={64} at={Q[2]} i={2} text="WHICH DOCTOR?" track={0.08} />
    </ChartCard>
  </>
);

/* ── the workflow, on the clinic's WhatsApp ── */
const PH = { x: 540, top: 470, s: 1.3 }; // phone placement (its bottom runs off the frame)
const Workflow: React.FC<{ f: number }> = ({ f }) => {
  const rise = springAt(f, TURN, 30, 14, 120);
  const screenW = PHONE.w - PHONE.inset * 2;
  const k = screenW / 1080;
  const innerH = (PHONE.h - PHONE.inset * 2) / k;
  // routing board: the case slides into the right doctor's lane
  const board = springAt(f, ROUTE - 2, 30, 13, 150) * (1 - tw(f, LINK - 8, LINK + 2, 0, 1, E.expoIn));
  const slide = tw(f, RIGHT - 8, RIGHT + 4, 0, 1, E.cubicInOut);
  const never = springAt(f, NEVER + 2, 30, 12, 170) * (1 - tw(f, UNSURE - 2, UNSURE + 6, 0, 1, E.linear));
  return (
    <>
      <div style={{ position: "absolute", left: PH.x - (PHONE.w * PH.s) / 2, top: PH.top, transform: `translateY(${(1 - clamp(rise)) * 1300}px) scale(${PH.s})`, transformOrigin: "0 0" }}>
        <Phone screenBg="#EFE7DE">
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: innerH, transform: `scale(${k})`, transformOrigin: "0 0" }}>
            <WaDay name="Clinic Reception" sub="Business account" icon={<div style={{ width: 80, height: 80, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="eye" size={50} color={C.coral} stroke={2.4} /></div>} bottom={innerH * 0.8}>
              <LMsg at={ASK - 12} me time="21:12" size={46}>Hi, I'd like an appointment</LMsg>
              <LMsg at={ONEQ} ai time="21:12" size={46}>Hi! What's the appointment for?</LMsg>
              <LMsg at={VN - 6} me time="21:13" size={46}>
                <Voice f={f} at={VN - 4} dur="0:12" w={600} />
                <div style={{ marginTop: 10, fontSize: 30, color: "#4B5B53", opacity: tw(f, VN + 12, VN + 20, 0, 1, E.linear) }}>
                  📝 “I've had blurry vision at night for two months”
                </div>
              </LMsg>
              <LMsg at={ROUTE - 6} ai time="21:13" size={46}>Thanks. How old are you?</LMsg>
              <LMsg at={LINK - 4} ai time="21:14" size={44}>
                <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 4px" }}>
                  <div style={{ width: 90, height: 90, borderRadius: 20, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="calendar" size={50} color="#FFF" stroke={2.3} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Book your appointment</div>
                    <div style={{ fontSize: 32, color: "#0A7CFF" }}>booking platform ↗</div>
                  </div>
                </div>
              </LMsg>
              <LMsg at={NEVER - 8} me time="21:15" size={46}>Is it cataracts?</LMsg>
              <LMsg at={UNSURE - 2} ai time="21:15" size={46}>I'll pass your question to our medical team 🙏</LMsg>
              {f >= HANDS ? (
                <div style={{ alignSelf: "center", marginTop: 18, padding: "12px 26px", borderRadius: 14, background: "#FFF3C4", color: "#6B5200", fontSize: 32, fontWeight: 650, opacity: tw(f, HANDS, HANDS + 6, 0, 1, E.linear) }}>Handed off to the team</div>
              ) : null}
            </WaDay>
          </div>
        </Phone>
      </div>
      {/* routing board */}
      {board > 0.01 ? (
        <div style={{ position: "absolute", left: 70, width: 940, top: 1130, transform: `translateY(${(1 - clamp(board)) * 900}px)`, borderRadius: 36, background: C.white, boxShadow: "0 40px 90px rgba(23,23,23,.25), inset 0 0 0 2px #EEEBE3", padding: "34px 36px" }}>
          <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.gray }}>ROUTING · THE CLINIC'S OWN RULES</div>
          {DOCTORS.map((d, i) => {
            const hot = i === 1 ? slide : 0;
            return (
              <div key={i} style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 20, padding: "16px 20px", borderRadius: 24, background: hot > 0.5 ? C.coralTint : "#F6F4EF", boxShadow: hot > 0.5 ? `inset 0 0 0 3px ${C.coral}` : "none" }}>
                <Face p={d.p} size={72} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 34, fontWeight: 750, color: C.ink }}>Doctor {i + 1}</div>
                  <div style={{ fontSize: 26, color: C.gray }}>{d.role}</div>
                </div>
                <div style={{ padding: "10px 18px", borderRadius: 999, background: C.white, fontFamily: MONO, fontSize: 24, color: C.ink }}>{d.lane}</div>
                {i === 1 && slide > 0 ? (
                  <div style={{ position: "absolute", right: 320, transform: `translate(${(1 - slide) * -260}px, ${(1 - slide) * -300}px)`, opacity: clamp(slide * 3), padding: "12px 20px", borderRadius: 18, background: C.ink, color: C.cream, fontSize: 26, fontWeight: 650, whiteSpace: "nowrap" }}>New patient · 58</div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {never > 0.01 ? (
        <div style={{ position: "absolute", left: 540, top: 1150, transform: `translate(-50%, -50%) scale(${mix(0.6, 1, clamp(never))}) rotate(-3deg)`, opacity: clamp(never * 2), display: "flex", alignItems: "center", gap: 16, padding: "22px 34px", borderRadius: 26, background: C.coral, color: C.white, fontSize: 44, fontWeight: 800, boxShadow: "0 20px 50px rgba(217,87,89,.4)" }}>
          <Icon name="lock" size={44} color="#FFF" stroke={2.6} /> No diagnosis. Ever.
        </div>
      ) : null}
    </>
  );
};

/* the headline above the phone, one per beat */
const BEATLINES: { at: number; to: number; words: string[]; hi: number[] }[] = [
  { at: AIREC - 4, to: ONEQ - 6, words: ["An", "AI", "receptionist", "on", "WhatsApp"], hi: [1, 2] },
  { at: ONEQ, to: VN - 6, words: ["One", "question", "at", "a", "time"], hi: [0] },
  { at: VN, to: ROUTE - 6, words: ["Understands", "voice", "notes"], hi: [1, 2] },
  { at: ROUTE, to: LINK - 6, words: ["Routes", "to", "the", "right", "doctor"], hi: [3, 4] },
  { at: LINK, to: NEVER - 6, words: ["Sends", "the", "booking", "link"], hi: [2, 3] },
  { at: NEVER, to: UNSURE - 6, words: ["Never", "diagnoses"], hi: [0] },
  { at: UNSURE, to: HANDS - 6, words: ["Not", "sure?", "Hands", "off"], hi: [2, 3] },
];

/* ── results: the clinic's real numbers, read off the chart ── */
const Results: React.FC<{ f: number }> = ({ f }) => {
  const max = Math.max(...HOURS);
  const lab = (at: number) => ({ opacity: tw(f, at + 6, at + 14, 0, 1, E.linear), transform: `translateY(${tw(f, at + 6, at + 16, 14, 0, E.expoOut)}px)` });
  return (
    <ChartCard top={170} height={1600} duo={false}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 54, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.coral, opacity: tw(f, RES + 4, RES + 12, 0, 1, E.linear) }}>REAL NUMBERS · SINCE MAY 2026</div>
      <Row top={110} size={190} at={MAY} i={0} track={0.01}>
        <Odometer value={15179} from={0} at={MAY - 2} dur={26} />
      </Row>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", fontSize: 34, fontWeight: 700, letterSpacing: "0.1em", color: C.gray, ...lab(MAY) }}>AI REPLIES ON WHATSAPP</div>
      <Row top={420} size={128} at={PAT} i={1} track={0.01}>
        {f >= PAT - 2 ? <Odometer value={1582} from={0} at={PAT - 2} dur={20} /> : <span style={{ opacity: 0 }}>0</span>}
      </Row>
      <div style={{ position: "absolute", left: 0, right: 0, top: 575, textAlign: "center", fontSize: 32, fontWeight: 700, letterSpacing: "0.1em", color: C.gray, ...lab(PAT) }}>PATIENTS</div>
      <Row top={660} size={100} at={VNS} i={2} track={0.01}>
        {f >= VNS - 2 ? <Odometer value={2984} from={0} at={VNS - 2} dur={20} /> : <span style={{ opacity: 0 }}>0</span>}
      </Row>
      <div style={{ position: "absolute", left: 0, right: 0, top: 785, textAlign: "center", fontSize: 30, fontWeight: 700, letterSpacing: "0.1em", color: C.gray, ...lab(VNS) }}>VOICE NOTES UNDERSTOOD</div>
      <Row top={870} size={84} at={ONEIN4} i={3} track={0.02}>
        <span style={{ opacity: tw(f, ONEIN4 - 2, ONEIN4 + 4, 0, 1, E.linear), color: f >= NIGHT ? C.coral : C.ink }}>1 in 4</span>
      </Row>
      <div style={{ position: "absolute", left: 0, right: 0, top: 975, textAlign: "center", fontSize: 30, fontWeight: 700, letterSpacing: "0.08em", color: C.gray, ...lab(ONEIN4) }}>MESSAGES ARRIVE 7 PM – 9 AM</div>
      {/* the clinic's real 24-hour curve; the night hours light coral */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 1060, height: 250, display: "flex", alignItems: "flex-end", gap: 6 }}>
        {HOURS.map((n, h) => {
          const grow = tw(f, ONEIN4 + h * 0.8, ONEIN4 + 12 + h * 0.8, 0, 1, E.expoOut);
          const night = h >= 19 || h < 9;
          const lit = night && f >= NIGHT + (h >= 19 ? h - 19 : h + 5) * 0.6;
          return <div key={h} style={{ flex: 1, height: `${(n / max) * 100 * grow}%`, borderRadius: "8px 8px 2px 2px", background: lit ? C.coral : "#DAD5CB" }} />;
        })}
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1322, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 22, color: C.gray2, opacity: tw(f, ONEIN4 + 6, ONEIN4 + 14, 0, 1, E.linear) }}>
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1392, textAlign: "center", fontSize: 30, fontWeight: 700, letterSpacing: "0.06em", color: C.ink, opacity: tw(f, NIGHT + 10, NIGHT + 18, 0, 1, E.linear) }}>549 HANDED TO THE TEAM · MEDIAN REPLY 26 S</div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 1470, textAlign: "center", fontFamily: MONO, fontSize: 21, lineHeight: 1.45, color: C.gray, opacity: tw(f, RES + 10, RES + 20, 0, 1, E.linear) }}>
        Aggregate numbers from the clinic's Brainfast account, May–Sep 2026. Clinic kept anonymous; chats shown are recreations.
      </div>
    </ChartCard>
  );
};

export const CaseEyeClinic: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const scene = f < CASE ? 0 : f < CLINIC ? 1 : f < NEEDS ? 2 : f < TURN ? 3 : f < RES ? 4 : f < HIT ? 5 : 6;
  // lens click: blur out → cut → snap back into focus, behind a phoropter ring
  let blur = 0, ring = 0;
  for (const b of LENS) {
    if (f >= b - 7 && f < b) blur = tw(f, b - 7, b, 0, 16, E.cubicIn);
    if (f >= b && f < b + 10) blur = tw(f, b, b + 10, 16, 0, E.expoOut);
    ring = Math.max(ring, 0.5 + 0.5 * Math.cos(Math.PI * clamp(Math.abs(f - b) / 14))); // a soft blink, not a blackout
  }
  // hook: seen through the lens, blurred, then click (sharp) and the lens opens
  const hookBlur = f < R1 - 2 ? 14 : tw(f, R1 - 2, R1 + 6, 14, 0, E.expoOut);
  const lensR = tw(f, R2 - 2, R2 + 14, 430, 1600, E.cubicInOut);
  const LC = { x: 540, y: 444 };
  const collapse = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const beat = BEATLINES.find((b) => f >= b.at - 4 && f <= b.to + 8);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, rgba(255,255,255,0) 60%)" }} />
      <div style={{ position: "absolute", inset: 0, filter: `blur(${scene === 0 ? Math.max(blur, hookBlur) : blur}px)`, transform: scene === 5 ? `scale(${mix(1, 0.02, collapse)})` : undefined, opacity: scene === 5 ? 1 - collapse : 1, transformOrigin: "50% 50%" }}>
        {scene === 0 ? <HookChart f={f} /> : null}
        {scene === 1 ? <CaseFile f={f} /> : null}
        {scene === 2 ? <Clinic f={f} /> : null}
        {scene === 3 ? <Needs /> : null}
        {scene === 4 ? <Workflow f={f} /> : null}
        {scene === 5 ? <Results f={f} /> : null}
      </div>
      {scene === 4 && beat ? (
        <Kinetic key={beat.at} from={beat.at} to={beat.to} y={200} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={beat.words.map((t, i) => ({ t, at: beat.at + i * 3, hi: beat.hi.includes(i) }))} />
      ) : null}
      {scene === 4 ? <Banner f={f} at={HANDS} until={RES - 16} app="Mail" icon={<MailIcon />} title="Customer needs your help on Clinic Reception" body="A patient asked: “Is it cataracts?”" /> : null}
      {/* phoropter: the hook lens (with its dial) and the click ring between chapters */}
      {scene === 0 && lensR < 1590 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <mask id="lens">
              <rect width={1080} height={1920} fill="#FFF" />
              <circle cx={LC.x} cy={LC.y} r={lensR} fill="#000" />
            </mask>
          </defs>
          <rect width={1080} height={1920} fill="#121214" mask="url(#lens)" />
          <circle cx={LC.x} cy={LC.y} r={lensR + 22} fill="none" stroke="#2A2A2E" strokeWidth={44} />
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const r0 = lensR + 6, r1 = lensR + (i % 6 === 0 ? 34 : 20);
            return <line key={i} x1={LC.x + Math.cos(a) * r0} y1={LC.y + Math.sin(a) * r0} x2={LC.x + Math.cos(a) * r1} y2={LC.y + Math.sin(a) * r1} stroke="#E9E6DF" strokeWidth={i % 6 === 0 ? 3 : 1.5} opacity={0.7} />;
          })}
        </svg>
      ) : null}
      {ring > 0 ? <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, rgba(18,18,20,0) ${mix(1150, 640, ring)}px, rgba(18,18,20,${0.72 * ring}) ${mix(1260, 860, ring)}px)` }} /> : null}
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" tagline={["Your", "clinic", "could", "be", "next."]} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/case-eye-clinic/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(R1 - 2, "focus", -3, "lens click: the chart snaps sharp"),
  cue(R1, "data", -12, "15,000 rolls"),
  cue(R2, "type", -13, "WHATSAPP REPLIES"),
  cue(R3, "type", -13, "ONE EYE CLINIC"),
  cue(R2, "zoom", -9, "the lens opens"),
  cue(MAG - 6, "dive", -11, "lean in to the smallest line"),
  cue(NOT + 4, "blip", -8, "isn't a person"),
  cue(NOT + 6, "shimmer", -12, "sparkle"),
  ...LENS.slice(0, 3).map((b, i) => cue(b, "focus", -4, `lens click ${i + 1}`)),
  cue(CASE + 4, "pop", -8, "case file tab"),
  cue(REAL, "check", -7, "real client"),
  cue(BF, "spark", -9, "built on Brainfast"),
  ...[0, 5, 10].map((d, i) => cue(DOCS + d, "pop", -9, `doctor ${i + 1}`)),
  ...LANGS.map((l, i) => cue(l - 2, "receive", -8, `language ${i + 1}`)),
  cue(VOICE - 2, "blip", -7, "voice note"),
  ...Q.map((q, i) => cue(q, "type", -11, ["what's wrong", "how urgent", "which doctor"][i])),
  cue(TURN, "focus", -4, "lens click into the drop"),
  cue(TURN + 2, "whoosh", -8, "the phone rises"),
  cue(AIREC - 4, "pop", -10, "headline"),
  cue(ASK - 12, "send", -6, "patient: I want an appointment"),
  cue(ONEQ, "receive", -4, "one question"),
  cue(VN - 6, "send", -6, "voice note"),
  cue(VN + 12, "data", -12, "transcribed"),
  cue(ROUTE - 6, "receive", -5, "how old are you?"),
  cue(ROUTE - 2, "whoosh", -11, "routing board"),
  cue(RIGHT + 2, "snap", -5, "case lands in the lane"),
  cue(RIGHT + 8, "check", -7, "routed"),
  cue(LINK - 4, "receive", -4, "booking link"),
  cue(NEVER - 8, "send", -6, "is it cataracts?"),
  cue(NEVER + 2, "seal", -7, "no diagnosis"),
  cue(UNSURE - 2, "receive", -5, "hands over"),
  cue(HANDS, "ping", -5, "staff notified"),
  cue(RES, "focus", -4, "lens click: results"),
  cue(MAY - 2, "data", -11, "15,179"),
  cue(PAT - 2, "data", -12, "1,582"),
  cue(VNS - 2, "data", -12, "2,984"),
  cue(ONEIN4, "draw", -13, "the 24-hour curve"),
  cue(NIGHT, "shimmer", -9, "night hours light up"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { CASE, CLINIC, NEEDS, TURN, RES, HIT, CTA, URL, DUR };

export const CASEEYECLINIC: FilmDef = { id: "CaseEyeClinic", slug: "case-eye-clinic", title: "Case study · The eye clinic", component: CaseEyeClinic, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/case-eye-clinic/mix.wav" };
