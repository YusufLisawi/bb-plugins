import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CheckDisc, Icon, IconName } from "../../components/Icons";
import { Mark } from "../../components/Mark";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { ChannelGlyph, Mono, PHONE, pop } from "../components/Kit";
import { Pt, crLength, crPath, crPoint } from "../components/Path";
import { ws } from "../timing";

/**
 * 9.3–27.5 s — the product, as one continuous camera move through a small world:
 *
 *   [customer's phone] ──── (the agent) ──── [your team's phone]
 *        world x 0              600                 1200
 *
 * The customer asks, the agent answers; when it doesn't know, the question flies
 * through the agent to the team, the reply flies back, and the camera pulls out
 * to show the whole loop while the answer is filed away as new knowledge.
 */
export const CX = 0;
export const TX = 1200;
export const BX = 600;
const SW = PHONE.w - PHONE.inset * 2; // 612
const SH = PHONE.h - PHONE.inset * 2; // 1272
const STAGE = { x: 540, y: 1170 };
/** phone-screen point → world point */
const scr = (px: number, sx: number, sy: number): Pt => ({ x: px - PHONE.w / 2 + PHONE.inset + sx, y: -PHONE.h / 2 + PHONE.inset + sy });

/* ───────── the beats (frames) ───────── */
const PHONE_IN = 282;
const Q1 = 286; // "Can you cater 60 people this Friday?" already sent as we arrive
const A1 = ws("l05", 3) - 2; // "answers"
const FAST = ws("l05", 4) - 2; // "instantly"
const Q2 = ws("l07", 1) - 1; // "when" — the follow-up
const SEARCH = ws("l07", 2); // agent looks it up…
const MISS = ws("l07", 4) - 1; // "…know" — nothing found
const STALL = ws("l08", 1) - 3; // "asks" — "I've asked a teammate…"
const Q_FLY: [number, number] = [ws("l08", 1) - 1, ws("l08", 1) + 23];
const WA = ws("l08", 5) - 2; // "WhatsApp"
const MAIL = ws("l08", 7) - 2; // "email"
const TAP_NOTE = ws("l09", 0) - 12;
const PORTAL = TAP_NOTE + 3;
const TYPE: [number, number] = [ws("l09", 0) + 3, ws("l09", 2) + 4]; // "Reply in seconds"
const TAP_REPHRASE = TYPE[1] + 3;
const REPHRASED = TAP_REPHRASE + 7;
const TAP_SEND = ws("l09", 4) - 1; // "and it"
const A_FLY: [number, number] = [ws("l09", 5) - 3, ws("l09", 10) - 5]; // "goes … the customer"
const A2 = A_FLY[1];
const LEARN: [number, number] = [ws("l10", 3) - 1, ws("l10", 6) + 2]; // "learns … next"
const LEARNED = LEARN[1];

/** the loop view swipes up and out (the dashboard rises after it) */
export const EXIT = 800;

/* ───────── camera ───────── */
export const camAt = (f: number) => {
  const toT = tw(f, 579, 603, 0, 1, E.expoInOut);
  const back = tw(f, A_FLY[0] + 2, A_FLY[0] + 24, 0, 1, E.expoInOut);
  const out = tw(f, 748, 792, 0, 1, E.cubicInOut);
  const x = CX + (TX - CX) * (toT - back) + (BX - CX) * out;
  // close framing crops the composer and fills the frame with the thread;
  // the pull-out sits the whole loop in the lower two thirds, under the headline
  const y = mix(-150, -160, out);
  const base = keys(
    f,
    [
      [PHONE_IN, 1.1],
      [575, 1.16],
      [603, 1.15],
      [694, 1.17],
      [722, 1.15],
      [748, 1.16],
      [792, 0.5],
      [806, 0.52],
    ],
    E.cubicInOut,
  );
  const swing = 1 - 0.12 * Math.sin(Math.PI * toT) - 0.12 * Math.sin(Math.PI * back);
  return { x, y, s: base * swing };
};
export const w2s = (p: Pt, f: number): Pt => {
  const c = camAt(f);
  return { x: STAGE.x + (p.x - c.x) * c.s, y: STAGE.y + (p.y - c.y) * c.s };
};

/* ───────── chat thread (customer's phone) ───────── */
const LINE = 41.6;
const bubbleH = (lines: number) => lines * LINE + 44;

const Slot: React.FC<{ f: number; at: number; h: number; out?: number; align?: "l" | "r"; landed?: boolean; children: React.ReactNode }> = ({
  f,
  at,
  h,
  out,
  align = "l",
  landed,
  children,
}) => {
  if (f < at) return null;
  // height opens fast so the popping bubble never overlaps its neighbour;
  // a "landed" message arrives full-size (a flyer just delivered it)
  const s = landed ? 1 : pop(f, at + 1, 15, 190);
  const o = out !== undefined ? tw(f, out, out + 8, 0, 1, E.cubicInOut) : 0;
  const grow = (landed ? 1 : tw(f, at, at + 7, 0, 1, E.expoOut)) * (1 - o);
  if (grow <= 0.001) return null;
  return (
    <div style={{ height: h * grow, marginTop: 18 * grow, flexShrink: 0, display: "flex", alignItems: "flex-end", justifyContent: align === "r" ? "flex-end" : "flex-start" }}>
      <div style={{ transform: `scale(${mix(0.6, 1, s)})`, transformOrigin: align === "r" ? "100% 100%" : "0% 100%", opacity: clamp(s * 2) * (1 - o) }}>{children}</div>
    </div>
  );
};

const Msg: React.FC<{ me?: boolean; lines: string[] }> = ({ me, lines }) => (
  <div
    style={{
      padding: "22px 28px",
      fontFamily: FONT,
      fontSize: 32,
      lineHeight: `${LINE}px`,
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      borderRadius: me ? "34px 34px 10px 34px" : "34px 34px 34px 10px",
      background: me ? C.ink : C.white,
      color: me ? C.cream : C.ink,
      boxShadow: me ? "none" : "0 8px 20px rgba(23,23,23,.07)",
    }}
  >
    {lines.map((l, i) => (
      <div key={i}>{l}</div>
    ))}
  </div>
);

const Note: React.FC<{ icon: IconName; children: React.ReactNode; color?: string }> = ({ icon, children, color = C.coral }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 19, letterSpacing: "0.08em", color, height: 26 }}>
    <Icon name={icon} size={20} color={color} stroke={2.4} />
    {children}
  </div>
);

const Q1_LINES = ["Can you cater 60 people", "this Friday?"];
const A1_LINES = ["Yes! Friday works. Catering", "starts at $55 per person."];
const Q2_LINES = ["Can you make the whole", "menu nut-free?"];
const STALL_LINES = ["I've asked a teammate,", "they'll reply shortly."];
const A2_LINES = ["Good news: yes! The whole", "menu can be nut-free,", "at $65 per person."];

const AgentHeader: React.FC<{ f: number }> = ({ f }) => {
  // the avatar swallows the knowledge chips (one pulse per chip) and glows while it thinks
  const hits = SOURCES.map((s) => s.land);
  const pulse = Math.max(0, ...hits.map((h) => (f >= h ? 1 - tw(f, h, h + 16, 0, 1, E.expoOut) : 0)));
  const think = f >= SEARCH && f < STALL ? 0.5 + 0.5 * Math.sin((f - SEARCH) / 3) : 0;
  return (
    <div style={{ height: 184, background: C.white, borderBottom: "1px solid #ECE9E2", display: "flex", alignItems: "flex-end", padding: "0 28px 24px", gap: 18, boxSizing: "border-box", fontFamily: FONT }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          background: C.coral,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transform: `scale(${1 + 0.18 * pulse})`,
          boxShadow: `0 0 0 ${10 * pulse + 6 * think}px rgba(217,87,89,${0.25 * pulse + 0.18 * think})`,
        }}
      >
        <Mark height={38} color={C.cream} stroke={24} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>Juniper Kitchen</div>
        <Mono size={17} style={{ marginTop: 4 }}>
          AI agent · online
        </Mono>
      </div>
    </div>
  );
};

const Search: React.FC<{ f: number }> = ({ f }) => {
  const miss = f >= MISS;
  const m = pop(f, MISS, 12, 200);
  const shake = miss ? Math.sin((f - MISS) * 2.4) * 9 * (1 - tw(f, MISS, MISS + 12, 0, 1, E.linear)) : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 26px",
        borderRadius: 999,
        background: miss ? "#F3E4E2" : C.sand,
        fontFamily: MONO,
        fontSize: 23,
        letterSpacing: "0.06em",
        color: miss ? C.coralDeep : C.gray,
        transform: `translateX(${shake}px)`,
      }}
    >
      {miss ? (
        <div style={{ transform: `scale(${mix(0.4, 1, m)})` }}>
          <Icon name="help" size={28} color={C.coralDeep} stroke={2.4} />
        </div>
      ) : (
        <svg width={28} height={28} viewBox="0 0 24 24" style={{ transform: `rotate(${(f - SEARCH) * 24}deg)` }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="#D9D5CC" strokeWidth="3" />
          <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {miss ? "NOT IN YOUR DOCS" : "CHECKING MENU.PDF, FAQS…"}
    </div>
  );
};

const CustomerScreen: React.FC<{ f: number }> = ({ f }) => {
  return (
    <AbsoluteFill style={{ background: "#F5F3EE" }}>
      <AgentHeader f={f} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 184, bottom: 130, padding: "0 28px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-start", overflow: "hidden" }}>
        <Slot f={f} at={Q1 - 30} h={bubbleH(2)} align="r">
          <Msg me lines={Q1_LINES} />
        </Slot>
        <Slot f={f} at={A1} h={bubbleH(2)}>
          <Msg lines={A1_LINES} />
        </Slot>
        <Slot f={f} at={FAST} h={26}>
          <Note icon="zap">REPLIED IN 0.8 SECONDS</Note>
        </Slot>
        <Slot f={f} at={Q2} h={bubbleH(2)} align="r">
          <Msg me lines={Q2_LINES} />
        </Slot>
        <Slot f={f} at={SEARCH} h={64} out={STALL - 6}>
          <Search f={f} />
        </Slot>
        <Slot f={f} at={STALL} h={bubbleH(2)}>
          <Msg lines={STALL_LINES} />
        </Slot>
        <Slot f={f} at={A2} h={bubbleH(3)} landed>
          <Msg lines={A2_LINES} />
        </Slot>
        <Slot f={f} at={A2 + 8} h={26}>
          <Note icon="check">ANSWERED BY YOUR TEAM</Note>
        </Slot>
      </div>
      {/* composer */}
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 34, height: 80, borderRadius: 40, background: C.white, boxShadow: "0 4px 14px rgba(23,23,23,.06)", display: "flex", alignItems: "center", padding: "0 10px 0 30px", fontFamily: FONT, fontSize: 28, color: C.gray2 }}>
        <div style={{ flex: 1 }}>Message…</div>
        <div style={{ width: 60, height: 60, borderRadius: 30, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="send" size={28} color={C.cream} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── your team's phone ───────── */
const Notification: React.FC<{ f: number; at: number; y: number; app: "whatsapp" | "gmail"; appName: string; title: string; body: string; press?: number }> = ({
  f,
  at,
  y,
  app,
  appName,
  title,
  body,
  press = 0,
}) => {
  if (f < at) return null;
  const s = pop(f, at, 14, 170);
  return (
    <div
      style={{
        position: "absolute",
        left: 22,
        right: 22,
        top: y,
        padding: "24px 26px",
        borderRadius: 38,
        background: "rgba(250,249,245,.94)",
        boxShadow: "0 18px 40px rgba(0,0,0,.35)",
        fontFamily: FONT,
        color: C.ink,
        transform: `translateY(${(1 - s) * -380}px) scale(${mix(0.7, 1, s) * (1 - 0.04 * press)})`,
        transformOrigin: "50% 0%",
        opacity: clamp(s * 2.5),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 50, height: 50, borderRadius: 13, background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChannelGlyph ch={app} size={34} />
        </div>
        <div style={{ flex: 1, fontFamily: MONO, fontSize: 19, letterSpacing: "0.08em", color: C.gray }}>{appName.toUpperCase()}</div>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.06em", color: C.gray2 }}>NOW</div>
      </div>
      <div style={{ fontSize: 29, fontWeight: 700, letterSpacing: "-0.015em", marginTop: 16, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 27, marginTop: 8, lineHeight: 1.3, color: "#3A3A3A" }}>{body}</div>
    </div>
  );
};

const TYPED = "Yes, $65 pp. Fully nut-free.";
const REPHRASED_LINES = ["Good news: yes! The whole", "menu can be nut-free,", "at $65 per person."];

const Portal: React.FC<{ f: number }> = ({ f }) => {
  const up = tw(f, PORTAL, PORTAL + 14, 0, 1, E.expoOut);
  const n = Math.round(tw(f, TYPE[0], TYPE[1], 0, TYPED.length, E.linear));
  const typed = TYPED.slice(0, n);
  const reph = f >= REPHRASED;
  const shimmer = tw(f, TAP_REPHRASE + 1, REPHRASED + 8, 0, 1, E.cubicInOut);
  const sending = f >= TAP_SEND + 3;
  const sent = pop(f, TAP_SEND + 3, 13, 190);
  const pressR = keys(f, [[TAP_REPHRASE - 2, 1], [TAP_REPHRASE, 0.92], [TAP_REPHRASE + 7, 1]]);
  const pressS = keys(f, [[TAP_SEND - 2, 1], [TAP_SEND, 0.95], [TAP_SEND + 7, 1]]);
  const caret = f >= TYPE[0] && f < REPHRASED && Math.floor(f / 8) % 2 === 0;
  const lift = tw(f, A_FLY[0], A_FLY[0] + 6, 0, 1, E.expoOut);
  return (
    <AbsoluteFill style={{ background: C.cream, transform: `translateY(${(1 - up) * SH}px)`, fontFamily: FONT, color: C.ink, boxShadow: "0 -20px 60px rgba(0,0,0,.3)" }}>
      <div style={{ position: "absolute", left: 32, right: 32, top: 92, display: "flex", alignItems: "center", gap: 5 }}>
        <Mark height={30} color={C.coral} />
        <div style={{ flex: 1, fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em" }}>brainfast.</div>
        <Mono size={17}>Escalation</Mono>
      </div>
      <div style={{ position: "absolute", left: 32, right: 32, top: 170 }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Customer needs your help</div>
        <Mono size={17} style={{ marginTop: 10 }}>
          Juniper Kitchen · just now
        </Mono>
      </div>
      <div style={{ position: "absolute", left: 32, right: 32, top: 300, padding: "24px 26px", borderRadius: 28, background: C.sand }}>
        <Mono size={17}>Elena R. asked</Mono>
        <div style={{ fontSize: 31, fontWeight: 600, letterSpacing: "-0.015em", marginTop: 10, lineHeight: 1.25 }}>Can you make the whole menu nut-free?</div>
      </div>
      {/* reply box */}
      <div
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          top: 520,
          height: 250,
          padding: "24px 26px",
          boxSizing: "border-box",
          borderRadius: 28,
          background: C.white,
          boxShadow: `inset 0 0 0 2px ${f >= TYPE[0] ? C.ink : "#E3DFD6"}`,
          overflow: "hidden",
          opacity: 1 - lift,
        }}
      >
        {f < TYPE[0] ? (
          <div style={{ fontSize: 28, color: C.gray2, lineHeight: 1.3 }}>Type the answer to send to the customer…</div>
        ) : reph ? (
          <div style={{ fontSize: 30, lineHeight: 1.3, whiteSpace: "nowrap" }}>
            {REPHRASED_LINES.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 30, lineHeight: 1.3 }}>
            {typed}
            <span style={{ display: "inline-block", width: 3, height: 34, marginLeft: 2, verticalAlign: "-6px", background: caret ? C.ink : "transparent" }} />
          </div>
        )}
        {shimmer > 0 && shimmer < 1 ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${mix(-40, 110, shimmer)}%`,
              width: "40%",
              background: "linear-gradient(90deg, rgba(246,213,209,0), rgba(246,213,209,.95), rgba(246,213,209,0))",
            }}
          />
        ) : null}
      </div>
      {/* rephrase */}
      <div style={{ position: "absolute", left: 32, right: 32, top: 800 }}>
        <Mono size={17}>Rephrase your reply</Mono>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          {["Friendlier", "More formal", "Shorter"].map((c, i) => {
            const on = i === 0 && f >= TAP_REPHRASE && f < REPHRASED + 10;
            return (
              <div
                key={c}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 20px",
                  borderRadius: 999,
                  background: on ? C.coral : C.white,
                  color: on ? C.white : C.ink,
                  boxShadow: on ? "none" : "inset 0 0 0 2px #E3DFD6",
                  fontSize: 25,
                  fontWeight: 600,
                  transform: `scale(${i === 0 ? pressR : 1})`,
                }}
              >
                {i === 0 ? <Icon name="sparkles" size={24} color={on ? C.white : C.coral} /> : null}
                {c}
              </div>
            );
          })}
        </div>
      </div>
      {/* send */}
      <div
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          top: 1000,
          height: 104,
          borderRadius: 999,
          background: sending ? C.ink : C.coral,
          color: C.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          transform: `scale(${pressS})`,
        }}
      >
        {sending ? (
          <>
            <div style={{ transform: `scale(${mix(0.3, 1, sent)})` }}>
              <CheckDisc t={clamp(sent)} size={44} bg={C.coral} fg={C.white} />
            </div>
            Sent to Elena
          </>
        ) : (
          <>
            Send reply
            <Icon name="send" size={32} color={C.white} />
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** A fingertip in phone-screen coordinates: closes onto the point, then ripples. */
const Touch: React.FC<{ f: number; x: number; y: number; at: number }> = ({ f, x, y, at }) => {
  if (f < at - 8 || f > at + 20) return null;
  const come = tw(f, at - 8, at, 0, 1, E.expoOut);
  const rip = tw(f, at, at + 18, 0, 1, E.expoOut);
  const r = mix(58, 32, come);
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 20 }}>
      <div
        style={{
          position: "absolute",
          left: -r,
          top: -r,
          width: r * 2,
          height: r * 2,
          boxSizing: "border-box",
          borderRadius: "50%",
          background: "rgba(23,23,23,.16)",
          border: "4px solid rgba(255,255,255,.95)",
          opacity: f < at + 4 ? come : 1 - rip,
        }}
      />
      {f >= at ? (
        <div
          style={{
            position: "absolute",
            left: -(32 + 62 * rip),
            top: -(32 + 62 * rip),
            width: (32 + 62 * rip) * 2,
            height: (32 + 62 * rip) * 2,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: `${5 * (1 - rip)}px solid ${C.coral}`,
            opacity: 1 - rip,
          }}
        />
      ) : null}
    </div>
  );
};

const TeamScreen: React.FC<{ f: number }> = ({ f }) => {
  const pressN = keys(f, [[TAP_NOTE - 2, 0], [TAP_NOTE, 1], [TAP_NOTE + 6, 0]]);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(165deg, #2E2729 0%, #1A1719 55%, #121012 100%)" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, textAlign: "center", color: C.cream, fontFamily: FONT }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", opacity: 0.7 }}>THURSDAY</div>
        <div style={{ fontSize: 150, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1.1 }}>7:42</div>
      </div>
      <Notification
        f={f}
        at={WA}
        y={430}
        app="whatsapp"
        appName="WhatsApp"
        title="Juniper Kitchen agent"
        body="Customer needs your help: “Can you make the whole menu nut-free?”"
        press={pressN}
      />
      <Notification f={f} at={MAIL} y={700} app="gmail" appName="Email" title="Customer needs your help on Juniper Kitchen" body="Elena R. asked a question your agent couldn't answer." />
      {f >= PORTAL ? <Portal f={f} /> : null}
      <Touch f={f} x={380} y={560} at={TAP_NOTE} />
      <Touch f={f} x={128} y={867} at={TAP_REPHRASE} />
      <Touch f={f} x={330} y={1052} at={TAP_SEND} />
    </AbsoluteFill>
  );
};

/* ───────── devices, agent, paths, flyers ───────── */
const Device: React.FC<{ cx: number; dy?: number; children: React.ReactNode }> = ({ cx, dy = 0, children }) => (
  <div
    style={{
      position: "absolute",
      left: cx - PHONE.w / 2,
      top: -PHONE.h / 2 + dy,
      width: PHONE.w,
      height: PHONE.h,
      borderRadius: PHONE.r,
      background: "#0E0E11",
      boxShadow: "0 70px 140px rgba(23,23,23,.28), 0 10px 30px rgba(23,23,23,.18), inset 0 0 0 2px rgba(255,255,255,.08)",
    }}
  >
    <div style={{ position: "absolute", left: PHONE.inset, top: PHONE.inset, width: SW, height: SH, borderRadius: PHONE.r - 14, overflow: "hidden" }}>
      {children}
      <div style={{ position: "absolute", top: 24, left: SW / 2 - 80, width: 160, height: 46, borderRadius: 23, background: "#050506", zIndex: 9 }} />
    </div>
  </div>
);

// where things sit, in world coordinates (see thread layout above)
const Q2_AT = scr(CX, 384, 600);
const ISLAND = scr(TX, SW / 2, 47);
const REPLY_AT = scr(TX, SW / 2, 645);
const A2_AT = scr(CX, 252, 911);
const BRAIN: Pt = { x: BX, y: 0 };
const Q_PATH: Pt[] = [Q2_AT, { x: 330, y: 60 }, BRAIN, { x: 900, y: -250 }, ISLAND];
const A_PATH: Pt[] = [REPLY_AT, { x: 900, y: 110 }, BRAIN, { x: 300, y: 260 }, A2_AT];
const K_PATH: Pt[] = [A2_AT, { x: 320, y: 110 }, BRAIN];
const Q_LEN = crLength(Q_PATH);
const A_LEN = crLength(A_PATH);

const Lane: React.FC<{ f: number; pts: Pt[]; len: number; draw: [number, number] }> = ({ f, pts, len, draw }) => {
  const t = tw(f, draw[0], draw[1], 0, 1, E.expoInOut);
  if (t <= 0) return null;
  const hot = tw(f, 776, 790, 0, 1, E.cubicInOut) * (1 - tw(f, 800, 812, 0, 1, E.linear));
  const march = f >= 748 ? (f - 748) * -5 : 0;
  return (
    <g>
      <path d={crPath(pts)} fill="none" stroke={C.coral} strokeOpacity={0.14 + 0.2 * hot} strokeWidth={44} strokeLinecap="round" strokeDasharray={`${len * t} ${len * 2}`} />
      <path
        d={crPath(pts)}
        fill="none"
        stroke={C.coral}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={t < 1 ? `${len * t} ${len * 2}` : "2 30"}
        strokeDashoffset={t < 1 ? 0 : march}
      />
    </g>
  );
};

const Brain: React.FC<{ f: number }> = ({ f }) => {
  const s = pop(f, 576, 12, 150);
  if (f < 576) return null;
  const passes = [Q_FLY[0] + (Q_FLY[1] - Q_FLY[0]) / 2, A_FLY[0] + (A_FLY[1] - A_FLY[0]) / 2, LEARNED];
  const kick = Math.max(0, ...passes.map((p, i) => (f >= p - 2 ? (1 - tw(f, p - 2, p + 20, 0, 1, E.expoOut)) * (i === 2 ? 1.6 : 1) : 0)));
  const ring = passes.map((p) => (f >= p - 2 && f < p + 30 ? tw(f, p - 2, p + 30, 0, 1, E.expoOut) : -1));
  const plus = pop(f, LEARNED + 2, 12, 170);
  const grow = 1 + 0.5 * tw(f, 748, 792, 0, 1, E.cubicInOut);
  return (
    <div style={{ position: "absolute", left: BX, top: 0, transform: `scale(${grow})` }}>
      {ring.map((r, i) =>
        r >= 0 ? (
          <div key={i} style={{ position: "absolute", left: -150 - 140 * r, top: -150 - 140 * r, width: 300 + 280 * r, height: 300 + 280 * r, borderRadius: "50%", border: `${10 * (1 - r)}px solid ${C.coral}`, opacity: 1 - r, boxSizing: "border-box" }} />
        ) : null,
      )}
      <div
        style={{
          position: "absolute",
          left: -150,
          top: -150,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: C.white,
          boxShadow: `0 30px 80px rgba(23,23,23,.18), 0 0 0 ${8 + 14 * kick}px rgba(217,87,89,${0.18 + 0.3 * kick})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${mix(0.2, 1, s) * (1 + 0.08 * kick)})`,
          opacity: clamp(s * 2),
        }}
      >
        <Mark height={170} color={C.coral} />
      </div>
      {f >= LEARNED ? (
        <div
          style={{
            position: "absolute",
            left: -210,
            width: 420,
            top: 196,
            display: "flex",
            justifyContent: "center",
            transform: `scale(${mix(0.4, 1, plus)})`,
            opacity: clamp(plus * 2),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 30px", borderRadius: 999, background: C.ink, color: C.cream, fontFamily: FONT, fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
            <Icon name="book" size={44} color={C.coral} stroke={2.4} />
            +1 learned
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** A message card that travels along a lane. */
const Flyer: React.FC<{ f: number; pts: Pt[]; span: [number, number]; from: number; to: number; children: React.ReactNode }> = ({ f, pts, span, from, to, children }) => {
  if (f < span[0] || f >= span[1]) return null;
  const t = tw(f, span[0], span[1], 0, 1, E.expoInOut);
  const p = crPoint(pts, t);
  const q = crPoint(pts, Math.min(1, t + 0.02));
  const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  const tilt = clamp(Math.sin(Math.PI * t) * 1.2) * Math.max(-14, Math.min(14, ang * 0.25));
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${mix(from, to, t)})`, filter: "drop-shadow(0 26px 40px rgba(23,23,23,.28))" }}>
      {children}
    </div>
  );
};

const Label: React.FC<{ f: number; x: number; y: number; children: React.ReactNode }> = ({ f, x, y, children }) => {
  const v = tw(f, 760, 780, 0, 1, E.expoOut);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x - 500, width: 1000, top: y, textAlign: "center", fontFamily: MONO, fontSize: 66, letterSpacing: "0.12em", color: C.gray, opacity: v, transform: `translateY(${(1 - v) * 30}px)` }}>
      {children}
    </div>
  );
};

export const World: React.FC = () => {
  const f = useCurrentFrame();
  if (f < PHONE_IN - 2 || f > EXIT + 18) return null;
  const c = camAt(f);
  const rise = pop(f, PHONE_IN, 16, 110, 0.8);
  // the whole loop swipes up and away; the dashboard follows it in
  const exit = tw(f, EXIT, EXIT + 18, 0, 1, E.expoIn);
  return (
    <AbsoluteFill style={{ transform: `translateY(${-exit * 2200}px)` }}>
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${STAGE.x}px, ${STAGE.y}px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)` }}>
        <svg style={{ position: "absolute", left: -2000, top: -2000, overflow: "visible" }} width={4000} height={4000} viewBox="-2000 -2000 4000 4000">
          <Lane f={f} pts={Q_PATH} len={Q_LEN} draw={Q_FLY} />
          <Lane f={f} pts={A_PATH} len={A_LEN} draw={A_FLY} />
        </svg>
        <Device cx={CX} dy={(1 - rise) * 1900}>
          <CustomerScreen f={f} />
        </Device>
        {f >= 560 ? (
          <Device cx={TX}>
            <TeamScreen f={f} />
          </Device>
        ) : null}
        <Brain f={f} />
        <Label f={f} x={CX} y={-790}>
          CUSTOMER
        </Label>
        <Label f={f} x={BX} y={-360}>
          YOUR AGENT
        </Label>
        <Label f={f} x={TX} y={-790}>
          YOUR TEAM
        </Label>
        <Flyer f={f} pts={Q_PATH} span={Q_FLY} from={1} to={0.3}>
          <Msg me lines={Q2_LINES} />
        </Flyer>
        <Flyer f={f} pts={A_PATH} span={A_FLY} from={0.8} to={1}>
          <Msg lines={A2_LINES} />
        </Flyer>
        <Flyer f={f} pts={K_PATH} span={LEARN} from={1.3} to={0.25}>
          <div style={{ width: 520, padding: "30px 34px", borderRadius: 34, background: C.white, boxShadow: `inset 0 0 0 4px ${C.coral}`, fontFamily: FONT, color: C.ink }}>
            <Mono size={24} color={C.coral}>
              New answer
            </Mono>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 10 }}>Nut-free menu?</div>
            <div style={{ fontSize: 34, marginTop: 6, color: "#3A3A3A" }}>Yes, at $65 per person.</div>
          </div>
        </Flyer>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── screen-space layers that ride on the camera ───────── */

/** "…trained on your docs, your site, your FAQs." — the sources are set as the
 *  second line of the headline, then dive into the agent's avatar. */
const SOURCES: { label: string; icon: IconName; at: number; land: number; x: number }[] = [
  { label: "docs", icon: "file", at: ws("l05", 8), land: ws("l05", 12) + 14, x: 80 },
  { label: "site", icon: "globe", at: ws("l05", 10), land: ws("l05", 12) + 18, x: 360 },
  { label: "FAQs", icon: "help", at: ws("l05", 12), land: ws("l05", 12) + 22, x: 625 },
];
const AVATAR = scr(CX, 28 + 36, 184 - 24 - 36);

export const Sources: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SOURCES[0].at - 4 || f > SOURCES[2].land + 2) return null;
  return (
    <AbsoluteFill>
      {SOURCES.map((s, i) => {
        if (f < s.at - 3 || f >= s.land) return null;
        const p = pop(f, s.at - 3, 12, 190);
        const fly = tw(f, s.land - 14, s.land, 0, 1, E.expoIn);
        const a = w2s(AVATAR, f);
        const x0 = s.x;
        const y0 = 360;
        const x = mix(x0, a.x - 130, fly);
        const y = mix(y0, a.y - 48, fly) - Math.sin(Math.PI * fly) * 120;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 34px 0 26px",
              height: 96,
              borderRadius: 999,
              background: C.white,
              boxShadow: `0 20px 40px rgba(23,23,23,.14), inset 0 0 0 3px ${C.coral}`,
              fontFamily: FONT,
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: C.ink,
              transform: `scale(${mix(0.5, 1, p) * mix(1, 0.2, fly)}) rotate(${(1 - p) * (i % 2 ? 8 : -8)}deg)`,
              transformOrigin: "50% 50%",
              opacity: clamp(p * 2) * (1 - tw(fly, 0.8, 1, 0, 1, E.linear)),
            }}
          >
            <Icon name={s.icon} size={52} color={C.coral} stroke={2.4} />
            {s.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** "It books. It sells. It captures every lead." — result cards stack over the phone. */
const RESULTS: { at: number; icon: IconName; title: string; meta: string; tag?: string; y: number; side: -1 | 1 }[] = [
  { at: ws("l06", 1) - 2, icon: "calendar", title: "Table booked", meta: "FRI · 8:00 PM · 6 GUESTS", y: 1090, side: -1 },
  { at: ws("l06", 3) - 2, icon: "bag", title: "Order paid · $128", meta: "3 × BIRTHDAY CAKE · PICKUP SAT", y: 1295, side: 1 },
  { at: ws("l06", 5) - 2, icon: "userPlus", title: "New lead · Elena R.", meta: "CATERING · 60 GUESTS · FRIDAY", tag: "$4K", y: 1500, side: -1 },
];
export const Results: React.FC = () => {
  const f = useCurrentFrame();
  if (f < RESULTS[0].at - 2 || f > Q2 + 10) return null;
  const every = ws("l06", 6);
  return (
    <AbsoluteFill>
      {RESULTS.map((r, i) => {
        if (f < r.at) return null;
        const s = pop(f, r.at, 13, 160);
        const out = tw(f, Q2 - 12 + i * 2, Q2 + 2 + i * 2, 0, 1, E.expoIn);
        const check = tw(f, r.at + 6, r.at + 18, 0, 1, E.cubicInOut);
        const glow = i === 2 ? tw(f, every, every + 10, 0, 1, E.expoOut) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 90,
              width: 900,
              top: r.y,
              height: 170,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 26,
              padding: "0 34px",
              borderRadius: 40,
              background: C.white,
              boxShadow: `0 40px 80px rgba(23,23,23,.16), 0 4px 12px rgba(23,23,23,.06), 0 0 0 ${glow * 4}px ${C.coral}`,
              fontFamily: FONT,
              color: C.ink,
              transform: `translateX(${(1 - s) * r.side * 1100 + out * 1300}px) rotate(${(1 - s) * r.side * -6 + r.side * 1.2 + out * 8}deg)`,
              opacity: 1 - tw(out, 0.7, 1, 0, 1, E.linear),
            }}
          >
            <div style={{ width: 100, height: 100, borderRadius: 30, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={r.icon} size={52} color={C.coral} stroke={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>{r.title}</div>
              <Mono size={21} style={{ marginTop: 8 }}>
                {r.meta}
              </Mono>
            </div>
            {r.tag ? (
              <div style={{ padding: "10px 18px", borderRadius: 999, background: C.coral, color: C.white, fontFamily: MONO, fontSize: 22, letterSpacing: "0.08em" }}>{r.tag}</div>
            ) : null}
            <CheckDisc t={check} size={60} bg={C.coral} fg={C.white} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Sparks that burst off the agent when it learns (screen space, rides the camera). */
export const LearnSparks: React.FC = () => {
  const f = useCurrentFrame();
  if (f < LEARNED || f > LEARNED + 30) return null;
  const b = w2s(BRAIN, f);
  const t = tw(f, LEARNED, LEARNED + 28, 0, 1, E.expoOut);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + rnd(i) * 0.3;
        const r0 = 70 + 20 * rnd(i + 4);
        const r1 = r0 + (120 + 90 * rnd(i + 9)) * t;
        return (
          <line
            key={i}
            x1={b.x + Math.cos(a) * mix(r0, r1, 0.55)}
            y1={b.y + Math.sin(a) * mix(r0, r1, 0.55)}
            x2={b.x + Math.cos(a) * r1}
            y2={b.y + Math.sin(a) * r1}
            stroke={i % 3 === 0 ? C.ink : C.coral}
            strokeWidth={6 * (1 - t)}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

export const BEATS = { PHONE_IN, Q1, A1, FAST, Q2, SEARCH, MISS, STALL, Q_FLY, WA, MAIL, TAP_NOTE, PORTAL, TYPE, TAP_REPHRASE, REPHRASED, TAP_SEND, A_FLY, A2, LEARN, LEARNED };
