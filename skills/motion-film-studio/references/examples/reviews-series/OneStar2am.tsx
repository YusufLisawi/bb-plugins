import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT } from "../../theme";
import { Cue, cue } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { AutoCaptions, TextSticker, phrasesFrom } from "../../kit/tiktok";
import { StatusBar, swipeX } from "../../kit/screenrec";
import { PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import { Booked, Cam, CountSticker, Marker, NADIA, NMsg, ReviewPage, Roll, RWord, SAMIRA, StrikeSticker, WaNight, camAt, shake } from "./review";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/one-star-2am/vo/lines.json";
import words from "../../../../public/films/one-star-2am/vo/words.json";

loadFonts();

/**
 * 1-STAR REVIEWS THAT ARE SECRETLY 5 STARS — ep. 1 "The 2 a.m. complaint".
 * A screen-recorded review page, a creator yapping over it: highlighter swipes
 * while the review is read, a dark-mode WhatsApp cutaway of what actually
 * happened at 02:04, then the re-rating — the four empty stars light one per
 * word ("We're · counting · that · five").
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);
const KEYS = Object.keys(lines).sort() as Line[];

/* beats */
const ONE = w("l01", 3);
const OUT1 = w("l02", 3);
const READ = T.VO.l03;
const OKAY = w("l06", 0);
const S2 = T.VO.l07 - 6; // swipe to the 02:04 chat
const CLOSED = w("l07", 5);
const ASLEEP = w("l07", 9);
const AWAKE = w("l08", 2);
const ANGRY = w("l08", 5);
const PARA = w("l08", 8);
const LATER = w("l09", 0);
const REPLY = w("l09", 4);
const POLITE = w("l09", 5);
const LANG = w("l09", 9);
const NEWTIME = w("l09", 12);
const HOLD = w("l10", 1);
const CALL = w("l10", 5);
const FIGHT = w("l11", 3);
const THU = w("l11", 6);
const TEN = w("l11", 8);
const S3 = T.VO.l12 - 2; // swipe back to the review
const SO = w("l12", 0);
const ONESTAR = w("l12", 2);
const LIGHT = [w("l12", 4), w("l12", 5), w("l12", 6), w("l12", 8)]; // We're · counting · that · five
const FIVE = LIGHT[3];
const PUT = w("l13", 0);
const TRY = w("l13", 7);
const URL = w("l13", 12);
const DUR = Math.ceil(T.lineEnd("l13") + 45);

/* the review, word for word as it is read (spoken index → highlighter swipe) */
const SAID = [...T.said("l03"), ...T.said("l04"), ...T.said("l05")];
const at = (i: number) => SAID[i].at;
const hl = (i: number) => [{ kind: "hilite" as const, at: at(i) }];
const REVIEW: RWord[] = [
  { t: "Messaged" }, { t: "the" }, { t: "clinic" }, { t: "at" }, { t: "2am", marks: [...hl(4), { kind: "circle", at: OKAY + 2 }] }, { t: "to" },
  { t: "complain", marks: hl(7) }, { t: "about" }, { t: "my" }, { t: "appointment." },
  { t: "It" }, { t: "replied" }, { t: "in" }, { t: "20", marks: hl(14) }, { t: "seconds,", marks: [...hl(15), { kind: "underline", at: w("l06", 2) }] },
  { t: "moved", marks: hl(16) }, { t: "me", marks: hl(17) }, { t: "to", marks: hl(18) }, { t: "Thursday", marks: hl(19) }, { t: "and" },
  { t: "said", marks: hl(21) }, { t: "goodnight.", marks: hl(22) },
  { t: "I" }, { t: "had" }, { t: "a" }, { t: "whole", marks: hl(27) }, { t: "speech", marks: hl(28) }, { t: "ready.", marks: hl(29) },
  { t: "One", marks: hl(30) }, { t: "star.", marks: hl(31) },
];

const Page: React.FC<{ stars: number[]; rating: React.ReactNode; scroll?: number }> = ({ stars, rating, scroll = 0 }) => (
  <ReviewPage
    biz={{ emoji: "🦷", tint: "#E3F1FB", name: "Sunny Side Dental", kind: "Dental clinic · Open 9 AM–6 PM", rating, count: "1,204", bars: [0.9, 0.06, 0.02, 0.01, 0.03] }}
    who={NADIA}
    name="Nadia R."
    meta="1 review"
    when="2 days ago"
    stars={stars}
    text={REVIEW}
    helpful="214"
    next={[
      { who: PEOPLE.marcus, name: "Marcus T.", text: "Booked a cleaning on WhatsApp in a minute. Lovely team." },
      { who: SAMIRA, name: "Samira K.", text: "Asked about whitening at midnight, got the price and a slot before I fell asleep." },
    ]}
    scroll={scroll}
  />
);

/* ── scene 2: what actually happened, 02:04 ── */
const Chat: React.FC<{ f: number }> = ({ f }) => {
  const scroll = tw(f, TEN - 30, TEN - 18, 0, 170, E.cubicInOut);
  return (
    <>
      <WaNight name="Sunny Side Dental" icon={<div style={{ width: 80, height: 80, background: "#E3F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 }}>🦷</div>} scroll={scroll}>
        <div style={{ alignSelf: "center", padding: "8px 18px", borderRadius: 12, background: "#182229", fontSize: 24, color: "#8696A0", marginBottom: 6 }}>Today</div>
        <NMsg at={AWAKE - 3} me time="02:03">Bonsoir.</NMsg>
        <NMsg at={ANGRY - 3} me time="02:03">C'est INADMISSIBLE 😡😡</NMsg>
        <NMsg at={PARA - 4} me time="02:04" grow={16} size={37}>
          Mon rendez-vous de mardi a été annulé SANS prévenir. J'ai pris ma journée pour rien, et personne ne répond au téléphone. Je veux une explication. Et des excuses. Par écrit.
        </NMsg>
        <NMsg at={REPLY - 2} ai time="02:04" size={38}>
          Bonsoir Nadia, <span style={{ position: "relative" }}>toutes nos excuses<Marker kind="underline" at={POLITE} dur={8} width={6} /></span> pour ce contretemps 🙏 Je peux vous proposer{" "}
          <span style={{ position: "relative", backgroundImage: "linear-gradient(rgba(255,214,10,.45), rgba(255,214,10,.45))", backgroundRepeat: "no-repeat", backgroundPosition: "0 80%", backgroundSize: `${tw(f, NEWTIME - 2, NEWTIME + 6, 0, 100, E.cubicInOut)}% 60%` }}>jeudi à 10h00</span>. Ça vous convient ?
        </NMsg>
        <NMsg at={FIGHT - 2} me time="02:05">…oui.</NMsg>
        <NMsg at={THU - 3} ai time="02:05" size={38}>C'est noté ✅ Jeudi à 10h00. Bonne nuit Nadia 🌙</NMsg>
      </WaNight>
      <StatusBar time="02:04" dark rec={false} />
    </>
  );
};

export const OneStar2am: React.FC<FilmProps> = ({ audio = true }) => {
  const f = useCurrentFrame();
  const stars1 = [-1e9, 1e9, 1e9, 1e9, 1e9];
  const stars3 = [-1e9, ...LIGHT];
  // the page flicks down to the review in the first frames (movement from frame 0)
  const flick = tw(f, 1, 13, 0, 250, E.expoOut);
  const cam1 = camAt(f, [
    [0, 1, 540, 960],
    [ONE - 5, 1, 540, 960],
    [ONE + 3, 2.05, 229, 633],
    [OUT1 - 2, 2.05, 229, 633],
    [OUT1 + 7, 1, 540, 960],
    [READ - 3, 1, 540, 960],
    [READ + 8, 1.08, 540, 850],
    [T.VO.l05 + 12, 1.08, 540, 900],
    [OKAY - 1, 1.08, 540, 900],
    [OKAY + 7, 1, 540, 960],
  ] as Cam[]);
  const cam3 = camAt(f, [
    [S3, 2.05, 229, 883],
    [FIVE + 12, 2.05, 229, 883],
    [FIVE + 34, 1, 540, 960],
  ] as Cam[]);
  const jolt = shake(f, ONE + 1, 14, 8);
  const jolt3 = { x: 0, y: 0 }; // the five-star moment sells itself (glow + sparkles); no camera jolt
  const scenes = [
    { from: 0, to: S2, el: <div style={{ position: "absolute", inset: 0, ...cam1, translate: `${jolt.x}px ${jolt.y}px` }}><Page stars={stars1} rating="4.9" scroll={flick} /><StatusBar time="10:24" /></div> },
    { from: S2, to: S3, el: <Chat f={f} /> },
    {
      from: S3,
      to: 1e9,
      el: (
        <div style={{ position: "absolute", inset: 0, ...cam3, translate: `${jolt3.x}px ${jolt3.y}px` }}>
          <Page stars={stars3} rating={<Roll a="4.9" b="5.0" at={FIVE + 40} />} />
          {/* the marker circles the one star, then gives up once the others light */}
          <div style={{ position: "absolute", left: 44, top: 853, width: 66, height: 66 }}>
            <Marker kind="circle" at={ONESTAR} dur={8} out={LIGHT[0] + 2} width={8} />
          </div>
          <StatusBar time="10:25" />
        </div>
      ),
    },
  ];
  // captions for the yap (the review itself is read on the card, highlighted)
  const phrases = [
    ...phrasesFrom([...T.said("l01"), ...T.said("l02")], T.lineEnd("l02") + 8),
    ...phrasesFrom(KEYS.slice(5).flatMap((k) => T.said(k)), DUR),
  ];
  const glow = tw(f, FIVE, FIVE + 6, 0, 1, E.expoOut) * (1 - tw(f, FIVE + 8, FIVE + 36, 0, 1, E.linear));
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000", fontFamily: FONT }}>
      {scenes.map((s, i) => {
        if (f < s.from - 8 || f > s.to + 8) return null;
        const inX = i === 0 ? 0 : (1 - swipeX(f, s.from)) * 1080;
        const outX = s.to < 1e9 ? -swipeX(f, s.to) * 1080 : 0;
        return (
          <div key={i} style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `translateX(${inX + outX}px)` }}>
            {s.el}
          </div>
        );
      })}
      {glow > 0 ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 37% 50%, rgba(255,214,10,.35), rgba(255,214,10,0) 55%)", opacity: glow, zIndex: 20 }} /> : null}
      {/* series sticker */}
      <TextSticker at={2} x={540} y={330} size={40} rot={-2} out={READ - 10}>
        1-star reviews that are secretly 5 stars ⭐
      </TextSticker>
      <TextSticker at={8} x={880} y={410} size={34} rot={4} bg={C.coral} color="#FFF" out={READ - 10}>
        ep. 1
      </TextSticker>
      {/* 02:04 */}
      <TextSticker at={CLOSED - 2} x={330} y={640} size={54} rot={-4} out={AWAKE - 6}>closed 🔒</TextSticker>
      <TextSticker at={ASLEEP - 2} x={690} y={800} size={54} rot={3} out={AWAKE - 6}>receptionist: 😴</TextSticker>
      <TextSticker at={PARA + 4} x={250} y={520} size={50} rot={-5} out={LATER - 4}>📜📜📜</TextSticker>
      <CountSticker at={LATER} to={20} dur={REPLY - LATER - 2} x={540} y={1330} size={60} fmt={(n) => `⏱ 0:${String(n).padStart(2, "0")}`} out={T.VO.l10 - 6} />
      <TextSticker at={LANG - 2} x={690} y={640} size={44} rot={4} out={T.VO.l10 - 6}>🇫🇷 in her language</TextSticker>
      <StrikeSticker at={HOLD - 2} strikeAt={HOLD + 8} x={330} y={690} rot={-4} out={T.VO.l11 - 4}>🎵 hold music</StrikeSticker>
      <StrikeSticker at={CALL - 3} strikeAt={CALL + 9} x={640} y={830} rot={3} size={50} out={T.VO.l11 - 4}>“we'll call you back”</StrikeSticker>
      <TextSticker at={FIGHT - 1} x={820} y={1160} size={64} rot={8} out={TEN - 4}>🥊</TextSticker>
      <Booked at={TEN - 2} x={540} y={900} title="Thursday · 10:00" meta="Sunny Side Dental · confirmed" dark out={S3 - 6} />
      {/* CTA */}
      <TextSticker at={PUT - 1} x={540} y={1250} size={50} rot={-2} out={TRY - 3}>an AI agent on your WhatsApp 💬</TextSticker>
      <TextSticker at={TRY - 1} x={540} y={1300} size={56} rot={-1.5}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          try it free 👉 brainfast.ai <Mark height={46} color={C.coral} stroke={26} />
        </span>
      </TextSticker>
      <AutoCaptions phrases={phrases} />
      {audio ? <Audio src={staticFile("films/one-star-2am/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "pop", -8, "series sticker"),
  cue(ONE, "dive", -12, "punch in on the one star"),
  cue(OUT1 + 1, "zoom", -12, "pull back"),
  cue(READ + 2, "whoosh", -16, "into the text"),
  ...[4, 7, 14, 16, 21, 27, 30].map((i) => cue(at(i) - 1, "tick", -16, `highlight ${SAID[i].t}`)),
  cue(OKAY, "zoom", -12, "okay, let's unpack this"),
  cue(OKAY + 2, "draw", -16, "marker circle"),
  cue(S2, "whoosh", -10, "swipe to 02:04"),
  cue(CLOSED - 2, "pop", -8, "closed sticker"),
  cue(ASLEEP - 2, "pop", -8, "asleep sticker"),
  cue(AWAKE - 3, "send", -6, "Bonsoir."),
  cue(ANGRY - 3, "send", -5, "INADMISSIBLE"),
  cue(PARA - 4, "send", -5, "the paragraph"),
  cue(PARA - 2, "keys", -12, "paragraph typing"),
  cue(PARA + 4, "pop", -9, "scroll sticker"),
  ...[0, 6, 12, 18].map((d) => cue(LATER + d, "tick", -12, "stopwatch")),
  cue(REPLY - 2, "receive", -2, "the reply, 20 seconds later"),
  cue(REPLY, "check", -9, "stopwatch stops"),
  cue(POLITE, "draw", -16, "underline polite"),
  cue(LANG - 2, "pop", -10, "in her language"),
  cue(NEWTIME - 2, "tick", -12, "highlight the new time"),
  cue(HOLD - 2, "pop", -8, "hold music sticker"),
  cue(HOLD + 8, "draw", -14, "strike"),
  cue(CALL - 3, "pop", -8, "call you back sticker"),
  cue(CALL + 9, "draw", -14, "strike"),
  cue(FIGHT - 2, "send", -7, "…oui."),
  cue(THU - 3, "receive", -4, "confirmation"),
  cue(TEN, "snap", -4, "booking card lands"),
  cue(TEN + 8, "check", -6, "booking confirmed"),
  cue(S3, "whoosh", -10, "swipe back to the review"),
  cue(SO, "scratch", -4, "record scratch: so yes, one star"),
  cue(ONESTAR, "draw", -14, "circle the one star"),
  ...LIGHT.map((l, i) => cue(l, "star", -9 + i * 1.5, `star ${i + 2} lights`)),
  cue(FIVE, "learn", -7, "five"),
  cue(FIVE, "spark", -8, "five: sparkle"),
  cue(FIVE + 34, "zoom", -14, "pull back to the full review"),
  cue(FIVE + 40, "tick", -10, "4.9 → 5.0"),
  cue(PUT - 1, "pop", -4, "CTA sticker 1"),
  cue(TRY - 1, "pop", -3, "CTA sticker 2"),
  cue(TRY + 8, "spark", -10, "sparkle"),
  cue(URL, "blip", -8, "url"),
];
export const BEATS = { S2, S3, FIVE, TRY, DUR };

export const ONESTAR2AM: FilmDef = { id: "OneStar2am", slug: "one-star-2am", title: "1-star reviews · ep. 1 · The 2 a.m. complaint", component: OneStar2am, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/one-star-2am/mix.wav" };
