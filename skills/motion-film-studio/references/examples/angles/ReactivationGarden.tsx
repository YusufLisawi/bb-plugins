import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord, wrapLines } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/reactivation-garden/vo/lines.json";
import words from "../../../../public/films/reactivation-garden/vo/words.json";

loadFonts();

/**
 * ANGLE · Reactivation: the lead graveyard. Night, fog, a moon — three
 * tombstones rise with their epitaphs ("Maybe next month.", "Send me the
 * price.", "I'll think about it."), then the camera pulls back on rows of them:
 * hundreds of leads that went quiet. The drop is sunrise. A WhatsApp campaign
 * writes to each one by name about what they asked for, in working hours, a
 * few at a time — and every stone it reaches sprouts. Replies bloom into
 * flowers as the agent answers and books them in; the quiet ones get a gentle
 * follow-up two days later. From graveyard to garden.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const GRAVE = w("l01", 5);
const TRIO = [w("l02", 0), w("l03", 0), w("l04", 0)];
const PULL = w("l05", 0);
const QUIET = w("l05", 6);
const DROP = w("l06", 0) - 2;
const CAMPAIGN = w("l07", 1);
const BYNAME = w("l07", 8);
const ASKED = w("l07", 12);
const HOURS = w("l07", 17);
const FEW = w("l07", 20);
const REPLY = w("l08", 2);
const AGENT = w("l08", 5);
const ANSWERS = w("l08", 10);
const BOOKS = w("l08", 12);
const NOREPLY = w("l09", 0);
const GENTLE = w("l09", 3);
const TWODAYS = w("l09", 5);
const GARDEN = w("l10", 0);
const GARDEN_W = w("l10", 3);
const HIT = T.VO.l11 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l11", 2) + 4;
const URL = w("l11", T.nwords("l11") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l11") + 50);

/* the field: 8 rows × 9 stones, the trio is row 3, columns 3–5 */
const ROWS = 8;
const COLS = 9;
const SX = 350;
const SY = 460;
const SW = 300;
const SH = 390;
const EPI = ["Maybe later.", "Too pricey.", "Busy now.", "Next month.", "Send info.", "I'll call you.", "Let me check.", "Not now.", "Thinking…", "Ask my partner.", "After summer.", "Will confirm.", "Interesting…", "Next year.", "Sounds good!"];
const TRIO_EPI = ["Maybe next month.", "Send me the price.", "I'll think about it."];
type Stone = { r: number; c: number; x: number; y: number; epi: string; trio: number; rise: number; sprout: number; bloom: number; color: string };
const PETALS = [C.coral, "#F2B544", "#E27BA0", "#8E6BD8", "#FFFFFF", "#F28C38"];
const STONES: Stone[] = (() => {
  const out: Stone[] = [];
  let k = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const trio = r === 3 && c >= 3 && c <= 5 ? c - 3 : -1;
      const d = Math.hypot(c - 4, (r - 3) * 1.2);
      const order = rnd(k * 7.31 + 2);
      out.push({
        r, c,
        x: 540 + (c - 4) * SX,
        y: 960 + (r - 3) * SY,
        epi: trio >= 0 ? TRIO_EPI[trio] : EPI[k % EPI.length],
        trio,
        rise: trio >= 0 ? TRIO[trio] - 2 : PULL + 4 + d * 5 + order * 6,
        // the campaign reaches a few at a time
        sprout: FEW - 2 + Math.floor(order * 12) * 9,
        // some reply while the agent books them in, the rest bloom in the garden
        bloom: order < 0.22 ? REPLY + 4 + order * 480 : GARDEN - 2 + d * 3 + order * 8,
        color: PETALS[k % PETALS.length],
      });
      k++;
    }
  return out;
})();

const Flower: React.FC<{ g: number; color: string; size: number }> = ({ g, color, size }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 200 260" style={{ overflow: "visible" }}>
    <path d={`M100 260 L100 ${260 - 150 * clamp(g * 1.4)}`} stroke="#3E8E4E" strokeWidth={12} strokeLinecap="round" />
    <ellipse cx={72} cy={200} rx={30 * clamp(g * 1.6)} ry={12 * clamp(g * 1.6)} fill="#4FA35F" transform="rotate(-30 72 200)" />
    <ellipse cx={128} cy={180} rx={30 * clamp(g * 1.6 - 0.2)} ry={12 * clamp(g * 1.6 - 0.2)} fill="#4FA35F" transform="rotate(30 128 180)" />
    <g transform={`translate(100 ${260 - 150 * clamp(g * 1.4)}) scale(${clamp((g - 0.35) / 0.65)}) rotate(${g * 40})`}>
      {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={0} cy={-44} rx={30} ry={46} fill={color} transform={`rotate(${i * 60})`} stroke="rgba(0,0,0,.08)" strokeWidth={2} />)}
      <circle r={30} fill="#F2B544" stroke="#D99A2B" strokeWidth={4} />
    </g>
  </svg>
);

const StoneView: React.FC<{ s: Stone; night: number }> = ({ s, night }) => {
  const f = useCurrentFrame();
  const rise = tw(f, s.rise, s.rise + 12, 0, 1, E.quintOut);
  if (rise <= 0) return null;
  const sprout = tw(f, s.sprout, s.sprout + 10, 0, 1, E.backOut);
  const bloom = tw(f, s.bloom, s.bloom + 16, 0, 1, E.quintOut);
  const sink = tw(f, s.bloom, s.bloom + 12, 0, 1, E.cubicInOut);
  return (
    <div style={{ position: "absolute", left: s.x - SW / 2, top: s.y - SH / 2, width: SW, height: SH }}>
      {sink < 1 ? (
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(-200px -200px ${sink * 100}% -200px)`, transform: `translateY(${(1 - rise) * SH * 0.6 + sink * SH * 0.4}px)`, opacity: clamp(rise * 2) }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: `${SW / 2}px ${SW / 2}px 18px 18px`, background: mixColor("#C9CBD1", "#8C91A0", night), boxShadow: `inset -18px -10px 0 ${mixColor("#A9ACB4", "#666B79", night)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 26px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 40, letterSpacing: "0.2em", color: mixColor("#8A8D96", "#3E4250", night) }}>R.I.P.</div>
            <div style={{ marginTop: 14, fontSize: s.trio >= 0 ? 44 : 40, fontWeight: 750, fontStyle: "italic", lineHeight: 1.1, color: mixColor("#4B4F5A", "#1B1E27", night) }}>“{s.epi}”</div>
            <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 22, color: mixColor("#8A8D96", "#3E4250", night) }}>LAST SEEN: AGES AGO</div>
          </div>
          {sprout > 0 ? (
            <svg width={120} height={90} viewBox="0 0 120 90" style={{ position: "absolute", left: SW / 2 - 60, top: -70, overflow: "visible", transform: `scale(${sprout})`, transformOrigin: "60px 90px" }}>
              <path d="M60 90 L60 40" stroke="#3E8E4E" strokeWidth={9} strokeLinecap="round" />
              <ellipse cx={38} cy={40} rx={26} ry={13} fill="#5CB86B" transform="rotate(-25 38 40)" />
              <ellipse cx={82} cy={34} rx={26} ry={13} fill="#5CB86B" transform="rotate(25 82 34)" />
            </svg>
          ) : null}
        </div>
      ) : null}
      {bloom > 0 ? (
        <div style={{ position: "absolute", left: SW / 2 - 130, bottom: -10, transformOrigin: "50% 100%" }}>
          <Flower g={bloom} color={s.color} size={260} />
        </div>
      ) : null}
    </div>
  );
};

const SARA: FaceSpec = { ...PEOPLE.maya, name: "Sara" };
const OMAR: FaceSpec = PEOPLE.omar;
const NAMES = ["Omar", "Lina", "Tom", "Grace", "Sara"];

/** placeholder pill that fills in with the real value */
const Fill: React.FC<{ at: number; label: string; value: string; cycle?: string[] }> = ({ at, label, value, cycle }) => {
  const f = useCurrentFrame();
  const on = f >= at;
  const t = tw(f, at, at + 8, 0, 1, E.backOut);
  const shown = cycle && on ? cycle[Math.min(cycle.length - 1, Math.floor((f - at) / 5))] : value;
  return (
    <span style={{ display: "inline-block", padding: "0 14px", margin: "0 4px", borderRadius: 14, background: on ? "#FFE7A8" : "transparent", border: on ? "3px solid #F2B544" : "3px dashed #9DBF9B", color: on ? C.ink : "#6E8F6C", fontWeight: on ? 800 : 600, transform: `scale(${on ? t : 1})`, lineHeight: 1.3 }}>
      {on ? shown : label}
    </span>
  );
};

const Setting: React.FC<{ at: number; icon: "calendar" | "activity" | "send"; children: React.ReactNode }> = ({ at, icon, children }) => {
  const f = useCurrentFrame();
  const s = tw(f, at - 4, at + 6, 0, 1, E.backOut);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px 14px 14px", borderRadius: 20, background: "#F4F1EA", fontSize: 32, fontWeight: 750, color: C.ink, transform: `scale(${s})`, opacity: clamp(s * 2), transformOrigin: "0 50%" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={30} color="#FFF" stroke={2.4} /></div>
      {children}
    </div>
  );
};

const Card: React.FC<{ inAt: number; out: number; y: number; children: React.ReactNode }> = ({ inAt, out, y, children }) => {
  const f = useCurrentFrame();
  if (f < inAt - 2 || f > out + 12) return null;
  const s = springAt(f, inAt, 30, 14, 160) * (1 - tw(f, out, out + 10, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, borderRadius: 44, background: C.white, boxShadow: "0 40px 100px rgba(23,40,23,.25)", padding: "26px 30px 30px", opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 90}px) scale(${mix(0.93, 1, clamp(s))})`, transformOrigin: "50% 0", zIndex: 20 }}>
      {children}
    </div>
  );
};

const WaMsg: React.FC<{ at: number; me?: boolean; ai?: boolean; time: string; text: string; ticks?: "grey" | "blue" }> = ({ at, me, ai, time, text, ticks }) => {
  const f = useCurrentFrame();
  const g = tw(f, at - 4, at + 4, 0, 1, E.cubicInOut);
  if (g <= 0) return null;
  const h = 14 + (ai ? 28 : 0) + wrapLines(text, 38, 400, 756) * 48 + 30 + 12;
  return (
    <div style={{ flexShrink: 0, boxSizing: "border-box", alignSelf: me ? "flex-end" : "flex-start", maxWidth: 800, height: h * g, overflow: g < 1 ? "hidden" : "visible", marginTop: 14 * g, opacity: tw(f, at - 3, at + 3, 0, 1, E.linear), padding: "14px 22px 12px", borderRadius: me ? "28px 28px 8px 28px" : "28px 28px 28px 8px", background: me ? "#D9FDD3" : C.white, boxShadow: "0 2px 0 rgba(23,23,23,.07)", fontSize: 38, lineHeight: "48px", color: C.ink }}>
      {ai ? <div style={{ fontSize: 22, lineHeight: "28px", fontWeight: 700, color: C.coral }}>✨ AI assistant</div> : null}
      {text}
      <div style={{ textAlign: "right", fontSize: 20, lineHeight: "26px", color: C.gray, marginTop: 4 }}>{time}{ticks ? <span style={{ color: ticks === "blue" ? "#34B7F1" : C.gray2, marginLeft: 8, fontWeight: 800 }}>✓✓</span> : null}</div>
    </div>
  );
};

const Head: React.FC<{ p: FaceSpec; sub: string }> = ({ p, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
    <Face p={p} size={70} />
    <div>
      <div style={{ fontSize: 36, fontWeight: 800 }}>{p.name}</div>
      <div style={{ fontSize: 24, color: C.gray }}>{sub}</div>
    </div>
    <div style={{ marginLeft: "auto" }}><ChannelBadge ch="whatsapp" size={52} /></div>
  </div>
);

export const ReactivationGarden: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const night = 1 - tw(f, DROP - 2, DROP + 16, 0, 1, E.cubicInOut);
  // camera: world (camX, camY) sits at the centre of the frame
  const s = keys(f, [[PULL - 2, 1], [QUIET + 6, 0.3], [DROP - 2, 0.3], [DROP + 18, 0.26], [GARDEN - 6, 0.26], [GARDEN + 20, 0.335]], E.cubicInOut);
  const camY = keys(f, [[PULL - 2, 960], [QUIET + 6, 1190], [DROP - 2, 1190], [DROP + 18, -760], [GARDEN - 6, -760], [GARDEN + 20, 1030]], E.cubicInOut);
  const drift = Math.sin(f / 40) * 6;
  const headline = (k: string, from: number, to: number, ws: KWord[], color = C.ink, hi = C.green) => (
    <Kinetic key={k} from={from} to={to} y={120} size={74} width={980} align="center" color={color} hi={hi} words={ws} />
  );
  const cur = f < PULL - 4 ? "a" : f < DROP - 2 ? "b" : f < REPLY - 8 ? "c" : f < NOREPLY - 6 ? "d" : f < GARDEN - 6 ? "e" : "f";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: mixColor("#9FD08E", "#141B26", night) }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {/* lawn texture + light */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 120px, rgba(0,0,0,0) 120px 240px)", opacity: 1 - night }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% -5%, rgba(255,236,170,${0.75 * (1 - night)}) 0%, rgba(255,236,170,0) 55%)` }} />
        <div style={{ position: "absolute", right: 80, top: 330, width: 110, height: 110, borderRadius: 55, background: "#F1EEDD", boxShadow: "0 0 80px 20px rgba(241,238,221,.35)", opacity: night * tw(f, 0, 10, 0, 1, E.linear), transform: `translateY(${(1 - night) * -300}px)` }} />
        {/* the field */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: `translate(540px, 960px) scale(${s}) translate(${-540}px, ${-camY}px)` }}>
          {STONES.map((st, i) => <StoneView key={i} s={st} night={night} />)}
        </div>
        {/* fog */}
        {night > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: night * 0.9, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -200 + drift * 4, right: -200, top: 1250, height: 700, background: "radial-gradient(ellipse at 50% 50%, rgba(200,210,230,.28) 0%, rgba(200,210,230,0) 65%)" }} />
            <div style={{ position: "absolute", left: -300 - drift * 5, right: -100, top: 1500, height: 600, background: "radial-gradient(ellipse at 40% 50%, rgba(200,210,230,.22) 0%, rgba(200,210,230,0) 60%)" }} />
            <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 240px 60px rgba(0,0,0,.7)" }} />
          </div>
        ) : null}

        {/* headlines */}
        {cur === "a" ? headline("a", T.VO.l01, PULL - 10, [{ t: "Every", at: w("l01", 0) }, { t: "business", at: w("l01", 1) }, { t: "has one.", at: w("l01", 2), br: true }, { t: "A graveyard.", at: GRAVE, hi: true }], "#E8E6F0", "#B9C2FF") : null}
        {cur === "b" ? headline("b", PULL - 2, DROP - 8, [{ t: "Hundreds", at: PULL, hi: true }, { t: "of leads", at: w("l05", 1), br: true }, { t: "that just", at: w("l05", 3) }, { t: "went quiet.", at: w("l05", 5), hi: true }], "#E8E6F0", "#B9C2FF") : null}
        {cur === "c" ? headline("c", DROP + 2, REPLY - 14, [{ t: "Brainfast", at: DROP + 4 }, { t: "brings", at: w("l06", 1) }, { t: "them back.", at: w("l06", 2), hi: true }]) : null}
        {cur === "d" ? headline("d", REPLY - 6, NOREPLY - 12, [{ t: "They reply.", at: REPLY }, { t: "Your agent", at: AGENT, br: true }, { t: "books them in.", at: BOOKS, hi: true }]) : null}
        {cur === "e" ? headline("e", NOREPLY - 4, GARDEN - 12, [{ t: "No reply?", at: NOREPLY }, { t: "A gentle", at: GENTLE, br: true }, { t: "follow-up.", at: w("l09", 4), hi: true }]) : null}
        {cur === "f" ? headline("f", GARDEN - 4, HIT - 10, [{ t: "From", at: GARDEN }, { t: "graveyard", at: w("l10", 1) }, { t: "to", at: w("l10", 2), br: true }, { t: "garden.", at: GARDEN_W, hi: true }], C.ink, C.coral) : null}

        {/* the campaign */}
        <Card inAt={CAMPAIGN - 4} out={REPLY - 10} y={400}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ChannelBadge ch="whatsapp" size={60} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.gray }}>WHATSAPP CAMPAIGN</div>
              <div style={{ fontSize: 40, fontWeight: 800 }}>Bring them back 🌱</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: C.greenTint, color: C.green, fontSize: 26, fontWeight: 800 }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: C.green, opacity: f >= FEW ? 0.4 + 0.6 * Math.abs(Math.sin(f / 6)) : 1 }} /> {f >= FEW ? "Sending" : "Ready"}
            </div>
          </div>
          <div style={{ marginTop: 22, boxSizing: "border-box", minHeight: 232, padding: "20px 24px", borderRadius: "28px 28px 8px 28px", background: "#D9FDD3", fontSize: 40, lineHeight: "60px", color: C.ink }}>
            Hi <Fill at={BYNAME - 2} label="name" value="Sara" cycle={NAMES} /> 👋 You asked us about <Fill at={ASKED} label="what they asked" value="a quote" /> in March. Still interested? Happy to help 🙂
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 22 }}>
            <Setting at={HOURS} icon="calendar">Working hours only</Setting>
            <Setting at={FEW} icon="activity">A few at a time</Setting>
          </div>
        </Card>

        {/* a reply → the agent books them in */}
        <Card inAt={REPLY - 6} out={NOREPLY - 10} y={380}>
          <Head p={SARA} sub="replied just now" />
          <div style={{ display: "flex", flexDirection: "column", borderRadius: 28, background: "#EFE7DE", padding: "10px 18px 18px", marginTop: 10 }}>
            <WaMsg at={REPLY - 6} me time="Tue 10:02" ticks="blue" text="Hi Sara 👋 You asked us about a quote in March…" />
            <WaMsg at={REPLY} time="10:17" text="Oh yes! Still need it. Can someone come Saturday?" />
            <WaMsg at={ANSWERS - 2} me ai time="10:17" ticks="blue" text="Of course, Sara 🙂 Saturday at 11 works. You're booked!" />
          </div>
        </Card>
        <SystemCard at={BOOKS - 6} doneAt={BOOKS + 6} x={70} y={1180} w={940} scale={0.95} system={{ label: "Your calendar", icon: "calendar", color: "#2B86CC" }} doing="Booking Sara in…" done="Booked · Saturday 11:00" facts={["Sara", "Back from the graveyard ✓"]} out={NOREPLY - 10} />

        {/* no reply → a gentle follow-up two days later */}
        <Card inAt={NOREPLY - 4} out={GARDEN - 8} y={380}>
          <Head p={OMAR} sub="last seen: ages ago" />
          <div style={{ display: "flex", flexDirection: "column", borderRadius: 28, background: "#EFE7DE", padding: "10px 18px 18px", marginTop: 10 }}>
            <WaMsg at={NOREPLY - 4} me time="Mon 10:14" ticks="grey" text="Hi Omar 👋 You asked us about a quote in March…" />
            {f >= NOREPLY - 2 ? (
              <div style={{ flexShrink: 0, position: "relative", height: 62 * tw(f, NOREPLY - 2, NOREPLY + 6, 0, 1, E.cubicInOut), overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 16, textAlign: "center", fontSize: 30, lineHeight: "44px", color: C.gray, opacity: tw(f, NOREPLY + 2, NOREPLY + 8, 0, 1, E.linear) * (1 - tw(f, GENTLE - 8, GENTLE - 3, 0, 1, E.linear)) }}>no reply… 🦗</div>
                <div style={{ position: "absolute", left: 0, right: 0, top: 16, display: "flex", justifyContent: "center", opacity: tw(f, GENTLE - 6, GENTLE, 0, 1, E.linear) }}>
                  <div style={{ padding: "0 20px", lineHeight: "44px", borderRadius: 12, background: f >= TWODAYS - 2 ? "#FFE7A8" : "#E1F2FB", fontSize: 26, fontWeight: 800, color: C.ink, transform: `scale(${tw(f, TWODAYS - 2, TWODAYS + 6, 1.2, 1, E.quintOut)})` }}>⏱ 2 days later · Wed</div>
                </div>
              </div>
            ) : null}
            <WaMsg at={GENTLE} me time="Wed 10:05" ticks="blue" text="Just checking in, Omar 🙂 Any questions about the quote?" />
            <WaMsg at={w("l09", 7) + 2} time="10:21" text="Yes please! Can you send it again? 🙌" />
          </div>
        </Card>
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.03 + 0.06 * night} /> : null}
      {audio ? <Audio src={staticFile("films/reactivation-garden/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

const firstBlooms = STONES.filter((s) => s.bloom < GARDEN - 4).map((s) => s.bloom).sort((a, b) => a - b);
export const SOUND: Cue[] = [
  cue(0, "night", -10, "night ambience"),
  cue(GRAVE - 2, "impact", -12, "a graveyard"),
  ...TRIO.map((t, i) => cue(t - 2, "sink", -6, `stone ${i + 1} rises`)),
  cue(PULL - 2, "zoom", -8, "pull back on hundreds"),
  cue(PULL + 8, "flurry", -12, "rows rising"),
  cue(DROP - 2, "swell", -4, "sunrise"),
  cue(DROP + 4, "birds", -10, "morning"),
  cue(CAMPAIGN - 4, "whoosh", -9, "campaign card"),
  cue(BYNAME - 2, "type", -10, "by name"),
  cue(ASKED - 1, "pop", -7, "what they asked"),
  cue(HOURS - 4, "pop", -8, "working hours"),
  cue(FEW - 4, "pop", -8, "a few at a time"),
  ...[0, 1, 2, 3, 4, 5].map((i) => cue(FEW - 2 + i * 18, "tick", -12, `batch ${i + 1} sprouts`)),
  cue(REPLY - 3, "receive", -4, "Sara replies"),
  cue(ANSWERS - 5, "send", -7, "the agent answers"),
  cue(BOOKS - 6, "blip", -8, "calendar"),
  cue(BOOKS + 6, "check", -5, "booked"),
  ...firstBlooms.filter((_, i) => i % 3 === 0).map((b, i) => cue(b, "spark", -14, `bloom ${i + 1}`)),
  cue(NOREPLY - 4, "whoosh", -10, "Omar"),
  cue(NOREPLY + 2, "miss", -10, "no reply"),
  cue(GENTLE - 3, "send", -6, "gentle follow-up"),
  cue(TWODAYS - 2, "clock", -8, "2 days later"),
  cue(w("l09", 7) - 1, "receive", -5, "Omar replies"),
  cue(GARDEN - 4, "shimmer", -6, "garden"),
  cue(GARDEN + 4, "flurry", -8, "everything blooms"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const REACTIVATIONGARDEN: FilmDef = { id: "ReactivationGarden", slug: "reactivation-garden", title: "Angle · Reactivation · From graveyard to garden", component: ReactivationGarden, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/reactivation-garden/mix.wav" };
