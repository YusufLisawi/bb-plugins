import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mark } from "../../components/Mark";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { AppTile, CHANNEL, ChannelGlyph, Headline, pop } from "../components/Kit";
import { DROP, ws } from "../timing";

/** "Brainfast fixes that." holds until the line is said, then lifts away. */
export const FIX_OUT = 272;

/**
 * 0–9.5 s — the problem, made concrete, then the drop.
 * "Your inbox looks like this." badges race, notifications rain down.
 * "Same questions. Every channel. All day." one question, six channels, round the clock.
 * "And the one question that really matters… gets lost." a high-value request sinks.
 * "Brainfast fixes that." — on the drop the mark detonates the pile; the world turns cream.
 */
type Ch = keyof typeof CHANNEL;
const TILES: { ch: Ch; to: number; x: number; y: number }[] = [
  { ch: "whatsapp", to: 148, x: 230, y: 700 },
  { ch: "instagram", to: 132, x: 540, y: 680 },
  { ch: "gmail", to: 214, x: 850, y: 700 },
  { ch: "messenger", to: 63, x: 230, y: 980 },
  { ch: "web", to: 41, x: 540, y: 960 },
  { ch: "phone", to: 17, x: 850, y: 980 },
];
const RAIN = [
  "Are you open today?", "Do you deliver?", "Is this still in stock?", "Price for 2 cakes?", "Can I book for 6?",
  "Hello?? 👋", "Gluten-free options?", "Where's my order?", "Open on Sunday?", "Do you ship to Canada?",
  "Hi! Quick question", "Can I change my booking?", "Are you open today?", "What time do you close?",
];
const RAIN_CH: Ch[] = ["whatsapp", "instagram", "web", "messenger", "gmail", "whatsapp", "instagram", "web", "messenger", "whatsapp", "gmail", "web", "instagram", "whatsapp"];

const SAME: { ch: Ch; time: string }[] = [
  { ch: "whatsapp", time: "9:02 AM" },
  { ch: "instagram", time: "11:47 AM" },
  { ch: "web", time: "2:15 PM" },
  { ch: "messenger", time: "6:30 PM" },
  { ch: "gmail", time: "11:58 PM" },
  { ch: "phone", time: "3:12 AM" },
];

const Notif: React.FC<{ ch: Ch; text: string; style?: React.CSSProperties }> = ({ ch, text, style }) => (
  <div
    style={{
      position: "absolute",
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "20px 32px 20px 20px",
      borderRadius: 32,
      background: "rgba(250,249,245,.97)",
      boxShadow: "0 24px 50px rgba(0,0,0,.45)",
      fontFamily: FONT,
      fontSize: 36,
      fontWeight: 600,
      color: C.ink,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <div style={{ width: 62, height: 62, borderRadius: 17, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ChannelGlyph ch={ch} size={38} />
    </div>
    {text}
  </div>
);

export const Chaos: React.FC = () => {
  const f = useCurrentFrame();
  if (f > DROP + 40) return null;
  // everything blasts outward on the drop
  const blast = tw(f, DROP, DROP + 22, 0, 1, E.expoOut);
  const gone = tw(f, DROP + 6, DROP + 24, 0, 1, E.linear);
  // a continuous handheld wobble: smooth curves, so motion blur streaks it
  // instead of double-exposing two random offsets
  const amp = f < DROP ? 4 * tw(f, 20, 60, 0, 1, E.linear) : 0;
  const shakeX = amp * (0.65 * Math.sin(f * 0.45) + 0.35 * Math.sin(f * 0.83 + 1.3));
  const shakeY = amp * 0.6 * (0.6 * Math.sin(f * 0.57 + 0.7) + 0.4 * Math.sin(f * 1.03 + 2.1));
  const explode = (x: number, y: number, k: number) => {
    const a = Math.atan2(y - 960, x - 540) + (rnd(k * 7.7) - 0.5) * 0.6;
    const d = 900 * blast;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: (rnd(k * 3.1) - 0.5) * 80 * blast };
  };

  // the question that matters, sinking under the flood
  const vipIn = pop(f, ws("l03", 2) - 3, 14, 150);
  const sink = tw(f, ws("l03", 7) - 2, ws("l03", 8) + 10, 0, 1, E.cubicInOut);
  const same = (i: number) => pop(f, ws("l02", 0) - 4 + i * 3, 14, 170);
  const flood = (i: number) => tw(f, ws("l03", 7) - 6 + i * 1.5, ws("l03", 7) + 12 + i * 1.5, 0, 1, E.expoOut);
  // the rain flings up and away as the "same question" rows take over
  const aOut = tw(f, ws("l02", 0) - 11, ws("l02", 0) - 3, 0, 1, E.expoIn);
  const phaseA = f < ws("l02", 0) - 2;
  const phaseB = f >= ws("l02", 0) - 4;
  const unread = Math.round(mix(12, 247, tw(f, 8, 120, 0, 1, E.cubicInOut)));

  return (
    <AbsoluteFill style={{ opacity: 1 - gone, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
      {/* A — the badge wall and the rain of notifications */}
      {phaseA
        ? TILES.map((t, i) => {
            const s = pop(f, -3 + i * 2, 12, 200);
            const n = Math.round(mix(1, t.to, tw(f, 2 + i * 2, 64 + i * 6, 0, 1, E.cubicInOut)));
            const out = aOut;
            const j = Math.sin(f * 1.7 + i) * 3 * tw(f, 20, 40, 0, 1, E.linear);
            return (
              <AppTile
                key={i}
                ch={t.ch}
                size={190}
                count={n > 99 ? "99+" : String(n)}
                style={{
                  position: "absolute",
                  left: t.x - 95,
                  top: t.y - 95,
                  transform: `scale(${mix(0.3, 1, s) * (1 - out)}) rotate(${j}deg)`,
                  opacity: clamp(s * 2) * (1 - out),
                }}
              />
            );
          })
        : null}
      {phaseA
        ? RAIN.map((txt, i) => {
            const at = 6 + i * 3.1;
            if (f < at) return null;
            const t = tw(f, at, at + 14, 0, 1, E.expoOut);
            const x = 40 + rnd(i * 5.3) * 440;
            const y = 1150 + (i % 7) * 100 + rnd(i * 2.2) * 40 - (i >= 7 ? 520 : 0);
            return (
              <Notif
                key={i}
                ch={RAIN_CH[i]}
                text={txt}
                style={{ left: x, top: mix(y - 260, y, t) - aOut * (900 + 300 * rnd(i * 4.7)), opacity: clamp(t * 2) * (1 - aOut), transform: `rotate(${(rnd(i * 9.1) - 0.5) * 10}deg)` }}
              />
            );
          })
        : null}
      {phaseA ? (
        <div style={{ position: "absolute", left: 80, top: 1830, fontFamily: MONO, fontSize: 30, letterSpacing: "0.12em", color: "#E5484D", opacity: 1 - aOut }}>● {unread} UNREAD</div>
      ) : null}

      {/* B — the same question, on every channel, round the clock */}
      {phaseB
        ? SAME.map((m, i) => {
            const s = same(i);
            const lit = tw(f, ws("l02", 2) + i * 3, ws("l02", 2) + 8 + i * 3, 0, 1, E.cubicInOut);
            const clock = f >= ws("l02", 4) - 2;
            const x = 70;
            const y = 610 + i * 168;
            const e = explode(x + 400, y, i + 40);
            const buried = tw(f, ws("l03", 7) - 4, ws("l03", 8) + 4, 0, 1, E.cubicInOut);
            const lean = f >= ws("l03", 0) ? tw(f, ws("l03", 0) - 4, ws("l03", 0) + 12, 0, 1, E.cubicInOut) : 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  width: 940,
                  opacity: clamp(s * 2) * (1 - 0.55 * lean) * (1 - 0.4 * buried),
                  transform: `translate(${(1 - s) * -120 + e.dx}px, ${e.dy}px) rotate(${e.r}deg) scale(${1 - 0.06 * lean})`,
                  fontFamily: FONT,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 28,
                    background: mixColor("#2A2729", C.cream, lit),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChannelGlyph ch={m.ch} size={54} color={lit > 0.5 ? C.ink : C.cream} />
                </div>
                <div style={{ padding: "24px 34px", borderRadius: "34px 34px 34px 10px", background: C.cream, fontSize: 42, fontWeight: 600, letterSpacing: "-0.015em", color: C.ink }}>Are you open today?</div>
                <div style={{ flex: 1, textAlign: "right", fontFamily: MONO, fontSize: 28, letterSpacing: "0.06em", color: "rgba(250,249,245,.62)", opacity: clock ? tw(f, ws("l02", 4) - 2 + i * 2, ws("l02", 4) + 6 + i * 2, 0, 1, E.linear) : 0 }}>{m.time}</div>
              </div>
            );
          })
        : null}

      {/* the one question that matters */}
      {f >= ws("l03", 2) - 4 ? (
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            top: 1010 + sink * 280,
            padding: "36px 40px",
            borderRadius: 42,
            background: C.white,
            boxShadow: `0 0 0 4px ${mixColor(C.coral, "#5A5456", sink)}, 0 40px 80px rgba(0,0,0,.5)`,
            fontFamily: FONT,
            color: C.ink,
            opacity: clamp(vipIn * 2) * (1 - 0.72 * sink),
            filter: `grayscale(${sink})`,
            transform: `scale(${mix(0.85, 1, vipIn) * (1 - 0.12 * sink)}) rotate(${sink * -4}deg) translate(${explode(540, 1100, 99).dx}px, ${explode(540, 1100, 99).dy}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: C.coralTint, color: C.coral, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700 }}>E</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em" }}>Elena R.</div>
              <div style={{ fontFamily: MONO, fontSize: 21, letterSpacing: "0.08em", color: C.gray, marginTop: 2 }}>INSTAGRAM · NOW</div>
            </div>
            <div style={{ padding: "10px 18px", borderRadius: 999, background: C.coral, color: C.white, fontFamily: MONO, fontSize: 21, letterSpacing: "0.1em" }}>$4K ORDER</div>
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.025em", marginTop: 22, lineHeight: 1.2 }}>Can you cater 60 people this Friday?</div>
          {sink > 0.4 ? <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 24, letterSpacing: "0.1em", color: "#E5484D", opacity: tw(sink, 0.4, 0.8, 0, 1, E.linear) }}>SEEN · NO REPLY · 3 DAYS</div> : null}
        </div>
      ) : null}
      {/* the flood that buries it */}
      {f >= ws("l03", 7) - 8
        ? Array.from({ length: 10 }, (_, i) => {
            const t = flood(i);
            const x = 60 + rnd(i * 4.4 + 1) * 480;
            const y = mix(620, 980 + rnd(i * 3.3) * 520, t);
            const e = explode(x + 200, y, i + 80);
            return (
              <Notif
                key={i}
                ch={RAIN_CH[i]}
                text={RAIN[(i * 3) % RAIN.length]}
                style={{ left: x + e.dx, top: y + e.dy, opacity: clamp(t * 3), transform: `rotate(${(rnd(i * 6.1) - 0.5) * 16 + e.r}deg)` }}
              />
            );
          })
        : null}

      <Headline
        from={6}
        to={ws("l02", 0) - 10}
        y={250}
        size={100}
        words={[
          { t: "Your", at: ws("l01", 0) },
          { t: "inbox", at: ws("l01", 1), br: true },
          { t: "looks", at: ws("l01", 2) },
          { t: "like", at: ws("l01", 3) },
          { t: "this.", at: ws("l01", 4), hi: true },
        ]}
      />
      <Headline
        from={ws("l02", 0) - 4}
        to={ws("l03", 0) - 10}
        y={220}
        size={100}
        words={[
          { t: "Same", at: ws("l02", 0) },
          { t: "questions.", at: ws("l02", 1), br: true },
          { t: "Every", at: ws("l02", 2) },
          { t: "channel.", at: ws("l02", 3), hi: true, br: true },
          { t: "All", at: ws("l02", 4) },
          { t: "day.", at: ws("l02", 5), hi: true },
        ]}
      />
      <Headline
        from={ws("l03", 0) - 4}
        to={DROP - 6}
        y={240}
        size={86}
        words={[
          { t: "And", at: ws("l03", 0) },
          { t: "the", at: ws("l03", 1) },
          { t: "one", at: ws("l03", 2), hi: true },
          { t: "question", at: ws("l03", 3), hi: true, br: true },
          { t: "that", at: ws("l03", 4) },
          { t: "really", at: ws("l03", 5) },
          { t: "matters…", at: ws("l03", 6), br: true },
          { t: "gets", at: ws("l03", 7) },
          { t: "lost.", at: ws("l03", 8) },
        ]}
      />
    </AbsoluteFill>
  );
};

/** The drop: the mark draws over the chaos and a coral iris opens the cream world. */
export const Fix: React.FC = () => {
  const f = useCurrentFrame();
  if (f < DROP - 8 || f > FIX_OUT + 16) return null;
  const draw = tw(f, DROP - 6, DROP + 10, 0, 1, E.cubicInOut);
  const iris = tw(f, DROP, DROP + 18, 0, 1, E.expoOut);
  const settle = keys(f, [[DROP - 6, 1.25], [DROP + 4, 0.92], [DROP + 16, 1]], E.cubicInOut);
  // the whole lockup lifts away just before the phone rises into its place
  const up = tw(f, FIX_OUT, FIX_OUT + 13, 0, 1, E.expoIn);
  const markH = 330;
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={540} cy={760} r={iris * 2300} fill="none" stroke={C.coral} strokeWidth={60 * (1 - iris)} opacity={1 - iris} />
      </svg>
      <AbsoluteFill style={{ transform: `translateY(${-up * 420}px)`, opacity: 1 - tw(up, 0.3, 1, 0, 1, E.linear) }}>
        <div
          style={{
            position: "absolute",
            left: 540 - (markH * 292) / 318 / 2,
            top: 760 - markH / 2,
            transform: `scale(${settle})`,
          }}
        >
          <Mark height={markH} progress={draw} color={C.coral} />
        </div>
        <Headline
          from={DROP}
          to={FIX_OUT + 30}
          y={1020}
          size={118}
          align="center"
          words={[
            { t: "Brainfast", at: ws("l04", 0), br: true },
            { t: "fixes", at: ws("l04", 1), hi: true },
            { t: "that.", at: ws("l04", 2), hi: true },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
