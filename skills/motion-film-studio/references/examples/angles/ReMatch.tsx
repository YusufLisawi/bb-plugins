import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { SystemCard } from "../../kit/systems";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/re-match/vo/lines.json";
import words from "../../../../public/films/re-match/vo/words.json";

loadFonts();

/**
 * ANGLE · Real estate: home hunting is basically dating. A dating-app parody —
 * homes have profiles ("Apartment, 34. Loves sunlight. Hates stairs."), buyers
 * swipe and get ghosted. The agency's agent plays matchmaker: her wish list,
 * a search of the agency's own listings, then the signature "It's a match!"
 * screen (her photo and the home's, hearts bursting). Awkward questions
 * answered, a first date (the viewing) booked, and a WhatsApp check-in so
 * nobody gets ghosted.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const DATING = w("l01", 4);
const OPTIONS = w("l02", 2);
const GHOST = w("l02", 7);
const DROP = w("l03", 0) - 2;
const MATCHMAKER = w("l03", 6);
const WISH = [w("l05", 1), w("l05", 3), w("l05", 5), w("l05", 10)];
const SEARCH = w("l06", 1);
const MATCH = w("l07", 3);
const THREE = w("l07", 4);
const PHOTOS = w("l08", 3);
const QS = [w("l08", 8), w("l08", 9), w("l08", 12)];
const DATE = w("l09", 3);
const SAT = w("l09", 5);
const QUIET = w("l10", 4);
const CHECKS = w("l10", 6);
const NOGHOST = w("l11", 0);
const HIT = T.VO.l12 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l12", 2) + 4;
const URL = w("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 50);

const SARA: FaceSpec = { name: "Sara", skin: "#E3B08A", hair: "#5A3522", style: "waves", shirt: "#2B86CC", bg: "#DCEDFA" };
const HOT = "linear-gradient(135deg, #FF5F6D 0%, #FF8A5C 55%, #FFC371 100%)";
const HOMES = [
  { name: "Apartment, 34", bio: "Loves sunlight. Hates stairs.", hue: ["#F6C9A0", "#E88E6D"] },
  { name: "Loft, 12", bio: "Industrial. Emotionally unavailable.", hue: ["#C9CED6", "#7D8794"] },
  { name: "Cottage, 81", bio: "Old soul. Needs work.", hue: ["#CFE8C9", "#86BF7C"] },
  { name: "Studio, 3", bio: "Small but ambitious.", hue: ["#F2D6F0", "#C58BC2"] },
];

const HomePic: React.FC<{ hue: string[]; w: number; h: number; r?: number; balcony?: boolean }> = ({ hue, w: W, h: H, r = 24, balcony }) => (
  <div style={{ position: "relative", width: W, height: H, borderRadius: r, overflow: "hidden", background: `linear-gradient(180deg, ${hue[0]} 0%, #FFF6EA 100%)` }}>
    <svg width={W} height={H} viewBox="0 0 100 80" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={68} width={100} height={12} fill="#9CCB8F" />
      <rect x={26} y={22} width={48} height={46} fill="#FFFDF8" />
      <path d="M22 24 L 50 8 L 78 24 Z" fill={hue[1]} />
      {[0, 1].map((r0) => [0, 1, 2].map((c0) => <rect key={`${r0}${c0}`} x={31 + c0 * 14} y={29 + r0 * 16} width={9} height={9} fill="#9EC3E6" />))}
      {balcony ? <rect x={29} y={42} width={42} height={3} fill={hue[1]} /> : null}
      <rect x={45} y={56} width={10} height={12} fill={hue[1]} />
    </svg>
  </div>
);

/* a home's dating profile */
const ProfileCard: React.FC<{ i: number; x?: number; y?: number; rot?: number; scale?: number; opacity?: number }> = ({ i, x = 140, y = 520, rot = 0, scale = 1, opacity = 1 }) => {
  const h = HOMES[i % HOMES.length];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 800, height: 1000, borderRadius: 48, background: C.white, boxShadow: "0 40px 90px rgba(120,40,40,.25)", overflow: "hidden", transform: `rotate(${rot}deg) scale(${scale})`, opacity, fontFamily: FONT }}>
      <HomePic hue={h.hue} w={800} h={760} r={0} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 360, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.72) 60%)" }} />
      <div style={{ position: "absolute", left: 44, bottom: 150, color: "#FFF" }}>
        <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: "-0.03em" }}>{h.name}</div>
        <div style={{ fontSize: 36, opacity: 0.9 }}>{h.bio}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", gap: 60 }}>
        {["✕", "♥"].map((t, k) => <div key={t} style={{ width: 96, height: 96, borderRadius: 48, background: C.white, color: k ? "#FF5F6D" : "#999", fontSize: 50, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(0,0,0,.2)" }}>{t}</div>)}
      </div>
    </div>
  );
};

export const ReMatch: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const act1 = f < DROP + 6;
  // act 1: swipe, swipe, swipe… then ghosted
  const swipes = [DATING - 10, OPTIONS - 6, OPTIONS + 2, OPTIONS + 8];
  const ghost = springAt(f, GHOST - 4, 30, 11, 170) * (1 - tw(f, DROP - 2, DROP + 6, 0, 1, E.linear));
  const cupid = springAt(f, DROP + 2, 30, 12, 170) * (1 - tw(f, SEARCH - 8, SEARCH, 0, 1, E.linear));
  const wish = springAt(f, T.VO.l04, 30, 13, 160) * (1 - tw(f, SEARCH - 8, SEARCH, 0, 1, E.linear));
  const match = springAt(f, MATCH - 3, 30, 11, 170) * (1 - tw(f, PHOTOS - 8, PHOTOS, 0, 1, E.expoIn));
  const chat = springAt(f, PHOTOS - 6, 30, 13, 160);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: "#FFF5F2" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {act1 ? (
          <>
            <div style={{ position: "absolute", inset: 0, background: HOT, opacity: 0.16 }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: "0.2em", color: "#FF5F6D" }}>♥ HOMEMATCH</div>
            {[3, 2, 1, 0].map((i) => {
              const t0 = swipes[i];
              const fl = tw(f, t0, t0 + 10, 0, 1, E.expoIn);
              if (fl >= 1) return null;
              const dir = i % 2 ? -1 : 1;
              return <ProfileCard key={i} i={i} rot={dir * fl * 22 + (i - 1.5) * 1.5} x={140 + dir * fl * 1100} y={520 + (3 - i) * 10} />;
            })}
            {f >= swipes[3] + 6 ? (
              <div style={{ position: "absolute", left: 90, right: 90, top: 640, opacity: tw(f, swipes[3] + 6, swipes[3] + 14, 0, 1, E.linear), fontFamily: FONT }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ alignSelf: "flex-end", padding: "22px 30px", borderRadius: "36px 36px 8px 36px", background: HOT, color: "#FFF", fontSize: 46, fontWeight: 700 }}>Is it still available? 🥺</div>
                  <div style={{ alignSelf: "flex-end", fontSize: 28, color: C.gray, fontFamily: MONO }}>SEEN · 3 DAYS AGO</div>
                </div>
              </div>
            ) : null}
            {ghost > 0.01 ? <div style={{ position: "absolute", left: 540, top: 1100, transform: `translate(-50%, 0) scale(${mix(0.4, 1, clamp(ghost))}) translateY(${Math.sin(f * 0.25) * 14}px)`, fontSize: 220, opacity: clamp(ghost * 2) }}>👻</div> : null}
            <Kinetic from={2} to={OPTIONS - 10} y={260} size={84} width={960} align="center" color={C.ink} hi="#FF5F6D" words={T.said("l01").map((x, i) => ({ ...x, hi: i === 4 }))} />
            <Kinetic from={OPTIONS - 6} to={DROP - 6} y={260} size={84} width={960} align="center" color={C.ink} hi="#FF5F6D" words={T.said("l02").map((x, i) => ({ ...x, hi: i === 7 }))} />
          </>
        ) : null}
        {/* the matchmaker */}
        {cupid > 0.01 ? (
          <div style={{ position: "absolute", left: 540, top: 260, transform: `translate(-50%, 0) scale(${mix(0.6, 1, clamp(cupid))})`, opacity: clamp(cupid * 2), display: "flex", alignItems: "center", gap: 20, padding: "22px 34px", borderRadius: 999, background: HOT, color: "#FFF", fontSize: 44, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 20px 50px rgba(255,95,109,.35)" }}>
            <Icon name="sparkles" size={46} color="#FFF" stroke={2.2} /> Your agent · matchmaker 💘
          </div>
        ) : null}
        {/* her wish list, as a dating profile */}
        {wish > 0.01 ? (
          <div style={{ position: "absolute", left: 110, width: 860, top: 520, opacity: clamp(wish * 2), transform: `translateY(${(1 - clamp(wish)) * 80}px)`, borderRadius: 48, background: C.white, boxShadow: "0 40px 90px rgba(120,40,40,.18)", padding: "44px 48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <Face p={SARA} size={150} />
              <div>
                <div style={{ fontSize: 60, fontWeight: 800, color: C.ink }}>Sara</div>
                <div style={{ fontSize: 30, color: C.gray }}>Looking for: her place</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 34 }}>
              {["🛏 2 bedrooms", "🌿 a balcony", "🏫 good schools nearby", "≤ 400k"].map((t, i) => {
                const c = springAt(f, WISH[i] - 2, 30, 11, 190);
                return <div key={t} style={{ padding: "16px 26px", borderRadius: 999, background: "#FFE9E6", color: "#C2364B", fontSize: 38, fontWeight: 750, transform: `scale(${mix(0.4, 1, clamp(c))})`, opacity: clamp(c * 2) }}>{t}</div>;
              })}
            </div>
          </div>
        ) : null}
        {/* the agent searches the agency's listings — plain words */}
        <SystemCard at={SEARCH - 6} doneAt={MATCH - 6} x={70} y={560} w={940} system={{ label: "Your listings", icon: "home", color: "#FF5F6D" }} doing="Searching your listings…" done="3 homes match" facts={["2 bd · balcony", "near 2 schools", "under 400k"]} out={MATCH - 4} />
        {/* IT'S A MATCH */}
        {match > 0.01 ? (
          <div style={{ position: "absolute", inset: 0, background: HOT, opacity: clamp(match * 2), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {Array.from({ length: 16 }, (_, k) => {
              const a = rnd(k * 3.3) * Math.PI * 2, d = mix(60, 520, tw(f, MATCH, MATCH + 30, 0, 1, E.expoOut)) * (0.6 + rnd(k) * 0.6);
              return <div key={k} style={{ position: "absolute", left: 540 + Math.cos(a) * d, top: 900 + Math.sin(a) * d, fontSize: 40 + rnd(k * 7) * 40, color: "#FFF", opacity: 1 - tw(f, MATCH + 20, MATCH + 40, 0, 1, E.linear) }}>♥</div>;
            })}
            <div style={{ fontSize: 150, fontWeight: 800, color: "#FFF", letterSpacing: "-0.05em", transform: `scale(${mix(0.5, 1, clamp(match))}) rotate(-4deg)`, fontStyle: "italic", textShadow: "0 10px 30px rgba(0,0,0,.2)" }}>It's a match!</div>
            <div style={{ display: "flex", gap: 40, marginTop: 50, alignItems: "center" }}>
              <div style={{ borderRadius: 999, border: "10px solid #FFF", overflow: "hidden" }}><Face p={SARA} size={260} /></div>
              <div style={{ fontSize: 90, color: "#FFF" }}>♥</div>
              <div style={{ borderRadius: 999, border: "10px solid #FFF", overflow: "hidden", width: 280, height: 280 }}><HomePic hue={HOMES[0].hue} w={280} h={280} r={0} balcony /></div>
            </div>
            <div style={{ marginTop: 40, padding: "16px 34px", borderRadius: 999, background: "rgba(255,255,255,.25)", color: "#FFF", fontSize: 44, fontWeight: 800, opacity: tw(f, THREE - 2, THREE + 6, 0, 1, E.linear) }}>× 3 matches</div>
          </div>
        ) : null}
        {/* the chat: photos, the awkward questions, a first date, no ghosting */}
        {chat > 0.01 ? (
          <div style={{ position: "absolute", left: 60, right: 60, top: 470, opacity: clamp(chat * 2), transform: `translateY(${(1 - clamp(chat)) * 100}px)`, borderRadius: 44, background: "#EFE7DE", boxShadow: "0 40px 90px rgba(23,23,23,.16)", padding: "26px 26px 34px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <ChannelBadge ch="whatsapp" size={56} />
              <div style={{ fontSize: 32, fontWeight: 800, color: C.ink }}>Parkside Homes</div>
              <div style={{ marginLeft: "auto", fontSize: 24, color: C.gray }}>AI agent</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ alignSelf: "flex-start", padding: 14, borderRadius: "28px 28px 28px 8px", background: C.white, display: "flex", gap: 10 }}>
                {[0, 2, 3].map((i, k) => <div key={i} style={{ transform: `scale(${tw(f, PHOTOS - 2 + k * 3, PHOTOS + 6 + k * 3, 0, 1, E.backOut)})` }}><HomePic hue={HOMES[i].hue} w={250} h={180} r={16} balcony /></div>)}
              </div>
              {[["Parking?", "✓ 1 space included"], ["Pets?", "✓ Allowed"], ["Monthly fees?", "$120 / month"]].map(([q, a], i) => {
                if (f < QS[i] - 6) return null;
                const t = tw(f, QS[i] - 6, QS[i] + 2, 0, 1, E.expoOut);
                return (
                  <div key={q} style={{ display: "flex", gap: 12, alignItems: "center", opacity: t }}>
                    <div style={{ padding: "14px 22px", borderRadius: 999, background: "#D9FDD3", fontSize: 32, fontWeight: 600 }}>{q}</div>
                    <div style={{ padding: "14px 22px", borderRadius: 999, background: C.white, fontSize: 32, fontWeight: 700 }}>{a}</div>
                  </div>
                );
              })}
              {f >= DATE - 4 ? (
                <div style={{ alignSelf: "center", marginTop: 10, display: "flex", alignItems: "center", gap: 20, padding: "22px 30px", borderRadius: 30, background: HOT, color: "#FFF", transform: `scale(${tw(f, DATE - 4, DATE + 6, 0.5, 1, E.backOut)})` }}>
                  <div style={{ fontSize: 60 }}>💘</div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em" }}>FIRST DATE · IN YOUR CALENDAR</div>
                    <div style={{ fontSize: 44, fontWeight: 800, opacity: tw(f, SAT - 2, SAT + 4, 0.3, 1, E.linear) }}>Saturday · 11:00 · Viewing</div>
                  </div>
                </div>
              ) : null}
              {f >= QUIET - 2 ? <div style={{ alignSelf: "flex-end", fontFamily: MONO, fontSize: 24, color: C.gray, opacity: tw(f, QUIET - 2, QUIET + 4, 0, 1, E.linear) }}>SEEN · 2 DAYS AGO {f < NOGHOST ? "👻" : ""}</div> : null}
              {f >= CHECKS - 4 ? (
                <div style={{ alignSelf: "flex-start", maxWidth: 820, padding: "18px 24px", borderRadius: "28px 28px 28px 8px", background: C.white, fontSize: 36, lineHeight: 1.3, opacity: tw(f, CHECKS - 4, CHECKS + 4, 0, 1, E.linear) }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1E9E5A" }}>↗ automatic check-in</div>
                  Hi Sara 👋 How did you feel about Elm Court? Want a second look on Sunday?
                </div>
              ) : null}
              {f >= NOGHOST + 4 ? <div style={{ alignSelf: "flex-end", padding: "16px 24px", borderRadius: "28px 28px 8px 28px", background: "#D9FDD3", fontSize: 36, opacity: tw(f, NOGHOST + 4, NOGHOST + 10, 0, 1, E.linear) }}>Yes!! Sunday works 🙌</div> : null}
            </div>
          </div>
        ) : null}
        {f >= PHOTOS - 6 && f < HIT - 4 ? (
          <Kinetic key={f < DATE - 6 ? "a" : f < QUIET - 6 ? "b" : "c"} from={f < DATE - 6 ? PHOTOS - 4 : f < QUIET - 6 ? DATE - 6 : QUIET - 6} to={f < DATE - 6 ? DATE - 10 : f < QUIET - 6 ? QUIET - 10 : HIT - 14} y={200} size={84} width={960} align="center" color={C.ink} hi="#FF5F6D"
            words={f < DATE - 6 ? [{ t: "The", at: w("l08", 5) }, { t: "awkward", at: w("l08", 6), hi: true }, { t: "questions", at: w("l08", 7) }] : f < QUIET - 6 ? [{ t: "A", at: w("l09", 2) }, { t: "first", at: DATE, hi: true }, { t: "date", at: w("l09", 4), hi: true }] : [{ t: "No", at: NOGHOST, hi: true }, { t: "ghosting.", at: w("l11", 1), hi: true }]} />
        ) : null}
        {f >= NOGHOST ? <Sparkles x={200} y={1300} w={680} h={200} at={NOGHOST} color="#FF5F6D" size={36} seed={3} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.035} /> : null}
      {audio ? <Audio src={staticFile("films/re-match/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...[w("l01", 4) - 10, OPTIONS - 6, OPTIONS + 2, OPTIONS + 8].map((t, i) => cue(t, "whoosh", -10, `swipe ${i + 1}`)),
  cue(OPTIONS + 14, "send", -7, "is it still available?"),
  cue(GHOST - 4, "miss", -6, "ghosted"),
  cue(DROP, "impact", -9, "the drop"),
  cue(DROP + 2, "shimmer", -8, "matchmaker"),
  ...WISH.map((t, i) => cue(t - 2, "pop", -9, `wish ${i + 1}`)),
  cue(SEARCH - 6, "blip", -8, "connecting to the listings"),
  cue(MATCH - 6, "check", -8, "3 match"),
  cue(MATCH - 3, "learn", -4, "it's a match"),
  cue(MATCH, "spark", -6, "hearts"),
  cue(PHOTOS - 2, "receive", -5, "photos"),
  ...QS.map((t, i) => cue(t - 6, "receive", -8, `answer ${i + 1}`)),
  cue(DATE - 4, "pop", -5, "first date"),
  cue(QUIET - 2, "miss", -10, "seen, quiet"),
  cue(CHECKS - 4, "send", -5, "automatic check-in"),
  cue(NOGHOST + 4, "receive", -5, "yes!!"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, MATCH, HIT, CTA, URL, DUR };

export const REMATCH: FilmDef = { id: "ReMatch", slug: "re-match", title: "Angle · Real estate · It's a match", component: ReMatch, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/re-match/mix.wav" };
