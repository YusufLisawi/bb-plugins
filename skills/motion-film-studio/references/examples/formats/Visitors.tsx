import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Impact, Odometer, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { AgentDot, CheckDisc, Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/visitors/vo/lines.json";
import words from "../../../../public/films/visitors/vo/words.json";

loadFonts();

/**
 * 500 VISITORS — a live data-viz. Visitors stream through your website as
 * particles; before, they all pass straight through and leave. Give the site
 * a voice: questions get answered (✓), buyers curve down into the leads list.
 * Same traffic, more customers.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const VIS = w("l01", 0);
const NONE = w("l02", 3);
const QMARK = w("l03", 3);
const BUY = w("l03", 6);
const LEFT = w("l04", 4);
const DROP = w("l05", 0);
const VOICE = w("l05", 5);
const ANSWER = w("l06", 7);
const LEADS = w("l07", 4);
const FIELDS = [w("l07", 5), w("l07", 6), w("l07", 9), w("l07", 10)];
const SAME = w("l08", 0);
const MORE = w("l08", 2);
const HIT = w("l09", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => w("l09", i));
const CTA = w("l10", 0) - 2;
const URL = w("l10", T.nwords("l10") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l10") + 60);

const BG = "#0B0F1E";
const SITE = { x: 70, y: 800, w: 940, h: 700 };
const CY = SITE.y + SITE.h / 2;
const WIDGET = { x: SITE.x + SITE.w - 70, y: SITE.y + SITE.h - 70 };
const LIST = { x: 70, y: 1400, w: 940 };
const N = 170;
const Q = (i: number) => i % 5 === 1; // had a question
const B = (i: number) => i % 11 === 3; // ready to buy

/** particle i at frame f: x, y, opacity, and whether it has been served */
const particle = (i: number, f: number) => {
  const speed = 0.0036 + rnd(i * 1.7) * 0.0026;
  const p = (rnd(i * 3.3) + f * speed) % 1;
  const lane = rnd(i * 7.9) - 0.5;
  const x = -80 + p * 1240;
  const edge = Math.abs(x - 540) / 540;
  let y = CY + lane * 520 * (0.45 + 0.55 * clamp(edge)) + Math.sin(f * 0.04 + i) * 8;
  let xx = x;
  let o = clamp(p * 8) * clamp((1 - p) * 8);
  const on = f >= DROP;
  // after the drop, buyers curve down into the leads list
  if (on && B(i) && f >= LEADS - 30 && p > 0.5) {
    const t = clamp((p - 0.5) / 0.28);
    xx = mix(x, LIST.x + 120 + (i % 3) * 300, E.cubicInOut(t));
    y = mix(y, LIST.y + 60, E.cubicInOut(t));
    o *= 1 - clamp((p - 0.74) * 12);
  }
  return { x: xx, y, o, p };
};

const Particles: React.FC<{ f: number }> = ({ f }) => {
  const qOn = tw(f, QMARK - 4, QMARK + 8, 0, 1, E.linear);
  const bOn = tw(f, BUY - 4, BUY + 8, 0, 1, E.linear);
  const left = tw(f, LEFT - 4, LEFT + 10, 0, 1, E.linear) * (1 - tw(f, DROP - 4, DROP + 4, 0, 1, E.linear));
  const on = f >= DROP;
  const out = tw(f, HIT - 16, HIT, 0, 1, E.expoIn);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      {Array.from({ length: N }, (_, i) => {
        const { x, y, o, p } = particle(i, f);
        if (o <= 0.01) return null;
        const q = Q(i);
        const b = B(i);
        const served = on && p > 0.52 && (q || b);
        const r = q || b ? 9 : 6;
        const base = served ? C.coral : q && qOn > 0 ? mixColor("#AFC3FF", "#FFFFFF", 0.3) : b && bOn > 0 ? "#FFD46E" : "#7F8DB8";
        const exitRed = !on && p > 0.78 ? left : 0;
        const col = mixColor(base, "#FF6B6B", exitRed * 0.7);
        return (
          <g key={i} opacity={o}>
            {served ? <circle cx={x} cy={y} r={r * 2.6} fill="rgba(217,87,89,.25)" /> : null}
            <circle cx={x} cy={y} r={r} fill={col} />
            {q && qOn > 0 && !served ? <text x={x} y={y - 18} textAnchor="middle" fontFamily="DM Sans" fontWeight={800} fontSize={26} fill="#FFFFFF" opacity={qOn}>?</text> : null}
            {b && bOn > 0 && !served ? <text x={x} y={y - 18} textAnchor="middle" fontFamily="DM Sans" fontWeight={800} fontSize={24} fill="#FFD46E" opacity={bOn}>$</text> : null}
            {served && q ? <text x={x} y={y - 16} textAnchor="middle" fontFamily="DM Sans" fontWeight={900} fontSize={24} fill="#FFFFFF">✓</text> : null}
          </g>
        );
      })}
    </svg>
  );
};

/** the website in the middle */
const Site: React.FC<{ f: number }> = ({ f }) => {
  const inS = clamp(springAt(f, 2, 30, 15, 140));
  const lit = tw(f, DROP - 2, DROP + 12, 0, 1, E.expoOut);
  const widget = clamp(springAt(f, VOICE - 4, 30, 11, 190));
  const out = tw(f, HIT - 16, HIT, 0, 1, E.expoIn);
  const shrink = tw(f, LEADS - 14, LEADS + 6, 0, 1, E.expoInOut);
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.18);
  return (
    <div style={{ position: "absolute", left: SITE.x, top: SITE.y, width: SITE.w, height: SITE.h, transformOrigin: "50% 0%", transform: `scale(${mix(0.85, 1, inS) * (1 - 0.9 * out) * mix(1, 0.8, shrink)})`, opacity: clamp(inS * 2) * (1 - out), borderRadius: 34, background: `linear-gradient(160deg, rgba(255,255,255,${0.1 + 0.05 * lit}), rgba(255,255,255,.03))`, boxShadow: `inset 0 0 0 2px rgba(255,255,255,.14), 0 40px 100px rgba(0,0,0,.5), 0 0 ${120 * lit}px rgba(217,87,89,${0.3 * lit})`, fontFamily: FONT, color: C.cream, overflow: "visible" }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", borderBottom: "2px solid rgba(255,255,255,.08)" }}>
        {["#F26B5E", "#F5BF4F", "#5DC269"].map((c) => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.8 }} />
        ))}
        <div style={{ marginLeft: 12, flex: 1, height: 36, borderRadius: 18, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 22, color: "rgba(250,249,245,.6)" }}>northwindoutdoor.com</div>
      </div>
      <div style={{ position: "absolute", left: 50, top: 120, fontSize: 84, fontWeight: 850, letterSpacing: "-0.045em", lineHeight: 1, opacity: 0.95 }}>
        Gear for
        <br />
        every trail.
      </div>
      <div style={{ position: "absolute", left: 50, top: 400, display: "flex", gap: 18 }}>
        {["Tents", "Packs", "Boots"].map((t) => (
          <div key={t} style={{ width: 190, height: 190, borderRadius: 26, background: "rgba(255,255,255,.06)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.08)", display: "flex", alignItems: "flex-end", padding: 14, boxSizing: "border-box", fontSize: 24, fontWeight: 700, color: "rgba(250,249,245,.8)" }}>{t}</div>
        ))}
      </div>
      {/* the voice */}
      {widget > 0.01 ? (
        <>
          <div style={{ position: "absolute", left: WIDGET.x - SITE.x - 56, top: WIDGET.y - SITE.y - 56, width: 112, height: 112, borderRadius: 56, transform: `scale(${widget})`, boxShadow: `0 0 0 ${14 + 10 * pulse}px rgba(217,87,89,${0.25 * widget}), 0 20px 40px rgba(0,0,0,.4)` }}>
            <AgentDot size={112} />
          </div>
          <div style={{ position: "absolute", left: 500, top: 330, width: 330, transform: `scale(${widget})`, transformOrigin: "100% 100%", opacity: clamp(widget * 2) * (1 - tw(f, LEADS - 10, LEADS, 0, 1, E.linear)), borderRadius: "28px 28px 8px 28px", background: C.cream, color: C.ink, padding: "16px 20px", fontSize: 26, fontWeight: 650, lineHeight: 1.25, boxShadow: "0 20px 40px rgba(0,0,0,.35)" }}>
            Hi! Looking for anything in particular?
          </div>
        </>
      ) : null}
    </div>
  );
};

/** the stats row */
const Stat: React.FC<{ label: string; children: React.ReactNode; color: string; s: number; glow?: number }> = ({ label, children, color, s, glow = 0 }) => (
  <div style={{ position: "relative", flex: 1, height: 150, borderRadius: 28, background: "rgba(255,255,255,.06)", boxShadow: `inset 0 0 0 2px rgba(255,255,255,.1), 0 0 ${50 * glow}px ${color}55`, padding: "18px 22px", boxSizing: "border-box", transform: `translateY(${(1 - s) * 40}px)`, opacity: clamp(s * 2), fontFamily: FONT, overflow: "hidden" }}>
    <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.12em", color: "rgba(250,249,245,.65)", whiteSpace: "nowrap" }}>{label}</div>
    <div style={{ fontSize: 76, fontWeight: 850, letterSpacing: "-0.04em", color, lineHeight: 1.1, marginTop: 6 }}>{children}</div>
  </div>
);
const Stats: React.FC<{ f: number }> = ({ f }) => {
  const out = tw(f, HIT - 16, HIT - 4, 0, 1, E.expoIn);
  const on = f >= DROP;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 590, display: "flex", gap: 18, opacity: 1 - out }}>
      <Stat label="VISITORS THIS WEEK" color={C.cream} s={clamp(springAt(f, VIS - 2, 30, 14, 170))}>
        <Odometer value={500} from={0} at={VIS} dur={60} />
      </Stat>
      {on ? (
        <>
          <Stat label="ANSWERED" color={C.coralLight} s={clamp(springAt(f, ANSWER - 20, 30, 14, 170))} glow={keys(f, [[ANSWER, 0], [ANSWER + 6, 1], [ANSWER + 30, 0.3]], E.cubicInOut)}>
            <Odometer value={132} from={0} at={ANSWER - 12} dur={40} />
          </Stat>
          <Stat label="NEW LEADS" color="#FFD46E" s={clamp(springAt(f, LEADS - 6, 30, 14, 170))} glow={keys(f, [[LEADS, 0], [LEADS + 6, 1], [LEADS + 30, 0.3]], E.cubicInOut)}>
            <Odometer value={23} from={0} at={LEADS} dur={36} />
          </Stat>
        </>
      ) : (
        <>
          <Stat label="TALKED TO" color="#FF8A80" s={clamp(springAt(f, NONE - 4, 30, 12, 190))} glow={keys(f, [[NONE, 0], [NONE + 4, 1], [NONE + 20, 0]], E.cubicInOut)}>
            0
          </Stat>
          <Stat label="JUST LEFT" color="#FF8A80" s={clamp(springAt(f, LEFT - 4, 30, 14, 170))}>
            <Odometer value={487} from={0} at={LEFT - 2} dur={30} />
          </Stat>
        </>
      )}
    </div>
  );
};

/** the leads list at the bottom */
const LEADROWS: { p: FaceSpec; name: string; email: string; need: string }[] = [
  { p: PEOPLE.ines, name: "Inês Costa", email: "ines@…", need: "2-person tent, June trip" },
  { p: PEOPLE.marcus, name: "Marcus Reed", email: "marcus@…", need: "Boots, size 11" },
  { p: PEOPLE.wei, name: "Wei Chen", email: "wei@…", need: "Group order, 12 packs" },
];
const Leads: React.FC<{ f: number }> = ({ f }) => {
  if (f < LEADS - 12) return null;
  const s = clamp(springAt(f, LEADS - 10, 30, 14, 150));
  const out = tw(f, HIT - 16, HIT - 2, 0, 1, E.expoIn);
  return (
    <div style={{ position: "absolute", left: LIST.x, top: LIST.y, width: LIST.w, transform: `translateY(${(1 - s) * 400 + out * 700}px)`, opacity: clamp(s * 2) * (1 - out), borderRadius: 34, background: C.cream, color: C.ink, boxShadow: "0 40px 90px rgba(0,0,0,.5)", padding: "22px 26px", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Icon name="userPlus" size={34} color={C.coral} stroke={2.4} />
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", flex: 1 }}>Leads</div>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray }}>SAVED BY YOUR AGENT</div>
      </div>
      {LEADROWS.map((r, i) => {
        const at = FIELDS[0] + i * 12 - 6;
        const rs = clamp(springAt(f, at, 30, 14, 180));
        const ck = tw(f, FIELDS[3] + i * 4, FIELDS[3] + 10 + i * 4, 0, 1, E.cubicInOut);
        return (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 16, height: 96, borderTop: "2px solid #EEEBE3", marginTop: i ? 0 : 14, transform: `translateX(${(1 - rs) * 300}px)`, opacity: clamp(rs * 2) }}>
            <Face p={r.p} size={62} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 750 }}>
                {r.name} <span style={{ fontFamily: MONO, fontSize: 20, color: C.gray, fontWeight: 400 }}>· {r.email}</span>
              </div>
              <div style={{ fontSize: 26, color: C.gray, whiteSpace: "nowrap" }}>{r.need}</div>
            </div>
            <CheckDisc t={ck} size={44} bg={C.coral} fg={C.white} />
          </div>
        );
      })}
      <Sheen at={FIELDS[3] + 4} dur={22} opacity={0.6} />
    </div>
  );
};

const Headlines: React.FC = () => (
  <>
    <Kinetic from={T.VO.l01} to={T.VO.l02 - 8} color={C.cream} hi={C.coralLight} words={[
      { t: "500", at: w("l01", 0), hi: true },
      { t: "people", at: w("l01", 2) },
      { t: "visited", at: w("l01", 3), br: true },
      { t: "your", at: w("l01", 4) },
      { t: "website.", at: w("l01", 5) },
    ]} />
    <Kinetic from={T.VO.l02 - 1} to={T.VO.l03 - 8} color={C.cream} hi="#FF8A80" words={[
      { t: "You", at: w("l02", 0) },
      { t: "talked", at: w("l02", 1) },
      { t: "to", at: w("l02", 2), br: true },
      { t: "none", at: w("l02", 3), hi: true },
      { t: "of", at: w("l02", 4) },
      { t: "them.", at: w("l02", 5) },
    ]} />
    <Kinetic from={T.VO.l03 - 1} to={T.VO.l04 - 8} color={C.cream} hi="#FFD46E" words={[
      { t: "Some", at: w("l03", 0) },
      { t: "had", at: w("l03", 1) },
      { t: "questions.", at: w("l03", 3), br: true },
      { t: "Some", at: w("l03", 4) },
      { t: "were", at: w("l03", 5) },
      { t: "ready.", at: w("l03", 6), hi: true },
    ]} />
    <Kinetic from={T.VO.l04 - 1} to={DROP - 10} color={C.cream} hi="#FF8A80" words={[
      { t: "Most", at: w("l04", 0) },
      { t: "just", at: w("l04", 3), br: true },
      { t: "left.", at: w("l04", 4), hi: true },
    ]} />
    <Kinetic from={DROP - 2} to={T.VO.l06 - 8} color={C.cream} hi={C.coralLight} shineAt={VOICE + 6} shineHi="#FFFFFF" words={[
      { t: "Give", at: w("l05", 1) },
      { t: "your", at: w("l05", 2) },
      { t: "website", at: w("l05", 3), br: true },
      { t: "a", at: w("l05", 4) },
      { t: "voice.", at: w("l05", 5), hi: true },
    ]} />
    <Kinetic from={T.VO.l06 - 1} to={T.VO.l07 - 8} color={C.cream} hi={C.coralLight} words={[
      { t: "Every", at: w("l06", 0) },
      { t: "question,", at: w("l06", 4), br: true },
      { t: "answered.", at: w("l06", 7), hi: true },
    ]} />
    <Kinetic from={T.VO.l07 - 1} to={T.VO.l08 - 8} color={C.cream} hi="#FFD46E" words={[
      { t: "The", at: w("l07", 0) },
      { t: "ready", at: w("l07", 1) },
      { t: "ones", at: w("l07", 2), br: true },
      { t: "become", at: w("l07", 3) },
      { t: "leads.", at: w("l07", 4), hi: true },
    ]} />
    <Kinetic from={T.VO.l08 - 1} to={HIT - 14} size={110} color={C.cream} hi={C.coralLight} shineAt={MORE + 6} shineHi="#FFFFFF" words={[
      { t: "Same", at: w("l08", 0) },
      { t: "traffic.", at: w("l08", 1), br: true },
      { t: "More", at: w("l08", 2), hi: true },
      { t: "customers.", at: w("l08", 3), hi: true },
    ]} />
  </>
);

export const Visitors: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const lit = tw(f, DROP - 2, DROP + 20, 0, 1, E.expoOut);
  const day = tw(f, HIT - 1, HIT + 3, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: mixColor(BG, C.cream, day) }}>
      <AbsoluteFill style={{ opacity: 1 - day, background: `radial-gradient(ellipse 80% 50% at 50% 55%, rgba(217,87,89,${0.18 * lit}), rgba(217,87,89,0) 70%)` }} />
      <AbsoluteFill style={{ opacity: (1 - day) * 0.5, backgroundImage: "linear-gradient(rgba(255,255,255,.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.035) 2px, transparent 2px)", backgroundSize: "60px 60px" }} />
      <Particles f={f} />
      <Site f={f} />
      <Stats f={f} />
      <Leads f={f} />
      {f >= DROP ? <Impact x={WIDGET.x} y={WIDGET.y} at={VOICE} dark scale={0.7} /> : null}
      {f >= VOICE ? <Sparkles x={WIDGET.x - 90} y={WIDGET.y - 90} w={180} h={180} at={VOICE + 4} color={C.coralLight} size={40} seed={2} /> : null}
      {day < 1 ? <Headlines /> : null}
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/visitors/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  cue(2, "hum", 0, "the site hums"),
  cue(VIS, "data", -8, "visitors count up"),
  cue(NONE, "miss", -3, "talked to none"),
  cue(QMARK, "blip", -7, "questions appear"),
  cue(BUY, "ping", -8, "buyers appear"),
  cue(LEFT - 2, "sink", -4, "they leave"),
  cue(LEFT, "data", -10, "left counter"),
  cue(DROP, "riser", -4, "into the drop"),
  ...moments.hit(DROP, "the drop").map((c) => ({ ...c, trim: (c.trim ?? 0) - 3 })),
  cue(VOICE - 4, "pop", -2, "the voice appears"),
  cue(VOICE + 8, "receive", -4, "Hi! Looking for anything?"),
  cue(ANSWER - 12, "data", -8, "answered counter"),
  ...[0, 1, 2, 3].map((k) => cue(w("l06", 0) + k * 14, "check", -12, `answered ${k + 1}`)),
  cue(LEADS - 10, "whoosh", -6, "leads list rises"),
  ...FIELDS.map((a, k) => cue(a, "snap", -7, `lead field ${k + 1}`)),
  cue(FIELDS[3] + 4, "shimmer", -8, "saved"),
  cue(SAME, "whoosh", -9, "same traffic"),
  cue(MORE, "pop", -4, "more customers"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { VIS, NONE, LEFT, DROP, VOICE, ANSWER, LEADS, SAME, HIT, CTA, URL, DUR };

export const VISITORS: FilmDef = {
  id: "Visitors",
  slug: "visitors",
  title: "Visitors",
  component: Visitors,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/visitors/mix.wav",
};
