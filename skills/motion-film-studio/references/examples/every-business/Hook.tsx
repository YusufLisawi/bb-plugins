import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon } from "../../components/Icons";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { CHANNEL, ChannelGlyph } from "../../loop/components/Kit";
import { Kinetic, Sparkles, springAt } from "../../fx2/Fx2";
import { BIZ, BizBadge, BizKey } from "../components/Biz";
import { DROP, VO, nwords, ws } from "../timing";

/**
 * 0–14 s. Four people ask four very different businesses a question; the
 * questions stack up as they are spoken, then burst into a whole wall of them
 * ("Every business runs on questions"), day and night, every channel, every
 * language — then the wall gets answered, and spirals into one point: the drop.
 */

/* ───────── A · the four questions ───────── */
const ASK: { k: BizKey; line: "c1" | "c2" | "c3" | "c4" }[] = [
  { k: "store", line: "c1" },
  { k: "clinic", line: "c2" },
  { k: "homes", line: "c3" },
  { k: "hotel", line: "c4" },
];
const CARD_H = 290;
const GAP = 38;
const arrive = (i: number) => ws(ASK[i].line, 0) - 5;
const BURST = VO.l01 - 6; // the stack bursts into the wall as the narrator starts

const QCard: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const { k, line } = ASK[i];
  const b = BIZ[k];
  const at = arrive(i);
  if (f < at - 2) return null;
  // stack layout: how many cards are in, and where this one sits
  const inCount = ASK.reduce((n, _, j) => n + clamp(springAt(f, arrive(j), 30, 16, 150)), 0);
  const total = inCount * CARD_H + Math.max(0, inCount - 1) * GAP;
  const top = (1920 - total) / 2 + 40;
  const s = springAt(f, at, 30, 14, 160);
  const y = mix(1980, top + i * (CARD_H + GAP), clamp(s));
  const tilt = [-1.6, 1.4, -1.0, 1.8][i] * (1 - 0.3 * clamp(s));
  const words = b.q.split(" ");
  const boom = tw(f, BURST, BURST + 16, 0, 1, E.expoIn);
  const dirX = [-1, 1, -1, 1][i];
  const glow = tw(f, at + 2, at + 16, 1, 0, E.cubicInOut);
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        top: y,
        width: 900,
        height: CARD_H,
        transform: `translate(${boom * dirX * 900}px, ${-boom * 200}px) rotate(${tilt + boom * dirX * 18}deg) scale(${mix(0.8, 1, clamp(s)) * (1 - 0.3 * boom)})`,
        opacity: 1 - tw(boom, 0.6, 1, 0, 1, E.linear),
      }}
    >
      <div style={{ position: "absolute", inset: -40, borderRadius: 80, background: `radial-gradient(ellipse at 50% 50%, ${b.color}55 0%, transparent 70%)`, opacity: glow }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 44,
          background: C.white,
          boxShadow: `0 40px 80px rgba(23,23,23,.10), 0 4px 14px rgba(23,23,23,.05), inset 0 0 0 2px ${mixColor("#FFFFFF", b.color, 0.18 * glow)}`,
          padding: "30px 38px",
          boxSizing: "border-box",
          fontFamily: FONT,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <BizBadge b={b} size={58} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>{b.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray, marginTop: 2 }}>{b.kind.toUpperCase()}</div>
          </div>
          {b.lang ? (
            <div style={{ padding: "8px 14px", borderRadius: 999, background: b.tint, color: b.color, fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", marginRight: 8 }}>{b.lang}</div>
          ) : null}
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.08em", color: C.gray2 }}>{b.time}</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 50, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.14, color: C.ink }}>
          {words.map((w, j) => {
            const wa = ws(line, Math.min(j, nwords(line) - 1));
            const t = tw(f, wa - 3, wa + 8, 0, 1, E.expoOut);
            return (
              <React.Fragment key={j}>
                <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.04em 0.03em 0.18em", margin: "-0.04em -0.03em -0.18em" }}>
                  <span style={{ display: "inline-block", transform: `translateY(${(1 - t) * 130}%)`, opacity: t > 0 ? 1 : 0 }}>{w}</span>
                </span>
                {j < words.length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <Sparkles x={0} y={0} w={900} h={CARD_H} at={at + 6} color={b.color} size={34} seed={i + 2} />
    </div>
  );
};

/* ───────── B · the wall of questions ───────── */
const QUESTIONS = [
  "Where's my order?",
  "Can I reschedule?",
  "Is it still available?",
  "Do you ship abroad?",
  "What are your hours?",
  "Can I get a refund?",
  "Do you take my insurance?",
  "Can I book a viewing?",
  "Is breakfast included?",
  "How do I reset my password?",
  "Can I pay in installments?",
  "Is there parking?",
  "Do you have it in blue?",
  "When does the course start?",
  "Can I bring my dog?",
  "Are you open on Sunday?",
  "Can someone call me back?",
  "Where do I send my documents?",
  "Can I change my plan?",
  "How long is the warranty?",
  "Do you deliver today?",
  "Is it gluten-free?",
  "Can I upgrade my room?",
  "What's included?",
];
const KEYS: BizKey[] = ["store", "clinic", "homes", "hotel", "saas"];
const ROWS = 9;
const ROW_Y = (r: number) => 150 + r * 196;
type Pill = { r: number; x0: number; w: number; text: string; k: BizKey; speed: number };
const PILLS: Pill[] = (() => {
  const out: Pill[] = [];
  let q = 0;
  for (let r = 0; r < ROWS; r++) {
    let x = -200 - rnd(r * 3.1) * 300;
    const speed = (r % 2 ? -1 : 1) * (1.4 + rnd(r * 1.7) * 1.4);
    while (x < 1500) {
      const text = QUESTIONS[q % QUESTIONS.length];
      const w = 110 + text.length * 17.5;
      out.push({ r, x0: x, w, text, k: KEYS[(q * 3 + r) % KEYS.length], speed });
      x += w + 34;
      q++;
    }
  }
  return out;
})();
const WALL_IN = BURST - 2;
const ANSWER_WAVE: [number, number] = [ws("l03", 1) - 4, ws("l03", 6) + 2];
const VORTEX: [number, number] = [ws("l03", 7) - 6, DROP - 2];
const CENTER = { x: 540, y: 960 };

const Wall: React.FC = () => {
  const f = useCurrentFrame();
  if (f < WALL_IN - 2 || f > DROP + 2) return null;
  const vIn = tw(f, WALL_IN, WALL_IN + 22, 0, 1, E.expoOut);
  const night = nightAt(f);
  const vt = tw(f, VORTEX[0], VORTEX[1], 0, 1, E.expoIn);
  const focus = tw(f, VO.l01, VO.l01 + 20, 0, 1, E.cubicInOut) * (1 - vt);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* night falls behind the wall for "day and night" */}
      {night > 0 ? (
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #0E0F22 0%, #1A1631 55%, #2A1B2C 100%)", opacity: night * 0.94 }}>
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: rnd(i * 3.3) * 1080, top: rnd(i * 5.1) * 1920, width: 4, height: 4, borderRadius: 2, background: "#FFF7E8", opacity: 0.35 + 0.5 * Math.sin(f * 0.2 + i) ** 2 }} />
          ))}
        </AbsoluteFill>
      ) : null}
      {PILLS.map((p, i) => {
        const b = BIZ[p.k];
        const span = 1500 + 600;
        const x = ((((p.x0 + p.speed * (f - WALL_IN) + 400) % span) + span) % span) - 400;
        const y = ROW_Y(p.r);
        // entrance: pills fly in from the burst centre with a stagger
        const d = rnd(i * 1.37) * 10;
        const e = tw(f, WALL_IN + d, WALL_IN + d + 18, 0, 1, E.expoOut);
        const px = mix(CENTER.x - p.w / 2, x, e);
        const py = mix(CENTER.y, y, e);
        // answered: a wave that sweeps left → right, top → bottom
        const wave = (x + p.w / 2) / 1080 * 0.6 + p.r / ROWS * 0.4;
        const ans = tw(f, mix(ANSWER_WAVE[0], ANSWER_WAVE[1], wave), mix(ANSWER_WAVE[0], ANSWER_WAVE[1], wave) + 8, 0, 1, E.expoOut);
        // vortex: spiral into the centre
        const cx0 = px + p.w / 2;
        const cy0 = py + 34;
        const ang0 = Math.atan2(cy0 - CENTER.y, cx0 - CENTER.x);
        const rad0 = Math.hypot(cx0 - CENTER.x, cy0 - CENTER.y);
        const ang = ang0 + vt * (2.2 + rnd(i) * 0.8);
        const rad = rad0 * (1 - vt);
        const vx = CENTER.x + Math.cos(ang) * rad - p.w / 2;
        const vy = CENTER.y + Math.sin(ang) * rad - 34;
        const X = vt > 0 ? vx : px;
        const Y = vt > 0 ? vy : py;
        // the band behind the headline stays calm: pills there fade back
        const band = Math.exp(-Math.pow((y - 780) / 330, 2));
        const op = e * (1 - 0.9 * band * focus) * (1 - tw(vt, 0.75, 1, 0, 1, E.linear)) * vIn;
        if (X > 1180 || X + p.w < -100 || op <= 0.01) return null;
        const bg = mixColor(mixColor(b.tint, "#2A2830", night * 0.85), "#FBE3E0", ans);
        const fg = mixColor(mixColor(b.color, "#F3EFE8", night * 0.8), C.coralDeep, ans);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: X,
              top: Y,
              height: 68,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 26px 0 18px",
              borderRadius: 999,
              background: bg,
              color: fg,
              fontSize: 29,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              opacity: op,
              transform: `scale(${1 - 0.6 * vt}) rotate(${vt * 90}deg)`,
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 20, background: ans > 0.5 ? C.coral : b.color, display: "flex", alignItems: "center", justifyContent: "center", opacity: mix(1, 1, night) }}>
              <Icon name={ans > 0.5 ? "check" : b.icon} size={22} color="#FFFFFF" stroke={2.6} />
            </div>
            {p.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ───────── B′ · day & night, every channel, every language ───────── */
const LANGS = ["Where's my order?", "¿Dónde está mi pedido?", "Où est ma commande ?", "أين طلبي؟", "Wo ist meine Bestellung?", "Dov'è il mio ordine?"];
const CH: (keyof typeof CHANNEL)[] = ["web", "whatsapp", "instagram", "messenger", "gmail", "phone"];

const Anywhere: React.FC = () => {
  const f = useCurrentFrame();
  const dayAt = ws("l02", 0) - 3;
  const chAt = ws("l02", 4) - 3;
  const langAt = ws("l02", 7) - 3;
  const end = ws("l03", 0) - 4;
  if (f < dayAt - 2 || f > end + 10) return null;
  const out = tw(f, end, end + 10, 0, 1, E.expoIn);
  const Y = 1180;
  // sun → moon → sun (the icon turns as the room dims)
  const sunMoon = keys(f, [[dayAt, 0], [ws("l02", 2), 1], [ws("l02", 4) - 2, 0]], E.cubicInOut);
  const dayIn = springAt(f, dayAt, 30, 13, 180);
  // one question rolls through six languages, a new one every 5 frames
  const lp = Math.max(0, (f - langAt) / 5);
  const langIdx = Math.min(LANGS.length - 1, Math.floor(lp));
  const roll = langIdx < LANGS.length - 1 ? tw(lp - langIdx, 0.55, 1, 0, 1, E.cubicInOut) : 0;
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 60}px)`, fontFamily: FONT }}>
      {/* sun / moon */}
      <div style={{ position: "absolute", left: 540 - 90, top: Y - 90, width: 180, height: 180, transform: `scale(${mix(0.3, 1, clamp(dayIn)) * (1 - tw(f, chAt - 6, chAt, 0, 1, E.expoIn))}) rotate(${sunMoon * 200}deg)`, opacity: f < chAt ? 1 : 0 }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - sunMoon }}>
          <Icon name="sun" size={180} color={C.coral} stroke={2.4} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: sunMoon }}>
          <Icon name="moon" size={180} color="#FFF3DC" stroke={2.4} />
        </div>
      </div>
      {/* channels */}
      {f >= chAt - 2 && f < langAt + 4
        ? CH.map((c, i) => {
            const s = springAt(f, chAt + i * 2.5, 30, 12, 200);
            const gone = tw(f, langAt - 4, langAt + 4, 0, 1, E.expoIn);
            const x = 540 + (i - 2.5) * 150;
            return (
              <div key={c} style={{ position: "absolute", left: x - 58, top: Y - 58, width: 116, height: 116, borderRadius: 32, background: C.white, boxShadow: "0 20px 44px rgba(23,23,23,.14)", display: "flex", alignItems: "center", justifyContent: "center", transform: `translateY(${(1 - clamp(s)) * 120 - gone * 80}px) scale(${mix(0.4, 1, clamp(s)) * (1 - 0.4 * gone)})`, opacity: clamp(s * 2) * (1 - gone) }}>
                <ChannelGlyph ch={c} size={60} />
              </div>
            );
          })
        : null}
      {/* one question, every language */}
      {f >= langAt - 2 ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: Y - 70, height: 140, display: "flex", justifyContent: "center", transform: `scale(${mix(0.6, 1, clamp(springAt(f, langAt, 30, 13, 190)))})` }}>
          <div style={{ position: "relative", height: 140, padding: "0 46px", borderRadius: 70, background: C.white, boxShadow: "0 30px 60px rgba(23,23,23,.14)", display: "flex", alignItems: "center", overflow: "hidden", minWidth: 640, justifyContent: "center" }}>
            <div style={{ position: "relative", height: 70, overflow: "hidden", display: "flex", justifyContent: "center" }}>
              {[langIdx, Math.min(LANGS.length - 1, langIdx + 1)].map((li, j) => (
                <div
                  key={j}
                  dir="auto"
                  style={{
                    position: j ? "absolute" : "relative",
                    top: 0,
                    fontSize: 54,
                    lineHeight: "70px",
                    fontWeight: 650,
                    letterSpacing: "-0.02em",
                    color: C.ink,
                    whiteSpace: "nowrap",
                    transform: `translateY(${(j - roll) * 100}%)`,
                    opacity: j === 1 && li === langIdx ? 0 : 1,
                  }}
                >
                  {LANGS[li]}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ───────── headlines ───────── */
export const nightAt = (f: number) => keys(f, [[ws("l02", 0) - 2, 0], [ws("l02", 2), 1], [ws("l02", 4), 0]], E.cubicInOut);
export const HookText: React.FC = () => {
  const f = useCurrentFrame();
  const inkN = mixColor(C.ink, "#FFF3DC", nightAt(f));
  return (
  <>
    <Kinetic
      from={VO.l01 - 2}
      to={ws("l02", 0) - 12}
      y={560}
      size={130}
      align="center"
      color={C.ink}
      hi={C.coral}
      shineAt={ws("l01", 4) + 6}
      shineHi="#FFC2BA"
      words={[
        { t: "Every", at: ws("l01", 0) },
        { t: "business", at: ws("l01", 1), br: true },
        { t: "runs", at: ws("l01", 2) },
        { t: "on", at: ws("l01", 3), br: true },
        { t: "questions.", at: ws("l01", 4), hi: true },
      ]}
    />
    <Kinetic
      from={ws("l02", 0) - 3}
      to={ws("l02", 4) - 10}
      y={720}
      size={120}
      align="center"
      color={inkN}
      hi={C.coral}
      words={[
        { t: "Day", at: ws("l02", 0) },
        { t: "&", at: ws("l02", 1) },
        { t: "night.", at: ws("l02", 2), hi: true },
      ]}
    />
    <Kinetic
      from={ws("l02", 4) - 3}
      to={ws("l02", 7) - 8}
      y={720}
      size={120}
      align="center"
      color={C.ink}
      hi={C.coral}
      words={[
        { t: "Every", at: ws("l02", 4) },
        { t: "channel.", at: ws("l02", 5), hi: true },
      ]}
    />
    <Kinetic
      from={ws("l02", 7) - 3}
      to={ws("l03", 0) - 8}
      y={720}
      size={120}
      align="center"
      color={C.ink}
      hi={C.coral}
      words={[
        { t: "Every", at: ws("l02", 7) },
        { t: "language.", at: ws("l02", 8), hi: true },
      ]}
    />
    <Kinetic
      from={ws("l03", 0) - 3}
      to={VORTEX[0] + 6}
      y={620}
      size={116}
      align="center"
      color={C.ink}
      hi={C.coral}
      words={[
        { t: "Now", at: ws("l03", 0) },
        { t: "every", at: ws("l03", 1) },
        { t: "one", at: ws("l03", 1) + 5, br: true },
        { t: "gets", at: ws("l03", 2) },
        { t: "the", at: ws("l03", 3) },
        { t: "right", at: ws("l03", 4), hi: true, br: true },
        { t: "answer.", at: ws("l03", 5), hi: true },
      ]}
    />
  </>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  if (f > DROP + 4) return null;
  return (
    <AbsoluteFill>
      <Wall />
      {f < BURST + 20 ? ASK.map((_, i) => <QCard key={i} i={i} />) : null}
      <Anywhere />
    </AbsoluteFill>
  );
};

export const HOOK_BEATS = { ARRIVE: [0, 1, 2, 3].map(arrive), BURST, WALL_IN, ANSWER_WAVE, VORTEX };
