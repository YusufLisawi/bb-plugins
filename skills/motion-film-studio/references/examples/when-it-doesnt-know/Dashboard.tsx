import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CheckDisc, Icon, IconName } from "../../components/Icons";
import { Mark } from "../../components/Mark";
import { E, clamp, keys, mix, mixColor, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { CHANNEL, ChannelGlyph, Mono, pop } from "../components/Kit";
import { HIT, ws } from "../timing";

/**
 * 27–34 s — the owner's side. "Wanna jump in? Take over any chat, live." then
 * "Every chat, lead and escalation in one dashboard." The live-chat window
 * shrinks into its own card as the dashboard assembles around it.
 * UI strings are the product's own (activity/conversations, takeover toasts).
 */
const IN = 810;
const ROW_HI = ws("l11", 1) - 2; // "jump in?"
const OPEN = ws("l11", 2) + 4; // click the row
const TAKE = ws("l11", 3) + 4; // "Take over" — click the button
const TYPE: [number, number] = [ws("l11", 5), ws("l11", 7) - 4];
const SEND = ws("l11", 7) - 2; // "live"
const SHRINK: [number, number] = [ws("l12", 0) - 6, ws("l12", 1) + 8];
const T_CHATS = ws("l12", 1) - 2;
const T_LEADS = ws("l12", 2) - 2;
const T_ESC = ws("l12", 4) - 2;
const T_CHART = ws("l12", 1) + 4;
const T_DASH = ws("l12", 7) - 2;
const COLLAPSE = HIT - 14;

const WIN = { x: 60, y: 590, w: 960, h: 1060 };
const CARD = { x: 555, y: 1290, w: 465, h: 480 };

type Row = { name: string; ch: keyof typeof CHANNEL; msg: string; tint: string; human?: boolean };
const ROWS: Row[] = [
  { name: "Elena R.", ch: "whatsapp", msg: "Perfect, see you Friday!", tint: "#F6D5D1" },
  { name: "Marco T.", ch: "instagram", msg: "Do you deliver on Sundays?", tint: "#E6E1F5" },
  { name: "Priya S.", ch: "messenger", msg: "Can I move my booking to 7?", tint: "#DDEBF7" },
  { name: "Jordan K.", ch: "whatsapp", msg: "Can I talk to a person?", tint: "#F4E6C8", human: true },
];

const Avatar: React.FC<{ r: Row; size?: number }> = ({ r, size = 84 }) => (
  <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
    <div style={{ width: size, height: size, borderRadius: size / 2, background: r.tint, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: size * 0.4, fontWeight: 700, color: C.ink }}>
      {r.name[0]}
    </div>
    <div style={{ position: "absolute", right: -4, bottom: -4, width: size * 0.44, height: size * 0.44, borderRadius: "50%", background: C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(23,23,23,.12)" }}>
      <ChannelGlyph ch={r.ch} size={size * 0.3} />
    </div>
  </div>
);

const Chip: React.FC<{ children: React.ReactNode; hot?: boolean }> = ({ children, hot }) => (
  <div style={{ padding: "10px 16px", borderRadius: 999, background: hot ? C.coralTint : C.sand, color: hot ? C.coralDeep : C.gray, fontFamily: MONO, fontSize: 19, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{children}</div>
);

const Cursor: React.FC<{ x: number; y: number; press: number; o: number }> = ({ x, y, press, o }) => (
  <svg width={60} height={60} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 8, top: y - 6, opacity: o, transform: `scale(${1 - 0.15 * press})`, transformOrigin: "8px 6px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.25))" }}>
    <path d="M4 3l15 7-6.5 2L10 19z" fill={C.ink} stroke={C.white} strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

const List: React.FC<{ f: number }> = ({ f }) => {
  const away = tw(f, OPEN + 1, OPEN + 13, 0, 1, E.expoInOut);
  const pulse = f >= ROW_HI ? 0.5 + 0.5 * Math.sin(((f - ROW_HI) / 12) * Math.PI * 2 - Math.PI / 2) : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${-away * 40}%)`, opacity: 1 - away }}>
      <div style={{ position: "absolute", left: 44, right: 44, top: 44, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT, fontSize: 50, fontWeight: 700, letterSpacing: "-0.035em", color: C.ink }}>Live chats</div>
        <Mono size={20}>4 active</Mono>
      </div>
      {ROWS.map((r, i) => {
        const s = pop(f, IN + 4 + i * 3, 15, 170);
        const hot = r.human && f >= ROW_HI;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 150 + i * 176,
              height: 156,
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              gap: 24,
              borderRadius: 30,
              background: hot ? "#FFF8F6" : "transparent",
              boxShadow: hot ? `0 0 0 ${3 + 6 * pulse}px rgba(217,87,89,${0.5 - 0.3 * pulse})` : "none",
              opacity: clamp(s * 2),
              transform: `translateY(${(1 - s) * 60}px)`,
              fontFamily: FONT,
            }}
          >
            <Avatar r={r} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>{r.name}</div>
              <div style={{ fontSize: 28, color: C.gray, marginTop: 4, whiteSpace: "nowrap" }}>{r.msg}</div>
            </div>
            {r.human ? <Chip hot>WANTS A HUMAN</Chip> : <Chip>AI</Chip>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Bub: React.FC<{ side: "l" | "r"; tone: "sand" | "white" | "ink"; label?: string; children: React.ReactNode; s?: number }> = ({ side, tone, label, children, s = 1 }) => (
  <div style={{ alignSelf: side === "r" ? "flex-end" : "flex-start", display: "flex", flexDirection: "column", alignItems: side === "r" ? "flex-end" : "flex-start", gap: 8, transform: `scale(${mix(0.6, 1, s)})`, transformOrigin: side === "r" ? "100% 100%" : "0% 100%", opacity: clamp(s * 2) }}>
    {label ? <Mono size={17}>{label}</Mono> : null}
    <div
      style={{
        padding: "22px 28px",
        maxWidth: 600,
        borderRadius: side === "r" ? "32px 32px 10px 32px" : "32px 32px 32px 10px",
        background: tone === "ink" ? C.ink : tone === "sand" ? C.sand : C.white,
        color: tone === "ink" ? C.cream : C.ink,
        boxShadow: tone === "white" ? "inset 0 0 0 2px #ECE9E2" : "none",
        fontFamily: FONT,
        fontSize: 31,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </div>
  </div>
);

const REPLY = "Hi Jordan! Maya here, let's plan it.";
const Convo: React.FC<{ f: number }> = ({ f }) => {
  const inT = tw(f, OPEN + 1, OPEN + 13, 0, 1, E.expoInOut);
  const taken = f >= TAKE + 3;
  const tk = pop(f, TAKE + 3, 13, 180);
  const pressT = keys(f, [[TAKE - 3, 1], [TAKE, 0.93], [TAKE + 7, 1]]);
  const n = Math.round(tw(f, TYPE[0], TYPE[1], 0, REPLY.length, E.linear));
  const sent = pop(f, SEND, 14, 180);
  const div = pop(f, TAKE + 4, 14, 170);
  const caret = Math.floor(f / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - inT) * 60}%)`, opacity: inT }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170, padding: "0 36px", display: "flex", alignItems: "center", gap: 22, borderBottom: "2px solid #F0EDE6", boxSizing: "border-box" }}>
        <Avatar r={ROWS[3]} size={76} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>Jordan K.</div>
          <Mono size={18} style={{ marginTop: 4 }} color={taken ? C.coral : C.gray}>
            {taken ? "● You are responding" : "WhatsApp · agent replying"}
          </Mono>
        </div>
        {taken ? (
          <div style={{ padding: "18px 28px", borderRadius: 999, boxShadow: "inset 0 0 0 2px #E3DFD6", fontFamily: FONT, fontSize: 28, fontWeight: 600, color: C.ink, opacity: clamp(tk * 2), transform: `scale(${mix(0.7, 1, tk)})` }}>Release</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 30px", borderRadius: 999, background: C.ink, color: C.cream, fontFamily: FONT, fontSize: 28, fontWeight: 600, transform: `scale(${pressT})` }}>
            <Icon name="headset" size={30} color={C.cream} />
            Take over
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 36, right: 36, top: 190, bottom: 150, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20 }}>
        <Bub side="l" tone="sand">
          Hi! Do you make wedding cakes?
        </Bub>
        <Bub side="r" tone="white" label="AI agent">
          We do! Tiers start at $220.
          <br />
          Want to see some designs?
        </Bub>
        <Bub side="l" tone="sand">
          Can I talk to a person?
        </Bub>
        {f >= TAKE + 4 ? (
          <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 14, opacity: clamp(div * 2), transform: `scale(${mix(0.8, 1, div)})` }}>
            <div style={{ width: 90, height: 2, background: "#E3DFD6" }} />
            <Mono size={18} color={C.coral}>
              Maya took over · agent paused
            </Mono>
            <div style={{ width: 90, height: 2, background: "#E3DFD6" }} />
          </div>
        ) : null}
        {f >= SEND ? (
          <Bub side="r" tone="ink" label="Maya · live" s={sent}>
            {REPLY}
          </Bub>
        ) : null}
      </div>
      {/* composer */}
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, height: 96, borderRadius: 48, background: C.sand, display: "flex", alignItems: "center", padding: "0 12px 0 34px", fontFamily: FONT, fontSize: 29 }}>
        <div style={{ flex: 1, color: n > 0 && f < SEND ? C.ink : C.gray2, whiteSpace: "nowrap", overflow: "hidden" }}>
          {n > 0 && f < SEND ? (
            <>
              {REPLY.slice(0, n)}
              <span style={{ display: "inline-block", width: 3, height: 32, marginLeft: 2, verticalAlign: "-6px", background: caret ? C.ink : "transparent" }} />
            </>
          ) : taken ? (
            "Type a reply…"
          ) : (
            "Click 'Take over' to reply."
          )}
        </div>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: taken ? C.coral : "#DCD8CF", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${keys(f, [[SEND - 3, 1], [SEND, 0.88], [SEND + 7, 1]])})` }}>
          <Icon name="send" size={32} color={C.white} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** The takeover toast (sonner-style, as in the app). */
const Toast: React.FC<{ f: number }> = ({ f }) => {
  const at = TAKE + 5;
  if (f < at || f > at + 50) return null;
  const s = pop(f, at, 14, 170);
  const out = tw(f, at + 38, at + 50, 0, 1, E.expoIn);
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        right: 120,
        top: WIN.y + WIN.h + 26,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "24px 30px",
        borderRadius: 26,
        background: C.white,
        boxShadow: "0 24px 60px rgba(23,23,23,.2), inset 0 0 0 2px #EEEBE4",
        fontFamily: FONT,
        fontSize: 29,
        fontWeight: 600,
        color: C.ink,
        transform: `translateY(${(1 - s) * 80 + out * 60}px)`,
        opacity: clamp(s * 2) * (1 - out),
      }}
    >
      <CheckDisc t={tw(f, at + 2, at + 14, 0, 1, E.cubicInOut)} size={40} bg={C.ink} fg={C.white} />
      You're now responding to this conversation
    </div>
  );
};

/* ───────── dashboard ───────── */
const count = (f: number, at: number, to: number) => Math.round(to * tw(f, at, at + 28, 0, 1, E.quintOut));
const fmt = (n: number) => n.toLocaleString("en-US");

const Tile: React.FC<{ f: number; at: number; x: number; label: string; value: string; foot: React.ReactNode; icon: IconName }> = ({ f, at, x, label, value, foot, icon }) => {
  if (f < at) return null;
  const s = pop(f, at, 13, 170);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 590,
        width: 300,
        height: 230,
        boxSizing: "border-box",
        padding: "28px 28px",
        borderRadius: 36,
        background: C.white,
        boxShadow: "0 24px 50px rgba(23,23,23,.1), 0 2px 8px rgba(23,23,23,.05)",
        transform: `translateY(${(1 - s) * 80}px) scale(${mix(0.8, 1, s)})`,
        opacity: clamp(s * 2),
        fontFamily: FONT,
        color: C.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Mono size={19}>{label}</Mono>
        <Icon name={icon} size={30} color={C.coral} stroke={2.2} />
      </div>
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: "-0.045em", marginTop: 14, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 16 }}>{foot}</div>
    </div>
  );
};

const Up: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 19, letterSpacing: "0.06em", color: C.coral }}>
    <Icon name="trend" size={22} color={C.coral} stroke={2.4} />
    {children}
  </div>
);

const SERIES = [120, 142, 131, 168, 176, 159, 204, 221, 198, 236, 252, 247, 281, 296];
const Chart: React.FC<{ f: number }> = ({ f }) => {
  if (f < T_CHART) return null;
  const s = pop(f, T_CHART, 14, 160);
  const draw = tw(f, T_CHART + 2, T_CHART + 34, 0, 1, E.cubicInOut);
  const W0 = 880;
  const H0 = 250;
  const max = 320;
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * W0, H0 - (v / max) * H0] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const len = 1200;
  const head = pts[Math.min(pts.length - 1, Math.floor(draw * (pts.length - 1)))];
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 850,
        width: 960,
        height: 410,
        boxSizing: "border-box",
        padding: "30px 40px",
        borderRadius: 36,
        background: C.white,
        boxShadow: "0 24px 50px rgba(23,23,23,.1), 0 2px 8px rgba(23,23,23,.05)",
        transform: `translateY(${(1 - s) * 80}px) scale(${mix(0.85, 1, s)})`,
        opacity: clamp(s * 2),
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", color: C.ink }}>Messages over time</div>
        <Mono size={18}>Last 14 days</Mono>
      </div>
      <svg width={W0} height={H0 + 20} style={{ position: "absolute", left: 40, top: 110, overflow: "visible" }}>
        <defs>
          <linearGradient id="loopArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.coral} stopOpacity={0.28} />
            <stop offset="1" stopColor={C.coral} stopOpacity={0} />
          </linearGradient>
          <clipPath id="loopClip">
            <rect x={0} y={-20} width={W0 * draw + 2} height={H0 + 40} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3].map((k) => (
          <line key={k} x1={0} x2={W0} y1={(k / 3) * H0} y2={(k / 3) * H0} stroke="#EFECE5" strokeWidth={2} />
        ))}
        <path d={`${d} L ${W0} ${H0} L 0 ${H0} Z`} fill="url(#loopArea)" clipPath="url(#loopClip)" />
        <path d={d} fill="none" stroke={C.coral} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`${len * draw} ${len}`} />
        {draw > 0.02 ? <circle cx={head[0]} cy={head[1]} r={11} fill={C.white} stroke={C.coral} strokeWidth={5} /> : null}
      </svg>
    </div>
  );
};

const SOURCES: { ch: keyof typeof CHANNEL; n: number }[] = [
  { ch: "whatsapp", n: 38 },
  { ch: "instagram", n: 27 },
  { ch: "web", n: 21 },
  { ch: "messenger", n: 10 },
];
const LeadsBySource: React.FC<{ f: number }> = ({ f }) => {
  const at = T_LEADS + 8;
  if (f < at) return null;
  const s = pop(f, at, 14, 160);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 1290,
        width: 465,
        height: 480,
        boxSizing: "border-box",
        padding: "30px 34px",
        borderRadius: 36,
        background: C.white,
        boxShadow: "0 24px 50px rgba(23,23,23,.1), 0 2px 8px rgba(23,23,23,.05)",
        transform: `translateY(${(1 - s) * 80}px) scale(${mix(0.85, 1, s)})`,
        opacity: clamp(s * 2),
        fontFamily: FONT,
        color: C.ink,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em" }}>Leads by source</div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 30 }}>
        {SOURCES.map((r, i) => {
          const g = tw(f, at + 4 + i * 3, at + 26 + i * 3, 0, 1, E.expoOut);
          return (
            <div key={r.ch} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <ChannelGlyph ch={r.ch} size={40} />
              <div style={{ flex: 1, height: 22, borderRadius: 11, background: C.sand, overflow: "hidden" }}>
                <div style={{ width: `${(r.n / 40) * 100 * g}%`, height: "100%", borderRadius: 11, background: i === 0 ? C.coral : mixColor(C.coral, "#F2C4C0", i / 3) }} />
              </div>
              <div style={{ width: 44, textAlign: "right", fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(r.n * g)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MiniLive: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", inset: 0, padding: "30px 34px", fontFamily: FONT, color: C.ink, opacity: tw(f, SHRINK[0] + 8, SHRINK[0] + 16, 0, 1, E.linear) }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em" }}>Live chats</div>
      <div style={{ padding: "6px 12px", borderRadius: 999, background: C.coral, color: C.white, fontFamily: MONO, fontSize: 16, letterSpacing: "0.1em" }}>● LIVE</div>
    </div>
    <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 22 }}>
      {ROWS.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar r={r} size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 25, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.06em", color: r.human ? C.coral : C.gray, marginTop: 2 }}>{r.human ? "YOU · LIVE" : "AI AGENT"}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** "…in one dashboard": the cards settle into one app window. */
const NAV = ["Overview", "Chats", "Leads", "Escalations"];
const AppFrame: React.FC<{ f: number }> = ({ f }) => {
  if (f < T_DASH - 4) return null;
  const s = pop(f, T_DASH - 4, 16, 150);
  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        top: 560,
        width: 992,
        height: 1210,
        borderRadius: 52,
        background: "#EFECE4",
        boxShadow: "inset 0 0 0 2px #E4E0D6",
        opacity: clamp(s * 2),
        transform: `scale(${mix(1.08, 1, s)})`,
        fontFamily: FONT,
      }}
    >
      <div style={{ position: "absolute", left: 40, right: 30, top: 20, height: 68, display: "flex", alignItems: "center", gap: 10 }}>
        <Mark height={34} color={C.coral} />
        <div style={{ flex: 1, fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", color: C.ink, marginLeft: -4 }}>brainfast.</div>
        {NAV.map((n, i) => (
          <div
            key={n}
            style={{
              padding: "12px 22px",
              borderRadius: 999,
              background: i === 0 ? C.ink : "transparent",
              color: i === 0 ? C.cream : C.gray,
              fontSize: 25,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              opacity: clamp(tw(f, T_DASH + i * 2, T_DASH + 8 + i * 2, 0, 1, E.linear)),
            }}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const f = useCurrentFrame();
  if (f < IN - 4 || f > HIT + 2) return null;
  const enter = pop(f, IN, 17, 120, 0.8);
  const sh = tw(f, SHRINK[0], SHRINK[1], 0, 1, E.expoInOut);
  const win = {
    x: mix(WIN.x, CARD.x, sh),
    y: mix(WIN.y, CARD.y, sh),
    w: mix(WIN.w, CARD.w, sh),
    h: mix(WIN.h, CARD.h, sh),
  };
  const inner = 1 - tw(f, SHRINK[0], SHRINK[0] + 7, 0, 1, E.linear);
  // cursor: to Jordan's row, click; to "Take over", click
  const rowPt = { x: 760, y: WIN.y + 150 + 3 * 176 + 78 };
  const btnPt = { x: WIN.x + WIN.w - 150, y: WIN.y + 85 };
  const cx = keys(f, [[ROW_HI, 1020], [OPEN - 2, rowPt.x], [OPEN + 10, rowPt.x], [TAKE - 2, btnPt.x]], E.cubicInOut);
  const cy = keys(f, [[ROW_HI, 1500], [OPEN - 2, rowPt.y], [OPEN + 10, rowPt.y], [TAKE - 2, btnPt.y]], E.cubicInOut);
  const press = Math.max(keys(f, [[OPEN - 2, 0], [OPEN, 1], [OPEN + 5, 0]]), keys(f, [[TAKE - 2, 0], [TAKE, 1], [TAKE + 5, 0]]));
  const curO = tw(f, ROW_HI, ROW_HI + 6, 0, 1, E.linear) * (1 - tw(f, TAKE + 8, TAKE + 16, 0, 1, E.linear));
  // gleam across the whole dashboard on "dashboard"
  const gleam = tw(f, T_DASH, T_DASH + 22, 0, 1, E.cubicInOut);
  // the collapse into the mark on the final hit
  const col = tw(f, COLLAPSE, HIT, 0, 1, E.expoIn);
  const fit = keys(f, [[T_DASH - 4, 1], [T_DASH + 12, 0.88]], E.cubicInOut);
  const zoom = mix(1, 0.15, col);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "540px 820px", opacity: 1 - tw(col, 0.55, 1, 0, 1, E.linear) }}>
      <AppFrame f={f} />
      <AbsoluteFill style={{ transform: `scale(${fit})`, transformOrigin: "540px 1235px" }}>
      <Tile f={f} at={T_CHATS} x={60} label="Chats" icon="message" value={fmt(count(f, T_CHATS, 1284))} foot={<Up>+18% this week</Up>} />
      <Tile f={f} at={T_LEADS} x={390} label="Leads" icon="userPlus" value={fmt(count(f, T_LEADS, 96))} foot={<Up>+32% this week</Up>} />
      <Tile
        f={f}
        at={T_ESC}
        x={720}
        label="Escalations"
        icon="users"
        value={String(count(f, T_ESC, 12))}
        foot={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 19, letterSpacing: "0.06em", color: C.coral }}>
            <Icon name="check" size={22} color={C.coral} stroke={2.6} />
            ALL ANSWERED
          </div>
        }
      />
      <Chart f={f} />
      <LeadsBySource f={f} />
      <div
        style={{
          position: "absolute",
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          borderRadius: mix(44, 36, sh),
          background: C.white,
          overflow: "hidden",
          boxShadow: "0 50px 110px rgba(23,23,23,.16), 0 4px 14px rgba(23,23,23,.06)",
          transform: `translateY(${(1 - enter) * 1500}px)`,
        }}
      >
        {inner > 0 ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: WIN.w, height: WIN.h, opacity: inner }}>
            {f < OPEN + 14 ? <List f={f} /> : null}
            {f >= OPEN ? <Convo f={f} /> : null}
          </div>
        ) : null}
        {f >= SHRINK[0] + 6 ? <MiniLive f={f} /> : null}
      </div>
      <Toast f={f} />
      {curO > 0 ? <Cursor x={cx} y={cy} press={press} o={curO} /> : null}
      {gleam > 0 && gleam < 1 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, height: 1240, overflow: "hidden", pointerEvents: "none", mixBlendMode: "soft-light" }}>
          <div style={{ position: "absolute", top: -200, bottom: -200, width: 260, left: mix(-400, 1300, gleam), transform: "rotate(14deg)", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.9), rgba(255,255,255,0))" }} />
        </div>
      ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DBEATS = { IN, ROW_HI, OPEN, TAKE, D_TYPE: TYPE, SEND, SHRINK, T_CHATS, T_LEADS, T_ESC, T_CHART, T_DASH, COLLAPSE };
