import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Icon } from "../../kit/ui";
import { AR } from "../../kit/chat";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/playbook-school/vo/lines.json";
import words from "../../../../public/films/playbook-school/vo/words.json";

loadFonts();

/**
 * PLAYBOOK — school admissions. World: the admissions office's cork
 * noticeboard, one tall board the camera travels down. Parents' 10 PM
 * questions get pinned up; the playbook arrives; a red yarn threads the
 * workflow note to note (trained on → asks → qualifies → books → hands off);
 * the signature is the final pull-back — the whole board, strung together,
 * while the pile of "price?" notes drops off it.
 * No invented results: this is how a school would set it up.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

/* beats */
const AM = w("l01", 5);
const DONT = w("l01", 1);
const PM = w("l02", 4);
const ASLEEP = w("l02", 10);
const FEES = w("l03", 6);
const LEVELS = w("l03", 7);
const BRIT = w("l03", 11);
const CLOSED = w("l04", 3);
const DROP = w("l05", 0) - 2; // "Here's the playbook."
const AGENT = w("l06", 1);
const WAPP = w("l06", 6);
const DOCS = [w("l06", 10), w("l06", 11), w("l06", 13)]; // brochure, fees, programs
const ASKS = w("l07", 2);
const ANSW = w("l08", 1);
const AGE = w("l08", 11);
const SECTION = w("l08", 14);
const LANG = [w("l09", 2), w("l09", 3), w("l09", 4), w("l09", 5), w("l09", 6)]; // "in the parent's own language"
const VISIT = w("l10", 4);
const BOOKS = w("l10", 7);
const SCHOL = w("l11", 1);
const CHECK = w("l12", 3);
const HANDS = w("l12", 8);
const MONDAY = w("l13", 2);
const BOOKED = w("l13", 7);
const PILE = w("l13", 11);
const HIT = T.VO.l14 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l14", 2) + 4;
const URL = w("l14", T.nwords("l14") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l14") + 50);

/* ── the board ── */
const BW = 1080, BH = 3600;
const PAPER = { white: "#FFFDF7", yellow: "#FFF3B8", green: "#DDF6D6", blue: "#DCEBFA", pink: "#FBDCE3", navy: "#23305A" };
const Pin: React.FC<{ color: string; s?: number }> = ({ color, s = 1 }) => (
  <div style={{ position: "absolute", left: "50%", top: -16, width: 38, height: 38, marginLeft: -19, borderRadius: 19, background: `radial-gradient(circle at 35% 30%, #FFFFFF 0%, ${color} 38%, ${color} 70%, rgba(0,0,0,.35) 100%)`, boxShadow: "0 6px 8px rgba(0,0,0,.35)", transform: `scale(${s})`, zIndex: 3 }} />
);

/** a note: pinned at `at` (slaps onto the cork), optionally unpinned at `fall` (drops off the board) */
const Note: React.FC<{ x: number; y: number; w: number; at: number; rot?: number; bg?: string; pin?: string; fall?: number; pad?: number; seed?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w: W, at, rot = 0, bg = PAPER.white, pin = "#D23B3B", fall, pad = 28, seed = 1, children, style }) => {
  const f = useCurrentFrame();
  if (f < at - 1) return null;
  const s = springAt(f, at, 30, 11, 190);
  const t = fall !== undefined ? Math.max(0, f - fall) : 0;
  const drop = fall !== undefined && t > 0 ? 0.9 * t * t : 0;
  const spin = fall !== undefined && t > 0 ? (rnd(seed) - 0.5) * 2.4 * t : 0;
  if (drop > BH) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, transform: `translateY(${drop}px) rotate(${rot + spin + (1 - clamp(s)) * 6}deg) scale(${mix(1.14, 1, clamp(s))})`, opacity: clamp(s * 3), transformOrigin: "50% 0%" }}>
      {!(fall !== undefined && t > 0) ? <Pin color={pin} s={mix(1.6, 1, clamp(s))} /> : null}
      <div style={{ background: bg, padding: pad, boxShadow: "0 12px 22px rgba(60,35,10,.32), 0 2px 3px rgba(60,35,10,.25)", borderRadius: 6, fontFamily: FONT, color: C.ink, ...style }}>{children}</div>
    </div>
  );
};

/** red yarn from pin to pin, drawn on */
type Yarn = { a: [number, number]; b: [number, number]; at: number; dur?: number; sag?: number };
const YarnLayer: React.FC<{ yarns: Yarn[] }> = ({ yarns }) => {
  const f = useCurrentFrame();
  return (
    <svg width={BW} height={BH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 5, pointerEvents: "none" }}>
      {yarns.map((y, i) => {
        if (f < y.at) return null;
        const t = tw(f, y.at, y.at + (y.dur ?? 12), 0, 1, E.cubicInOut);
        const [x1, y1] = y.a, [x2, y2] = y.b;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + (y.sag ?? 60);
        const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="rgba(60,20,10,.25)" strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} transform="translate(3 6)" />
            <path d={d} fill="none" stroke="#C8322F" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
          </g>
        );
      })}
    </svg>
  );
};

const Cork: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, width: BW, height: BH, background: "#C69C6D" }}>
    <div style={{ position: "absolute", inset: 0, opacity: 0.55, backgroundImage: "radial-gradient(rgba(90,55,25,.55) 1.4px, transparent 1.6px), radial-gradient(rgba(255,235,200,.45) 1.2px, transparent 1.4px), radial-gradient(rgba(120,75,35,.4) 2.2px, transparent 2.4px)", backgroundSize: "11px 13px, 17px 15px, 29px 31px", backgroundPosition: "0 0, 5px 7px, 13px 3px" }} />
    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 26px #8A5B34, inset 0 0 0 30px #6E4526, inset 0 0 90px rgba(40,20,5,.45)" }} />
  </div>
);

/** the office sign hangs on one pin and swings in */
const Sign: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  if (f < at - 1) return null;
  const t = Math.max(0, f - at);
  const ang = 14 * Math.exp(-t / 22) * Math.cos(t * 0.32);
  const s = springAt(f, at, 30, 12, 180);
  return (
    <div style={{ position: "absolute", left: 540, top: 1090, transformOrigin: "0 0", transform: `rotate(${ang}deg) scale(${mix(1.1, 1, clamp(s))})`, opacity: clamp(s * 3), zIndex: 4 }}>
      <Pin color="#2B2B2B" />
      <svg width={300} height={70} style={{ position: "absolute", left: -150, top: 8 }}>
        <path d="M 150 4 L 20 66 M 150 4 L 280 66" stroke="#3A2A1A" strokeWidth={3} fill="none" />
      </svg>
      <div style={{ position: "absolute", left: -250, top: 70, width: 500, borderRadius: 14, background: "#FFFDF7", boxShadow: "0 16px 30px rgba(60,35,10,.4)", padding: "26px 24px", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.gray }}>ADMISSIONS OFFICE</div>
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.03em", color: C.coralDeep, marginTop: 4 }}>CLOSED</div>
        <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>back Monday, 8:30</div>
      </div>
    </div>
  );
};

const Msg: React.FC<{ text: string; time: string; rtl?: boolean; size?: number }> = ({ text, time, rtl, size = 46 }) => (
  <div>
    <div dir={rtl ? "rtl" : undefined} style={{ fontSize: size, fontWeight: 650, lineHeight: 1.2, fontFamily: rtl ? AR : FONT }}>{text}</div>
    <div style={{ fontFamily: MONO, fontSize: 22, color: "#5B7A55", marginTop: 8, textAlign: "right" }}>{time} ✓✓</div>
  </div>
);

/* camera over the board: [frame, scale, centre y] */
const CAM: [number, number, number][] = [
  [0, 1.08, 760],
  [CLOSED - 20, 1.0, 980],
  [DROP - 4, 1.0, 980],
  [DROP + 16, 1.0, 1980],
  [ASKS - 6, 1.0, 1980],
  [ASKS + 12, 1.0, 2420],
  [LANG[0] - 10, 1.0, 2420],
  [LANG[0] + 6, 1.0, 2660],
  [HANDS - 10, 1.0, 2660],
  [HANDS + 16, 0.78, 2380],
  [MONDAY - 8, 0.78, 2380],
  [MONDAY + 18, 0.533, 1800],
];
const camAt = (f: number) => {
  let [, s, y] = CAM[0];
  for (let i = 1; i < CAM.length; i++) {
    const [k0, s0, y0] = CAM[i - 1];
    const [k1, s1, y1] = CAM[i];
    if (f >= k0) {
      const t = tw(f, k0, k1, 0, 1, E.cubicInOut);
      s = mix(s0, s1, t); y = mix(y0, y1, t);
    }
  }
  const hy = 960 / s;
  y = clamp(y, hy, BH - hy);
  return { s, y };
};

/* pin points for the yarn (board coords) */
const P = {
  agent: [540, 1703] as [number, number],
  doc: [[200, 2033], [540, 2073], [880, 2033]] as [number, number][],
  chat: [540, 2213] as [number, number],
  age: [290, 2643] as [number, number],
  sect: [790, 2643] as [number, number],
  visit: [320, 3003] as [number, number],
  schol: [800, 2983] as [number, number],
  sign: [540, 1093] as [number, number],
};

export const PlaybookSchool: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const { s, y } = camAt(f);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const yarns: Yarn[] = [
    ...P.doc.map((d, i) => ({ a: d, b: P.agent, at: DOCS[i] + 2, sag: 40 })),
    { a: P.agent, b: P.chat, at: ASKS, sag: 30 },
    { a: P.chat, b: P.age, at: AGE - 4, sag: 70 },
    { a: P.chat, b: P.sect, at: SECTION - 4, sag: 70 },
    { a: P.sect, b: P.visit, at: VISIT - 2, sag: 90 },
    { a: P.visit, b: P.schol, at: SCHOL, sag: 50 },
    { a: P.schol, b: P.sign, at: HANDS - 2, dur: 22, sag: -200 },
  ];
  const pile = [
    { t: "price?", x: 680, y: 930, r: 8 },
    { t: "how much?", x: 820, y: 1010, r: -6 },
    { t: "¿precio?", x: 700, y: 1080, r: -3 },
    { t: "fees??", x: 860, y: 900, r: 12 },
    { t: "tarif ?", x: 640, y: 1010, r: 5 },
    { t: "price pls", x: 780, y: 1130, r: -9 },
  ];
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transformOrigin: "0 0", transform: `translate(${540 - 540 * s}px, ${960 - y * s}px) scale(${s})` }}>
        <Cork />
        {/* already on the board at frame 0: the admissions poster (the 10 PM notes get pinned over it) */}
        <Note x={540} y={150} w={460} at={-20} rot={2} bg="#FFFFFF" pin="#2B86CC" pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.coral }}>ADMISSIONS 2026–27</div>
          <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 6 }}>Enrol now 🎒</div>
          <div style={{ fontSize: 26, color: C.gray, marginTop: 8 }}>Kindergarten → Middle school · Bilingual program</div>
        </Note>
        <Note x={620} y={600} w={330} at={-18} rot={-4} bg={PAPER.pink} pin="#F2B544" pad={20}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Open day · Sat 10:00</div>
        </Note>
        {/* ── night: the 10 PM questions ── */}
        <Note x={110} y={200} w={380} at={-14} rot={-4} bg={PAPER.yellow}>
          <div style={{ fontSize: 30, fontFamily: MONO, color: C.gray }}>☀️ admissions open</div>
          <div style={{ position: "relative", display: "inline-block", fontSize: 92, fontWeight: 800, letterSpacing: "-0.04em" }}>
            10 AM
            {f >= DONT + 6 ? <div style={{ position: "absolute", left: -8, right: -8, top: "52%", height: 9, borderRadius: 5, background: C.coral, transform: `scaleX(${tw(f, DONT + 6, DONT + 14, 0, 1, E.cubicInOut)})`, transformOrigin: "0 50%" }} /> : null}
          </div>
        </Note>
        <Note x={560} y={260} w={420} at={PM - 3} rot={4} bg={PAPER.navy} pin="#F2B544" style={{ color: "#F4F1EA" }}>
          <div style={{ fontSize: 30, fontFamily: MONO, color: "#AFC0E8" }}>🌙 parents, actually</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: "-0.04em" }}>10 PM</div>
        </Note>
        <Note x={600} y={560} w={330} at={ASLEEP - 2} rot={-3} bg={PAPER.white} pad={20}>
          <div style={{ fontSize: 38, fontWeight: 700 }}>kids asleep 😴</div>
        </Note>
        <Note x={90} y={560} w={420} at={FEES - 3} rot={-2} bg={PAPER.green}>
          <Msg text="Fees for grade 1?" time="10:04 PM" />
        </Note>
        <Note x={130} y={800} w={380} at={LEVELS - 3} rot={3} bg={PAPER.green}>
          <Msg text="Which levels?" time="10:12 PM" />
        </Note>
        <Note x={90} y={1020} w={400} at={BRIT - 3} rot={-3} bg={PAPER.green}>
          <Msg text="Bilingual program?" time="10:31 PM" />
        </Note>
        {pile.map((p, i) => (
          <Note key={i} x={p.x} y={p.y} w={200} at={BRIT + 8 + i * 3} rot={p.r} bg={i % 2 ? PAPER.white : PAPER.pink} pad={16} fall={PILE - 4 + i * 2} seed={i + 3} pin={i % 2 ? "#2B86CC" : "#D23B3B"}>
            <div style={{ fontSize: 34, fontWeight: 700, fontFamily: FONT, textAlign: "center" }}>{p.t}</div>
          </Note>
        ))}
        <Sign at={CLOSED - 3} />
        {/* ── the playbook ── */}
        <Note x={90} y={1420} w={900} at={DROP} rot={-1} bg={PAPER.white} pad={36}>
          <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: "0.16em", color: C.coral }}>THE PLAYBOOK</div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>School admissions</div>
        </Note>
        <Note x={300} y={1700} w={480} at={AGENT - 2} rot={1} bg={C.white} pin="#F2B544" pad={26}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 86, height: 86, borderRadius: 24, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mark height={50} color={C.cream} stroke={26} />
            </div>
            <div>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>Admissions Assistant</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 28, color: C.gray, opacity: tw(f, WAPP - 2, WAPP + 4, 0, 1, E.linear) }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: "#25D366" }} /> on WhatsApp
              </div>
            </div>
          </div>
        </Note>
        {[
          { t: "Brochure.pdf", icon: "file" as const },
          { t: "Fees 2026–27", icon: "card" as const },
          { t: "Programs", icon: "book" as const },
        ].map((d, i) => (
          <Note key={d.t} x={[60, 400, 740][i]} y={i === 1 ? 2070 : 2030} w={280} at={DOCS[i] - 3} rot={[-4, 2, 4][i]} bg={PAPER.blue} pin="#2B86CC" pad={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name={d.icon} size={40} color="#2B5E9C" stroke={2.2} />
              <div style={{ fontSize: 32, fontWeight: 700 }}>{d.t}</div>
            </div>
          </Note>
        ))}
        {/* the chat, pinned up like a screenshot */}
        <Note x={70} y={2210} w={940} at={ASKS - 3} rot={-1} bg={PAPER.white} pad={30}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ alignSelf: "flex-end", maxWidth: 700, padding: "18px 24px", borderRadius: "26px 26px 6px 26px", background: "#D9FDD3", fontSize: 40 }}>Hi! How much is Grade 1?</div>
            {f >= ANSW - 2 ? (
              <div style={{ alignSelf: "flex-start", maxWidth: 820, padding: "18px 24px", borderRadius: "26px 26px 26px 6px", background: "#F2F0EA", fontSize: 38, lineHeight: 1.3, opacity: tw(f, ANSW - 2, ANSW + 4, 0, 1, E.linear) }}>
                <div style={{ fontSize: 22, fontWeight: 650, color: C.coral }}>✨ AI assistant</div>
                Grade 1 fees depend on the program. Here's our fee sheet 👇 How old is your child, and which program interests you?
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, background: C.white, fontSize: 28, fontWeight: 650, color: "#2B5E9C" }}>
                  <Icon name="file" size={28} color="#2B5E9C" stroke={2.2} /> Fees 2026–27.pdf
                </div>
              </div>
            ) : null}
          </div>
        </Note>
        <Note x={80} y={2640} w={420} at={AGE - 3} rot={-3} bg={PAPER.yellow} pin="#2B86CC">
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.gray }}>CHILD'S AGE</div>
          <div style={{ fontSize: 60, fontWeight: 800 }}>6 years</div>
        </Note>
        <Note x={580} y={2640} w={420} at={SECTION - 3} rot={3} bg={PAPER.yellow} pin="#2B86CC">
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.gray }}>PROGRAM</div>
          <div style={{ fontSize: 60, fontWeight: 800 }}>Bilingual</div>
        </Note>
        {["Hello", "Hola", "Bonjour", "Olá", "مرحبا"].map((t, i) => (
          <Note key={t} x={[60, 250, 440, 630, 820][i]} y={[2850, 2880, 2845, 2885, 2850][i]} w={190} at={LANG[i] - 2} rot={[-5, 3, -2, 4, -4][i]} bg={[PAPER.green, PAPER.blue, PAPER.pink, PAPER.yellow, PAPER.white][i]} pad={14}>
            <div dir={i === 4 ? "rtl" : undefined} style={{ fontSize: 40, fontWeight: 800, textAlign: "center", fontFamily: i === 4 ? AR : FONT }}>{t}</div>
          </Note>
        ))}
        <Note x={100} y={3000} w={440} at={VISIT - 3} rot={-2} bg={C.white} pin="#D23B3B" pad={0}>
          <div style={{ background: C.coral, color: C.white, padding: "14px 24px", fontFamily: MONO, fontSize: 26, letterSpacing: "0.12em" }}>SATURDAY</div>
          <div style={{ padding: "18px 24px 24px" }}>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.03em" }}>10:00</div>
            <div style={{ fontSize: 32, fontWeight: 600 }}>Campus visit</div>
            <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: C.greenTint, color: C.green, fontSize: 26, fontWeight: 700, opacity: tw(f, BOOKS - 2, BOOKS + 4, 0, 1, E.linear) }}>
              <Icon name="check" size={24} color={C.green} stroke={3} /> Booked
            </div>
          </div>
        </Note>
        <Note x={600} y={2980} w={400} at={SCHOL - 3} rot={4} bg={PAPER.green}>
          <Msg text="Any scholarships?" time="9:48 PM" size={42} />
        </Note>
        <Note x={590} y={3170} w={420} at={CHECK - 2} rot={-2} bg="#F2F0EA" pad={24}>
          <div style={{ fontSize: 22, fontWeight: 650, color: C.coral }}>✨ AI assistant</div>
          <div style={{ fontSize: 34, lineHeight: 1.25 }}>I'll check with the office and get back to you 🙏</div>
          <div style={{ marginTop: 12, display: "inline-block", padding: "8px 16px", borderRadius: 10, background: "#FFF3C4", color: "#6B5200", fontSize: 26, fontWeight: 700, opacity: tw(f, HANDS, HANDS + 6, 0, 1, E.linear) }}>Handed off</div>
        </Note>
        <YarnLayer yarns={yarns} />
      </div>
      {/* Monday morning: the list the office opens to (pinned over the pulled-back board) */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        <Note x={120} y={1180} w={840} at={BOOKED - 2} rot={-2} bg={PAPER.white} pin="#D23B3B" pad={34}>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.coral }}>MONDAY, 8:30</div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.03em" }}>Visits booked</div>
          {[
            ["Sat 10:00", "age 6 · Bilingual"],
            ["Sat 11:30", "age 4 · Standard"],
            ["Mon 16:00", "age 9 · Bilingual"],
          ].map(([a, b], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, fontSize: 36, opacity: tw(f, BOOKED + 4 + i * 4, BOOKED + 10 + i * 4, 0, 1, E.linear) }}>
              <Icon name="check" size={32} color={C.green} stroke={3} />
              <span style={{ fontWeight: 750 }}>{a}</span>
              <span style={{ color: C.gray }}>{b}</span>
            </div>
          ))}
        </Note>
        {f >= BOOKED + 16 ? <Sparkles x={160} y={1180} w={760} h={120} at={BOOKED + 16} color={C.coral} size={36} seed={6} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/playbook-school/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(DONT + 6, "draw", -14, "10 AM struck out"),
  cue(PM - 3, "pin", -5, "10 PM note"),
  cue(ASLEEP - 2, "pin", -8, "kids asleep"),
  cue(FEES - 3, "pin", -6, "fees?"),
  cue(LEVELS - 3, "pin", -6, "levels?"),
  cue(BRIT - 3, "pin", -6, "bilingual program?"),
  ...[0, 1, 2, 3, 4, 5].map((i) => cue(BRIT + 8 + i * 3, "pin", -13, `price note ${i + 1}`)),
  cue(CLOSED - 3, "pin", -5, "office sign"),
  cue(CLOSED, "flip", -8, "sign swings"),
  cue(DROP, "pin", -3, "the playbook slams on"),
  cue(DROP + 4, "whoosh", -9, "down the board"),
  cue(AGENT - 2, "pin", -6, "the agent card"),
  ...DOCS.map((d, i) => cue(d - 3, "pin", -8, `doc ${i + 1}`)),
  ...DOCS.map((d, i) => cue(d + 2, "draw", -15, `yarn ${i + 1}`)),
  cue(ASKS - 3, "pin", -6, "the chat"),
  cue(ASKS, "draw", -15, "yarn to the chat"),
  cue(ASKS + 8, "whoosh", -12, "down the board"),
  cue(ANSW - 2, "receive", -5, "the answer"),
  cue(AGE - 3, "pin", -6, "age"),
  cue(SECTION - 3, "pin", -6, "section"),
  ...LANG.map((l, i) => cue(l - 2, "pin", -8, `hello ${i + 1}`)),
  cue(VISIT - 3, "pin", -5, "campus visit"),
  cue(BOOKS - 2, "check", -6, "booked"),
  cue(SCHOL - 3, "pin", -6, "scholarship?"),
  cue(CHECK - 2, "pin", -7, "I'll check with the office"),
  cue(HANDS - 2, "draw", -9, "yarn back up to the office"),
  cue(HANDS + 2, "zoom", -11, "pull back"),
  cue(MONDAY, "zoom", -8, "the whole board"),
  cue(BOOKED - 2, "pin", -4, "Monday: visits booked"),
  cue(BOOKED + 8, "check", -7, "visits"),
  cue(PILE - 4, "paper", -6, "the price pile drops off"),
  cue(PILE + 2, "paper", -9, "more paper"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, ASKS, HANDS, MONDAY, HIT, CTA, URL, DUR };

export const PLAYBOOKSCHOOL: FilmDef = { id: "PlaybookSchool", slug: "playbook-school", title: "Playbook · School admissions", component: PlaybookSchool, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/playbook-school/mix.wav" };
