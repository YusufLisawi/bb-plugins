import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Cue, cue } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Icon } from "../../kit/ui";
import { PEOPLE } from "../../kit/people";
import { AutoCaptions, ReplySticker, TextSticker, phrasesFrom } from "../../kit/tiktok";
import { AppToast, Banner, BfScreen, MailIcon, Pill, Row, StatusBar, Tap, WaMsg, WaScreen, swipeX, zoomTo } from "../../kit/screenrec";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/reply-wrong/vo/lines.json";
import words from "../../../../public/films/reply-wrong/vo/words.json";

loadFonts();

/**
 * TIKTOK REPLY #2 — "ok but what if it tells my patients something wrong??"
 * Screen-recorded walkthrough with the product's real strings: knowledge base,
 * the stall message + escalation email, Chat Logs, 👎 feedback, Take over.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);
const KEYS = Object.keys(lines).sort() as Line[];

const K = [w("l03", 9), w("l03", 11), w("l03", 13)];
const S2 = T.VO.l04 - 8;
const Q = w("l04", 2);
const NOGUESS = w("l04", 7);
const STALL = w("l05", 4);
const PING = w("l05", 11);
const S3 = T.VO.l07 - 6;
const WRONG = w("l08", 0);
const THUMB = w("l09", 0) + 4;
const NOTE: [number, number] = [w("l09", 1), w("l09", 3) + 4];
const TOAST = w("l09", 4);
const FIXED = w("l09", 7);
const S4 = T.VO.l10 - 8;
const TAKE = w("l10", 3);
const CTA = w("l11", 2);
const DUR = Math.ceil(T.lineEnd("l11") + 36);

const hl = (f: number, at: number) => tw(f, at - 4, at + 2, 0, 1, E.expoOut) * (1 - tw(f, at + 14, at + 24, 0, 1, E.linear));
const Knowledge: React.FC<{ f: number }> = ({ f }) => (
  <BfScreen agent="Smile Studio Assistant" tab="Knowledge">
    <div style={{ padding: "440px 40px 10px", fontFamily: FONT }}>
      <div style={{ fontSize: 40, fontWeight: 750, letterSpacing: "-0.03em", color: C.ink }}>Knowledge Base</div>
      <div style={{ fontSize: 30, color: C.gray, marginTop: 6 }}>Upload documents and connect data sources</div>
    </div>
    <Row f={f} at={8} icon="card" title="Treatment prices.pdf" sub="File resource" right={<Pill>READY</Pill>} hot={hl(f, K[0])} />
    <Row f={f} at={12} icon="file" title="Cancellation policy" sub="Text resource" right={<Pill>READY</Pill>} hot={hl(f, K[1])} />
    <Row f={f} at={16} icon="help" title="FAQ" sub="42 questions" right={<Pill>READY</Pill>} hot={hl(f, K[2])} />
  </BfScreen>
);

const Patient: React.FC<{ f: number }> = ({ f }) => (
  <WaScreen name="Tom" who={PEOPLE.omar} sub="patient">
    <div style={{ alignSelf: "center", padding: "8px 18px", borderRadius: 14, background: "#E1F2FB", fontSize: 26, color: "#555", marginBottom: 10 }}>Today</div>
    <WaMsg f={f} at={Q - 6} time="21:40">hi, can I take ibuprofen after my extraction tomorrow?</WaMsg>
    <WaMsg f={f} at={STALL - 4} me ai time="21:40">I've asked a teammate, they'll reply shortly.</WaMsg>
  </WaScreen>
);

/* Chat Logs + a conversation sheet with 👎 feedback */
const Logs: React.FC<{ f: number }> = ({ f }) => {
  const sheet = tw(f, WRONG + 6, WRONG + 16, 0, 1, E.expoOut);
  const pop = tw(f, THUMB + 2, THUMB + 10, 0, 1, E.expoOut);
  const note = "We close at 1 PM on Saturdays";
  const n = Math.round(tw(f, NOTE[0], NOTE[1], 0, note.length, E.linear));
  const fixed = tw(f, FIXED - 4, FIXED + 6, 0, 1, E.expoOut);
  return (
    <>
      <BfScreen agent="Smile Studio Assistant" tab="Chat Logs">
        <div style={{ paddingTop: 460 }}>
          <Row f={f} at={S3 + 2} img="img/icons/whatsapp.svg" title="Tom · ibuprofen after extraction" sub="Escalated · Dr Priya replied" right={<Pill color="#8A5A00" bg="#FFF1CC">ESCALATED</Pill>} />
          <Row f={f} at={S3 + 5} icon="globe" title="Lena · teeth whitening price" sub="From $250 · booked a consult" right={<Pill>BOOKED</Pill>} />
          <Row f={f} at={S3 + 8} img="img/icons/instagram.svg" title="Ana · open on Saturdays?" sub={fixed > 0.5 ? "Saturdays 9 AM – 1 PM" : "Yes, 9 AM – 5 PM"} right={<Pill color={fixed > 0.5 ? C.green : C.coralDeep} bg={fixed > 0.5 ? C.greenTint : C.coralTint}>{fixed > 0.5 ? "FIXED" : "CHECK"}</Pill>} hot={tw(f, WRONG - 4, WRONG + 4, 0, 1, E.linear) * (1 - fixed)} />
          <Row f={f} at={S3 + 11} img="img/icons/whatsapp.svg" title="Marcus · reschedule cleaning" sub="Moved to Thu 10:30" right={<Pill>BOOKED</Pill>} />
        </div>
      </BfScreen>
      {sheet > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1240, transform: `translateY(${(1 - sheet) * 1240 + fixed * 1240}px)`, borderRadius: "44px 44px 0 0", background: C.white, boxShadow: "0 -20px 60px rgba(0,0,0,.25)", fontFamily: FONT, color: C.ink, padding: "30px 44px" }}>
          <div style={{ width: 120, height: 10, borderRadius: 5, background: "#DDD", margin: "0 auto 30px" }} />
          <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.1em", color: C.gray }}>ANA · INSTAGRAM</div>
          <div style={{ marginTop: 20, alignSelf: "flex-start", display: "inline-block", padding: "18px 24px", borderRadius: "28px 28px 28px 8px", background: "#F1EFEA", fontSize: 36 }}>Are you open on Saturdays?</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <div style={{ padding: "18px 24px", borderRadius: "28px 28px 8px 28px", background: C.coralTint, fontSize: 36 }}>Yes! We're open 9 AM – 5 PM.</div>
          </div>
          <div style={{ display: "flex", gap: 18, justifyContent: "flex-end", marginTop: 16 }}>
            {["thumbsUp", "thumbsDown"].map((ic, i) => (
              <div key={ic} style={{ width: 76, height: 76, borderRadius: 20, background: i === 1 && f >= THUMB ? C.coralTint : "#F4F1EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={ic as "thumbsUp"} size={40} color={i === 1 && f >= THUMB ? C.coral : C.gray} stroke={2.3} />
              </div>
            ))}
          </div>
          {pop > 0 ? (
            <div style={{ marginTop: 26, borderRadius: 28, boxShadow: "0 16px 40px rgba(0,0,0,.14), inset 0 0 0 2px #ECE8E0", padding: "26px 28px", opacity: pop, transform: `translateY(${(1 - pop) * 30}px)` }}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>Please describe what was wrong with this response</div>
              <div style={{ marginTop: 18, minHeight: 90, borderRadius: 18, boxShadow: "inset 0 0 0 2px #E3E0D8", padding: "20px 22px", fontSize: 34, color: n ? C.ink : C.gray2 }}>
                {n ? note.slice(0, n) : "e.g., The answer was incorrect because…"}
                {n > 0 && n < note.length ? <span style={{ display: "inline-block", width: 3, height: 36, background: C.coral, marginLeft: 2, verticalAlign: "-6px" }} /> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {fixed > 0 ? (
        <div style={{ position: "absolute", left: 40, right: 40, top: 1290, opacity: fixed, transform: `scale(${mix(0.8, 1, fixed)})`, display: "flex", alignItems: "center", gap: 16, padding: "22px 26px", borderRadius: 24, background: C.greenTint, color: C.green, fontFamily: FONT, fontSize: 32, fontWeight: 700 }}>
          <Icon name="check" size={34} color={C.green} stroke={3} /> Replaced the previous answer
        </div>
      ) : null}
      <AppToast f={f} at={TOAST} until={S4 - 12} text="Thanks for your feedback! We'll use it to improve the agent." />
    </>
  );
};

/* Live chat with Take over (WhatsApp session) */
const Live: React.FC<{ f: number }> = ({ f }) => {
  const taken = f >= TAKE + 2;
  return (
    <BfScreen agent="Smile Studio Assistant" tab="Live chats">
      <div style={{ padding: "470px 40px 0", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 36, fontWeight: 750 }}>Lena</div>
          <Pill color={C.gray} bg="#EEEBE3">WHATSAPP</Pill>
          <div style={{ marginLeft: "auto", padding: "16px 30px", borderRadius: 999, background: taken ? "#EEEBE3" : C.ink, color: taken ? C.ink : C.cream, fontSize: 30, fontWeight: 700 }}>{taken ? "Release" : "Take over"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ alignSelf: "flex-start", padding: "18px 24px", borderRadius: "28px 28px 28px 8px", background: C.white, boxShadow: "inset 0 0 0 2px #ECE8E0", fontSize: 36 }}>does whitening hurt? a bit nervous 😬</div>
          <div style={{ alignSelf: "flex-end", padding: "18px 24px", borderRadius: "28px 28px 8px 28px", background: C.coralTint, fontSize: 36, maxWidth: 820 }}>Most people feel little to no discomfort. Want me to book you a free consult?</div>
          {taken ? <div style={{ alignSelf: "center", fontFamily: MONO, fontSize: 22, letterSpacing: "0.1em", color: C.coral, marginTop: 8 }}>YOU ARE RESPONDING</div> : null}
        </div>
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 330, height: 96, borderRadius: 48, background: C.white, boxShadow: "inset 0 0 0 2px #E3E0D8", display: "flex", alignItems: "center", padding: "0 34px", fontSize: 32, color: C.gray2, fontFamily: FONT }}>Type a reply…</div>
    </BfScreen>
  );
};

export const ReplyWrong: React.FC<FilmProps> = ({ audio = true }) => {
  const f = useCurrentFrame();
  const scenes = [
    { from: 0, to: S2, el: <Knowledge f={f} /> },
    { from: S2, to: S3, el: <Patient f={f} /> },
    { from: S3, to: S4, el: <Logs f={f} /> },
    { from: S4, to: 1e9, el: <Live f={f} /> },
  ];
  const z = zoomTo(f, [
    [0, 1, 540, 960],
    [K[0] - 10, 1, 540, 960],
    [K[2] + 10, 1.05, 540, 1000],
    [S2 - 2, 1.05, 540, 1000],
    [S2 + 10, 1, 540, 960],
    [WRONG - 10, 1, 540, 960],
    [WRONG, 1.04, 540, 1000],
    [S4 - 2, 1.04, 540, 1000],
    [S4 + 10, 1, 540, 960],
  ]);
  const phrases = phrasesFrom(KEYS.flatMap((k) => T.said(k)), DUR);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000", fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${z.ox}px ${z.oy}px`, transform: `scale(${z.s})` }}>
        {scenes.map((s, i) => {
          if (f < s.from - 8 || f > s.to + 8) return null;
          const inX = i === 0 ? 0 : (1 - swipeX(f, s.from)) * 1080;
          const outX = s.to < 1e9 ? -swipeX(f, s.to) * 1080 : 0;
          return (
            <div key={i} style={{ position: "absolute", inset: 0, transform: `translateX(${inX + outX}px)` }}>
              {s.el}
            </div>
          );
        })}
        <Tap f={f} x={540} y={1075} at={WRONG + 4} />
        <Tap f={f} x={998} y={1030} at={THUMB} />
        <Tap f={f} x={930} y={800} at={TAKE} />
      </div>
      <Banner f={f} at={PING - 4} until={S3 - 20} app="Mail" icon={<MailIcon />} title="Customer needs your help on Smile Studio Assistant" body="Tom asked about medication after an extraction." />
      <StatusBar time="21:43" />
      <TextSticker at={NOGUESS} x={560} y={1200} size={58} rot={-3} out={STALL - 8}>no guessing 🙅‍♀️</TextSticker>
      <AppToast f={f} at={TAKE + 6} until={CTA - 8} text="You're now responding to this conversation" />
      <TextSticker at={CTA} x={540} y={1280} size={56} rot={-1.5}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          try it free 👉 brainfast.ai <Mark height={46} color={C.coral} stroke={26} />
        </span>
      </TextSticker>
      <AutoCaptions phrases={phrases} />
      <ReplySticker name="dr priya 🦷" text="ok but what if it tells my patients something wrong?? thats my biggest fear 😭" avatar={PEOPLE.priya} />
      {audio ? <Audio src={staticFile("films/reply-wrong/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...K.map((k, i) => cue(k - 4, "tick", -10, `knowledge ${i + 1}`)),
  cue(S2, "whoosh", -12, "swipe to WhatsApp"),
  cue(Q - 6, "notif", -8, "patient asks"),
  cue(NOGUESS, "pop", -9, "no guessing sticker"),
  cue(STALL - 4, "send", -8, "stall message"),
  cue(PING - 4, "ping", -6, "email to you"),
  cue(S3, "whoosh", -12, "swipe to Chat Logs"),
  cue(WRONG + 4, "tap", -6, "open the chat"),
  cue(THUMB, "tap", -5, "thumbs down"),
  cue(NOTE[0], "keys", -12, "typing the note"),
  cue(TOAST, "toast", -8, "thanks for your feedback"),
  cue(FIXED, "learn", -8, "replaced the previous answer"),
  cue(S4, "whoosh", -12, "swipe to Live chats"),
  cue(TAKE, "tap", -5, "take over"),
  cue(TAKE + 6, "toast", -8, "you're responding"),
  cue(CTA, "pop", -8, "CTA sticker"),
];
export const BEATS = { S2, S3, S4, WRONG, THUMB, TAKE, CTA, DUR };

export const REPLYWRONG: FilmDef = { id: "ReplyWrong", slug: "reply-wrong", title: "ReplyWrong", component: ReplyWrong, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/reply-wrong/mix.wav" };
