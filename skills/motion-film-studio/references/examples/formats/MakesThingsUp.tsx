import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import type { FilmDef, FilmProps } from "../registry";
import { BOARD, Board, CHALK, CHALK_G, CHALK_R, CHALK_Y, Chalk, ChalkDefs, Stroke, Write } from "./chalk";
import lines from "../../../../public/films/makes-things-up/vo/lines.json";
import words from "../../../../public/films/makes-things-up/vo/words.json";

loadFonts();

/**
 * WHY AI MAKES THINGS UP — AI, explained · 04. A chalkboard lesson: an AI
 * guesses the next word, so it can sound right without being right
 * (a "hallucination"). The fix is an open-book exam: look it up in your own
 * documents first, and ask a human when the answer isn't there.
 * Every scene is written in chalk and wiped with a felt eraser.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

/* ── beats ── */
const CONF = w("l01", 6);
const HALL = w("l02", 3);
const WHY = w("l03", 0);
const GUESS = w("l04", 3);
const SOUND_R = w("l05", 4);
const IS_R = w("l05", 9);
const REFUND = w("l06", 4);
const INVENT = w("l06", 8);
const YOURS = w("l07", 2);
const FIX = w("l08", 0);
const OPEN = w("l08", 4);
const EXAM = w("l08", 6);
const LOOKS = w("l09", 4);
const DOCS = w("l09", 10);
const FINDS = w("l09", 16);
const THERE = w("l10", 5);
const NOGUESS = w("l10", 8);
const ASKS = w("l10", 10);
const CLOSED = w("l11", 0);
const CGUESS = w("l11", 3);
const OPENB = w("l12", 0);
const CHECKS = w("l12", 3);
const HIT = w("l13", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l13", i));
const CTA = w("l14", 0) - 2;
const URL = w("l14", T.nwords("l14") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l14") + 60);

/* scene windows: [from, erase] */
const S1: [number, number] = [4, WHY - 8];
const S2: [number, number] = [WHY + 10, T.VO.l06 - 14];
const S3: [number, number] = [T.VO.l06 - 2, FIX - 14];
const S4: [number, number] = [FIX - 2, T.VO.l09 - 14];
const S5: [number, number] = [T.VO.l09 - 2, T.VO.l10 - 14];
const S6: [number, number] = [T.VO.l10 - 2, CLOSED - 14];
const S7: [number, number] = [CLOSED - 4, HIT - 16];

/* ── helpers ── */
const rect = (x: number, y: number, ww: number, h: number) => `M ${x} ${y} L ${x + ww} ${y} L ${x + ww} ${y + h} L ${x} ${y + h} Z`;
const check = (x: number, y: number, s = 1) => `M ${x} ${y} L ${x + 22 * s} ${y + 24 * s} L ${x + 64 * s} ${y - 30 * s}`;
const cross = (x: number, y: number, s = 1) => `M ${x} ${y} L ${x + 60 * s} ${y + 60 * s} M ${x + 60 * s} ${y} L ${x} ${y + 60 * s}`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M ${cx - rx} ${cy} C ${cx - rx} ${cy - ry * 1.1}, ${cx + rx * 1.05} ${cy - ry * 1.05}, ${cx + rx} ${cy} C ${cx + rx * 0.98} ${cy + ry * 1.1}, ${cx - rx * 1.1} ${cy + ry}, ${cx - rx * 0.96} ${cy - ry * 0.2}`;
const openBook = (cx: number, cy: number, s = 1) =>
  `M ${cx} ${cy - 70 * s} C ${cx - 60 * s} ${cy - 100 * s}, ${cx - 130 * s} ${cy - 95 * s}, ${cx - 170 * s} ${cy - 70 * s} L ${cx - 170 * s} ${cy + 80 * s} C ${cx - 130 * s} ${cy + 55 * s}, ${cx - 60 * s} ${cy + 50 * s}, ${cx} ${cy + 80 * s} C ${cx + 60 * s} ${cy + 50 * s}, ${cx + 130 * s} ${cy + 55 * s}, ${cx + 170 * s} ${cy + 80 * s} L ${cx + 170 * s} ${cy - 70 * s} C ${cx + 130 * s} ${cy - 95 * s}, ${cx + 60 * s} ${cy - 100 * s}, ${cx} ${cy - 70 * s} L ${cx} ${cy + 80 * s} M ${cx - 140 * s} ${cy - 40 * s} L ${cx - 40 * s} ${cy - 50 * s} M ${cx - 140 * s} ${cy - 5 * s} L ${cx - 40 * s} ${cy - 15 * s} M ${cx - 140 * s} ${cy + 30 * s} L ${cx - 40 * s} ${cy + 20 * s} M ${cx + 40 * s} ${cy - 50 * s} L ${cx + 140 * s} ${cy - 40 * s} M ${cx + 40 * s} ${cy - 15 * s} L ${cx + 140 * s} ${cy - 5 * s}`;
const closedBook = (cx: number, cy: number, s = 1) => `${rect(cx - 110 * s, cy - 80 * s, 220 * s, 160 * s)} M ${cx - 90 * s} ${cy - 80 * s} L ${cx - 90 * s} ${cy + 80 * s} M ${cx - 40 * s} ${cy - 30 * s} L ${cx + 70 * s} ${cy - 30 * s} M ${cx - 40 * s} ${cy} L ${cx + 50 * s} ${cy}`;
const person = (cx: number, cy: number) => `M ${cx} ${cy - 60} m -26 0 a 26 26 0 1 0 52 0 a 26 26 0 1 0 -52 0 M ${cx} ${cy - 34} L ${cx} ${cy + 40} M ${cx - 44} ${cy - 6} L ${cx + 44} ${cy - 6} M ${cx} ${cy + 40} L ${cx - 34} ${cy + 96} M ${cx} ${cy + 40} L ${cx + 34} ${cy + 96}`;

const Label: React.FC<{ x: number; y: number; at: number; children: React.ReactNode; color?: string; size?: number }> = ({ x, y, at, children, color = "rgba(243,240,227,.72)", size = 26 }) => (
  <Write at={at} dur={8} x={x} y={y} size={size} color={color} weight={500}>
    <span style={{ fontFamily: MONO, letterSpacing: "0.12em" }}>{children}</span>
  </Write>
);

/* ── scenes ── */
const Scene1: React.FC = () => (
  <Board from={S1[0]} out={S1[1]}>
    <Label x={110} y={660} at={8}>YOU ASKED</Label>
    <Stroke d={rect(100, 700, 880, 170)} at={6} dur={14} />
    <Write at={12} dur={26} x={130} y={730} size={50}>{"Who won Lyon's best\ncroissant award in 1987?"}</Write>
    <Label x={110} y={930} at={52}>AI ANSWERED</Label>
    <Stroke d={rect(100, 970, 880, 240)} at={50} dur={14} color={CHALK_Y} />
    <Write at={58} dur={34} x={130} y={1000} size={50} color={CHALK_Y}>{"Boulangerie Martin!\nFamous for its lemon tart,\nfounded in 1952."}</Write>
    <Write at={CONF} dur={10} x={640} y={1240} size={42} italic color={CHALK_Y}>(so sure!)</Write>
    <Stroke d={ellipse(540, 1090, 490, 170)} at={HALL - 2} dur={14} color={CHALK_R} width={9} />
    <Stroke d="M 820 1380 C 780 1320, 720 1300, 700 1270" at={HALL + 8} dur={8} color={CHALK_R} width={8} />
    <Write at={HALL + 10} dur={12} x={650} y={1380} size={78} weight={800} color={CHALK_R}>MADE UP</Write>
  </Board>
);

const Scene2: React.FC = () => (
  <Board from={S2[0]} out={S2[1]}>
    <Write at={S2[0]} dur={20} x={100} y={680} size={52}>{"The best croissant\nin Lyon is from ___"}</Write>
    {[
      ["Martin", 62],
      ["Paul", 21],
      ["Pierre", 9],
    ].map(([t, p], i) => {
      const at = T.VO.l04 + 8 + i * 6;
      const y = 900 + i * 110;
      return (
        <React.Fragment key={t as string}>
          <Write at={at} dur={8} x={120} y={y} size={50} color={i === 0 ? CHALK_Y : CHALK}>{t as string}</Write>
          <Stroke d={`M 400 ${y + 32} L ${400 + (p as number) * 7} ${y + 32}`} at={at + 4} dur={10} color={i === 0 ? CHALK_Y : CHALK} width={26} />
          <Write at={at + 12} dur={6} x={420 + (p as number) * 7} y={y + 4} size={40} color="rgba(243,240,227,.7)">{`${p}%`}</Write>
        </React.Fragment>
      );
    })}
    <Stroke d={ellipse(220, 932, 130, 50)} at={GUESS} dur={12} color={CHALK_Y} width={7} />
    <Stroke d="M 100 1260 L 980 1260 M 540 1240 L 540 1620" at={T.VO.l05 - 6} dur={12} />
    <Write at={T.VO.l05} dur={12} x={130} y={1280} size={46} weight={800}>SOUNDS RIGHT</Write>
    <Write at={T.VO.l05 + 6} dur={10} x={620} y={1280} size={46} weight={800}>IS RIGHT</Write>
    <Stroke d={check(230, 1470, 1.6)} at={SOUND_R} dur={10} color={CHALK_G} width={12} />
    <Write at={IS_R - 2} dur={8} x={700} y={1380} size={180} weight={800} color={CHALK_R}>?</Write>
  </Board>
);

const Scene3: React.FC = () => (
  <Board from={S3[0]} out={S3[1]}>
    <Label x={110} y={640} at={S3[0]}>A CUSTOMER ASKS</Label>
    <Write at={REFUND - 12} dur={18} x={110} y={690} size={56}>{"What's your\nrefund policy?"}</Write>
    <Label x={110} y={900} at={INVENT - 10}>AI (NO DOCUMENTS)</Label>
    <Stroke d={rect(100, 940, 880, 250)} at={INVENT - 8} dur={12} color={CHALK_Y} />
    <Write at={INVENT} dur={30} x={130} y={970} size={52} color={CHALK_Y}>{"Full refund within 90 days,\nno questions asked!"}</Write>
    <Stroke d={cross(420, 960, 3.4)} at={YOURS - 4} dur={10} color={CHALK_R} width={14} />
    <Write at={YOURS + 4} dur={14} x={110} y={1300} size={42} weight={800} color={CHALK_G}>{"YOUR REAL POLICY:\n14 days, unused items only."}</Write>
  </Board>
);

const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Board from={S4[0]} out={S4[1]}>
      <Stroke d={openBook(330, 1060, 1.3)} at={OPEN - 2} dur={18} color={CHALK} width={8} />
      <Stroke d={rect(640, 850, 330, 430)} at={EXAM - 6} dur={12} />
      <Write at={EXAM - 2} dur={10} x={680} y={880} size={48} weight={800}>EXAM</Write>
      <Stroke d="M 680 980 L 930 980 M 680 1040 L 900 1040 M 680 1100 L 920 1100 M 680 1160 L 860 1160" at={EXAM + 2} dur={10} width={5} />
      <Write at={EXAM + 10} dur={8} x={820} y={1170} size={96} weight={900} color={CHALK_G}>A+</Write>
      {f >= FIX ? <Sparkles x={120} y={820} w={860} h={520} at={FIX + 2} color={CHALK_Y} size={48} seed={3} /> : null}
    </Board>
  );
};

const DOCSDEF = [
  ["Refund policy", 130],
  ["FAQ", 420],
  ["Prices", 710],
] as const;
const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const hl = tw(f, FINDS - 2, FINDS + 8, 0, 1, E.expoOut);
  const lens = tw(f, LOOKS, FINDS - 2, 0, 1, E.cubicInOut);
  return (
    <Board from={S5[0]} out={S5[1]}>
      <Write at={S5[0]} dur={14} x={110} y={640} size={50}>{"Q: What's your refund policy?"}</Write>
      <Stroke d="M 540 720 L 540 820 M 510 790 L 540 822 L 570 790" at={LOOKS - 4} dur={8} color={CHALK_Y} width={8} />
      <Label x={580} y={750} at={LOOKS - 2} color={CHALK_Y}>LOOKS IT UP</Label>
      {DOCSDEF.map(([t, x], i) => (
        <React.Fragment key={t}>
          <Stroke d={rect(x, 860, 240, 300)} at={DOCS - 8 + i * 4} dur={10} />
          <Write at={DOCS - 4 + i * 4} dur={8} x={x + 20} y={880} size={32} weight={800}>{t}</Write>
          <Stroke d={`M ${x + 20} 960 L ${x + 210} 960 M ${x + 20} 1010 L ${x + 190} 1010 M ${x + 20} 1060 L ${x + 200} 1060 M ${x + 20} 1110 L ${x + 160} 1110`} at={DOCS + i * 4} dur={8} width={4} />
        </React.Fragment>
      ))}
      <div style={{ position: "absolute", left: 140, top: 990, width: 220 * hl, height: 46, background: "rgba(255,212,110,.35)" }} />
      {lens > 0 && lens < 1 ? <Stroke d={`M ${mix(740, 200, lens)} ${mix(1100, 1000, lens)} m -46 0 a 46 46 0 1 0 92 0 a 46 46 0 1 0 -92 0 M ${mix(740, 200, lens) + 32} ${mix(1100, 1000, lens) + 32} l 44 44`} at={0} dur={1} color={CHALK_Y} width={7} /> : null}
      <Label x={110} y={1230} at={FINDS - 2} color={CHALK_G}>ANSWERS FROM WHAT IT FINDS</Label>
      <Write at={FINDS + 2} dur={24} x={110} y={1280} size={52} color={CHALK_G}>{"Refunds within 14 days,\nfor unused items."}</Write>
      <Stroke d={check(820, 1320, 1.4)} at={FINDS + 24} dur={8} color={CHALK_G} width={11} />
    </Board>
  );
};

const Scene6: React.FC = () => (
  <Board from={S6[0]} out={S6[1]}>
    <Write at={S6[0] + 2} dur={16} x={110} y={640} size={50}>{"Q: Can I return a\nbirthday cake?"}</Write>
    {DOCSDEF.map(([t, x], i) => (
      <React.Fragment key={t}>
        <Stroke d={rect(x, 820, 240, 150)} at={S6[0] + 10 + i * 3} dur={8} width={5} />
        <Write at={S6[0] + 12 + i * 3} dur={6} x={x + 20} y={840} size={30} weight={800}>{t}</Write>
      </React.Fragment>
    ))}
    <Write at={THERE - 2} dur={10} x={110} y={1000} size={52} weight={900} color={CHALK_R}>NOT FOUND</Write>
    <Write at={NOGUESS - 10} dur={12} x={110} y={1100} size={48} color="rgba(243,240,227,.6)">{'"Sure, anytime!"'}</Write>
    <Stroke d="M 100 1132 L 520 1128" at={NOGUESS} dur={8} color={CHALK_R} width={10} />
    <Write at={NOGUESS + 2} dur={10} x={560} y={1100} size={40} weight={800} color={CHALK_R}>no guessing</Write>
    <Stroke d={rect(100, 1230, 640, 170)} at={ASKS - 6} dur={10} color={CHALK_Y} />
    <Write at={ASKS - 2} dur={22} x={130} y={1255} size={44} color={CHALK_Y}>{"I've asked a teammate,\nthey'll reply shortly."}</Write>
    <Stroke d={person(880, 1330)} at={ASKS + 8} dur={14} color={CHALK} width={8} />
  </Board>
);

const Scene7: React.FC = () => (
  <Board from={S7[0]} out={S7[1]}>
    <Stroke d="M 540 640 L 540 1600" at={S7[0]} dur={10} width={6} />
    <Stroke d={closedBook(290, 900, 1.2)} at={CLOSED} dur={14} width={8} />
    <Write at={CLOSED + 8} dur={10} x={120} y={1060} size={48} weight={900}>CLOSED BOOK</Write>
    <Write at={CGUESS - 2} dur={10} x={120} y={1140} size={60} weight={900} color={CHALK_R}>guesses</Write>
    <Stroke d={cross(230, 1260, 2)} at={CGUESS + 4} dur={8} color={CHALK_R} width={13} />
    <Stroke d={openBook(810, 900, 0.95)} at={OPENB} dur={14} width={8} />
    <Write at={OPENB + 8} dur={10} x={620} y={1060} size={48} weight={900}>OPEN BOOK</Write>
    <Write at={CHECKS - 2} dur={10} x={620} y={1140} size={60} weight={900} color={CHALK_G}>checks</Write>
    <Stroke d={check(740, 1310, 2)} at={CHECKS + 4} dur={8} color={CHALK_G} width={14} />
  </Board>
);

const BoardBg: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 110% 80% at 50% 45%, #25463D 0%, ${BOARD} 55%, #15292300 100%), ${BOARD}` }}>
    {/* old dusty smudges */}
    {[
      [200, 420, 380, 0.05],
      [820, 1180, 460, 0.045],
      [360, 1560, 420, 0.04],
      [900, 520, 300, 0.035],
    ].map(([x, y, r, a], i) => (
      <div key={i} style={{ position: "absolute", left: x - r, top: y - r * 0.5, width: r * 2, height: r, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(243,240,227,${a}), rgba(243,240,227,0) 70%)` }} />
    ))}
    {/* the chalk tray */}
    <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, height: 70, background: "linear-gradient(180deg, #8A5A34, #6E4526)", boxShadow: "0 -10px 30px rgba(0,0,0,.35)" }} />
    <div style={{ position: "absolute", left: 180, bottom: 44, width: 120, height: 22, borderRadius: 11, background: "#F1EEE2", transform: "rotate(-4deg)" }} />
    <div style={{ position: "absolute", left: 360, bottom: 46, width: 70, height: 20, borderRadius: 10, background: "#FFD46E", transform: "rotate(6deg)" }} />
  </AbsoluteFill>
);

const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, HIT - 14, HIT - 6, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: CHALK }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: CHALK_R }} />
      AI, EXPLAINED · 04
    </div>
  );
};

const H: React.FC<{ from: number; to: number; ws: { t: string; at: number; hi?: boolean; br?: boolean }[]; hi?: string }> = ({ from, to, ws, hi = CHALK_Y }) => <Kinetic from={from} to={to} color={CHALK} hi={hi} words={ws} />;
const Headlines: React.FC = () => (
  <>
    <H from={T.VO.l01} to={T.VO.l02 - 9} ws={[{ t: "Confidently", at: w("l01", 6), br: true }, { t: "made", at: w("l01", 7), hi: true }, { t: "up.", at: w("l01", 8), hi: true }]} />
    <H from={T.VO.l02 - 1} to={T.VO.l03 - 9} hi={CHALK_R} ws={[{ t: "A", at: w("l02", 2) }, { t: "hallucination.", at: w("l02", 3), hi: true }]} />
    <H from={T.VO.l03 - 1} to={T.VO.l04 - 9} ws={[{ t: "Here's", at: w("l03", 0) }, { t: "why.", at: w("l03", 1), hi: true }]} />
    <H from={T.VO.l04 - 1} to={T.VO.l06 - 16} ws={[{ t: "It", at: w("l04", 0) }, { t: "guesses", at: w("l04", 3), hi: true, br: true }, { t: "the", at: w("l04", 4) }, { t: "next", at: w("l04", 5) }, { t: "word.", at: w("l04", 6) }]} />
    <H from={T.VO.l06 - 1} to={T.VO.l07 - 6} ws={[{ t: "Your", at: w("l06", 3) }, { t: "refund", at: w("l06", 4), br: true }, { t: "policy?", at: w("l06", 5), hi: true }]} />
    <H from={T.VO.l07 - 4} to={FIX - 14} hi={CHALK_R} ws={[{ t: "Just", at: w("l07", 0) }, { t: "not", at: w("l07", 1), hi: true, br: true }, { t: "yours.", at: w("l07", 2), hi: true }]} />
    <H from={FIX - 1} to={T.VO.l09 - 12} hi={CHALK_G} ws={[{ t: "The", at: w("l08", 0) }, { t: "fix:", at: w("l08", 1), br: true }, { t: "an", at: w("l08", 3) }, { t: "open-book", at: w("l08", 4), hi: true, br: true }, { t: "exam.", at: w("l08", 6), hi: true }]} />
    <H from={T.VO.l09 - 1} to={T.VO.l10 - 12} hi={CHALK_G} ws={[{ t: "It", at: w("l09", 3) }, { t: "looks", at: w("l09", 4), hi: true }, { t: "it", at: w("l09", 5) }, { t: "up", at: w("l09", 6), hi: true, br: true }, { t: "first.", at: w("l09", 10) }]} />
    <H from={T.VO.l10 - 1} to={CLOSED - 12} hi={CHALK_Y} ws={[{ t: "Not", at: w("l10", 4) }, { t: "there?", at: w("l10", 5), br: true }, { t: "It", at: w("l10", 9) }, { t: "asks", at: w("l10", 10), hi: true }, { t: "a", at: w("l10", 11) }, { t: "human.", at: w("l10", 12), hi: true }]} />
  </>
);

export const MakesThingsUp: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const boardOut = tw(f, HIT - 12, HIT + 2, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: BOARD }}>
      <ChalkDefs />
      <BoardBg />
      <Chalk style={{ opacity: 1 - boardOut }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: "540px 600px", transform: "translateY(50px) scale(1.09)" }}>
          <Scene1 />
          <Scene2 />
          <Scene3 />
          <Scene4 />
          <Scene5 />
          <Scene6 />
          <Scene7 />
        </div>
        <Headlines />
      </Chalk>
      <Series f={f} />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" dark />
      {grain ? <Grain opacity={0.06} /> : null}
      {audio ? <Audio src={staticFile("films/makes-things-up/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
const erase = (at: number, note: string): Cue[] => [cue(at + 6, "whoosh", -9, `eraser: ${note}`)];
export const SOUND: Cue[] = [
  cue(8, "draw", -9, "chalk box"),
  cue(12, "keys", -12, "question written"),
  cue(56, "draw", -10, "answer box"),
  cue(60, "keys", -12, "answer written"),
  cue(CONF, "pop", -8, "so sure"),
  cue(HALL - 2, "draw", -6, "circled"),
  cue(HALL + 10, "miss", -4, "MADE UP"),
  ...erase(S1[1], "scene 1"),
  cue(S2[0], "keys", -12, "sentence"),
  ...[0, 1, 2].map((i) => cue(T.VO.l04 + 12 + i * 6, "tick", -8, `candidate ${i + 1}`)),
  cue(GUESS, "draw", -8, "circles Martin"),
  cue(T.VO.l05 - 6, "draw", -10, "table"),
  cue(SOUND_R, "check", -4, "sounds right"),
  cue(IS_R, "blip", -5, "is right?"),
  ...erase(S2[1], "scene 2"),
  cue(REFUND - 12, "keys", -11, "customer asks"),
  cue(INVENT, "keys", -11, "invented answer"),
  cue(YOURS - 4, "miss", -3, "crossed out"),
  cue(YOURS + 4, "tick", -6, "real policy"),
  ...erase(S3[1], "scene 3"),
  cue(FIX, "riser", -10, "into the fix"),
  ...moments.hit(FIX, "the fix").slice(1, 3).map((c) => ({ ...c, trim: (c.trim ?? 0) - 6 })),
  cue(OPEN, "draw", -6, "open book"),
  cue(EXAM, "draw", -8, "exam"),
  cue(EXAM + 10, "seal", -5, "A+"),
  ...erase(S4[1], "scene 4"),
  cue(LOOKS - 4, "whoosh", -10, "looks it up"),
  cue(DOCS - 6, "flurry", -12, "documents"),
  cue(FINDS - 2, "focus", -6, "found it"),
  cue(FINDS + 24, "check", -4, "right answer"),
  ...erase(S5[1], "scene 5"),
  cue(THERE - 2, "miss", -4, "not found"),
  cue(NOGUESS, "draw", -8, "no guessing"),
  cue(ASKS - 2, "send", -4, "asks a teammate"),
  cue(ASKS + 8, "draw", -9, "the human"),
  ...erase(S6[1], "scene 6"),
  cue(CGUESS + 4, "miss", -5, "closed book guesses"),
  cue(CHECKS + 4, "check", -3, "open book checks"),
  cue(HIT - 10, "whoosh", -8, "board clears"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { HALL, FIX, FINDS, ASKS, CLOSED, HIT, CTA, URL, DUR };

export const MAKESTHINGSUP: FilmDef = {
  id: "MakesThingsUp",
  slug: "makes-things-up",
  title: "MakesThingsUp",
  component: MakesThingsUp,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/makes-things-up/mix.wav",
};
