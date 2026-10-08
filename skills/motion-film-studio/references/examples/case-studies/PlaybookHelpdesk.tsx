import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/playbook-helpdesk/vo/lines.json";
import words from "../../../../public/films/playbook-helpdesk/vo/words.json";

loadFonts();

/**
 * PLAYBOOK — the internal helpdesk. World: a take-a-number queue. A red LED
 * "NOW SERVING" board hangs over the whole film; the line of colleagues with
 * paper tickets, two tired people at the IT window. The playbook opens a third
 * window — the agent — and the signature is the LED counter racing as the line
 * clears itself, while only the hard ticket reaches IT, with a summary.
 * Based on a real internal deployment (ERP tickets, answered in Spanish); no
 * invented results.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

/* beats */
const LINE = w("l01", 4);
const QS = [w("l02", 0), w("l02", 6), w("l02", 12)];
const SAME = w("l03", 0);
const WEEK = w("l03", 3);
const TWO = w("l03", 7);
const DROP = w("l04", 0) - 2; // "Here's the playbook."
const AGENT = w("l05", 2);
const GUIDES = w("l05", 8);
const OPENS = w("l06", 1);
const STEPS = w("l07", 4);
const NAMES = w("l07", 7);
const SPANISH = w("l08", 2);
const DONT = w("l09", 3);
const SAYS = w("l09", 7);
const ONEQ = w("l10", 1);
const PASSES = w("l10", 8);
const SUMMARY = w("l10", 16);
const PASSW = w("l11", 6);
const CHANGE = w("l11", 10);
const HARD = w("l12", 5);
const CARE = w("l12", 9);
const HIT = T.VO.l13 - 2;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l13", 7) - 2;
const URL = w("l13", T.nwords("l13") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l13") + 50);

const QUEUE: { p: FaceSpec; n: number }[] = [
  { p: PEOPLE.maya, n: 48 },
  { p: PEOPLE.omar, n: 49 },
  { p: PEOPLE.eleanor, n: 50 },
  { p: PEOPLE.marcus, n: 51 },
  { p: PEOPLE.wei, n: 52 },
  { p: PEOPLE.lucia, n: 53 },
];
const LED = "#FF3B30";

/* ── NOW SERVING: the LED board over the whole film ── */
const serving = (f: number) => {
  if (f < LINE) return 47;
  if (f < STEPS) return 47;
  if (f < SPANISH - 2) return 112;
  if (f < PASSES) return 113;
  if (f < CARE - 4) return 114;
  return Math.round(tw(f, CARE - 4, CARE + 26, 114, 188, E.cubicInOut));
};
const Led: React.FC<{ f: number }> = ({ f }) => {
  const n = serving(f);
  const prev = serving(f - 3);
  const blink = n !== prev ? 0.55 : 1;
  const racing = f >= CARE - 4 && f < CARE + 26;
  return (
    <div style={{ position: "absolute", left: 120, top: 150, width: 840, height: 290, borderRadius: 30, background: "#141416", boxShadow: "0 30px 70px rgba(0,0,0,.35), inset 0 0 0 6px #2A2A2E", display: "flex", alignItems: "center", padding: "0 44px", gap: 30, zIndex: 20 }}>
      <div style={{ fontFamily: MONO, fontSize: 38, lineHeight: 1.05, letterSpacing: "0.08em", color: "#FFB020", textShadow: "0 0 14px rgba(255,176,32,.7)" }}>
        NOW
        <br />
        SERVING
      </div>
      <div style={{ flex: 1, textAlign: "right", fontFamily: MONO, fontWeight: 500, fontSize: 200, letterSpacing: "0.04em", color: LED, opacity: blink, textShadow: `0 0 24px rgba(255,59,48,.85), 0 0 60px rgba(255,59,48,${racing ? 0.8 : 0.45})`, fontVariantNumeric: "tabular-nums" }}>
        {String(n).padStart(3, "0")}
      </div>
    </div>
  );
};

/* ── scene A: the line ── */
const Ticket: React.FC<{ n: number; size?: number }> = ({ n, size = 1 }) => (
  <div style={{ padding: `${8 * size}px ${14 * size}px`, background: "#FFF7E8", borderRadius: 6 * size, boxShadow: "0 4px 8px rgba(0,0,0,.18)", fontFamily: MONO, fontSize: 26 * size, fontWeight: 500, color: C.ink, borderLeft: `${4 * size}px dashed #E3D6BD` }}>No. {String(n).padStart(3, "0")}</div>
);
const Bubble: React.FC<{ at: number; x: number; y: number; text: string; lang?: string; tail?: "left" | "right" }> = ({ at, x, y, text, tail = "left" }) => {
  const f = useCurrentFrame();
  if (f < at - 1) return null;
  const s = springAt(f, at, 30, 11, 180);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${mix(0.5, 1, clamp(s))})`, transformOrigin: tail === "left" ? "10% 100%" : "90% 100%", opacity: clamp(s * 2), zIndex: 12 }}>
      <div style={{ padding: "22px 30px", borderRadius: 32, background: C.white, boxShadow: "0 16px 40px rgba(23,23,23,.16)", fontSize: 44, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>{text}</div>
      <svg width={40} height={30} style={{ position: "absolute", [tail]: 40, bottom: -24 } as React.CSSProperties}>
        <path d={tail === "left" ? "M0 0 L 40 0 L 6 28 Z" : "M0 0 L 40 0 L 34 28 Z"} fill={C.white} />
      </svg>
    </div>
  );
};
const Line_: React.FC<{ f: number }> = ({ f }) => {
  const clear = tw(f, CARE - 6, CARE + 30, 0, 1, E.cubicInOut); // the line takes care of itself
  const pile = f >= HARD - 8 ? 1 : Math.round(tw(f, WEEK - 4, TWO + 14, 3, 26, E.cubicInOut)); // later: IT keeps just the hard one
  const it = springAt(f, SAME - 4, 30, 13, 150);
  return (
    <>
      {/* the queue */}
      {QUEUE.map((q, i) => {
        const s = springAt(f, -16 + i * 2, 30, 12, 170); // already in line at frame 0
        const leave = clamp(clear * 1.6 - i * 0.12);
        return (
          <div key={i} style={{ position: "absolute", left: 60 + i * 160, top: 880 + (i % 2) * 26, width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `translate(${leave * -900}px, ${(1 - clamp(s)) * 80}px)`, opacity: clamp(s * 2) * (1 - leave) }}>
            <Face p={q.p} size={140} />
            <Ticket n={q.n + 64} size={0.78} />
            {leave > 0.05 ? <div style={{ position: "absolute", top: -10, right: 4, width: 44, height: 44, borderRadius: 22, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={28} color="#FFF" stroke={3} /></div> : null}
          </div>
        );
      })}
      {f < DROP + 8 ? (
        <>
          <Bubble at={QS[0]} x={70} y={560} text="How do I post an invoice?" />
          <Bubble at={QS[1]} x={250} y={690} text="Why can't I see this client?" />
          <Bubble at={QS[2]} x={330} y={1150} text="Where's the export button?" tail="right" />
        </>
      ) : null}
      {/* a whole week of the same questions */}
      {f >= WEEK - 4 && f < DROP + 4 ? (
        <div style={{ position: "absolute", left: 60, right: 60, top: 1300, display: "flex", gap: 12, opacity: tw(f, WEEK - 4, WEEK + 4, 0, 1, E.linear) }}>
          {["MON", "TUE", "WED", "THU", "FRI"].map((d, i) => (
            <div key={d} style={{ flex: 1, borderRadius: 18, background: C.white, boxShadow: "0 10px 26px rgba(23,23,23,.1)", padding: "12px 10px", textAlign: "center", transform: `translateY(${(1 - tw(f, WEEK - 4 + i * 3, WEEK + 6 + i * 3, 0, 1, E.expoOut)) * 40}px)` }}>
              <div style={{ fontFamily: MONO, fontSize: 22, color: C.gray }}>{d}</div>
              {["invoice?", "client?", "export?"].map((q) => (
                <div key={q} style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: C.coralDeep }}>{q}</div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {/* the IT window: two people, a growing pile */}
      <div style={{ position: "absolute", left: 560, top: 1490, width: 460, height: 360, transform: `translateY(${(1 - clamp(it)) * 500}px)`, opacity: clamp(it * 2) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "#E9E5DB", boxShadow: "inset 0 0 0 10px #D8D2C4" }} />
        <div style={{ position: "absolute", left: 30, top: -34, padding: "10px 24px", borderRadius: 14, background: C.ink, color: C.cream, fontFamily: MONO, fontSize: 26, letterSpacing: "0.12em" }}>IT HELPDESK</div>
        <div style={{ position: "absolute", left: 50, top: 60, display: "flex", gap: 24 }}>
          <Face p={PEOPLE.jonas} size={140} />
          <Face p={PEOPLE.dana} size={140} />
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, height: 90, borderRadius: 16, background: "#CFC7B6" }} />
        {Array.from({ length: pile }, (_, k) => (
          <div key={k} style={{ position: "absolute", left: 60 + (k % 3) * 118, bottom: 72 + Math.floor(k / 3) * 10, width: 110, height: 44, borderRadius: 6, background: "#FFF7E8", boxShadow: "0 2px 3px rgba(0,0,0,.2)", transform: `rotate(${((k * 37) % 11) - 5}deg)` }} />
        ))}
        {f >= TWO ? <div style={{ position: "absolute", right: 24, top: 24, padding: "8px 16px", borderRadius: 999, background: C.coral, color: C.white, fontFamily: MONO, fontSize: 24, opacity: tw(f, TWO, TWO + 6, 0, 1, E.linear) }}>{pile} open</div> : null}
      </div>
      {/* the dispenser */}
      <div style={{ position: "absolute", left: 70, top: 1480, width: 300, height: 380 }}>
        <div style={{ position: "absolute", left: 40, top: 0, width: 220, height: 260, borderRadius: "110px 110px 24px 24px", background: "linear-gradient(160deg,#FF5A4F,#C8261D)", boxShadow: "0 20px 40px rgba(200,38,29,.35)" }}>
          <div style={{ position: "absolute", left: 20, right: 20, top: 150, textAlign: "center", fontFamily: MONO, fontSize: 22, color: "#FFF", letterSpacing: "0.06em", lineHeight: 1.1 }}>TAKE A<br />NUMBER</div>
        </div>
        <div style={{ position: "absolute", left: 90, top: 250, transform: `translateY(${tw(f, LINE - 4, LINE + 6, -40, 0, E.backOut)}px) rotate(-6deg)` }}>
          <Ticket n={118} />
        </div>
        <div style={{ position: "absolute", left: 130, top: 300, width: 40, height: 80, background: "#8C8C8C", borderRadius: 6 }} />
      </div>
    </>
  );
};

/* ── scene B: the third window, the agent ── */
const Step: React.FC<{ n: number; at: number; children: React.ReactNode }> = ({ n, at, children }) => {
  const f = useCurrentFrame();
  const s = tw(f, at, at + 8, 0, 1, E.expoOut);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, opacity: s, transform: `translateX(${(1 - s) * 30}px)` }}>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: C.coral, color: C.white, fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
      <div style={{ fontSize: 36, fontWeight: 600 }}>{children}</div>
    </div>
  );
};
const GuideChip: React.FC<{ at: number; text: string }> = ({ at, text }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at, 30, 12, 180);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 18, padding: "10px 18px", borderRadius: 14, background: "#EEF3FB", color: "#2B5E9C", fontSize: 28, fontWeight: 650, transform: `scale(${mix(0.6, 1, clamp(s))})`, transformOrigin: "0 50%", opacity: clamp(s * 2) }}>
      <Icon name="book" size={30} color="#2B5E9C" stroke={2.2} /> {text}
    </div>
  );
};
const TicketCard: React.FC<{ f: number; at: number; no: number; who: FaceSpec; name: string; q: string; y: number; children: React.ReactNode; out?: number; to?: [number, number] }> = ({ f, at, no, who, name, q, y, children, out = 1e9, to }) => {
  if (f < at - 1) return null;
  const s = springAt(f, at, 30, 13, 160);
  const go = tw(f, out, out + 16, 0, 1, E.cubicInOut);
  const tx = to ? to[0] * go : -1200 * tw(f, out, out + 12, 0, 1, E.expoIn);
  const gone = to ? tw(f, out + 14, out + 22, 0, 1, E.linear) : 0; // the flown ticket melts into the IT window
  const ty = to ? to[1] * go : 0;
  if (!to && f > out + 14) return null;
  return (
    <div style={{ position: "absolute", left: 70, top: y, width: 940, transform: `translate(${tx}px, ${ty + (1 - clamp(s)) * 120}px) scale(${to ? mix(1, 0.34, go) : 1})`, transformOrigin: "100% 100%", opacity: clamp(s * 2) * (1 - gone), zIndex: 10 }}>
      <div style={{ borderRadius: 34, background: C.white, boxShadow: "0 30px 70px rgba(23,23,23,.16), inset 0 0 0 2px #EEEBE3", padding: "30px 36px 34px", fontFamily: FONT, color: C.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Face p={who} size={76} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 24, color: C.gray }}>TICKET #{no} · {name}</div>
            <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.02em" }}>{q}</div>
          </div>
        </div>
        <div style={{ marginTop: 20, height: 2, background: "#EEEBE3" }} />
        <div style={{ marginTop: 18 }}>{children}</div>
      </div>
    </div>
  );
};
const AgentHead: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, AGENT - 2, 30, 13, 160);
  const g = tw(f, GUIDES - 4, GUIDES + 10, 0, 1, E.expoOut);
  return (
    <div style={{ position: "absolute", left: 70, top: 500, width: 940, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 60}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 110, height: 110, borderRadius: 30, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 40px rgba(217,87,89,.35)" }}>
          <Mark height={64} color={C.cream} stroke={26} />
        </div>
        <div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em" }}>Helpdesk Assistant</div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.gray, letterSpacing: "0.08em" }}>INTERNAL · OPEN 24/7</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
        {["How to post an invoice", "Client permissions", "Exporting reports"].map((t, i) => (
          <div key={t} style={{ flex: 1, padding: "14px 16px", borderRadius: 18, background: "#EEF3FB", color: "#2B5E9C", fontSize: 25, fontWeight: 650, display: "flex", alignItems: "center", gap: 8, opacity: clamp(g * 3 - i * 0.6), transform: `translateY(${(1 - clamp(g * 3 - i * 0.6)) * 20}px)` }}>
            <Icon name="book" size={26} color="#2B5E9C" stroke={2.2} /> {t}
          </div>
        ))}
      </div>
    </div>
  );
};
const MiniQueue: React.FC<{ f: number }> = ({ f }) => {
  const done = [STEPS + 12, SPANISH + 10, PASSES + 4, 1e9, 1e9, 1e9];
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1750, display: "flex", gap: 22, alignItems: "flex-end" }}>
      <div style={{ fontFamily: MONO, fontSize: 22, color: C.gray, letterSpacing: "0.1em", width: 110, lineHeight: 1.2 }}>THE<br />LINE</div>
      {QUEUE.map((q, i) => {
        const g = tw(f, done[i], done[i] + 14, 0, 1, E.cubicInOut);
        return (
          <div key={i} style={{ position: "relative", opacity: 1 - g, transform: `translateY(${-g * 60}px)` }}>
            <Face p={q.p} size={96} />
            <div style={{ position: "absolute", left: -6, right: -6, bottom: -14, textAlign: "center", fontFamily: MONO, fontSize: 18, color: C.ink, background: "#FFF7E8", borderRadius: 6 }}>{q.n + 64}</div>
            {f >= done[i] ? (
              <div style={{ position: "absolute", right: -6, top: -6, width: 36, height: 36, borderRadius: 18, background: i === 2 ? "#F2B544" : C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={i === 2 ? "users" : "check"} size={22} color="#FFF" stroke={3} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
const Workflow: React.FC<{ f: number }> = ({ f }) => (
  <>
    <AgentHead f={f} />
    <MiniQueue f={f} />
    {/* 1 · a ticket answered with steps + the guide it used */}
    <TicketCard f={f} at={OPENS - 2} no={112} who={PEOPLE.maya} name="Finance" q="How do I post an invoice?" y={800} out={SPANISH - 10}>
      <div style={{ fontSize: 24, fontWeight: 650, color: C.coral }}>✨ Helpdesk Assistant</div>
      <Step n={1} at={STEPS - 2}>Open Invoices › Drafts</Step>
      <Step n={2} at={STEPS + 3}>Select the invoice</Step>
      <Step n={3} at={STEPS + 8}>Click Post</Step>
      <GuideChip at={NAMES} text="Guide: How to post an invoice" />
    </TicketCard>
    {/* 2 · even in Spanish */}
    <TicketCard f={f} at={SPANISH - 8} no={113} who={PEOPLE.lucia} name="Ventas" q="¿Cómo exporto un informe?" y={800} out={DONT - 10}>
      <div style={{ fontSize: 24, fontWeight: 650, color: C.coral }}>✨ Helpdesk Assistant</div>
      <Step n={1} at={SPANISH - 4}>Abre Informes</Step>
      <Step n={2} at={SPANISH}>Elige el periodo</Step>
      <Step n={3} at={SPANISH + 4}>Pulsa Exportar</Step>
      <GuideChip at={SPANISH + 8} text="Guía: Exportar informes" />
    </TicketCard>
    {/* 3 · not in the guides: says so, one question, hands it over with a summary */}
    <TicketCard f={f} at={DONT - 8} no={114} who={PEOPLE.omar} name="Accounting" q="Error 504 closing the month" y={800} out={PASSES} to={[-40, 700]}>
      <div style={{ fontSize: 24, fontWeight: 650, color: C.coral }}>✨ Helpdesk Assistant</div>
      <div style={{ fontSize: 36, fontWeight: 600, marginTop: 8, opacity: tw(f, SAYS - 4, SAYS + 4, 0, 1, E.linear) }}>Our guides don't cover this error.</div>
      <div style={{ fontSize: 36, fontWeight: 600, marginTop: 8, opacity: tw(f, ONEQ - 2, ONEQ + 6, 0, 1, E.linear) }}>Which month are you closing?</div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, opacity: tw(f, ONEQ + 16, ONEQ + 22, 0, 1, E.linear) }}>
        <div style={{ padding: "12px 22px", borderRadius: "22px 22px 6px 22px", background: "#D9FDD3", fontSize: 34, fontWeight: 600 }}>September</div>
      </div>
    </TicketCard>
    {/* the IT window receives it, with a summary */}
    {f >= PASSES - 6 ? (
      <div style={{ position: "absolute", left: 470, top: 1440, width: 550, opacity: tw(f, PASSES - 6, PASSES + 4, 0, 1, E.linear), transform: `translateY(${tw(f, PASSES - 6, PASSES + 6, 60, 0, E.expoOut)}px)` }}>
        <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: "14px 14px 0 0", background: C.ink, color: C.cream, fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em" }}>IT HELPDESK</div>
        <div style={{ borderRadius: "0 26px 26px 26px", background: "#E9E5DB", padding: "22px 24px", boxShadow: "0 20px 50px rgba(23,23,23,.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Face p={PEOPLE.jonas} size={70} />
            <div style={{ padding: "6px 14px", borderRadius: 10, background: "#FFF3C4", color: "#6B5200", fontSize: 24, fontWeight: 700 }}>Handed off</div>
          </div>
          <div style={{ marginTop: 14, borderRadius: 16, background: C.white, padding: "14px 18px", fontSize: 26, lineHeight: 1.35, opacity: tw(f, SUMMARY - 6, SUMMARY + 2, 0, 1, E.linear) }}>
            <b>Summary:</b> #114 · error 504 on month-end close (Sep). Not in the guides.
          </div>
        </div>
      </div>
    ) : null}
    {/* the rules it's set to */}
    {[
      { at: PASSW - 4, icon: "lock" as const, t: "Never asks for passwords" },
      { at: CHANGE - 4, icon: "database" as const, t: "Never changes data on its own" },
    ].map((r, i) => {
      const s = springAt(f, r.at, 30, 12, 170);
      if (f < r.at - 1) return null;
      return (
        <div key={i} style={{ position: "absolute", left: 70, top: 830 + i * 150, width: 940, display: "flex", alignItems: "center", gap: 22, padding: "28px 32px", borderRadius: 30, background: C.ink, color: C.cream, fontSize: 46, fontWeight: 750, letterSpacing: "-0.02em", transform: `translateX(${(1 - clamp(s)) * -300}px)`, opacity: clamp(s * 2), zIndex: 14 }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={r.icon} size={40} color="#FFF" stroke={2.4} />
          </div>
          {r.t}
        </div>
      );
    })}
  </>
);

export const PlaybookHelpdesk: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const scene = f < DROP ? 0 : f < HARD - 8 ? 1 : 2;
  // scene hand-overs: the stage slides up under the LED board
  const upA = tw(f, DROP - 8, DROP + 8, 0, 1, E.expoInOut);
  const upB = tw(f, HARD - 16, HARD, 0, 1, E.expoInOut);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const drop = springAt(f, DROP, 30, 12, 150);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #F1EEE6 0%, #FAF9F5 45%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {scene === 0 || (f < DROP + 8) ? <div style={{ position: "absolute", inset: 0, transform: `translateY(${-upA * 1920}px)` }}><Line_ f={f} /></div> : null}
        {scene === 1 || (f >= DROP - 8 && f < HARD) ? (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - upA) * 1920 - upB * 1920}px)` }}>
            {/* the playbook ticket stub */}
            <div style={{ position: "absolute", left: 70, top: 470, width: 940, opacity: 1 - tw(f, AGENT - 10, AGENT - 2, 0, 1, E.linear), transform: `rotate(${mix(-8, -2, clamp(drop))}deg) scale(${mix(0.6, 1, clamp(drop))})` }}>
              <div style={{ borderRadius: 18, background: "#FFF7E8", boxShadow: "0 30px 60px rgba(23,23,23,.18)", padding: "40px 50px", borderLeft: "10px dashed #E3D6BD" }}>
                <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: C.coral }}>No. 001 · THE PLAYBOOK</div>
                <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>Internal helpdesk</div>
              </div>
            </div>
            <Workflow f={f} />
          </div>
        ) : null}
        {scene === 2 || f >= HARD - 16 ? (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - upB) * 1920}px)` }}>
            <Line_ f={f} />
            {/* the IT team keeps the hard problem: one ticket, coffee */}
            {f >= HARD - 4 ? (
              <div style={{ position: "absolute", left: 590, top: 1340, padding: "14px 22px", borderRadius: 18, background: C.white, boxShadow: "0 16px 40px rgba(23,23,23,.14)", fontSize: 32, fontWeight: 700, color: C.ink, opacity: tw(f, HARD - 4, HARD + 4, 0, 1, E.linear) }}>
                just #114 ☕
              </div>
            ) : null}
            {f >= CARE + 20 ? <Sparkles x={140} y={250} w={800} h={160} at={CARE + 20} color={LED} size={40} seed={2} /> : null}
          </div>
        ) : null}
        <Led f={f} />
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/playbook-helpdesk/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(LINE - 4, "tear", -4, "ticket torn off"),
  cue(LINE, "chime", -6, "now serving 047"),
  ...[0, 1, 2, 3, 4, 5].map((i) => cue(1 + i * 2, "pop", -15, `person ${i + 1}`)),
  ...QS.map((q, i) => cue(q, "pop", -7, `question ${i + 1}`)),
  cue(SAME - 4, "whoosh", -12, "the IT window"),
  cue(WEEK - 4, "flurry", -14, "a whole week of it"),
  cue(TWO, "buzz", -10, "pile grows"),
  cue(DROP - 6, "whoosh", -8, "the stage slides up"),
  cue(DROP, "tear", -3, "the playbook ticket"),
  cue(DROP + 2, "impact", -9, "the drop"),
  cue(AGENT - 2, "pop", -6, "the agent's window"),
  cue(GUIDES - 2, "learn", -9, "trained on the guides"),
  cue(OPENS - 2, "notif", -5, "ticket #112"),
  cue(STEPS - 2, "tick", -9, "step 1"),
  cue(STEPS + 3, "tick", -10, "step 2"),
  cue(STEPS + 8, "tick", -10, "step 3"),
  cue(NAMES, "blip", -8, "the guide it used"),
  cue(STEPS - 2, "chime", -9, "now serving 112"),
  cue(SPANISH - 10, "whoosh", -12, "next ticket"),
  cue(SPANISH - 8, "notif", -6, "ticket #113"),
  cue(SPANISH - 2, "chime", -9, "now serving 113"),
  cue(DONT - 10, "whoosh", -12, "next ticket"),
  cue(DONT - 8, "notif", -6, "ticket #114"),
  cue(SAYS - 4, "miss", -9, "our guides don't cover this"),
  cue(ONEQ - 2, "receive", -6, "one question"),
  cue(ONEQ + 16, "send", -7, "September"),
  cue(PASSES, "whoosh", -8, "passed to IT"),
  cue(PASSES + 8, "ping", -6, "IT receives it"),
  cue(PASSES, "chime", -9, "now serving 114"),
  cue(PASSW - 4, "seal", -6, "never asks for passwords"),
  cue(CHANGE - 4, "seal", -6, "never changes data"),
  cue(HARD - 16, "whoosh", -9, "back to the line"),
  cue(CARE - 4, "data", -8, "the counter races"),
  cue(CARE + 26, "chime", -5, "all served"),
  cue(CARE + 20, "shimmer", -10, "sparkle"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, OPENS, PASSES, HARD, CARE, HIT, CTA, URL, DUR };

export const PLAYBOOKHELPDESK: FilmDef = { id: "PlaybookHelpdesk", slug: "playbook-helpdesk", title: "Playbook · Internal helpdesk", component: PlaybookHelpdesk, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/playbook-helpdesk/mix.wav" };
