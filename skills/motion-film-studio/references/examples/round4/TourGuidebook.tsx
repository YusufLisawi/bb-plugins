import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon, IconName } from "../../kit/ui";
import { Face, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/tour-guidebook/vo/lines.json";
import words from "../../../../public/films/tour-guidebook/vo/words.json";

loadFonts();

/**
 * TOURISM · EDUCATIONAL: How does an AI agent know your hotel? (grounding)
 * World: one open travel guidebook with coloured tabs. Your documents (rooms,
 * rates, check-in rules, tours; files, links, website) fly into it and write its
 * pages. Signature: when a guest asks, the book flips to the right page and a
 * highlighter sweeps the exact line the answer comes from; when the answer isn't
 * in the book, the pages riffle, come up empty, and the agent asks the team.
 * "That's called grounding." No music: paper, pens, page flips.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const GUESS = w("l02", 2);
const GIVE = w("l02", 7);
const DOCS = [w("l03", 1), w("l03", 4), w("l03", 6), w("l03", 10)];
const SRC = [w("l03", 12), w("l03", 13), w("l03", 16)];
const READS = w("l04", 1);
const ASK1 = w("l05", 3);
const FINDS = w("l05", 6);
const RIGHT = w("l05", 9);
const ANSWERS = w("l05", 12);
const ASK2 = w("l06", 0) - 4;
const SAYS = w("l06", 5);
const TEAM = w("l06", 10);
const GROUND = w("l07", 2);
const VOICE = w("l07", 6);
const HIT = T.VO.l08 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l08", 2) + 4;
const URL = w("l08", T.nwords("l08") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l08") + 50);

const BG = "#EAF1F4";
const COVER = "#1F3C5B";
const PAPER = "#FFFCF4";
const TABS: { label: string; color: string; icon: IconName; lines: string[] }[] = [
  { label: "Rooms", color: C.coral, icon: "bed", lines: ["Deluxe · sea view · 2 adults", "Family suite · 4 guests", "Twin room · garden side"] },
  { label: "Rates", color: "#2F6FB5", icon: "card", lines: ["Low season · from 90", "High season · from 140", "Breakfast included"] },
  { label: "Rules", color: "#2E9C6A", icon: "file", lines: ["Check-in from 14:00", "Check-out until 11:00", "Pets: small dogs · 20/night"] },
  { label: "Tours", color: "#E59A2B", icon: "sun", lines: ["Sunrise boat · daily 06:00", "Old town walk · 10:00", "Pickup at the lobby"] },
];

const Lines: React.FC<{ n: number; draw: number; color?: string }> = ({ n, draw, color = "rgba(31,60,91,.13)" }) => (
  <>{Array.from({ length: n }, (_, i) => <div key={i} style={{ height: 14, borderRadius: 7, background: color, marginTop: 22, width: `${(70 + ((i * 37) % 28)) * clamp(draw * n - i)}%` }} />)}</>
);

/** a page's content: heading with icon + three entries (+ highlighter on one) */
const PageContent: React.FC<{ tab: number; draw: number; hl?: number; hlRow?: number }> = ({ tab, draw, hl = 0, hlRow = 2 }) => {
  const t = TABS[tab];
  return (
    <div style={{ padding: "40px 38px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: clamp(draw * 3) }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: t.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={t.icon} size={32} color="#FFF" stroke={2.3} /></div>
        <div style={{ fontSize: 40, fontWeight: 850, color: COVER, letterSpacing: "-0.02em" }}>{t.label === "Rules" ? "House rules" : t.label}</div>
      </div>
      {t.lines.map((l, i) => (
        <div key={l} style={{ position: "relative", marginTop: 26, fontSize: 27, fontWeight: 600, color: "#33465C", opacity: clamp(draw * 4 - 1 - i), whiteSpace: "nowrap" }}>
          {i === hlRow && hl > 0 ? <div style={{ position: "absolute", left: -8, top: 2, height: 38, width: `calc(${hl * 100}% + 16px)`, background: "rgba(255,214,64,.65)", borderRadius: 6, transform: "skewX(-6deg)" }} /> : null}
          <span style={{ position: "relative" }}>{l}</span>
        </div>
      ))}
      <Lines n={4} draw={clamp(draw * 2 - 1)} />
    </div>
  );
};

const Bubble: React.FC<{ at: number; me?: boolean; children: React.ReactNode; y: number; out?: number; face?: boolean }> = ({ at, me, children, y, out = 1e9, face }) => {
  const f = useCurrentFrame();
  const s = springAt(f, at - 4, 30, 12, 170) * (1 - tw(f, out, out + 8, 0, 1, E.expoIn));
  if (s <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, display: "flex", justifyContent: me ? "flex-start" : "flex-end", alignItems: "flex-end", gap: 16, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 40}px) scale(${mix(0.9, 1, clamp(s))})`, transformOrigin: me ? "0 100%" : "100% 100%" }}>
      {me && face ? <Face p={PEOPLE.lucia} size={86} /> : null}
      {!me ? <div style={{ order: 2, width: 86, height: 86, borderRadius: 26, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Mark height={48} color={C.cream} stroke={26} /></div> : null}
      <div style={{ maxWidth: 760, padding: "22px 28px", borderRadius: me ? "34px 34px 34px 10px" : "34px 34px 10px 34px", background: me ? "#FFFFFF" : "#DCF7E3", boxShadow: "0 14px 34px rgba(31,60,91,.12)", fontSize: 40, lineHeight: 1.25, color: C.ink }}>{children}</div>
    </div>
  );
};

export const TourGuidebook: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const book = springAt(f, GIVE - 8, 30, 13, 120);
  // which tab spread is open, and riffles
  const riffle = (a: number, n: number, d = 4) => (f >= a && f < a + n * d ? ((f - a) % d) / d : 0);
  const reading = riffle(READS - 2, 7, 4);
  const searching = riffle(ASK2 + 4, 6, 4);
  const shown = f < DOCS[0] - 4 ? -1 : f < READS - 2 ? Math.min(3, DOCS.filter((d) => f >= d - 4).length - 1) : f < FINDS ? 1 : f < ASK2 ? 2 : f < SAYS ? 3 : 2;
  const closeBook = tw(f, GROUND - 6, GROUND + 10, 0, 1, E.cubicInOut);
  const bookY = f < ASK1 - 6 ? 900 : mix(900, 960, tw(f, ASK1 - 6, ASK1 + 6, 0, 1, E.cubicInOut));
  const hk = f < GIVE - 4 ? "a" : f < READS - 6 ? "b" : f < ASK1 - 6 ? "c" : f < ASK2 - 4 ? "-" : f < GROUND - 6 ? "-" : "e";
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={170} size={80} width={980} align="center" color={COVER} hi={C.coral} words={ws} />;
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: BG }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(31,60,91,.08) 2px, transparent 2px)", backgroundSize: "38px 38px" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: "0.2em", color: "#5B7590", opacity: tw(f, 0, 10, 0, 1, E.linear) }}>AI, EXPLAINED · FOR HOTELS & TOURS</div>
        {hk === "a" ? headline("a", T.VO.l01, GIVE - 8, [{ t: "How", at: w("l01", 0) }, { t: "does", at: w("l01", 1) }, { t: "an AI agent", at: w("l01", 2), br: true }, { t: "know", at: w("l01", 5) }, { t: "your", at: w("l01", 6) }, { t: "hotel?", at: w("l01", 7), hi: true }]) : null}
        {hk === "b" ? headline("b", GIVE - 4, READS - 10, [{ t: "You give it", at: w("l02", 3) }, { t: "your guidebook.", at: GIVE, hi: true }]) : null}
        {hk === "c" ? headline("c", READS - 4, ASK1 - 10, [{ t: "It reads", at: READS }, { t: "every page.", at: w("l04", 2), hi: true }]) : null}
        {hk === "e" ? headline("e", GROUND - 4, HIT - 10, [{ t: "That's", at: w("l07", 0) }, { t: "called", at: w("l07", 1) }, { t: "grounding.", at: GROUND, hi: true, br: true }, { t: "Your knowledge,", at: w("l07", 3) }, { t: "its voice.", at: VOICE, hi: true }]) : null}

        {/* l01–l02: the guessing chatbot — a cloud of "?" that bursts on "guess" */}
        {f < GIVE + 4 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 700, height: 600, opacity: 1 - tw(f, GIVE - 8, GIVE, 0, 1, E.linear) }}>
            {Array.from({ length: 14 }, (_, i) => {
              const s = springAt(f, T.VO.l01 + i * 3, 30, 12, 140);
              const pop = tw(f, GUESS - 2, GUESS + 6, 0, 1, E.expoOut);
              const ang = (i / 14) * Math.PI * 2;
              const r = 180 + (i % 3) * 70 + pop * 260;
              return <div key={i} style={{ position: "absolute", left: 540 + Math.cos(ang) * r - 40, top: 280 + Math.sin(ang) * r * 0.75 - 50, fontSize: 90 + (i % 3) * 20, fontWeight: 900, color: i % 2 ? "#9BB0C4" : C.coral, opacity: clamp(s) * (1 - pop), transform: `rotate(${(i % 5) * 9 - 18}deg) scale(${clamp(s)})` }}>?</div>;
            })}
            <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontSize: 64, fontWeight: 850, color: COVER, opacity: tw(f, GUESS - 6, GUESS, 0, 1, E.linear) * (1 - tw(f, GIVE - 10, GIVE - 4, 0, 1, E.linear)), transform: `scale(${tw(f, GUESS - 6, GUESS + 4, 1.4, 1, E.expoOut)})` }}>It doesn't <span style={{ textDecoration: "line-through", textDecorationColor: C.coral, textDecorationThickness: 8 }}>guess</span>.</div>
          </div>
        ) : null}

        {/* the guidebook */}
        {book > 0.01 ? (
          <div style={{ position: "absolute", left: 510, top: bookY, width: 980, height: 640, transform: `translate(-50%, -50%) scale(${0.88 * mix(0.6, 1, clamp(book)) * mix(1, 0.85, closeBook)}) translateY(${(1 - clamp(book)) * 300}px)`, opacity: clamp(book * 2) }}>
            {closeBook < 0.98 ? (
              <div style={{ position: "relative", width: 980, height: 640, transformStyle: "preserve-3d", perspective: 2400 }}>
                {/* cover edge */}
                <div style={{ position: "absolute", inset: -16, borderRadius: 26, background: COVER, boxShadow: "0 40px 80px rgba(31,60,91,.35)" }} />
                {/* tabs */}
                {TABS.map((t, i) => (
                  <div key={t.label} style={{ position: "absolute", right: -64, top: 40 + i * 130, width: 80, height: 110, borderRadius: "0 18px 18px 0", background: t.color, opacity: tw(f, DOCS[i] - 2, DOCS[i] + 4, 0, 1, E.linear), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shown === i ? `0 0 0 4px #FFF, 0 0 24px ${t.color}` : "none" }}>
                    <div style={{ transform: "rotate(90deg)", fontSize: 22, fontWeight: 800, color: "#FFF", whiteSpace: "nowrap" }}>{t.label}</div>
                  </div>
                ))}
                {/* pages */}
                <div style={{ position: "absolute", left: 0, top: 0, width: 490, height: 640, background: PAPER, borderRadius: "18px 0 0 18px", boxShadow: "inset -24px 0 30px rgba(0,0,0,.06)" }}>
                  {shown >= 0 ? <PageContent tab={Math.max(0, shown - 1 < 0 ? 0 : (shown + 3) % 4)} draw={1} /> : <div style={{ padding: 40 }}><Lines n={8} draw={tw(f, GIVE, GIVE + 10, 0, 1, E.linear)} /></div>}
                </div>
                <div style={{ position: "absolute", left: 490, top: 0, width: 490, height: 640, background: PAPER, borderRadius: "0 18px 18px 0", boxShadow: "inset 24px 0 30px rgba(0,0,0,.06)" }}>
                  {shown >= 0 ? (
                    <PageContent key={shown} tab={shown} draw={f < READS - 2 ? tw(f, DOCS[shown] - 2, DOCS[shown] + 14, 0, 1, E.linear) : 1}
                      hl={shown === 2 && f >= RIGHT - 2 && f < ASK2 ? tw(f, RIGHT - 2, RIGHT + 10, 0, 1, E.cubicInOut) : 0} hlRow={2} />
                  ) : null}
                </div>
                {/* a riffling page */}
                {reading > 0 || searching > 0 ? (
                  <div style={{ position: "absolute", left: 490, top: 0, width: 490, height: 640, transformOrigin: "0 50%", transform: `rotateY(${-(reading || searching) * 180}deg)`, background: PAPER, borderRadius: "0 18px 18px 0", boxShadow: "0 0 30px rgba(0,0,0,.12)", backfaceVisibility: "visible" }}>
                    <div style={{ padding: 40 }}><Lines n={9} draw={1} /></div>
                  </div>
                ) : null}
                {/* the reading light */}
                {f >= READS - 2 && f < READS + 30 ? <div style={{ position: "absolute", left: 0, right: 0, top: mix(-20, 640, tw(f, READS - 2, READS + 28, 0, 1, E.linear)), height: 60, background: "linear-gradient(180deg, rgba(255,215,90,0), rgba(255,215,90,.45), rgba(255,215,90,0))" }} /> : null}
                {/* not found */}
                {f >= SAYS - 6 && f < GROUND - 6 ? (
                  <div style={{ position: "absolute", left: 490, top: 0, width: 490, height: 640, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,252,244,.85)", borderRadius: "0 18px 18px 0", opacity: tw(f, SAYS - 6, SAYS, 0, 1, E.linear) }}>
                    <div style={{ textAlign: "center" }}>
                      <Icon name="search" size={110} color="#9BB0C4" stroke={2} />
                      <div style={{ fontSize: 40, fontWeight: 850, color: COVER, marginTop: 18 }}>Not in the guidebook</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {closeBook > 0.02 ? (
              <div style={{ position: "absolute", left: 490 - 245, top: 0, width: 490, height: 640, borderRadius: 26, background: COVER, boxShadow: "0 40px 80px rgba(31,60,91,.35)", opacity: clamp(closeBook * 3), transform: `rotateY(${(1 - closeBook) * 70}deg)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
                <div style={{ width: 150, height: 150, borderRadius: 42, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={86} color={C.cream} stroke={24} /></div>
                <div style={{ fontSize: 46, fontWeight: 850, color: "#FFF", textAlign: "center", lineHeight: 1.1 }}>Your hotel,<br />the guidebook</div>
                <div style={{ position: "absolute", top: -10, right: 70, width: 44, height: 160, background: C.coral, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)" }} />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* l03: documents fly into the book, then files / links / website */}
        {f >= DOCS[0] - 8 && f < READS + 6
          ? TABS.map((t, i) => {
              const p = tw(f, DOCS[i] - 8, DOCS[i] + 2, 0, 1, E.cubicInOut);
              if (f < DOCS[i] - 8 || p >= 1) return null;
              const x0 = i % 2 ? 1150 : -300, y0 = 300 + i * 120;
              return (
                <div key={t.label} style={{ position: "absolute", left: mix(x0, 640, p), top: mix(y0, 820, p) - Math.sin(p * Math.PI) * 180, transform: `rotate(${mix(i % 2 ? 20 : -20, 0, p)}deg) scale(${mix(1, 0.4, p)})`, display: "flex", alignItems: "center", gap: 16, padding: "22px 30px", borderRadius: 24, background: "#FFF", boxShadow: "0 20px 40px rgba(31,60,91,.2)" }}>
                  <div style={{ width: 70, height: 70, borderRadius: 20, background: t.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={t.icon} size={40} color="#FFF" stroke={2.2} /></div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: COVER }}>{t.label === "Rules" ? "Check-in rules" : t.label === "Rooms" ? "Room types" : t.label}</div>
                </div>
              );
            })
          : null}
        {f >= SRC[0] - 4 && f < READS + 6 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1310, display: "flex", justifyContent: "center", gap: 20, opacity: 1 - tw(f, READS, READS + 6, 0, 1, E.linear) }}>
            {[["file", "Files"], ["link", "Links"], ["globe", "Your website"]].map(([ic, l], i) => {
              const s = tw(f, SRC[i] - 4, SRC[i] + 6, 0, 1, E.backOut);
              return <div key={l} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 26px", borderRadius: 999, background: "#FFF", boxShadow: "0 12px 30px rgba(31,60,91,.12)", fontSize: 34, fontWeight: 750, color: COVER, transform: `scale(${s})`, opacity: clamp(s * 2) }}><Icon name={ic as IconName} size={34} color={C.coral} stroke={2.3} />{l}</div>;
            })}
          </div>
        ) : null}

        {/* l05: a guest asks → the right page → the answer, with its source */}
        <Bubble at={ASK1} me face y={300} out={ASK2 - 10}>Hi! Can I bring my dog? 🐶</Bubble>
        <Bubble at={ANSWERS} y={1340} out={ASK2 - 10}>
          Yes! Small dogs are welcome, 20 per night.
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: "#FFF", fontSize: 24, fontWeight: 750, color: "#2E9C6A" }}><Icon name="book" size={24} color="#2E9C6A" stroke={2.3} /> From your guidebook · House rules</div>
        </Bubble>
        {f >= ANSWERS && f < ASK2 ? <Sparkles x={560} y={1300} w={420} h={260} at={ANSWERS + 2} color="#FFC861" size={36} seed={5} /> : null}

        {/* l06: not in the guidebook → ask the team */}
        <Bubble at={ASK2} me face y={300} out={GROUND - 10}>Is there a rooftop spa?</Bubble>
        <Bubble at={SAYS + 2} y={1340} out={GROUND - 10}>
          Good question! I don't have that yet, so I've asked the team. 🙏
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 14px 8px 8px", borderRadius: 12, background: "#FFF", fontSize: 24, fontWeight: 750, color: COVER, opacity: tw(f, TEAM - 2, TEAM + 6, 0, 1, E.linear) }}><Face p={PEOPLE.grace} size={36} /> Asked Grace · reception ✓</div>
        </Bubble>
        {f >= GROUND ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1380, display: "flex", justifyContent: "center", opacity: tw(f, GROUND + 4, GROUND + 12, 0, 1, E.linear) }}>
            <div style={{ padding: "18px 32px", borderRadius: 999, background: "#FFF", boxShadow: "0 14px 34px rgba(31,60,91,.12)", fontSize: 34, fontWeight: 750, color: COVER }}>Answers from your knowledge, never made up</div>
          </div>
        ) : null}
        {f >= GROUND ? <Sparkles x={200} y={600} w={680} h={700} at={GROUND + 2} color="#FFC861" size={44} seed={11} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/tour-guidebook/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...Array.from({ length: 5 }, (_, i) => cue(T.VO.l01 + i * 8, "pop", -12, `question mark ${i + 1}`)),
  cue(GUESS - 2, "scratch", -6, "doesn't guess"),
  cue(GIVE - 8, "whoosh", -8, "the guidebook rises"),
  cue(GIVE, "paper", -4, "book opens"),
  ...DOCS.map((d, i) => cue(d - 2, "paper", -7, `document ${i + 1} into the book`)),
  ...DOCS.map((d, i) => cue(d + 2, "draw", -12, `page ${i + 1} writes itself`)),
  ...SRC.map((d, i) => cue(d - 4, "pop", -9, `source ${i + 1}`)),
  ...Array.from({ length: 7 }, (_, i) => cue(READS - 2 + i * 4, "flip", -11, `page flip ${i + 1}`)),
  cue(READS - 2, "shimmer", -12, "reading light"),
  cue(ASK1 - 4, "receive", -5, "guest asks"),
  cue(FINDS, "flip", -6, "turns to the right page"),
  cue(RIGHT - 2, "draw", -6, "highlighter"),
  cue(ANSWERS - 4, "send", -5, "answer with its source"),
  cue(ANSWERS + 2, "spark", -9, "sparkles"),
  cue(ASK2 - 4, "receive", -5, "second question"),
  ...Array.from({ length: 6 }, (_, i) => cue(ASK2 + 4 + i * 4, "flip", -12, `search flip ${i + 1}`)),
  cue(SAYS - 6, "miss", -7, "not in the guidebook"),
  cue(SAYS + 2, "send", -6, "asks the team"),
  cue(TEAM - 2, "check", -6, "asked reception"),
  cue(GROUND - 6, "paper", -5, "book closes"),
  cue(GROUND, "chime", -5, "grounding"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { HIT, CTA, URL, DUR };

export const TOURGUIDEBOOK: FilmDef = { id: "TourGuidebook", slug: "tour-guidebook", title: "Tourism · Explained · The guidebook", component: TourGuidebook, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/tour-guidebook/mix.wav" };
