import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT } from "../../theme";
import { Cue, cue } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { AutoCaptions, TT_FONT, TextSticker, phrasesFrom } from "../../kit/tiktok";
import { StatusBar, swipeX } from "../../kit/screenrec";
import { PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import { Booked, Cam, CountSticker, KARIM, LMsg, Marker, PAUL, ReviewPage, Roll, RWord, WaDay, camAt, shake } from "../one-star-2am/review";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/one-star-discount/vo/lines.json";
import words from "../../../../public/films/one-star-discount/vo/words.json";

loadFonts();

/**
 * 1-STAR REVIEWS THAT ARE SECRETLY 5 STARS — ep. 2 "The discount hunter".
 * Same series grammar as ep. 1 (the review page, the creator's highlighter, the
 * re-rating), new story: Karim asks for a discount in French, Darija and
 * English; the hotel's agent says no in all three — it only knows the hotel's
 * rules — then sells him the last sea-view room at full price.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);
const KEYS = Object.keys(lines).sort() as Line[];

const ONE = w("l01", 0);
const BRACE = w("l01", 2);
const READ = T.VO.l02;
const OKAY = w("l05", 0);
const MEET = w("l05", 1);
const KAREEM = w("l05", 2);
const NEVER = w("l05", 5);
const S2 = T.VO.l06 - 6; // swipe to the chat
const OPENS = w("l06", 1);
const NO1 = w("l06", 6);
const SWITCH = w("l07", 1);
const NO2 = w("l07", 4);
const TRIES = w("l08", 1);
const STILL = w("l08", 11);
const BREAKFAST = w("l09", 1);
const SEAVIEW = w("l09", 7);
const BOOKS = w("l10", 1);
const ROOM = w("l10", 3);
const DEVAST = w("l10", 6);
const S3 = T.VO.l11 - 2; // swipe back to the review
const ONESTAR = w("l11", 0);
const LIGHT = [w("l11", 2), w("l11", 3), w("l11", 4), w("l11", 6)]; // We're · reading · that · five
const FIVE = LIGHT[3];
const AN = w("l12", 0);
const TRY = w("l12", 8);
const URL = w("l12", 13);
const DUR = Math.ceil(T.lineEnd("l12") + 45);

const SAID = [...T.said("l02"), ...T.said("l03"), ...T.said("l04")];
const at = (i: number) => SAID[i].at;
const hl = (i: number) => [{ kind: "hilite" as const, at: at(i) }];
const REVIEW: RWord[] = [
  { t: "Asked" }, { t: "their" }, { t: "AI" }, { t: "for" }, { t: "a" }, { t: "discount", marks: hl(5) }, { t: "6", marks: hl(6) }, { t: "times,", marks: hl(7) },
  { t: "in" }, { t: "3", marks: hl(9) }, { t: "languages.", marks: hl(10) },
  { t: "It" }, { t: "said", marks: hl(12) }, { t: "no", marks: hl(13) }, { t: "6", marks: hl(14) }, { t: "times,", marks: hl(15) }, { t: "in" }, { t: "3", marks: hl(17) }, { t: "languages.", marks: hl(18) },
  { t: "Very", marks: hl(19) }, { t: "politely.", marks: hl(20) },
  { t: "Then" }, { t: "it" }, { t: "booked", marks: hl(23) }, { t: "my", marks: hl(24) }, { t: "room", marks: hl(25) }, { t: "anyway." },
  { t: "Full", marks: [...hl(27), { kind: "circle", at: w("l05", 6) + 2 }] }, { t: "price.", marks: hl(28) }, { t: "One", marks: hl(29) }, { t: "star.", marks: hl(30) },
];

const Page: React.FC<{ stars: number[]; rating: React.ReactNode; scroll?: number }> = ({ stars, rating, scroll = 0 }) => (
  <ReviewPage
    biz={{ emoji: "🏨", tint: "#DDF0FA", name: "Seaside Hotel", kind: "Boutique hotel · Sea view", rating, count: "2,431", bars: [0.86, 0.09, 0.03, 0.01, 0.01] }}
    who={KARIM}
    name="Karim B."
    meta="3 reviews"
    when="1 week ago"
    stars={stars}
    text={REVIEW}
    helpful="387"
    next={[
      { who: PAUL, name: "Paul D.", text: "Asked about a late check-in at 1 AM. Instant answer, and the room was ready." },
      { who: PEOPLE.aisha, name: "Aïcha M.", text: "They reply in Darija, French and English. Breakfast was amazing." },
    ]}
    scroll={scroll}
  />
);

/** a quick "photo" of the sea-view room, sent by the hotel's agent */
const RoomPic: React.FC = () => (
  <div style={{ position: "relative", width: 560, height: 330, borderRadius: 18, overflow: "hidden", background: "linear-gradient(180deg,#9ED8FF 0%,#E4F6FF 52%,#2F9AD6 53%,#1B6FA8 100%)" }}>
    <div style={{ position: "absolute", left: 380, top: 46, width: 74, height: 74, borderRadius: 37, background: "#FFE08A", boxShadow: "0 0 40px #FFE08A" }} />
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ position: "absolute", left: 40 + i * 150, top: 206 + (i % 2) * 34, width: 90, height: 6, borderRadius: 3, background: "rgba(255,255,255,.55)" }} />
    ))}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, background: "linear-gradient(180deg,#F3E6D3,#E4D2B8)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, height: 8, background: "#FFFFFF" }} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} style={{ position: "absolute", left: 24 + i * 84, bottom: 70, width: 6, height: 70, background: "#FFFFFF" }} />
    ))}
    <div style={{ position: "absolute", left: 16, top: 14, padding: "6px 14px", borderRadius: 10, background: "rgba(0,0,0,.45)", color: "#FFF", fontSize: 24, fontWeight: 600 }}>Sea-view room · Fri–Sun</div>
  </div>
);

const Chat: React.FC = () => (
  <>
    <WaDay name="Seaside Hotel" icon={<div style={{ width: 80, height: 80, background: "#DDF0FA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 }}>🏨</div>}>
      <LMsg at={OPENS - 2} me time="14:12">Bonjour ! Une petite réduction possible ? 🙏</LMsg>
      <LMsg at={NO1 - 2} ai time="14:12">Bonjour Karim ! Désolé, nos prix sont fixes 😊</LMsg>
      <LMsg at={SWITCH - 2} me rtl time="14:13">واش كاين شي تخفيض؟ 🙏</LMsg>
      <LMsg at={NO2 - 2} ai rtl time="14:13">سمح ليا، الأثمنة ثابتة 😊</LMsg>
      <LMsg at={TRIES - 2} me time="14:14">ok last try. my cousin is getting married and I'm broke 😭</LMsg>
      <LMsg at={STILL - 2} ai time="14:14">Congratulations to your cousin! 🎉 Prices are fixed, but…</LMsg>
      <LMsg at={BREAKFAST - 3} ai time="14:14">breakfast is included, and there's one sea-view room left for Friday. Want it? 🌊</LMsg>
      <LMsg at={SEAVIEW - 1} ai time="14:14">
        <RoomPic />
      </LMsg>
      <LMsg at={BOOKS - 3} me time="14:15">…fine. book it.</LMsg>
    </WaDay>
    <StatusBar time="14:15" rec={false} />
  </>
);

/** "🙅 no ×2 / ×4 / ×6": the refusals pile up, one bump per language */
const NoCounter: React.FC = () => {
  const f = useCurrentFrame();
  if (f < NO1 - 1 || f > S3 - 2) return null;
  const n = f >= STILL - 1 ? 6 : f >= NO2 - 1 ? 4 : 2;
  const last = f >= STILL - 1 ? STILL - 1 : f >= NO2 - 1 ? NO2 - 1 : NO1 - 1;
  const bump = 1 + 0.22 * Math.sin(clamp((f - last) / 8) * Math.PI);
  const o = clamp((f - NO1 + 2) / 3) * (1 - tw(f, S3 - 8, S3 - 2, 0, 1, E.linear));
  return (
    <div style={{ position: "absolute", left: 800, top: 380, transform: `translate(-50%, -50%) rotate(5deg) scale(${bump * tw(f, NO1 - 1, NO1 + 5, 0.6, 1, E.backOut)})`, opacity: o, padding: "12px 22px", borderRadius: 14, background: C.ink, color: "#FFF", fontFamily: TT_FONT, fontSize: 50, fontWeight: 800, whiteSpace: "nowrap", zIndex: 45 }}>
      🙅 no ×{n}
    </div>
  );
};

export const OneStarDiscount: React.FC<FilmProps> = ({ audio = true }) => {
  const f = useCurrentFrame();
  const flick = tw(f, 1, 13, 0, 250, E.expoOut);
  const cam1 = camAt(f, [
    [0, 1, 540, 960],
    [ONE - 2, 1, 540, 960],
    [ONE + 6, 2.05, 229, 633],
    [BRACE - 2, 2.05, 229, 633],
    [BRACE + 6, 1, 540, 960],
    [READ - 3, 1, 540, 960],
    [READ + 8, 1.08, 540, 850],
    [T.VO.l04 + 12, 1.08, 540, 900],
    [MEET - 4, 1.08, 540, 900],
    [MEET + 4, 2.2, 245, 560],
  ] as Cam[]);
  const cam3 = camAt(f, [
    [S3, 2.05, 229, 883],
    [FIVE + 12, 2.05, 229, 883],
    [FIVE + 34, 1, 540, 960],
  ] as Cam[]);
  const jolt = shake(f, BRACE, 16, 10);
  const jolt3 = { x: 0, y: 0 }; // the five-star moment sells itself (glow + sparkles); no camera jolt
  const scenes = [
    { from: 0, to: S2, el: <div style={{ position: "absolute", inset: 0, ...cam1, translate: `${jolt.x}px ${jolt.y}px` }}><Page stars={[-1e9, 1e9, 1e9, 1e9, 1e9]} rating="4.8" scroll={flick} /><StatusBar time="18:40" /></div> },
    { from: S2, to: S3, el: <Chat /> },
    {
      from: S3,
      to: 1e9,
      el: (
        <div style={{ position: "absolute", inset: 0, ...cam3, translate: `${jolt3.x}px ${jolt3.y}px` }}>
          <Page stars={[-1e9, ...LIGHT]} rating={<Roll a="4.8" b="4.9" at={FIVE + 40} />} />
          <div style={{ position: "absolute", left: 44, top: 850, width: 66, height: 66 }}>
            <Marker kind="circle" at={ONESTAR} dur={8} out={LIGHT[0] + 2} width={8} />
          </div>
          <StatusBar time="18:41" />
        </div>
      ),
    },
  ];
  const phrases = [...phrasesFrom(T.said("l01"), T.lineEnd("l01") + 8), ...phrasesFrom(KEYS.slice(4).flatMap((k) => T.said(k)), DUR)];
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
      <TextSticker at={2} x={540} y={330} size={40} rot={-2} out={READ - 10}>
        1-star reviews that are secretly 5 stars ⭐
      </TextSticker>
      <TextSticker at={8} x={880} y={410} size={34} rot={4} bg={C.coral} color="#FFF" out={READ - 10}>
        ep. 2
      </TextSticker>
      {/* meet Karim */}
      <TextSticker at={KAREEM} x={560} y={400} size={50} rot={-3} out={S2 - 4}>professional negotiator 🕶️</TextSticker>
      <CountSticker at={NEVER} to={0} from={0} dur={1} x={640} y={590} size={46} rot={2} fmt={() => "full price paid: 0 times"} out={S2 - 4} />
      <NoCounter />
      <TextSticker at={DEVAST - 2} x={700} y={560} size={56} rot={5} out={S3 - 6}>devastated 😭</TextSticker>
      <Booked at={ROOM - 1} x={540} y={930} title="Sea-view room · Fri–Sun" meta="Seaside Hotel · breakfast incl. · confirmed" out={S3 - 6} />
      {/* CTA */}
      <TextSticker at={AN - 1} x={540} y={1250} size={48} rot={-2} out={TRY - 3}>an AI agent that sticks to your rules ✅</TextSticker>
      <TextSticker at={TRY - 1} x={540} y={1300} size={56} rot={-1.5}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          try it free 👉 brainfast.ai <Mark height={46} color={C.coral} stroke={26} />
        </span>
      </TextSticker>
      <AutoCaptions phrases={phrases} />
      {audio ? <Audio src={staticFile("films/one-star-discount/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "pop", -8, "series sticker"),
  cue(ONE, "dive", -12, "punch in on the one star"),
  cue(BRACE, "zoom", -12, "brace yourselves"),
  cue(READ + 2, "whoosh", -16, "into the text"),
  ...[5, 6, 12, 19, 23, 27, 29].map((i) => cue(at(i) - 1, "tick", -16, `highlight ${SAID[i].t}`)),
  cue(MEET - 2, "dive", -11, "meet Karim"),
  cue(KAREEM, "pop", -8, "negotiator sticker"),
  cue(NEVER, "pop", -8, "full price paid: 0"),
  cue(w("l05", 6) + 2, "draw", -15, "circle full price"),
  cue(S2, "whoosh", -10, "swipe to the chat"),
  cue(OPENS - 2, "send", -5, "petite réduction?"),
  cue(NO1 - 2, "receive", -3, "no (French)"),
  cue(NO1 - 1, "miss", -10, "no ×2"),
  cue(SWITCH - 2, "send", -5, "Darija"),
  cue(NO2 - 2, "receive", -3, "no (Darija)"),
  cue(NO2 - 1, "miss", -10, "no ×4"),
  cue(TRIES - 2, "send", -5, "the cousin's wedding"),
  cue(STILL - 2, "receive", -3, "still no"),
  cue(STILL - 1, "miss", -10, "no ×6"),
  cue(BREAKFAST - 3, "receive", -4, "but breakfast is included"),
  cue(SEAVIEW - 1, "pop", -6, "the sea-view photo"),
  cue(BOOKS - 3, "send", -5, "…fine. book it."),
  cue(ROOM, "snap", -4, "booking card lands"),
  cue(ROOM + 8, "check", -6, "confirmed"),
  cue(DEVAST - 2, "pop", -8, "devastated sticker"),
  cue(S3, "whoosh", -10, "swipe back to the review"),
  cue(S3 + 2, "scratch", -4, "record scratch: one star"),
  cue(ONESTAR, "draw", -14, "circle the one star"),
  ...LIGHT.map((l, i) => cue(l, "star", -9 + i * 1.5, `star ${i + 2} lights`)),
  cue(FIVE, "learn", -7, "five"),
  cue(FIVE, "spark", -8, "five: sparkle"),
  cue(FIVE + 34, "zoom", -14, "pull back to the full review"),
  cue(FIVE + 40, "tick", -10, "4.8 → 4.9"),
  cue(AN - 1, "pop", -4, "CTA sticker 1"),
  cue(TRY - 1, "pop", -3, "CTA sticker 2"),
  cue(TRY + 8, "spark", -10, "sparkle"),
  cue(URL, "blip", -8, "url"),
];
export const BEATS = { S2, S3, FIVE, TRY, DUR };

export const ONESTARDISCOUNT: FilmDef = { id: "OneStarDiscount", slug: "one-star-discount", title: "1-star reviews · ep. 2 · The discount hunter", component: OneStarDiscount, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/one-star-discount/mix.wav" };
