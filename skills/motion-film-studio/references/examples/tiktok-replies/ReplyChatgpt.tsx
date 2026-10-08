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
import { BfScreen, IOS, Pill, Row, StatusBar, Tap, WaMsg, WaScreen, swipeX, zoomTo } from "../../kit/screenrec";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/reply-chatgpt/vo/lines.json";
import words from "../../../../public/films/reply-chatgpt/vo/words.json";

loadFonts();

/**
 * TIKTOK REPLY #1 — "wait what's the difference between this and just using
 * chatgpt??" A native screen-recording reply: the exact TikTok reply sticker,
 * auto-captions, the iOS recording pill, taps and app swipes. No ad polish.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);
const KEYS = Object.keys(lines).sort() as Line[];

const SEND = w("l02", 0) + 10;
const STREAM: [number, number] = [w("l03", 0), w("l03", 10) + 8];
const S2 = w("l04", 0) - 6;
const CH = [w("l05", 7), w("l05", 9), w("l05", 11)];
const KN = [w("l06", 4), w("l06", 6), w("l06", 8)];
const S3 = T.VO.l07 - 6;
const CUST = w("l07", 5);
const ANS = w("l08", 1);
const YES = w("l08", 4) - 6;
const DONE = w("l08", 8);
const S4 = T.VO.l09 - 4;
const ST1 = w("l10", 0);
const ST2 = w("l11", 0);
const ST3 = w("l12", 2);
const DUR = Math.ceil(T.lineEnd("l12") + 36);

const CAPTION = "Freshly baked happiness 🧁✨ Tag someone who deserves a sweet treat this weekend! #cupcakes #bakery";

/* S1: a generic AI chat app (text label only, no logos) */
const ChatApp: React.FC<{ f: number }> = ({ f }) => {
  const typed = "write an instagram caption for my cupcakes";
  const n = Math.round(tw(f, 16, SEND - 6, 0, typed.length, E.linear));
  const sent = f >= SEND;
  const k = Math.round(tw(f, STREAM[0], STREAM[1], 0, CAPTION.length, E.linear));
  return (
    <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", fontFamily: IOS, color: "#0D0D0D" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, height: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 38, fontWeight: 650 }}>
        ChatGPT <span style={{ color: "#8E8E93", fontWeight: 500 }}>›</span>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 680, display: "flex", flexDirection: "column", gap: 34 }}>
        {sent ? (
          <div style={{ alignSelf: "flex-end", maxWidth: 760, padding: "22px 30px", borderRadius: 40, background: "#F2F2F2", fontSize: 44, lineHeight: 1.3 }}>{typed}</div>
        ) : null}
        {f >= STREAM[0] ? <div style={{ fontSize: 44, lineHeight: 1.4, paddingRight: 20 }}>{CAPTION.slice(0, k)}{k < CAPTION.length ? <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: 11, background: "#0D0D0D", marginLeft: 6 }} /> : null}</div> : null}
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 60, minHeight: 110, borderRadius: 56, background: "#F4F4F4", display: "flex", alignItems: "center", padding: "0 34px", fontSize: 36, color: sent || n === 0 ? "#9A9A9F" : "#0D0D0D" }}>
        {sent || n === 0 ? "Ask anything" : typed.slice(0, n)}
        {!sent && n > 0 ? <span style={{ display: "inline-block", width: 3, height: 44, background: "#0A84FF", marginLeft: 3 }} /> : null}
      </div>
    </div>
  );
};

/* S2: the Brainfast app: channels + knowledge (each row lights up as it is named) */
const hl = (f: number, at: number) => tw(f, at - 4, at + 2, 0, 1, E.expoOut) * (1 - tw(f, at + 14, at + 24, 0, 1, E.linear));
const Agent: React.FC<{ f: number }> = ({ f }) => {
  const scroll = tw(f, T.VO.l06 - 6, T.VO.l06 + 10, 0, 1, E.cubicInOut) * 540;
  return (
    <BfScreen agent="Ana's Bakes Assistant">
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        <div style={{ padding: "400px 40px 16px", fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: C.gray }}>CHANNELS</div>
        <Row f={f} at={S2 + 10} icon="globe" title="Website widget" sub="anasbakes.com" right={<Pill>CONNECTED</Pill>} hot={hl(f, CH[0])} />
        <Row f={f} at={S2 + 14} img="img/icons/whatsapp.svg" title="WhatsApp" sub="+1 (415) 555-0142" right={<Pill>CONNECTED</Pill>} hot={hl(f, CH[1])} />
        <Row f={f} at={S2 + 18} img="img/icons/instagram.svg" title="Instagram" sub="@anasbakes" right={<Pill>CONNECTED</Pill>} hot={hl(f, CH[2])} />
        <div style={{ padding: "60px 40px 16px", fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: C.gray }}>KNOWLEDGE BASE</div>
        <Row f={f} at={S2 + 22} icon="book" title="Menu.pdf" sub="File resource" right={<Pill>READY</Pill>} hot={hl(f, KN[0])} />
        <Row f={f} at={S2 + 26} icon="card" title="Price list" sub="Text resource" right={<Pill>READY</Pill>} hot={hl(f, KN[1])} />
        <Row f={f} at={S2 + 30} icon="calendar" title="Opening hours" sub="anasbakes.com/hours" right={<Pill>READY</Pill>} hot={hl(f, KN[2])} />
      </div>
    </BfScreen>
  );
};

/* S3: WhatsApp Business on the owner's phone */
const Whats: React.FC<{ f: number }> = ({ f }) => (
  <WaScreen name="Jess" who={PEOPLE.eleanor} sub="customer">
    <div style={{ alignSelf: "center", padding: "8px 18px", borderRadius: 14, background: "#E1F2FB", fontSize: 26, color: "#555", marginBottom: 10 }}>Today</div>
    <WaMsg f={f} at={CUST - 10} time="00:12">hi!! do u do gluten free cupcakes? need 12 for saturday 🙏</WaMsg>
    <WaMsg f={f} at={ANS} me ai time="00:12">Yes! 🧁 Gluten-free vanilla &amp; chocolate. 12 are $42. Want me to book a pickup for Saturday?</WaMsg>
    <WaMsg f={f} at={YES} time="00:13">yes pls, 11am?</WaMsg>
    <WaMsg f={f} at={DONE - 4} me ai time="00:13">Done ✅ Order #2231 · Pickup Sat 11:00. See you then!</WaMsg>
  </WaScreen>
);

/* S4: Chat Logs */
const Logs: React.FC<{ f: number }> = ({ f }) => (
  <BfScreen agent="Ana's Bakes Assistant" tab="Chat Logs">
    <div style={{ paddingTop: 390 }}>
      <Row f={f} at={S4 + 2} img="img/icons/whatsapp.svg" title="Jess · gluten-free cupcakes" sub="Order #2231 · Pickup Sat 11:00" right={<Pill color={C.coralDeep} bg={C.coralTint}>BOOKED</Pill>} hot={tw(f, S4 + 10, S4 + 20, 0, 1, E.linear)} />
      <Row f={f} at={S4 + 5} icon="globe" title="Tom · do you deliver?" sub="Yes, within 5 miles, $4" right={<Pill>ANSWERED</Pill>} />
      <Row f={f} at={S4 + 8} img="img/icons/instagram.svg" title="Maya · birthday cake price" sub="From $38 · link sent" right={<Pill>ANSWERED</Pill>} />
      <Row f={f} at={S4 + 11} img="img/icons/whatsapp.svg" title="Omar · open on Sunday?" sub="10 AM – 4 PM" right={<Pill>ANSWERED</Pill>} />
      <Row f={f} at={S4 + 14} icon="globe" title="Grace · custom wedding order" sub="Handed to you" right={<Pill color="#8A5A00" bg="#FFF1CC">ESCALATED</Pill>} />
    </div>
  </BfScreen>
);

export const ReplyChatgpt: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const scenes = [
    { from: 0, to: S2, el: <ChatApp f={f} /> },
    { from: S2, to: S3, el: <Agent f={f} /> },
    { from: S3, to: S4, el: <Whats f={f} /> },
    { from: S4, to: 1e9, el: <Logs f={f} /> },
  ];
  const z = zoomTo(f, [
    [0, 1, 540, 960],
    [STREAM[0] - 10, 1, 540, 960],
    [STREAM[0] + 30, 1.05, 560, 900],
    [S2 - 2, 1.05, 560, 900],
    [S2 + 10, 1, 540, 960],
    [CUST, 1, 540, 960],
    [DONE, 1.05, 540, 1100],
    [S4 - 2, 1.05, 540, 1100],
    [S4 + 10, 1, 540, 960],
  ]);
  const phrases = phrasesFrom(KEYS.flatMap((k) => T.said(k)), DUR);
  const dim = tw(f, ST1 - 6, ST1 + 4, 0, 1, E.linear);
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
        <Tap f={f} x={1000} y={1805} at={SEND - 4} />
        <Tap f={f} x={540} y={1120} at={S4 + 20} />
      </div>
      <StatusBar time="14:22" />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)", opacity: dim, pointerEvents: "none" }} />
      <TextSticker at={ST1} x={540} y={900} size={64} rot={-2}>ChatGPT → works for YOU 🫵</TextSticker>
      <TextSticker at={ST2} x={540} y={1040} size={58} rot={1.5} bg={C.coral} color="#FFFFFF">Brainfast → works for your customers 🧁</TextSticker>
      <TextSticker at={ST3} x={540} y={1180} size={54} rot={-1}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          try it free 👉 brainfast.ai <Mark height={44} color={C.coral} stroke={26} />
        </span>
      </TextSticker>
      <AutoCaptions phrases={phrases} y={1360} />
      <ReplySticker name="ana's bakes 🧁" text="wait whats the difference between this and just using chatgpt?? i already pay for it 😭" avatar={PEOPLE.lucia} />
      {audio ? <Audio src={staticFile("films/reply-chatgpt/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(16, "keys", -12, "typing the prompt"),
  cue(SEND, "send", -6, "sent"),
  cue(STREAM[0], "type", -14, "answer streams"),
  cue(S2, "whoosh", -12, "swipe to Brainfast"),
  ...CH.map((c, i) => cue(c - 4, "tick", -10, `channel ${i + 1}`)),
  ...KN.map((c, i) => cue(c - 4, "tick", -10, `knowledge ${i + 1}`)),
  cue(S3, "whoosh", -12, "swipe to WhatsApp"),
  cue(CUST - 10, "notif", -8, "customer message"),
  cue(ANS, "send", -8, "AI reply"),
  cue(YES, "receive", -9, "customer yes"),
  cue(DONE - 4, "send", -8, "booked"),
  cue(S4, "whoosh", -12, "swipe to Chat Logs"),
  cue(S4 + 20, "tap", -6, "tap"),
  cue(ST1, "pop", -8, "sticker 1"),
  cue(ST2, "pop", -8, "sticker 2"),
  cue(ST3, "pop", -8, "sticker 3"),
];
export const BEATS = { SEND, S2, S3, S4, ST1, ST2, ST3, DUR };

export const REPLYCHATGPT: FilmDef = { id: "ReplyChatgpt", slug: "reply-chatgpt", title: "ReplyChatgpt", component: ReplyChatgpt, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/reply-chatgpt/mix.wav" };
