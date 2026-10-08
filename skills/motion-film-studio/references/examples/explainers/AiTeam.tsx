import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { useLayout } from "../../kit/format";
import { Grain, Impact, Odometer, Ring, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { AgentDot, ChannelGlyph, Icon, IconName } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/ai-team/vo/lines.json";
import words from "../../../../public/films/ai-team/vo/words.json";

loadFonts();

/**
 * NOT A CHATBOT. AN AI TEAM. — a positioning test: Brainfast for your own
 * team (inside Slack), then one agent per job, routed by one entry point.
 * Swiss-poster motion: hard colour blocks that wipe, huge type, a grid.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);

/* ── beats ── */
const FORTY = T.ws("l01", 10);
const OWN = T.ws("l02", 3);
const BANDS = [T.ws("l03", 0), T.ws("l03", 3), T.ws("l03", 6)];
const MEET = T.ws("l04", 0);
const JOIN = T.ws("l04", 5); // "Brainfast" — the drop
const SLACK = T.ws("l04", 8);
const DOCS = [T.ws("l05", 3), T.ws("l05", 5), T.ws("l05", 8)];
const ASK1 = T.ws("l06", 0);
const ANS1 = T.ws("l06", 3);
const SRC = T.ws("l06", 9);
const ASK2 = T.ws("l07", 0) - 4;
const ANS2 = T.ws("l07", 4);
const JOIN2 = T.ws("l07", 9);
const ZOOM = T.ws("l08", 0) - 6;
const TILES = [T.ws("l08", 5), T.ws("l08", 8), T.ws("l08", 11)];
const HUB = T.ws("l09", 0);
const ROUTES = [T.ws("l09", 1), T.ws("l09", 2), T.ws("l09", 3), T.ws("l09", 6)];
const NOTBOT = T.ws("l10", 3);
const TEAM = T.ws("l10", 7);
const COLLAPSE: [number, number] = [T.ws("l11", 0) - 16, T.ws("l11", 0) - 2];
const HIT = T.ws("l11", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => T.ws("l11", i));
const CTA = T.ws("l12", 0) - 2;
const URL = T.ws("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 60);

const INK = "#161419";
const COBALT = "#2F5BEA";
const TEAL = "#1C9A83";
const P = (p: FaceSpec, name: string): FaceSpec => ({ ...p, name });
const LINA = P(PEOPLE.priya, "Lina");
const SAM = P(PEOPLE.marcus, "Sam");
const MARIA = P(PEOPLE.ines, "Maria");

/* ── S1: the notification avalanche ── */
const NOTIFS: { who: FaceSpec; text: string }[] = [
  { who: LINA, text: "Where's the logo file?" },
  { who: SAM, text: "What's the Wi-Fi password?" },
  { who: P(PEOPLE.omar, "Omar"), text: "How do I book time off?" },
  { who: P(PEOPLE.grace, "Grace"), text: "Can I give a discount?" },
  { who: P(PEOPLE.ken, "Ken"), text: "Where's the brand kit?" },
  { who: P(PEOPLE.aisha, "Aisha"), text: "What's our refund policy?" },
  { who: P(PEOPLE.jonas, "Jonas"), text: "Who approves expenses?" },
  { who: P(PEOPLE.wei, "Wei"), text: "Is Friday a holiday?" },
];
const Avalanche: React.FC<{ f: number }> = ({ f }) => {
  if (f > BANDS[0] + 4) return null;
  const out = tw(f, BANDS[0] - 12, BANDS[0] + 2, 0, 1, E.expoIn);
  const at = (i: number) => 8 + i * 11;
  const count = NOTIFS.filter((_, i) => f >= at(i)).length;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${out * 1400}px)` }}>
      {/* the counter: questions today */}
      <div style={{ position: "absolute", left: 80, top: 560, fontFamily: FONT, color: C.cream, display: "flex", alignItems: "baseline", gap: 18 }}>
        <div style={{ fontSize: 300, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.9 }}>
          <Odometer value={40} from={0} at={10} dur={Math.max(12, FORTY - 10)} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: "0.12em", lineHeight: 1.3, opacity: 0.85 }}>
          QUESTIONS
          <br />
          TODAY
        </div>
      </div>
      {NOTIFS.map((n, i) => {
        if (f < at(i) - 2) return null;
        const s = clamp(springAt(f, at(i), 30, 14, 190));
        const idx = count - 1 - i; // newest on top
        const y = 960 + idx * 128;
        if (idx > 5) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 60, top: y, width: 960, height: 112, borderRadius: 30, background: "rgba(255,255,255,.94)", boxShadow: "0 16px 30px rgba(80,10,10,.18)", display: "flex", alignItems: "center", gap: 18, padding: "0 24px", boxSizing: "border-box", transform: `translateY(${(1 - s) * -120}px) scale(${mix(0.9, 1, s)})`, opacity: clamp(s * 2) * (1 - idx * 0.08), fontFamily: FONT, transition: "none" }}>
            <Face p={n.who} size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray }}>
                <Img src={staticFile("img/icons/slack.svg")} style={{ width: 20, height: 20 }} />
                SLACK · {n.who.name.toUpperCase()} · NOW
              </div>
              <div style={{ fontSize: 34, fontWeight: 650, letterSpacing: "-0.02em", color: C.ink, marginTop: 4, whiteSpace: "nowrap" }}>{n.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── S2: three questions, three bands ── */
const BANDDEF = [
  { q: "Where's the logo?", who: LINA, bg: INK, fg: C.cream },
  { q: "What's the Wi-Fi?", who: SAM, bg: C.cream, fg: C.ink },
  { q: "How do I book time off?", who: P(PEOPLE.omar, "Omar"), bg: "#F2B544", fg: C.ink },
];
const Bands: React.FC<{ f: number }> = ({ f }) => {
  if (f < BANDS[0] - 8 || f > MEET + 16) return null;
  const out = tw(f, MEET - 10, MEET + 8, 0, 1, E.expoInOut);
  return (
    <>
      {BANDDEF.map((b, i) => {
        const s = tw(f, BANDS[i] - 8, BANDS[i] + 6, 0, 1, E.expoOut);
        const dir = i % 2 ? 1 : -1;
        const y = 560 + i * 400;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: y, width: 1080, height: 400, background: b.bg, transform: `translateX(${(1 - s) * dir * 1100 + out * -dir * 1100}px)`, display: "flex", alignItems: "center", gap: 34, padding: "0 70px", boxSizing: "border-box", fontFamily: FONT }}>
            <Face p={b.who} size={150} ring={b.fg === C.cream ? "rgba(250,249,245,.3)" : "rgba(23,23,23,.1)"} />
            <div style={{ fontSize: 84, fontWeight: 850, letterSpacing: "-0.045em", lineHeight: 1.0, color: b.fg }}>{b.q}</div>
          </div>
        );
      })}
    </>
  );
};

/* ── S3–S6: the team chat (mobile, Slack-like, generic) ── */
const BOX = { x: 60, y: 600, w: 960, h: 960 };
const Msg: React.FC<{ who?: FaceSpec; app?: boolean; time: string; s: number; children: React.ReactNode; indent?: boolean }> = ({ who, app, time, s, children, indent }) => (
  <div style={{ display: "flex", gap: 20, padding: indent ? "0 0 0 70px" : 0, transform: `translateY(${(1 - s) * 30}px)`, opacity: clamp(s * 2) }}>
    {app ? <AgentDot size={96} /> : <Face p={who!} size={96} />}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: C.ink }}>{app ? "Brainfast" : who!.name}</div>
        {app ? <div style={{ padding: "2px 8px", borderRadius: 6, background: "#EDEBE6", fontFamily: MONO, fontSize: 16, letterSpacing: "0.08em", color: C.gray }}>APP</div> : null}
        <div style={{ fontFamily: MONO, fontSize: 20, color: C.gray2 }}>{time}</div>
      </div>
      <div style={{ fontSize: 41, lineHeight: 1.28, color: C.ink, marginTop: 4, letterSpacing: "-0.01em" }}>{children}</div>
    </div>
  </div>
);
const Mention: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ background: "#E8F0FE", color: COBALT, borderRadius: 6, padding: "0 6px", fontWeight: 650 }}>{children}</span>;

const Chat: React.FC<{ f: number }> = ({ f }) => {
  if (f < MEET - 8 || f > ZOOM + 26) return null;
  const s = tw(f, MEET - 8, MEET + 8, 0, 1, E.expoOut);
  const shrink = tw(f, ZOOM, ZOOM + 18, 0, 1, E.expoInOut);
  const joined = clamp(springAt(f, JOIN, 30, 13, 180));
  const scroll = tw(f, ASK1 - 10, ASK1 + 4, 0, 1, E.expoInOut) * 150 + tw(f, ASK2 - 10, ASK2 + 4, 0, 1, E.expoInOut) * 400;
  const docs = ["Employee handbook", "Price list", "Processes"];
  // shrink into the "Team agent" tile position
  const tx = mix(0, 80 - BOX.x, shrink);
  const ty = mix(0, 640 - BOX.y, shrink);
  const sc = mix(1, 440 / BOX.w, shrink);
  return (
    <div style={{ position: "absolute", left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty + (1 - s) * 1300}px) scale(${sc})`, borderRadius: 44, background: C.white, overflow: "hidden", boxShadow: "0 50px 110px rgba(23,23,23,.25)", fontFamily: FONT, opacity: 1 - tw(f, HUB - 4, HUB + 8, 0, 1, E.linear) * 0 }}>
      <div style={{ height: 120, background: INK, color: C.cream, display: "flex", alignItems: "center", gap: 16, padding: "0 34px" }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: "#F2B544", color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900 }}>A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}># ask-anything</div>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", opacity: 0.6 }}>ACME STUDIO · 14 MEMBERS</div>
        </div>
        <Img src={staticFile("img/icons/slack.svg")} style={{ width: 52, height: 52, transform: `scale(${1 + 0.25 * keys(f, [[SLACK - 2, 0], [SLACK + 3, 1], [SLACK + 14, 0]], E.cubicInOut)})` }} />
      </div>
      <div style={{ position: "absolute", left: 34, right: 34, top: 150, bottom: 30, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 36, transform: `translateY(${-scroll}px)` }}>
          {/* joined */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 20px", borderRadius: 26, background: mixColor("#FFFFFF", C.coralTint, joined), boxShadow: `inset 0 0 0 2px ${mixColor("#EEEBE3", C.coral, joined * 0.5)}`, opacity: clamp(joined * 2), transform: `scale(${mix(0.8, 1, joined)})` }}>
            <AgentDot size={88} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>Brainfast joined #ask-anything</div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {docs.map((d, i) => {
                  const ds = clamp(springAt(f, DOCS[i], 30, 12, 190));
                  return (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: C.white, boxShadow: "inset 0 0 0 2px #EEEBE3", fontFamily: MONO, fontSize: 20, letterSpacing: "0.06em", color: C.ink, transform: `scale(${mix(0.4, 1, ds)})`, opacity: clamp(ds * 2) }}>
                      <Icon name={(["book", "card", "file"] as IconName[])[i]} size={18} color={C.coral} stroke={2.4} />
                      {d.toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
            <Sheen at={JOIN + 4} dur={20} opacity={0.6} />
          </div>
          {/* question 1 + thread answer with the source */}
          {f >= ASK1 - 2 ? (
            <Msg who={LINA} time="9:41" s={clamp(springAt(f, ASK1, 30, 14, 190))}>
              <Mention>@Brainfast</Mention> how do I book time off?
            </Msg>
          ) : null}
          {f >= ANS1 - 2 ? (
            <Msg app time="9:41" s={clamp(springAt(f, ANS1, 30, 14, 190))} indent>
              1. Fill in the time-off form in the HR portal.
              <br />
              2. Tag your manager to approve it.
              {f >= SRC - 2 ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, padding: "6px 14px", borderRadius: 10, background: C.coralTint, color: C.coralDeep, fontFamily: MONO, fontSize: 18, letterSpacing: "0.06em", opacity: clamp(springAt(f, SRC, 30, 12, 190) * 2) }}>
                  <Icon name="book" size={18} color={C.coral} stroke={2.4} /> SOURCE · EMPLOYEE HANDBOOK, P.14
                </div>
              ) : null}
            </Msg>
          ) : null}
          {/* question 2: the tricky one goes to the right person */}
          {f >= ASK2 - 2 ? (
            <Msg who={SAM} time="9:52" s={clamp(springAt(f, ASK2, 30, 14, 190))}>
              <Mention>@Brainfast</Mention> can I give Northwind a 30% discount?
            </Msg>
          ) : null}
          {f >= ANS2 - 2 ? (
            <Msg app time="9:52" s={clamp(springAt(f, ANS2, 30, 14, 190))} indent>
              That one needs <Mention>@Maria</Mention>, our sales lead. I've looped her in.
            </Msg>
          ) : null}
          {f >= JOIN2 - 2 ? (
            <Msg who={MARIA} time="9:53" s={clamp(springAt(f, JOIN2, 30, 14, 190))} indent>
              On it, Sam!
            </Msg>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* the documents fly in */
const DocsFly: React.FC<{ f: number }> = ({ f }) => (
  <>
    {DOCS.map((d, i) => {
      if (f < d - 16 || f > d + 2) return null;
      const t = tw(f, d - 16, d, 0, 1, E.expoInOut);
      const label = ["Handbook", "Price list", "Processes"][i];
      return (
        <div key={i} style={{ position: "absolute", left: mix(900, 200, t), top: mix(1600 - i * 60, 760, t) - Math.sin(Math.PI * t) * 200, transform: `translate(-50%, -50%) rotate(${(1 - t) * 14}deg) scale(${mix(1, 0.4, t)})`, width: 220, height: 150, borderRadius: 20, background: C.white, boxShadow: "0 20px 40px rgba(23,23,23,.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: FONT }}>
          <Icon name={(["book", "card", "file"] as IconName[])[i]} size={44} color={C.coral} stroke={2.2} />
          <div style={{ fontSize: 28, fontWeight: 750 }}>{label}</div>
        </div>
      );
    })}
  </>
);

/* ── S7–S9: one agent per job, one entry point ── */
const TILEDEF = [
  { name: "Team agent", sub: "SLACK", color: INK, icon: "users" as IconName, ch: "slack" as const, at: 0 },
  { name: "Support agent", sub: "WEBSITE · WHATSAPP", color: C.coral, icon: "headset" as IconName, ch: "whatsapp" as const, at: 1 },
  { name: "Sales agent", sub: "LEADS · CRM", color: COBALT, icon: "trend" as IconName, ch: "web" as const, at: 2 },
  { name: "Bookings agent", sub: "CALENDAR", color: TEAL, icon: "calendar" as IconName, ch: "instagram" as const, at: 3 },
];
const TPOS = [
  [80, 640],
  [560, 640],
  [80, 1120],
  [560, 1120],
];
const HUBC = { x: 540, y: 1100 };
const Team: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f < ZOOM + 6) return null;
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const hub = clamp(springAt(f, HUB - 4, 30, 12, 170));
  const row = tw(f, TEAM - 16, TEAM + 2, 0, 1, E.expoInOut);
  const qs = [
    { t: "Wi-Fi?", to: 0 },
    { t: "Refund?", to: 1 },
    { t: "20 seats?", to: 2 },
    { t: "Friday 3pm?", to: 3 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${L.cx}px ${L.lockup.cy}px`, transform: `scale(${1 - 0.95 * col})`, opacity: 1 - tw(col, 0.7, 1, 0, 1, E.linear) }}>
      {TILEDEF.map((t, i) => {
        const appear = i === 0 ? tw(f, ZOOM + 14, ZOOM + 24, 0, 1, E.expoOut) : clamp(springAt(f, TILES[i - 1] - 4, 30, 14, 160));
        const [x, y] = TPOS[i];
        const rx = mix(x, 60 + i * 245, row);
        const ry = mix(y, 1000, row);
        const size = mix(440, 225, row);
        const lit = Math.max(...ROUTES.map((r, k) => (qs[k].to === i ? keys(f, [[r + 14, 0], [r + 18, 1], [r + 30, 0]], E.cubicInOut) : 0)));
        return (
          <div key={t.name} style={{ position: "absolute", left: rx, top: ry, width: size, height: size, transform: `scale(${mix(0.5, 1, appear) * (1 + 0.04 * lit)})`, opacity: clamp(appear * 2), borderRadius: mix(40, 30, row), background: t.color, color: C.cream, padding: mix(34, 18, row), boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: `0 30px 60px rgba(23,23,23,.2), 0 0 0 ${8 * lit}px rgba(255,255,255,.7)`, fontFamily: FONT, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: mix(100, 64, row), height: mix(100, 64, row), borderRadius: 26, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={t.icon} size={mix(56, 36, row)} color={C.cream} stroke={2.2} />
              </div>
              {row < 0.5 ? (
                <div style={{ width: 70, height: 70, borderRadius: 20, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 - row * 2 }}>
                  <ChannelGlyph ch={t.ch} size={40} />
                </div>
              ) : null}
            </div>
            <div>
              <div style={{ fontSize: mix(52, 30, row), fontWeight: 850, letterSpacing: "-0.04em", lineHeight: 1.0 }}>{t.name}</div>
              <div style={{ fontFamily: MONO, fontSize: mix(20, 14, row), letterSpacing: "0.1em", opacity: 0.75, marginTop: 8 }}>{t.sub}</div>
            </div>
            <Sheen at={i === 0 ? ZOOM + 20 : TILES[i - 1] + 2} dur={20} opacity={0.35} />
          </div>
        );
      })}
      {/* the entry point, routing */}
      {hub > 0.01 && row < 1 ? (
        <>
          {qs.map((q, k) => {
            const r = ROUTES[k];
            const t1 = tw(f, r - 4, r + 8, 0, 1, E.expoInOut);
            const t2 = tw(f, r + 8, r + 18, 0, 1, E.expoInOut);
            if (t1 <= 0 || t2 >= 1) return null;
            const [tx, ty] = TPOS[q.to];
            const cx = tx + 220;
            const cy = ty + 220;
            const x = t2 > 0 ? mix(HUBC.x, cx, t2) : mix(540, HUBC.x, t1);
            const y = t2 > 0 ? mix(HUBC.y, cy, t2) : mix(560, HUBC.y, t1);
            return (
              <div key={q.t} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", padding: "12px 22px", borderRadius: 999, background: C.white, color: C.ink, fontFamily: FONT, fontSize: 32, fontWeight: 750, whiteSpace: "nowrap", boxShadow: "0 12px 28px rgba(23,23,23,.28)", zIndex: 4 }}>{q.t}</div>
            );
          })}
          <div style={{ position: "absolute", left: HUBC.x - 110, top: HUBC.y - 110, width: 220, height: 220, borderRadius: 110, background: C.cream, boxShadow: `0 0 0 14px rgba(250,249,245,.5), 0 30px 60px rgba(23,23,23,.3)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, transform: `scale(${hub * (1 - row)})`, zIndex: 3 }}>
            <Mark height={86} color={C.coral} />
            <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.12em", color: C.ink }}>ONE ENTRY POINT</div>
          </div>
        </>
      ) : null}
      {hub > 0.01 && row < 1 ? <Ring x={HUBC.x} y={HUBC.y} at={HUB} r={420} width={14} color={C.coral} dur={26} /> : null}
      {/* not a chatbot */}
      {f >= NOTBOT - 10 ? (
        <div style={{ position: "absolute", left: L.cx, top: 1400, transform: `translate(-50%, -50%) scale(${clamp(springAt(f, NOTBOT - 10, 30, 13, 180))})`, opacity: 1 - tw(f, TEAM - 6, TEAM + 4, 0, 1, E.linear), display: "flex", alignItems: "center", gap: 16, padding: "18px 30px", borderRadius: 999, background: C.white, boxShadow: "0 16px 34px rgba(23,23,23,.16)", fontFamily: FONT, fontSize: 44, fontWeight: 800, color: C.gray }}>
          <Icon name="message" size={44} color={C.gray} stroke={2.2} />
          <span style={{ position: "relative" }}>
            a chatbot
            <span style={{ position: "absolute", left: -6, right: -6, top: "52%", height: 7, borderRadius: 4, background: C.coral, transformOrigin: "0 50%", transform: `scaleX(${tw(f, NOTBOT, NOTBOT + 8, 0, 1, E.expoOut)})` }} />
          </span>
        </div>
      ) : null}
      {f >= TEAM ? <Sparkles x={60} y={1000} w={960} h={225} at={TEAM + 2} color={C.coral} size={46} seed={8} /> : null}
    </div>
  );
};

const Stage: React.FC<{ f: number }> = ({ f }) => {
  const coral = 1 - tw(f, BANDS[0] - 12, BANDS[0] + 2, 0, 1, E.expoIn);
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill style={{ background: C.coral, transform: `translateY(${(1 - coral) * 100}%)` }} />
      {/* Swiss grid lines */}
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(90deg, rgba(23,23,23,.05) 2px, transparent 2px)", backgroundSize: "270px 100%", opacity: 1 - coral }} />
    </AbsoluteFill>
  );
};

const Headlines: React.FC = () => (
  <>
    <Kinetic from={T.VO.l01} to={T.VO.l02 - 9} color={C.cream} hi={INK} words={[
      { t: "The", at: T.ws("l01", 7) },
      { t: "same", at: T.ws("l01", 8) },
      { t: "questions.", at: T.ws("l01", 9), br: true },
      { t: "All", at: T.ws("l01", 10) },
      { t: "day.", at: T.ws("l01", 13), hi: true },
    ]} />
    <Kinetic from={T.VO.l02 - 1} to={BANDS[0] - 12} color={C.cream} hi={INK} words={[
      { t: "From", at: T.ws("l02", 1) },
      { t: "your", at: T.ws("l02", 2), br: true },
      { t: "own", at: T.ws("l02", 3), hi: true },
      { t: "team.", at: T.ws("l02", 4), hi: true },
    ]} />
    <Kinetic from={MEET - 4} to={T.VO.l05 - 9} color={C.ink} hi={C.coral} words={[
      { t: "Your", at: T.ws("l04", 1) },
      { t: "newest", at: T.ws("l04", 3) },
      { t: "teammate.", at: T.ws("l04", 4), hi: true },
    ]} />
    <Kinetic from={T.VO.l05 - 1} to={T.VO.l06 - 9} color={C.ink} hi={C.coral} words={[
      { t: "Trained", at: T.ws("l05", 0) },
      { t: "on", at: T.ws("l05", 1) },
      { t: "your", at: T.ws("l05", 2), br: true },
      { t: "company.", at: T.ws("l05", 3), hi: true },
    ]} />
    <Kinetic from={T.VO.l06 - 1} to={T.VO.l07 - 6} color={C.ink} hi={C.coral} words={[
      { t: "Answers", at: T.ws("l06", 3) },
      { t: "in", at: T.ws("l06", 4) },
      { t: "the", at: T.ws("l06", 5) },
      { t: "thread.", at: T.ws("l06", 6), hi: true },
    ]} />
    <Kinetic from={T.VO.l07 - 4} to={ZOOM - 4} color={C.ink} hi={C.coral} words={[
      { t: "Tricky", at: T.ws("l07", 2) },
      { t: "ones?", at: T.ws("l07", 3), br: true },
      { t: "The", at: T.ws("l07", 7) },
      { t: "right", at: T.ws("l07", 8), hi: true },
      { t: "person.", at: T.ws("l07", 9), hi: true },
    ]} />
    <Kinetic from={ZOOM} to={HUB - 8} color={C.ink} hi={C.coral} words={[
      { t: "One", at: T.ws("l08", 2) },
      { t: "agent", at: T.ws("l08", 3) },
      { t: "per", at: T.ws("l08", 4), br: true },
      { t: "job.", at: T.ws("l08", 5), hi: true },
    ]} />
    <Kinetic from={HUB - 6} to={T.VO.l10 - 9} color={C.ink} hi={C.coral} words={[
      { t: "Every", at: T.ws("l09", 2) },
      { t: "question,", at: T.ws("l09", 3), br: true },
      { t: "the", at: T.ws("l09", 5) },
      { t: "right", at: T.ws("l09", 6), hi: true },
      { t: "one.", at: T.ws("l09", 7), hi: true },
    ]} />
    <Kinetic from={T.VO.l10 - 1} to={COLLAPSE[0]} size={120} color={C.ink} hi={C.coral} shineAt={TEAM + 6} shineHi="#FFC2BA" words={[
      { t: "An", at: T.ws("l10", 5) },
      { t: "AI", at: T.ws("l10", 6), hi: true, br: true },
      { t: "team.", at: T.ws("l10", 7), hi: true },
    ]} />
  </>
);

export const AiTeam: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT }}>
      <Stage f={f} />
      <Avalanche f={f} />
      <Bands f={f} />
      <Chat f={f} />
      <DocsFly f={f} />
      <Team f={f} />
      {f >= JOIN - 1 && f < JOIN + 40 ? <Impact x={L.cx} y={780} at={JOIN} scale={0.8} /> : null}
      <Headlines />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("films/ai-team/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  ...NOTIFS.map((_, i) => cue(8 + i * 11, i % 2 ? "notif" : "ping", -6 - (i % 3), `notification ${i + 1}`)),
  cue(10, "data", -12, "the counter rolls"),
  cue(FORTY, "tick", -3, "40"),
  cue(OWN, "blip", -6, "your own team"),
  ...moments.move(BANDS[0] - 8, "the avalanche drops away", -6),
  ...BANDS.map((b, i) => cue(b - 4, "whoosh", -6, `band ${i + 1}`)),
  ...BANDS.map((b, i) => cue(b + 2, "snap", -4, `band ${i + 1} lands`)),
  ...moments.move(MEET - 2, "bands wipe, the chat rises", -5),
  cue(JOIN, "riser", -4, "into the drop"),
  ...moments.hit(JOIN, "Brainfast joined"),
  cue(SLACK, "pop", -4, "Slack"),
  ...DOCS.flatMap((d, i) => [cue(d - 12, "whoosh", -11, `doc ${i + 1}`), cue(d, "learn", -8, `doc ${i + 1} learned`)]),
  ...moments.ask(ASK1, "Lina asks"),
  ...moments.answer(ANS1, "answered in the thread"),
  cue(SRC, "blip", -6, "source"),
  ...moments.ask(ASK2, "Sam asks"),
  ...moments.answer(ANS2, "routed"),
  cue(JOIN2, "notif", -5, "Maria joins"),
  ...moments.move(ZOOM + 8, "zoom out to the team", -5),
  ...TILES.map((t, i) => cue(t - 2, "snap", -3, `tile ${i + 1}`)),
  cue(HUB - 4, "poweron", -6, "one entry point"),
  ...ROUTES.flatMap((r, i) => [cue(r, "send", -8, `question ${i + 1} in`), cue(r + 16, "tick", -6, `routed ${i + 1}`)]),
  cue(NOTBOT, "miss", -4, "not a chatbot"),
  cue(TEAM - 8, "whoosh", -7, "the team lines up"),
  cue(TEAM, "impact", -8, "an AI team", { kind: "hit" }),
  cue(TEAM + 2, "shimmer", -8, "sparkles"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { FORTY, BANDS, MEET, JOIN, DOCS, ASK1, ANS1, ASK2, ANS2, ZOOM, TILES, HUB, ROUTES, NOTBOT, TEAM, HIT, CTA, URL, DUR };

export const AITEAM: FilmDef = {
  id: "AiTeam",
  slug: "ai-team",
  title: "AiTeam",
  component: AiTeam,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/ai-team/mix.wav",
};
