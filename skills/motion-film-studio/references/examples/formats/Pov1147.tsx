import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { AgentDot, ChannelGlyph, Icon, IconName, Touch } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/pov-1147/vo/lines.json";
import words from "../../../../public/films/pov-1147/vo/words.json";

loadFonts();

/**
 * POV: 11:47 PM — a phone-native screen recording. The frame IS the owner's
 * phone: the lock screen lights up with customers' questions; each one flips
 * to "Replied by Brainfast"; the clock runs through the night; at 7:00 AM the
 * app opens on a calm Activity screen; the one that needs a human waits in
 * the inbox. Captions in the native "classic" style, no ad look.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const LIGHT = w("l02", 3);
const NOTE = [w("l03", 1), w("l03", 3), w("l03", 4), w("l03", 7)];
const WAITING = w("l04", 4);
const UNLESS = w("l05", 0);
const BF = w("l06", 1);
const REPLIED = [w("l06", 3), w("l06", 4) + 2, w("l06", 7), w("l06", 8) + 2];
const SLEEP = w("l06", 10);
const SEVEN = w("l07", 0);
const OPEN = w("l07", 3);
const STATS = [w("l08", 0), w("l08", 3), w("l08", 6)];
const INBOX = w("l09", 5) - 8;
const TAP = w("l09", 11);
const HIT = w("l10", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l10", i));
const CTA = w("l11", 0) - 2;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 60);

type Note = { ch: "whatsapp" | "instagram" | "gmail" | "messenger"; app: string; who: FaceSpec; title: string; text: string; reply: string };
const P = (p: FaceSpec, name: string): FaceSpec => ({ ...p, name });
const NOTES: Note[] = [
  { ch: "whatsapp", app: "WhatsApp", who: P(PEOPLE.maya, "Maya"), title: "Maya", text: "Can I book a repotting slot on Saturday?", reply: "Booked Sat 10:00 ✓" },
  { ch: "instagram", app: "Instagram", who: P(PEOPLE.omar, "Omar"), title: "omar.designs", text: "How much is the big monstera?", reply: "Replied: $48, in stock" },
  { ch: "gmail", app: "Email", who: P(PEOPLE.eleanor, "Eleanor"), title: "Eleanor Hughes", text: "Where's my order #1182?", reply: "Replied: out for delivery" },
  { ch: "messenger", app: "Messenger", who: P(PEOPLE.ken, "Ken"), title: "Ken Watanabe", text: "Are you open tomorrow?", reply: "Replied: 9–6 tomorrow" },
];

/* the lock-screen clock through the night */
const CLOCK = ["11:47", "11:48", "12:36", "2:14", "4:52", "6:59", "7:00"];
const clockIdx = (f: number) => (f < LIGHT ? 0 : f < SLEEP - 6 ? 1 : f < SEVEN - 4 ? Math.min(5, 2 + Math.floor((f - (SLEEP - 6)) / Math.max(1, (SEVEN - 4 - (SLEEP - 6)) / 4))) : 6);
const dawn = (f: number) => tw(f, SLEEP, SEVEN, 0, 1, E.cubicInOut);

const Wallpaper: React.FC<{ f: number }> = ({ f }) => {
  const d = dawn(f);
  const lit = tw(f, LIGHT - 2, LIGHT + 8, 0, 1, E.expoOut);
  const top = mixColor("#0B1030", "#F08A5D", d);
  const mid = mixColor("#1A1F4A", "#F6B46E", d);
  const bot = mixColor("#2A1E45", "#FBE3C4", d);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${bot} 100%)` }}>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: rnd(i * 3.1) * 1080, top: rnd(i * 5.7) * 1100, width: 3 + rnd(i) * 3, height: 3 + rnd(i) * 3, borderRadius: 4, background: "#FFF6E0", opacity: (1 - d) * (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(f * 0.08 + i))) }} />
      ))}
      <div style={{ position: "absolute", left: 540 - 300, top: mix(1500, 1150, d), width: 600, height: 600, borderRadius: 300, background: `radial-gradient(circle, rgba(255,220,150,${0.85 * d}), rgba(255,220,150,0) 65%)` }} />
      {/* hills */}
      <svg width={1080} height={600} style={{ position: "absolute", left: 0, bottom: 0 }}>
        <path d="M0 300 C 200 220, 360 260, 540 230 C 760 190, 900 260, 1080 220 L 1080 600 L 0 600 Z" fill={mixColor("#141633", "#E58F62", d)} opacity={0.9} />
        <path d="M0 420 C 240 360, 420 400, 620 370 C 820 340, 960 390, 1080 370 L 1080 600 L 0 600 Z" fill={mixColor("#0D0F24", "#C96E4B", d)} />
      </svg>
      {/* the screen is dim until it lights up */}
      <AbsoluteFill style={{ background: "#000", opacity: 0.55 * (1 - lit) }} />
    </AbsoluteFill>
  );
};

const StatusBar: React.FC<{ f: number; dark?: boolean }> = ({ f, dark = false }) => {
  const col = dark ? C.ink : "#FFFFFF";
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 44, display: "flex", alignItems: "center", fontFamily: FONT, fontSize: 34, fontWeight: 650, color: col }}>
      <div>{CLOCK[clockIdx(f)]}</div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginRight: 16 }}>
        {[10, 16, 22, 28].map((h) => (
          <div key={h} style={{ width: 7, height: h, borderRadius: 2, background: col }} />
        ))}
      </div>
      <div style={{ width: 56, height: 26, borderRadius: 8, boxShadow: `inset 0 0 0 3px ${col}`, padding: 4, boxSizing: "border-box" }}>
        <div style={{ width: `${mix(62, 38, dawn(f))}%`, height: "100%", borderRadius: 3, background: col }} />
      </div>
    </div>
  );
};

/** Native-style caption (white pill, ink text). */
const Caption: React.FC<{ f: number; from: number; to: number; children: React.ReactNode; y?: number }> = ({ f, from, to, children, y = 190 }) => {
  if (f < from - 2 || f > to + 8) return null;
  const s = clamp(springAt(f, from, 30, 14, 190)) * (1 - tw(f, to, to + 8, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", transform: `scale(${mix(0.8, 1, s)})`, opacity: clamp(s * 2), zIndex: 20 }}>
      <div style={{ padding: "14px 26px", borderRadius: 18, background: "#FFFFFF", color: "#111", fontFamily: FONT, fontSize: 48, fontWeight: 750, letterSpacing: "-0.02em", lineHeight: 1.2, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.3)", maxWidth: 900 }}>{children}</div>
    </div>
  );
};

const LockScreen: React.FC<{ f: number }> = ({ f }) => {
  if (f > OPEN + 14) return null;
  const idx = clockIdx(f);
  const roll = idx >= 2 && idx <= 5 ? 1 : 0;
  const open = tw(f, OPEN - 2, OPEN + 12, 0, 1, E.expoIn);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - open, transform: `scale(${1 + 0.08 * open})` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: FONT, fontSize: 40, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>{f < SEVEN - 4 ? "Friday, 26 September" : "Saturday, 27 September"}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center", fontFamily: FONT, fontSize: 250, fontWeight: 700, letterSpacing: "-0.04em", color: "#FFFFFF", lineHeight: 1.05, transform: roll ? `translateY(${Math.sin(f * 0.6) * 0}px)` : undefined }}>
        {CLOCK[idx]}
      </div>
      {f >= SLEEP - 8 && f < SEVEN ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", opacity: tw(f, SLEEP - 8, SLEEP + 4, 0, 1, E.linear) * (1 - tw(f, SEVEN - 10, SEVEN - 2, 0, 1, E.linear)) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,.14)", color: "#FFFFFF", fontFamily: FONT, fontSize: 30, fontWeight: 650 }}>
            <Icon name="moon" size={30} color="#FFFFFF" stroke={2.4} />
            Sleep · Brainfast is on
          </div>
        </div>
      ) : null}
      <Notifications f={f} />
    </div>
  );
};

const Notifications: React.FC<{ f: number }> = ({ f }) => {
  const shown = NOTES.filter((_, i) => f >= NOTE[i] - 2).length;
  const collapse = tw(f, SLEEP - 4, SLEEP + 12, 0, 1, E.expoInOut);
  return (
    <>
      {NOTES.map((n, i) => {
        if (f < NOTE[i] - 2) return null;
        const s = clamp(springAt(f, NOTE[i], 30, 14, 170));
        const idx = shown - 1 - i; // newest on top
        const y = mix(860 + idx * 196, 860 + idx * 36, collapse);
        const rep = tw(f, REPLIED[i], REPLIED[i] + 8, 0, 1, E.expoOut);
        const wait = f >= WAITING - 4 && f < REPLIED[i] ? 0.5 + 0.5 * Math.sin(f * 0.25 + i) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 50, width: 980, top: y, transform: `translateY(${(1 - s) * -120}px) scale(${mix(0.92, 1, s) * mix(1, 0.94 - idx * 0.02, collapse)})`, opacity: clamp(s * 2) * (idx > 3 ? 0 : 1) * (collapse > 0 && idx > 0 ? 1 - 0.5 * collapse : 1), zIndex: 10 - idx, borderRadius: 40, background: mixColor("#FFFFFF", "#FFF4F1", rep), boxShadow: `0 20px 50px rgba(0,0,0,.28), 0 0 0 ${4 * rep}px rgba(217,87,89,.6)`, padding: "24px 28px", boxSizing: "border-box", fontFamily: FONT, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#F3F1EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChannelGlyph ch={n.ch} size={32} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 650, color: "#666", flex: 1 }}>{n.app.toUpperCase()}</div>
              <div style={{ fontSize: 26, color: "#8a8a8a" }}>{rep > 0.5 ? "11:4" + (8 + i) + " PM" : "now"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14 }}>
              <Face p={n.who} size={76} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 34, fontWeight: 750, color: "#111", letterSpacing: "-0.02em" }}>{n.title}</div>
                <div style={{ fontSize: 34, color: "#222", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.text}</div>
              </div>
              {wait > 0 ? <div style={{ width: 18, height: 18, borderRadius: 9, background: "#F2A33A", opacity: 0.5 + 0.5 * wait }} /> : null}
            </div>
            {rep > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, opacity: rep, transform: `translateY(${(1 - rep) * 12}px)` }}>
                <AgentDot size={40} />
                <div style={{ fontSize: 28, fontWeight: 700, color: C.coralDeep }}>Replied by Brainfast</div>
                <div style={{ fontSize: 28, color: "#555" }}>· {n.reply}</div>
              </div>
            ) : null}
            {rep > 0 ? <Sheen at={REPLIED[i]} dur={18} opacity={0.6} /> : null}
          </div>
        );
      })}
    </>
  );
};

/* ── the app at 7:00 AM ── */
const APPROWS: { who: FaceSpec; ch: "whatsapp" | "instagram" | "gmail" | "messenger" | "web"; text: string; tag: string; tagColor: string }[] = [
  { who: NOTES[0].who, ch: "whatsapp", text: "Can I book a repotting slot…", tag: "Booked", tagColor: C.green },
  { who: NOTES[1].who, ch: "instagram", text: "How much is the big monstera?", tag: "Answered", tagColor: C.coral },
  { who: NOTES[2].who, ch: "gmail", text: "Where's my order #1182?", tag: "Answered", tagColor: C.coral },
  { who: NOTES[3].who, ch: "messenger", text: "Are you open tomorrow?", tag: "Answered", tagColor: C.coral },
  { who: P(PEOPLE.lucia, "Lucía"), ch: "web", text: "Do you deliver to Valencia St?", tag: "New lead", tagColor: "#2B86CC" },
  { who: P(PEOPLE.jonas, "Jonas"), ch: "whatsapp", text: "Workshop on Sunday?", tag: "Booked", tagColor: C.green },
];
const App: React.FC<{ f: number }> = ({ f }) => {
  if (f < OPEN - 4) return null;
  const o = tw(f, OPEN - 2, OPEN + 14, 0, 1, E.expoOut);
  const out = tw(f, HIT - 12, HIT, 0, 1, E.expoIn);
  const stat = (i: number) => clamp(springAt(f, STATS[i], 30, 12, 180));
  return (
    <div style={{ position: "absolute", inset: 0, background: C.cream, transformOrigin: "540px 1500px", transform: `scale(${mix(0.2, 1, o) * (1 - 0.9 * out)})`, borderRadius: mix(200, 0, o), opacity: clamp(o * 3) * (1 - tw(out, 0.6, 1, 0, 1, E.linear)), overflow: "hidden", fontFamily: FONT, color: C.ink }}>
      <StatusBar f={f} dark />
      <div style={{ position: "absolute", left: 60, right: 60, top: 150, display: "flex", alignItems: "center", gap: 18 }}>
        <AgentDot size={70} />
        <div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.035em" }}>Activity</div>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.1em", color: C.gray }}>CASA VERDE ASSISTANT · OVERNIGHT</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 280, display: "flex", gap: 26, fontSize: 28, fontWeight: 650, color: C.gray, borderBottom: "2px solid #ECE8E0", paddingBottom: 16 }}>
        <span style={{ color: C.ink, borderBottom: `4px solid ${C.coral}`, paddingBottom: 14, marginBottom: -18 }}>Chat Logs</span>
        <span>Live chats</span>
        <span>Escalations</span>
        <span>Leads</span>
      </div>
      {/* the three stats */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 380, display: "flex", gap: 18 }}>
        {[
          { k: "ALL CHATS", v: "Answered", icon: "check" as IconName, c: C.coral },
          { k: "BOOKINGS", v: "2 made", icon: "calendar" as IconName, c: C.green },
          { k: "NEW LEADS", v: "1 saved", icon: "userPlus" as IconName, c: "#2B86CC" },
        ].map((t, i) => {
          const s = stat(i);
          return (
            <div key={t.k} style={{ position: "relative", flex: 1, height: 200, borderRadius: 30, background: C.white, boxShadow: "0 16px 40px rgba(23,23,23,.1)", padding: "22px 22px", boxSizing: "border-box", transform: `translateY(${(1 - s) * 60}px) scale(${mix(0.8, 1, s)})`, opacity: clamp(s * 2), overflow: "hidden" }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: mixColor(t.c, "#FFFFFF", 0.85), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={t.icon} size={32} color={t.c} stroke={2.6} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray, marginTop: 16 }}>{t.k}</div>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 2, whiteSpace: "nowrap" }}>{t.v}</div>
              <Sheen at={STATS[i] + 4} dur={18} opacity={0.7} />
            </div>
          );
        })}
      </div>
      {STATS.map((a, i) => (f >= a ? <Sparkles key={i} x={60 + i * 327} y={380} w={300} h={200} at={a + 4} color={C.coral} size={34} seed={i + 4} /> : null))}
      {/* the log */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 630 }}>
        {APPROWS.map((r, i) => {
          const s = clamp(springAt(f, OPEN + 8 + i * 4, 30, 14, 180));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, height: 140, borderBottom: "2px solid #EFECE5", transform: `translateY(${(1 - s) * 40}px)`, opacity: clamp(s * 2) }}>
              <div style={{ position: "relative" }}>
                <Face p={r.who} size={84} />
                <div style={{ position: "absolute", right: -6, bottom: -6, width: 38, height: 38, borderRadius: 19, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,.12)" }}>
                  <ChannelGlyph ch={r.ch} size={24} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 34, fontWeight: 750, letterSpacing: "-0.02em" }}>{r.who.name}</div>
                <div style={{ fontSize: 30, color: C.gray, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.text}</div>
              </div>
              <div style={{ padding: "8px 16px", borderRadius: 999, background: mixColor(r.tagColor, "#FFFFFF", 0.85), color: r.tagColor, fontFamily: MONO, fontSize: 20, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{r.tag.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <InboxBanner f={f} />
    </div>
  );
};

/* the one that needs you: a real escalation email (subject template from the product) */
const InboxBanner: React.FC<{ f: number }> = ({ f }) => {
  if (f < INBOX - 2) return null;
  const s = clamp(springAt(f, INBOX, 30, 14, 170));
  const press = keys(f, [[TAP - 3, 1], [TAP, 0.95], [TAP + 7, 1]], E.cubicInOut);
  return (
    <>
      <div style={{ position: "absolute", left: 40, right: 40, top: 120, transform: `translateY(${(1 - s) * -300}px) scale(${press})`, zIndex: 30, borderRadius: 40, background: "rgba(255,255,255,.97)", boxShadow: "0 30px 70px rgba(23,23,23,.3), 0 0 0 4px rgba(217,87,89,.5)", padding: "24px 28px", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#F3F1EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChannelGlyph ch="gmail" size={32} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 650, color: "#666", flex: 1 }}>MAIL · 7:02 AM</div>
          <div style={{ padding: "6px 14px", borderRadius: 999, background: C.coralTint, color: C.coralDeep, fontFamily: MONO, fontSize: 18, letterSpacing: "0.08em" }}>NEEDS YOU</div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#111", marginTop: 14, letterSpacing: "-0.02em", lineHeight: 1.15 }}>Customer needs your help on Casa Verde Assistant</div>
        <div style={{ fontSize: 30, color: "#444", marginTop: 8 }}>Lucía asked about a custom order for a wedding.</div>
      </div>
      <Touch f={f} x={540} y={300} at={TAP} />
    </>
  );
};

export const Pov1147: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const bfGlow = tw(f, BF - 2, BF + 10, 0, 1, E.expoOut) * (1 - tw(f, SLEEP, SLEEP + 20, 0, 1, E.linear));
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: "#0B1030" }}>
      <Wallpaper f={f} />
      <StatusBar f={f} />
      <LockScreen f={f} />
      {bfGlow > 0 ? (
        <div style={{ position: "absolute", left: 540 - 120, top: 1660, width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center", opacity: bfGlow, transform: `scale(${mix(0.6, 1, bfGlow)})` }}>
          <div style={{ width: 140, height: 140, borderRadius: 40, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${60 * bfGlow}px rgba(217,87,89,.8)` }}>
            <Mark height={80} color={C.cream} stroke={24} />
          </div>
        </div>
      ) : null}
      <App f={f} />
      <Caption f={f} from={14} to={LIGHT - 8}>POV: it's 11:47 PM and you finally sit down</Caption>
      <Caption f={f} from={WAITING - 20} to={UNLESS - 6}>every one of them waiting on you</Caption>
      <Caption f={f} from={UNLESS} to={SLEEP - 8}>unless someone else is still awake…</Caption>
      <Caption f={f} from={SEVEN} to={OPEN - 4} y={260}>7:00 AM</Caption>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/pov-1147/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  cue(LIGHT - 2, "poweron", -8, "screen lights up"),
  ...NOTE.map((n, i) => cue(n, (["ping", "notif", "blip", "ping"] as const)[i], -3, `notification ${i + 1}`)),
  cue(NOTE[3] + 10, "flurry", -12, "more pile in"),
  cue(WAITING, "clock", -10, "waiting"),
  cue(BF - 2, "swell", -6, "someone is awake"),
  cue(BF, "spark", -6, "Brainfast"),
  ...REPLIED.map((r, i) => cue(r, "receive", -4, `replied ${i + 1}`)),
  ...REPLIED.map((r, i) => cue(r + 4, "check", -9, `reply check ${i + 1}`)),
  cue(SLEEP - 4, "whoosh", -9, "notifications stack"),
  cue(SLEEP, "night", 2, "the night"),
  ...[0, 1, 2, 3].map((i) => cue(SLEEP + 8 + i * 9, "tick", -9, `clock ${i + 1}`)),
  cue(SEVEN - 4, "birds", 0, "morning"),
  cue(OPEN - 2, "zoom", -4, "the app opens"),
  cue(OPEN + 10, "flurry", -12, "chat log rows"),
  ...STATS.map((s, i) => cue(s, "pop", -4, `stat ${i + 1}`)),
  ...STATS.map((s, i) => cue(s + 4, "shimmer", -12, `stat shine ${i + 1}`)),
  cue(INBOX, "notif", -3, "the one that needs you"),
  cue(TAP, "tap", -2, "tap"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { LIGHT, NOTE, BF, REPLIED, SLEEP, SEVEN, OPEN, STATS, INBOX, HIT, CTA, URL, DUR };

export const POV1147: FilmDef = {
  id: "Pov1147",
  slug: "pov-1147",
  title: "Pov1147",
  component: Pov1147,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/pov-1147/mix.wav",
};
