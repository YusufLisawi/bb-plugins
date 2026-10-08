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
import { Icon, Phone, PHONE } from "../../kit/ui";
import { Face, FaceSpec } from "../../kit/people";
import { LMsg, WaDay } from "../../kit/chat";
import { ToolCall } from "../../kit/agentic";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/niche-real-estate/vo/lines.json";
import words from "../../../../public/films/niche-real-estate/vo/words.json";

loadFonts();

/**
 * NICHE · Real estate. World: the city map at night. The buyer's 11 PM message
 * becomes three criteria; the agent calls the agency's own listings tool and
 * the signature move plays out on the map — a sweep filters every listing pin
 * by budget, bedrooms and distance to the park until three light up and rise
 * as cards. Then the WhatsApp side: photos, qualifying questions, a viewing
 * booked in the calendar, the lead saved, and the automatic follow-up.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

/* beats */
const DM = w("l01", 3) - 6;
const CRIT = [w("l02", 1), w("l02", 4), w("l02", 8)]; // bedrooms · park · 400k
const DROP = w("l03", 0) - 2;
const CONNECT = w("l04", 1);
const SEARCH = w("l04", 6);
const LIVE = w("l04", 8);
const MATCH = w("l05", 0);
const PHOTOS = w("l06", 1);
const ASKS = w("l06", 5);
const CASH = w("l06", 15);
const TUE = w("l07", 0);
const BOOKS = w("l08", 1);
const CAL = w("l08", 6);
const SAVES = w("l08", 8);
const QUIET = w("l09", 4);
const DAYS = w("l10", 0);
const FOLLOW = w("l10", 4);
const AUTO = w("l10", 8);
const MONDAY = w("l11", 2);
const VIEWINGS = w("l11", 6);
const INBOX = w("l11", 9);
const HIT = T.VO.l12 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l12", 2) + 4;
const URL = w("l12", T.nwords("l12") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l12") + 50);
const S1 = PHOTOS - 12; // map → chat
const S2 = MONDAY - 6; // chat → the week

const SARA: FaceSpec = { name: "Sara", skin: "#E3B08A", hair: "#5A3522", style: "waves", shirt: "#2B86CC", bg: "#DCEDFA" };

/* ── the map ── */
const PARK = { x: 170, y: 760, w: 380, h: 300 };
const PC = { x: PARK.x + PARK.w / 2, y: PARK.y + PARK.h / 2 };
type Pin = { x: number; y: number; price: number; beds: number; match?: number };
const MATCHES: Pin[] = [
  { x: 640, y: 800, price: 385, beds: 2, match: 0 },
  { x: 640, y: 1040, price: 372, beds: 2, match: 1 },
  { x: 250, y: 1150, price: 398, beds: 2, match: 2 },
];
const PINS: Pin[] = [
  ...MATCHES,
  ...Array.from({ length: 44 }, (_, i) => {
    let x = 80 + rnd(i * 7.1) * 920, y = 560 + rnd(i * 3.7 + 1) * 980;
    if (x > PARK.x - 30 && x < PARK.x + PARK.w + 30 && y > PARK.y - 30 && y < PARK.y + PARK.h + 30) x = (x + 520) % 960 + 60;
    const price = Math.round(220 + rnd(i * 5.3 + 2) * 480);
    const beds = 1 + Math.floor(rnd(i * 9.1 + 3) * 4);
    // keep the three real matches unique: anything else that would pass all three filters gets 3 bedrooms
    const near = Math.hypot(x - PC.x, y - PC.y) < 430;
    return { x, y, price, beds: near && price <= 400 && beds === 2 ? 3 : beds };
  }),
];
const LISTING = [
  { name: "12 Park Lane", price: "385k", hue: ["#F6C9A0", "#E88E6D"] },
  { name: "4 Elm Court", price: "372k", hue: ["#BFD8F2", "#7AA7D9"] },
  { name: "8 Garden Row", price: "398k", hue: ["#CFE8C9", "#86BF7C"] },
];

/** a flat illustration of a home, as a listing photo */
const HomePic: React.FC<{ hue: string[]; w: number; h: number; r?: number }> = ({ hue, w: W, h: H, r = 18 }) => (
  <div style={{ position: "relative", width: W, height: H, borderRadius: r, overflow: "hidden", background: `linear-gradient(180deg, ${hue[0]} 0%, #FFF6EA 100%)` }}>
    <svg width={W} height={H} viewBox="0 0 100 70" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={58} width={100} height={12} fill="#9CCB8F" />
      <circle cx={84} cy={48} r={9} fill="#6FAE62" />
      <rect x={83} y={52} width={2} height={8} fill="#6B4A2E" />
      <path d="M22 34 L44 18 L66 34 Z" fill={hue[1]} />
      <rect x={26} y={34} width={36} height={24} fill="#FFFDF8" />
      <rect x={31} y={39} width={8} height={7} fill="#9EC3E6" />
      <rect x={49} y={39} width={8} height={7} fill="#9EC3E6" />
      <rect x={40} y={46} width={8} height={12} fill={hue[1]} />
    </svg>
  </div>
);

const MapScene: React.FC<{ f: number }> = ({ f }) => {
  // filter stages: budget → bedrooms → near the park
  const st1 = SEARCH + 2, st2 = SEARCH + 9, st3 = LIVE - 2;
  const sweep = tw(f, SEARCH - 4, LIVE + 6, 0, 1, E.cubicInOut);
  const lit = tw(f, CONNECT, CONNECT + 10, 0, 1, E.expoOut);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0E1A2B" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {/* streets */}
        {Array.from({ length: 16 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={480 + i * 72 + (i % 3) * 6} x2={1080} y2={470 + i * 72 - (i % 2) * 10} stroke="rgba(255,255,255,.07)" strokeWidth={i % 4 === 0 ? 10 : 4} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 92} y1={420} x2={60 + i * 92 - (i % 3) * 14} y2={1920} stroke="rgba(255,255,255,.07)" strokeWidth={i % 3 === 0 ? 10 : 4} />
        ))}
        <path d="M 0 1400 C 260 1340, 420 1520, 700 1460 S 1000 1380, 1080 1420 L 1080 1500 C 980 1470, 820 1560, 680 1545 S 300 1440, 0 1490 Z" fill="#12314F" />
        {/* the park */}
        <rect x={PARK.x} y={PARK.y} width={PARK.w} height={PARK.h} rx={60} fill="#173D2F" stroke="#2F6B50" strokeWidth={4} />
        {Array.from({ length: 22 }, (_, i) => (
          <circle key={i} cx={PARK.x + 40 + rnd(i * 2.3) * (PARK.w - 80)} cy={PARK.y + 40 + rnd(i * 4.1) * (PARK.h - 80)} r={10 + rnd(i) * 10} fill="#2F6B50" opacity={0.8} />
        ))}
        <text x={PC.x} y={PC.y + 8} textAnchor="middle" fontFamily={MONO} fontSize={24} fill="#7FBF9A" letterSpacing={3}>PARK</text>
        {/* the sweep, from the park out */}
        {sweep > 0 && sweep < 1 ? <circle cx={PC.x} cy={PC.y} r={mix(60, 1500, sweep)} fill="none" stroke={C.coral} strokeWidth={6} opacity={0.6 * (1 - sweep)} /> : null}
        {f >= st3 ? <circle cx={PC.x} cy={PC.y} r={430} fill="rgba(217,87,89,.06)" stroke="rgba(217,87,89,.35)" strokeWidth={3} strokeDasharray="10 12" opacity={tw(f, st3, st3 + 8, 0, 1, E.linear)} /> : null}
      </svg>
      {PINS.map((p, i) => {
        const out1 = p.price > 400 ? tw(f, st1, st1 + 6, 0, 1, E.linear) : 0;
        const out2 = p.beds !== 2 ? tw(f, st2, st2 + 6, 0, 1, E.linear) : 0;
        const out3 = Math.hypot(p.x - PC.x, p.y - PC.y) > 430 ? tw(f, st3, st3 + 6, 0, 1, E.linear) : 0;
        const o = mix(0.35, 1, lit) * (1 - 0.85 * Math.max(out1, out2, out3));
        const win = p.match !== undefined ? springAt(f, MATCH + p.match * 3, 30, 11, 180) : 0;
        const col = p.match !== undefined && f >= MATCH - 2 ? C.coral : "#F2EDE4";
        return (
          <div key={i} style={{ position: "absolute", left: p.x - 16, top: p.y - 16, width: 32, height: 32, borderRadius: 16, background: col, opacity: o, transform: `scale(${1 + 0.6 * clamp(win)})`, boxShadow: p.match !== undefined && f >= MATCH ? `0 0 0 ${8 * clamp(win)}px rgba(217,87,89,.25), 0 0 30px rgba(217,87,89,.6)` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="home" size={18} color={p.match !== undefined && f >= MATCH - 2 ? "#FFF" : "#0E1A2B"} stroke={2.4} />
          </div>
        );
      })}
      {/* three matches rise as listing cards */}
      {MATCHES.map((p, i) => {
        const s = springAt(f, MATCH + 2 + i * 3, 30, 12, 170);
        if (s <= 0.001) return null;
        const cx = 70 + i * 320, cy = 1560;
        return (
          <React.Fragment key={i}>
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <line x1={p.x} y1={p.y} x2={cx + 150} y2={cy} stroke="rgba(217,87,89,.6)" strokeWidth={3} strokeDasharray="6 8" opacity={clamp(s)} />
            </svg>
            <div style={{ position: "absolute", left: cx, top: cy, width: 300, transform: `translateY(${(1 - clamp(s)) * 80}px) scale(${mix(0.8, 1, clamp(s))})`, opacity: clamp(s * 2), borderRadius: 24, background: C.white, boxShadow: "0 20px 50px rgba(0,0,0,.45)", padding: 12, fontFamily: FONT, color: C.ink }}>
              <HomePic hue={LISTING[i].hue} w={276} h={150} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 30, fontWeight: 800 }}>
                <span>{LISTING[i].price}</span>
                <span style={{ fontSize: 24, fontWeight: 600, color: C.gray }}>2 bd</span>
              </div>
              <div style={{ fontSize: 22, color: C.gray, marginTop: 2 }}>{LISTING[i].name} · 🌳 {3 + i * 2} min</div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* the buyer's message and her three criteria (over the map) */
const Brief: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, DM, 30, 12, 170);
  const up = tw(f, CONNECT - 6, CONNECT + 8, 0, 1, E.expoInOut);
  if (s <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 170, transform: `translateY(${(1 - clamp(s)) * -60 - up * 420}px)`, opacity: clamp(s * 2) * (1 - up), fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, color: "#AFC0D6", fontFamily: MONO, fontSize: 24, letterSpacing: "0.1em" }}>
        <span style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(255,255,255,.08)" }}>SUN · 11:04 PM</span> NEW MESSAGE
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <div style={{ width: 84, height: 84, borderRadius: 42, overflow: "hidden", flexShrink: 0 }}>
          <Face p={SARA} size={84} />
        </div>
        <div style={{ padding: "22px 28px", borderRadius: "8px 32px 32px 32px", background: "#FFFFFF", fontSize: 44, fontWeight: 650, color: C.ink, lineHeight: 1.25 }}>Hi! 2 bedrooms near a park, under 400k? 🙏</div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 22, marginLeft: 102 }}>
        {["🛏 2 bedrooms", "🌳 near a park", "≤ 400k"].map((t, i) => {
          const c = springAt(f, CRIT[i], 30, 11, 190);
          return (
            <div key={t} style={{ padding: "12px 22px", borderRadius: 999, background: C.coral, color: C.white, fontSize: 32, fontWeight: 750, transform: `scale(${mix(0.4, 1, clamp(c))})`, opacity: clamp(c * 2) }}>{t}</div>
          );
        })}
      </div>
    </div>
  );
};

/* ── the conversation (WhatsApp) + what the agent does around it ── */
const PH = { x: 540, top: 470, s: 1.26 };
const ChatScene: React.FC<{ f: number }> = ({ f }) => {
  const rise = springAt(f, S1, 30, 14, 120);
  const screenW = PHONE.w - PHONE.inset * 2;
  const k = screenW / 1080;
  const innerH = (PHONE.h - PHONE.inset * 2) / k;
  const cal = springAt(f, CAL - 2, 30, 12, 170) * (1 - tw(f, QUIET - 4, QUIET + 6, 0, 1, E.expoIn));
  const lead = springAt(f, SAVES - 2, 30, 12, 170) * (1 - tw(f, QUIET - 4, QUIET + 6, 0, 1, E.expoIn));
  const auto = springAt(f, AUTO - 4, 30, 12, 180);
  return (
    <>
      <div style={{ position: "absolute", left: PH.x - (PHONE.w * PH.s) / 2, top: PH.top, transform: `translateY(${(1 - clamp(rise)) * 1400}px) scale(${PH.s})`, transformOrigin: "0 0" }}>
        <Phone screenBg="#EFE7DE">
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: innerH, transform: `scale(${k})`, transformOrigin: "0 0" }}>
            <WaDay name="Parkside Homes" sub="Business account" icon={<div style={{ width: 80, height: 80, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="home" size={46} color={C.coral} stroke={2.4} /></div>} bottom={innerH * 0.8}>
              <LMsg at={S1 - 30} me time="23:04" size={46}>Hi! 2 bedrooms near a park, under 400k? 🙏</LMsg>
              <LMsg at={PHOTOS - 2} ai time="23:04" size={44}>
                <div style={{ marginBottom: 10 }}>3 homes match 🏡</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {LISTING.map((l, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <HomePic hue={l.hue} w={250} h={190} r={14} />
                      <div style={{ position: "absolute", left: 10, bottom: 8, padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,.55)", color: "#FFF", fontSize: 24, fontWeight: 700 }}>{l.price}</div>
                    </div>
                  ))}
                </div>
              </LMsg>
              <LMsg at={ASKS - 2} ai time="23:05" size={44}>Lovely! When do you want to move, what's your budget, and mortgage or cash?</LMsg>
              <LMsg at={CASH + 6} me time="23:06" size={44}>June · around 380k · mortgage, pre-approved ✓</LMsg>
              <LMsg at={TUE - 4} ai time="23:06" size={44}>Can you do a viewing at 12 Park Lane on Tuesday at 6 PM?</LMsg>
              <LMsg at={TUE + 16} me time="23:07" size={44}>Perfect 👍</LMsg>
              <LMsg at={BOOKS} ai time="23:07" size={44}>Booked ✅ Tue 18:00 · 12 Park Lane. See you there!</LMsg>
              {f >= DAYS - 8 ? (
                <div style={{ alignSelf: "center", margin: "20px 0 4px", padding: "10px 22px", borderRadius: 14, background: "#E1F2FB", fontSize: 30, color: "#555", opacity: tw(f, DAYS - 8, DAYS - 2, 0, 1, E.linear) }}>Thursday · 2 days later</div>
              ) : null}
              <LMsg at={FOLLOW - 2} ai time="10:00" size={44}>Hi Sara 👋 Still thinking about Park Lane? I can hold Thursday 6 PM for a second look.</LMsg>
              <LMsg at={AUTO + 14} me time="10:02" size={44}>Yes please! 🙌</LMsg>
            </WaDay>
          </div>
        </Phone>
      </div>
      {/* calendar: the viewing lands */}
      {cal > 0.01 ? (
        <div style={{ position: "absolute", right: 40, top: 900, width: 470, transform: `translateX(${(1 - clamp(cal)) * 300}px) rotate(2deg)`, opacity: clamp(cal * 2), borderRadius: 28, background: C.white, boxShadow: "0 30px 70px rgba(23,23,23,.25)", overflow: "hidden", fontFamily: FONT, zIndex: 20 }}>
          <div style={{ padding: "14px 22px", background: "#1A73E8", color: "#FFF", fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}><Icon name="calendar" size={28} color="#FFF" stroke={2.3} /> Google Calendar</div>
          <div style={{ padding: "18px 22px" }}>
            <div style={{ fontFamily: MONO, fontSize: 22, color: C.gray }}>TUESDAY</div>
            <div style={{ marginTop: 8, padding: "14px 16px", borderRadius: 14, background: "#E8F0FE", borderLeft: "8px solid #1A73E8" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.ink }}>18:00 · Viewing</div>
              <div style={{ fontSize: 24, color: C.gray }}>12 Park Lane · Sara K.</div>
            </div>
          </div>
        </div>
      ) : null}
      {/* the lead, saved with everything she said */}
      {lead > 0.01 ? (
        <div style={{ position: "absolute", left: 40, top: 1260, width: 520, transform: `translateX(${(1 - clamp(lead)) * -300}px) rotate(-2deg)`, opacity: clamp(lead * 2), borderRadius: 28, background: C.ink, color: C.cream, boxShadow: "0 30px 70px rgba(23,23,23,.35)", padding: "22px 26px", fontFamily: FONT, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Face p={SARA} size={64} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em", color: "#B9B4AA" }}>LEAD SAVED</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>Sara K.</div>
            </div>
            <div style={{ padding: "6px 14px", borderRadius: 999, background: C.coral, fontSize: 22, fontWeight: 800 }}>🔥 HOT</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {["2 bd · near a park", "≤ 400k", "move: June", "mortgage ✓", "viewing Tue 18:00"].map((t) => (
              <div key={t} style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(255,255,255,.1)", fontSize: 22 }}>{t}</div>
            ))}
          </div>
        </div>
      ) : null}
      {/* the follow-up is automatic */}
      {auto > 0.01 && f < S2 ? (
        <div style={{ position: "absolute", left: 540, top: 1180, transform: `translate(-50%, -50%) scale(${mix(0.5, 1, clamp(auto))}) rotate(-3deg)`, opacity: clamp(auto * 2), padding: "18px 30px", borderRadius: 999, background: "#25D366", color: "#FFF", fontSize: 38, fontWeight: 800, boxShadow: "0 20px 50px rgba(37,211,102,.4)", zIndex: 22, whiteSpace: "nowrap" }}>
          ↗ Automatic follow-up
        </div>
      ) : null}
    </>
  );
};

/* the week: viewings, not an inbox */
const WeekScene: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, S2, 30, 13, 150);
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const blocks: [number, number, string][] = [[0, 0, "10:00"], [1, 2, "18:00"], [2, 1, "12:30"], [3, 3, "18:00"], [4, 0, "09:30"], [0, 2, "17:00"], [3, 1, "11:00"]];
  const inbox = springAt(f, INBOX - 4, 30, 12, 180);
  return (
    <>
      <div style={{ position: "absolute", left: 60, right: 60, top: 520, transform: `translateY(${(1 - clamp(s)) * 120}px)`, opacity: clamp(s * 2), borderRadius: 36, background: C.white, boxShadow: "0 40px 90px rgba(23,23,23,.14)", padding: "30px 30px 36px", fontFamily: FONT }}>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.coral }}>THIS WEEK · VIEWINGS</div>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          {days.map((d, di) => (
            <div key={d} style={{ flex: 1 }}>
              <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 22, color: C.gray }}>{d}</div>
              <div style={{ marginTop: 10, height: 560, borderRadius: 18, background: "#F6F4EF", position: "relative" }}>
                {blocks.filter((b) => b[0] === di).map((b, bi) => {
                  const at = VIEWINGS - 10 + blocks.indexOf(b) * 3;
                  const t = springAt(f, at, 30, 12, 190);
                  return (
                    <div key={bi} style={{ position: "absolute", left: 6, right: 6, top: 20 + b[1] * 130, height: 110, borderRadius: 14, background: C.coral, color: "#FFF", padding: "10px 10px", transform: `scale(${mix(0.4, 1, clamp(t))})`, opacity: clamp(t * 2), boxSizing: "border-box" }}>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{b[2]}</div>
                      <div style={{ fontSize: 18, opacity: 0.85 }}>Viewing</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 540, top: 1330, transform: `translate(-50%, 0) scale(${mix(0.5, 1, clamp(inbox))})`, opacity: clamp(inbox * 2), display: "flex", alignItems: "center", gap: 14, padding: "18px 30px", borderRadius: 999, background: C.ink, color: C.cream, fontSize: 36, fontWeight: 750, whiteSpace: "nowrap" }}>
        <Icon name="mail" size={36} color={C.cream} stroke={2.2} /> Inbox · 0 unread
      </div>
      {f >= VIEWINGS + 10 ? <Sparkles x={120} y={540} w={840} h={120} at={VIEWINGS + 10} color={C.coral} size={36} seed={8} /> : null}
    </>
  );
};

const BEATLINES: { at: number; to: number; words: string[]; hi: number[] }[] = [
  { at: PHOTOS, to: ASKS - 6, words: ["Sends", "the", "photos"], hi: [2] },
  { at: ASKS, to: TUE - 8, words: ["Asks", "what", "matters"], hi: [2] },
  { at: TUE, to: SAVES - 6, words: ["Books", "the", "viewing"], hi: [2] },
  { at: SAVES, to: QUIET - 8, words: ["Saves", "the", "lead"], hi: [2] },
  { at: QUIET, to: S2 - 10, words: ["Follows", "up.", "Automatically."], hi: [2] },
];

export const NicheRealEstate: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const mapOut = tw(f, S1 - 6, S1 + 10, 0, 1, E.expoInOut);
  const chatOut = tw(f, S2 - 8, S2 + 6, 0, 1, E.expoInOut);
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const beat = BEATLINES.find((b) => f >= b.at - 4 && f <= b.to + 8);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      {f < S1 + 12 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - mapOut, transform: `scale(${mix(1, 1.08, mapOut)})` }}>
          <MapScene f={f} />
          {/* first frame: the clock, before the message lands */}
          {f < DM + 8 ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontFamily: FONT, color: "#F4F1EA", opacity: 1 - tw(f, DM - 2, DM + 6, 0, 1, E.linear), transform: `scale(${mix(1.06, 1, tw(f, 0, 30, 0, 1, E.expoOut))})` }}>
              <div style={{ fontFamily: MONO, fontSize: 36, letterSpacing: "0.2em", color: "#AFC0D6" }}>SUNDAY</div>
              <div style={{ fontSize: 190, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>11:04<span style={{ fontSize: 90, marginLeft: 16 }}>PM</span></div>
            </div>
          ) : null}
          <Brief f={f} />
          <ToolCall at={CONNECT - 2} resultAt={LIVE + 4} x={70} y={170} w={940} tool="listings.search" args={[["bedrooms", "2"], ["near", "a park"], ["max_price", "400,000"]]} result="214 listings searched · 3 match" out={S1 - 10} />
        </div>
      ) : null}
      {f >= S1 - 6 && f < S2 + 8 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - chatOut, transform: `translateY(${-chatOut * 200}px)` }}>
          <ChatScene f={f} />
        </div>
      ) : null}
      {f >= S1 - 6 && f < S2 && beat ? <Kinetic key={beat.at} from={beat.at} to={beat.to} y={200} size={84} width={960} align="center" color={C.ink} hi={C.coral} words={beat.words.map((t, i) => ({ t, at: beat.at + i * 3, hi: beat.hi.includes(i) }))} /> : null}
      {f >= S2 - 6 && f < HIT + 4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
          <Kinetic from={S2} to={HIT - 14} y={220} size={92} width={960} align="center" color={C.ink} hi={C.coral} words={[{ t: "Viewings,", at: VIEWINGS - 4, hi: true }, { t: "not", at: w("l11", 7) }, { t: "an", at: w("l11", 8) }, { t: "inbox.", at: INBOX }]} />
          <WeekScene f={f} />
        </div>
      ) : null}
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/niche-real-estate/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(DM, "notif", -4, "the buyer's message, Sunday 11 PM"),
  ...CRIT.map((c, i) => cue(c, "pop", -8, `criterion ${i + 1}`)),
  cue(DROP, "impact", -9, "the drop"),
  cue(CONNECT - 2, "data", -10, "tool call: listings.search"),
  cue(SEARCH - 4, "zoom", -10, "the sweep"),
  cue(SEARCH + 2, "tick", -12, "filter: budget"),
  cue(SEARCH + 9, "tick", -12, "filter: bedrooms"),
  cue(LIVE - 2, "tick", -12, "filter: near the park"),
  cue(LIVE + 4, "check", -7, "3 match"),
  ...[0, 1, 2].map((i) => cue(MATCH + 2 + i * 3, "pop", -7, `listing ${i + 1} rises`)),
  cue(S1, "whoosh", -8, "to the chat"),
  cue(PHOTOS - 2, "receive", -4, "photos sent"),
  cue(ASKS - 2, "receive", -5, "what matters"),
  cue(CASH + 6, "send", -6, "her answers"),
  cue(TUE - 4, "receive", -5, "Tuesday at six?"),
  cue(TUE + 16, "send", -6, "perfect"),
  cue(BOOKS, "receive", -5, "booked"),
  cue(CAL - 2, "snap", -5, "calendar card"),
  cue(CAL + 6, "check", -7, "in the calendar"),
  cue(SAVES - 2, "snap", -6, "lead card"),
  cue(QUIET, "whoosh", -12, "two days pass"),
  cue(FOLLOW - 2, "send", -4, "the follow-up goes out"),
  cue(AUTO - 4, "pop", -6, "automatic"),
  cue(AUTO + 14, "receive", -6, "yes please"),
  cue(S2, "whoosh", -9, "the week"),
  cue(VIEWINGS - 10, "data", -12, "viewings fill the week"),
  cue(INBOX - 4, "check", -7, "0 unread"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, S1, S2, HIT, CTA, URL, DUR };

export const NICHEREALESTATE: FilmDef = { id: "NicheRealEstate", slug: "niche-real-estate", title: "Niche · Real estate", component: NicheRealEstate, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/niche-real-estate/mix.wav" };
