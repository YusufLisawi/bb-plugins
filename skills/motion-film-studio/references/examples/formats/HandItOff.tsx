import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { useLayout } from "../../kit/format";
import { Grain, Sparkles, Stamp, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { ChannelGlyph, Icon, IconName } from "../../kit/ui";
import { Kinetic } from "../../kit/type";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/hand-it-off/vo/lines.json";
import words from "../../../../public/films/hand-it-off/vo/words.json";

loadFonts();

/**
 * 5 JOBS TO HAND OFF — a listicle printed on a thermal receipt. Each job
 * prints line by line on the words, and is stamped HANDED TO AI. At the end
 * the receipt tears off and flies away: nothing left on your plate.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const TEAR = w("l07", 3);
const HIT = w("l08", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l08", i));
const CTA = w("l09", 0) - 2;
const URL = w("l09", T.nwords("l09") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l09") + 60);

const SLOT = 1440; // the printer's slot (paper rises out of it)
const PX = 160; //   paper left
const PW = 760; //   paper width
const PAPER = "#FBFAF5";
const INK = "#23211E";

/* ── what prints, and when ── */
type Row = { at: number; h: number; el: React.ReactNode; side?: { icon?: IconName; ch?: "whatsapp" | "instagram" | "web"; text: string; right?: boolean } };
const mono = (size: number, weight = 500, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, fontWeight: weight, color: INK, letterSpacing: "0.02em", whiteSpace: "nowrap", ...extra });
const Dots: React.FC = () => <div style={{ height: 30, display: "flex", alignItems: "center" }}><div style={{ flex: 1, borderTop: `4px dotted ${INK}`, opacity: 0.45 }} /></div>;
const Big: React.FC<{ n: string; title: string }> = ({ n, title }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
    <div style={{ fontFamily: FONT, fontSize: 210, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.82, color: INK }}>{n}</div>
    <div style={{ ...mono(44, 700), whiteSpace: "normal", lineHeight: 1.08, paddingBottom: 8 }}>{title}</div>
  </div>
);
const Item: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => <div style={mono(37, 500, { opacity: muted ? 0.6 : 1 })}>{children}</div>;

const ROWS: Row[] = [
  { at: 4, h: 70, el: <div style={mono(30, 700, { textAlign: "center", letterSpacing: "0.3em" })}>* * * * * * * *</div> },
  { at: w("l01", 0), h: 150, el: <div style={{ fontFamily: FONT, fontSize: 150, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, textAlign: "center", color: INK }}>5 JOBS</div> },
  { at: w("l01", 4), h: 56, el: <div style={mono(34, 700, { textAlign: "center" })}>TO HAND TO AN AI</div> },
  { at: w("l01", 8), h: 56, el: <div style={mono(30, 500, { textAlign: "center" })}>THIS WEEK · NO. 0001</div> },
  { at: w("l01", 9) + 6, h: 40, el: <Dots /> },
  // 05
  { at: w("l02", 0), h: 180, el: <Big n="05" title="THE DAILY QUESTIONS" /> },
  { at: w("l02", 9), h: 58, el: <Item>› hours?</Item>, side: { ch: "whatsapp", text: "Open 8–6 today!", right: false } },
  { at: w("l02", 10), h: 58, el: <Item>› prices?</Item> },
  { at: w("l02", 13), h: 58, el: <Item>› do you deliver?</Item>, side: { ch: "instagram", text: "Yes, free over $30", right: true } },
  { at: w("l02", 13) + 14, h: 96, el: <Dots /> },
  // 04
  { at: w("l03", 0), h: 180, el: <Big n="04" title="BOOKINGS" /> },
  { at: w("l03", 4), h: 58, el: <Item>› checks your calendar</Item> },
  { at: w("l03", 8), h: 58, el: <Item>› books the slot: FRI 10:30</Item>, side: { icon: "calendar", text: "Booked · Fri 10:30", right: true } },
  { at: w("l03", 10) + 10, h: 96, el: <Dots /> },
  // 03
  { at: w("l04", 0), h: 180, el: <Big n="03" title="NEW LEADS" /> },
  { at: w("l04", 5), h: 58, el: <Item>› asks the right questions</Item> },
  { at: w("l04", 10), h: 58, el: <Item>› saves name · email · need</Item>, side: { icon: "userPlus", text: "New lead saved", right: false } },
  { at: w("l04", 12) + 10, h: 96, el: <Dots /> },
  // 02
  { at: w("l05", 0), h: 180, el: <Big n="02" title="YOUR TEAM'S QUESTIONS" /> },
  { at: w("l05", 6), h: 58, el: <Item>› the handbook</Item>, side: { icon: "book", text: "Answered in Slack", right: true } },
  { at: w("l05", 8), h: 58, el: <Item>› the process</Item> },
  { at: w("l05", 10), h: 58, el: <Item>› the Wi-Fi password</Item> },
  { at: w("l05", 11) + 12, h: 96, el: <Dots /> },
  // 01
  { at: w("l06", 1), h: 180, el: <Big n="01" title="FOLLOW-UPS" /> },
  { at: w("l06", 5), h: 58, el: <Item>› the customers you</Item> },
  { at: w("l06", 7), h: 58, el: <Item>{"  meant to message back"}</Item>, side: { icon: "mail", text: "Follow-up sent", right: false } },
  { at: w("l06", 10) + 8, h: 96, el: <Dots /> },
  // total
  { at: w("l07", 0), h: 64, el: <div style={{ ...mono(36, 700), display: "flex", justifyContent: "space-between" }}><span>ON YOUR PLATE</span><span>0</span></div> },
  { at: w("l07", 1) + 4, h: 70, el: <div style={mono(26, 500, { textAlign: "center", opacity: 0.7 })}>THANK YOU · COME AGAIN</div> },
];
const OFFS = ROWS.map((_, i) => ROWS.slice(0, i).reduce((a, r) => a + r.h, 0) + 40);
const STAMPS = [9, 13, 17, 22, 26].map((row) => ({ at: ROWS[row].at + 3, row }));

/** printed length at frame f (each row feeds out over 6 frames) */
const printed = (f: number) => 40 + ROWS.reduce((a, r) => a + r.h * tw(f, r.at, r.at + 6, 0, 1, E.cubicInOut), 0);

const Receipt: React.FC<{ f: number }> = ({ f }) => {
  const len = printed(f);
  const tear = tw(f, TEAR, TEAR + 22, 0, 1, E.expoIn);
  const top = SLOT - len;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: SLOT, overflow: tear > 0 ? "visible" : "hidden" }}>
      <div style={{ position: "absolute", left: PX, top, width: PW, height: len + 30, transformOrigin: `${PW / 2}px ${len}px`, transform: `translateY(${-tear * 2000}px) rotate(${-tear * 14}deg)` }}>
        {/* the paper with a zigzag top edge */}
        <div style={{ position: "absolute", inset: 0, background: PAPER, boxShadow: "0 30px 60px rgba(60,40,20,.18)", clipPath: `polygon(${Array.from({ length: 21 }, (_, i) => `${i * 5}% ${i % 2 ? 0 : 14}px`).join(", ")}, 100% 100%, 0 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.04), rgba(0,0,0,0) 12%, rgba(0,0,0,0) 88%, rgba(0,0,0,.04))" }} />
        {ROWS.map((r, i) => (f >= r.at ? <div key={i} style={{ position: "absolute", left: 40, right: 40, top: OFFS[i], height: r.h, display: "flex", flexDirection: "column", justifyContent: "center" }}>{r.el}</div> : null))}
        {STAMPS.map((s, i) => (f >= s.at ? <Stamp key={i} at={s.at} text="HANDED TO AI" x={i % 2 ? 470 : 260} y={OFFS[s.row] + 48} rot={i % 2 ? 4 : -5} size={42} /> : null))}
        {/* side chips (proof), outside the paper */}
        {ROWS.map((r, i) => {
          if (!r.side || f < r.at + 4) return null;
          const s = clamp(springAt(f, r.at + 4, 30, 12, 180));
          const right = r.side.right;
          return (
            <div key={`s${i}`} style={{ position: "absolute", top: OFFS[i] - 10, left: PW - 110, width: 230, transform: `scale(${mix(0.4, 1, s)}) rotate(${right ? 4 : -3}deg)`, transformOrigin: "0% 50%", opacity: clamp(s * 2), display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 18, background: C.white, boxShadow: "0 14px 30px rgba(60,40,20,.2), 0 0 0 3px rgba(217,87,89,.25)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.ink, zIndex: 3 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {r.side.ch ? <ChannelGlyph ch={r.side.ch} size={26} /> : <Icon name={r.side.icon!} size={26} color={C.coral} stroke={2.4} />}
              </div>
              <div style={{ lineHeight: 1.1 }}>{r.side.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Printer: React.FC<{ f: number }> = ({ f }) => {
  const inS = clamp(springAt(f, 0, 30, 14, 150));
  const out = tw(f, TEAR + 8, TEAR + 26, 0, 1, E.expoIn);
  const busy = ROWS.some((r) => f >= r.at && f < r.at + 7);
  const shake = busy ? Math.sin(f * 1.3) * 1.2 : 0;
  return (
    <div style={{ position: "absolute", left: 100, top: SLOT - 30, width: 880, height: 210, transform: `translateY(${(1 - inS) * 400 + out * 900 + shake}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 40, background: "linear-gradient(180deg, #3A3836, #242220)", boxShadow: "0 40px 80px rgba(40,25,10,.35), inset 0 2px 0 rgba(255,255,255,.12)" }} />
      <div style={{ position: "absolute", left: 50, top: 18, width: 780, height: 22, borderRadius: 11, background: "#0E0D0C", boxShadow: "inset 0 4px 8px rgba(0,0,0,.6)" }} />
      <div style={{ position: "absolute", left: 60, top: 90, fontFamily: MONO, fontSize: 24, letterSpacing: "0.2em", color: "rgba(255,255,255,.5)" }}>TO-DO PRINTER</div>
      <div style={{ position: "absolute", right: 60, top: 92, width: 20, height: 20, borderRadius: 10, background: busy ? "#4CE08A" : "#2B7A4F", boxShadow: busy ? "0 0 16px #4CE08A" : "none" }} />
    </div>
  );
};

export const HandItOff: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: "#EFE8DC" }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(60,40,20,.08) 2px, transparent 2px)", backgroundSize: "36px 36px" }} />
      <div style={{ position: "absolute", left: 540 - 520 + Math.sin(f * 0.01) * 40, top: 300, width: 1040, height: 1040, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,87,89,.10), rgba(217,87,89,0) 65%)" }} />
      <div style={{ position: "absolute", inset: 0, transformOrigin: "540px 1400px", transform: `scale(${mix(1.5, 1, tw(printed(f), 260, 1250, 0, 1, E.cubicInOut)) * (1 + 0.02 * Math.sin(f * 0.03))})` }}>
        <Receipt f={f} />
        <Printer f={f} />
      </div>
      {f >= TEAR ? <Sparkles x={200} y={600} w={680} h={600} at={TEAR + 4} color={C.coral} size={50} seed={2} /> : null}
      <Kinetic from={TEAR + 2} to={HIT - 10} y={740} size={130} align="center" color={C.ink} hi={C.coral} shineAt={TEAR + 14} shineHi="#FFC2BA" words={[
        { t: "Off", at: TEAR + 2 },
        { t: "your", at: TEAR + 5, br: true },
        { t: "plate.", at: TEAR + 8, hi: true },
      ]} />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("films/hand-it-off/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  cue(0, "poweron", -6, "printer on"),
  ...ROWS.map((r, i) => cue(r.at, i % 3 === 0 ? "keys" : "type", -9, `print row ${i + 1}`)),
  ...ROWS.filter((r) => r.side).map((r, i) => cue(r.at + 4, "pop", -7, `chip ${i + 1}`)),
  ...STAMPS.map((s, i) => cue(s.at, "impact", -7, `stamp ${i + 1}`, { kind: "hit" })),
  ...STAMPS.map((s, i) => cue(s.at + 1, "snap", -4, `stamp ${i + 1} snap`)),
  cue(w("l02", 0), "riser", -8, "into number five"),
  cue(TEAR - 2, "flip", -2, "tear"),
  cue(TEAR + 8, "whoosh", -4, "the receipt flies off"),
  cue(TEAR + 6, "shimmer", -8, "sparkles"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { TEAR, HIT, CTA, URL, DUR };

export const HANDITOFF: FilmDef = {
  id: "HandItOff",
  slug: "hand-it-off",
  title: "HandItOff",
  component: HandItOff,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/hand-it-off/mix.wav",
};
