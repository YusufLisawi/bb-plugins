import React from "react";
import { useCurrentFrame } from "remotion";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Face, FaceSpec } from "../../kit/people";
import { Icon } from "../../kit/ui";
import { IOS } from "../../kit/screenrec";
import { TT_FONT } from "../../kit/tiktok";

/**
 * "1-star reviews that are secretly 5 stars": the shared pieces of the series.
 * A screen-recorded review page the narrator yaps over, a creator's marker
 * (highlighter swipes, hand-drawn circles, strikes), a dark-mode WhatsApp for
 * the "what actually happened" cutaway, and the signature move: the four empty
 * stars light up one per word as the narrator re-rates the review.
 * The reviews are written by us, so the card always carries a Dramatization tag.
 */
export const GOLD = "#F4B400";
export const MARKER = "#E5383B";
export const HILITE = "rgba(255, 214, 10, 0.62)";

export const NADIA: FaceSpec = { name: "Nadia", skin: "#C8906A", hair: "#23160F", style: "long", shirt: "#1C9A83", bg: "#DCF2EC" };
export const KARIM: FaceSpec = { name: "Karim", skin: "#B98160", hair: "#15100D", style: "short", beard: true, shirt: "#D4861C", bg: "#FAEBD4" };
export const SAMIRA: FaceSpec = { name: "Samira", skin: "#9C6446", hair: "#1A1210", style: "bun", glasses: true, shirt: "#5E6AD2", bg: "#E7E9FB" };
export const PAUL: FaceSpec = { name: "Paul", skin: "#F0C9A8", hair: "#7A5230", style: "short", shirt: "#2B86CC", bg: "#DCEDFA" };

/* ── camera: centre a page point at a scale, clamped so the page always fills the frame ── */
export type Cam = [frame: number, scale: number, x: number, y: number];
export const camAt = (f: number, keysArr: Cam[], W = 1080, H = 1920) => {
  let [, s, x, y] = keysArr[0];
  for (let i = 1; i < keysArr.length; i++) {
    const [k0, s0, x0, y0] = keysArr[i - 1];
    const [k1, s1, x1, y1] = keysArr[i];
    if (f >= k0) {
      const t = tw(f, k0, k1, 0, 1, k1 - k0 <= 10 ? E.expoOut : E.cubicInOut);
      s = mix(s0, s1, t); x = mix(x0, x1, t); y = mix(y0, y1, t);
    }
  }
  const hx = W / 2 / s, hy = H / 2 / s;
  x = clamp(x, hx, W - hx); y = clamp(y, hy, H - hy);
  return { transform: `translate(${W / 2 - x * s}px, ${H / 2 - y * s}px) scale(${s})`, transformOrigin: "0 0" } as React.CSSProperties;
};

/* ── stars ── */
const STAR_D = "M12 1.6 L14.95 8.1 L22 8.85 L16.7 13.6 L18.2 20.6 L12 17 L5.8 20.6 L7.3 13.6 L2 8.85 L9.05 8.1 Z";
export const Star: React.FC<{ size: number; on: number; big?: boolean }> = ({ size, on, big = false }) => {
  const f = useCurrentFrame();
  const lit = f >= on;
  const pop = on > -1e8 ? tw(f, on, on + 10, 0, 1, E.backOut) : 1;
  const s = lit ? mix(0.55, 1, pop) * (1 + 0.18 * Math.sin(clamp((f - on) / 12) * Math.PI)) : 1;
  const ring = on > -1e8 ? tw(f, on, on + 16, 0, 1, E.expoOut) : 1;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {lit && ring < 1 ? (
        <div style={{ position: "absolute", left: size / 2 - size * 0.9, top: size / 2 - size * 0.9, width: size * 1.8, height: size * 1.8, borderRadius: "50%", border: `${Math.max(2, size * 0.07) * (1 - ring)}px solid ${GOLD}`, transform: `scale(${mix(0.3, 1.25, ring)})`, opacity: 1 - ring }} />
      ) : null}
      {lit && big && f - on < 22
        ? Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + 0.4;
            const d = tw(f, on, on + 18, size * 0.45, size * 1.15, E.expoOut);
            const o = 1 - tw(f, on + 6, on + 20, 0, 1, E.linear);
            return <div key={i} style={{ position: "absolute", left: size / 2 + Math.cos(a) * d - 4, top: size / 2 + Math.sin(a) * d - 4, width: 8, height: 8, borderRadius: 4, background: i % 2 ? GOLD : "#FFE680", opacity: o }} />;
          })
        : null}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, transform: `scale(${s})`, overflow: "visible" }}>
        <path d={STAR_D} fill={lit ? GOLD : "#DDD9D0"} strokeLinejoin="round" stroke={lit ? GOLD : "#DDD9D0"} strokeWidth={1.2} />
      </svg>
    </div>
  );
};
export const Stars: React.FC<{ on: number[]; size: number; gap?: number; big?: boolean }> = ({ on, size, gap = 8, big }) => (
  <div style={{ display: "flex", gap }}>
    {on.map((o, i) => (
      <Star key={i} size={size} on={o} big={big} />
    ))}
  </div>
);

/* ── the creator's marker ── */
export type MarkKind = "circle" | "underline" | "strike" | "hilite";
const MARK_D: Record<Exclude<MarkKind, "hilite">, string> = {
  circle: "M 0.12 0.62 C 0.08 0.14, 0.88 0.02, 0.97 0.44 C 1.03 0.86, 0.22 1.02, 0.05 0.62 C -0.02 0.38, 0.28 0.16, 0.6 0.12",
  underline: "M 0 0.45 C 0.25 0.62, 0.65 0.3, 1 0.5",
  strike: "M 0 0.58 C 0.35 0.46, 0.7 0.56, 1 0.42",
};
const MARK_BOX: Record<Exclude<MarkKind, "hilite">, React.CSSProperties> = {
  circle: { left: "-14%", top: "-38%", width: "128%", height: "176%" },
  underline: { left: "-2%", top: "82%", width: "104%", height: "34%" },
  strike: { left: "-4%", top: "28%", width: "108%", height: "44%" },
};
export const Marker: React.FC<{ kind: Exclude<MarkKind, "hilite">; at: number; dur?: number; out?: number; width?: number; color?: string }> = ({ kind, at, dur = 9, out = 1e9, width = 7, color = MARKER }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const t = tw(f, at, at + dur, 0, 1, E.cubicInOut);
  const o = 1 - tw(f, out, out + 6, 0, 1, E.linear);
  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: "absolute", ...MARK_BOX[kind], overflow: "visible", opacity: o, pointerEvents: "none" }}>
      <path d={MARK_D[kind]} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
    </svg>
  );
};

/** A word or phrase that can be highlighted (swipe) and/or marked (circle, underline, strike). */
export type Mk = { kind: MarkKind; at: number; out?: number };
export const Marked: React.FC<{ marks?: Mk[]; children: React.ReactNode; style?: React.CSSProperties }> = ({ marks = [], children, style }) => {
  const f = useCurrentFrame();
  const hl = marks.find((m) => m.kind === "hilite");
  const p = hl ? tw(f, hl.at - 2, hl.at + 5, 0, 1, E.cubicInOut) * (1 - tw(f, hl.out ?? 1e9, (hl.out ?? 1e9) + 8, 0, 1, E.linear)) : 0;
  return (
    <span style={{ position: "relative", display: "inline", backgroundImage: `linear-gradient(${HILITE}, ${HILITE})`, backgroundRepeat: "no-repeat", backgroundPosition: "0 78%", backgroundSize: `${p * 100}% 62%`, borderRadius: 6, ...style }}>
      {children}
      {marks
        .filter((m) => m.kind !== "hilite")
        .map((m, i) => (
          <Marker key={i} kind={m.kind as Exclude<MarkKind, "hilite">} at={m.at} out={m.out} />
        ))}
    </span>
  );
};

/* ── the review page (a phone screen recording) ── */
export type Biz = { emoji: string; tint: string; name: string; kind: string; rating: React.ReactNode; count: string; bars: number[] };
export type RWord = { t: string; marks?: Mk[] };
export const ReviewPage: React.FC<{
  biz: Biz;
  who: FaceSpec;
  name: string;
  meta: string;
  when: string;
  stars: number[];
  text: RWord[];
  helpful: React.ReactNode;
  owner?: { at: number; text: string };
  next: { who: FaceSpec; name: string; text: string }[];
  /** how far the page is scrolled (px); the app bar stays put */
  scroll?: number;
}> = ({ biz, who, name, meta, when, stars, text, helpful, owner, next, scroll = 0 }) => {
  const f = useCurrentFrame();
  const own = owner ? tw(f, owner.at, owner.at + 10, 0, 1, E.expoOut) : 0;
  const nextTop = owner && own > 0 ? 1560 : 1470;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: "#FFFFFF", fontFamily: IOS, color: "#111", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 2800, transform: `translateY(${-scroll}px)` }}>
      {/* business summary */}
      <div style={{ position: "absolute", left: 44, right: 44, top: 262, display: "flex", gap: 30 }}>
        <div style={{ width: 136, height: 136, borderRadius: 34, background: biz.tint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 78, flexShrink: 0 }}>{biz.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.1, whiteSpace: "nowrap" }}>{biz.name}</div>
          <div style={{ fontSize: 31, color: "#6E6E73", marginTop: 6 }}>{biz.kind}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{biz.rating}</div>
            <Stars on={[-1e9, -1e9, -1e9, -1e9, -1e9]} size={34} gap={3} />
            <div style={{ fontSize: 30, color: "#6E6E73" }}>({biz.count})</div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 44, right: 44, top: 438, display: "flex", flexDirection: "column", gap: 9 }}>
        {biz.bars.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 20, fontSize: 22, color: "#8E8E93", textAlign: "right" }}>{5 - i}</div>
            <div style={{ flex: 1, height: 12, borderRadius: 6, background: "#EEECE8", overflow: "hidden" }}>
              <div style={{ width: `${b * 100}%`, height: "100%", borderRadius: 6, background: GOLD }} />
            </div>
          </div>
        ))}
      </div>
      {/* sort chips — the yapper sorted by lowest rating */}
      <div style={{ position: "absolute", left: 44, top: 606, display: "flex", gap: 14 }}>
        {["Most relevant", "Newest", "Lowest rating"].map((c, i) => (
          <div key={c} style={{ padding: "14px 26px", borderRadius: 999, fontSize: 29, fontWeight: 600, background: i === 2 ? "#111" : "#F2F1EE", color: i === 2 ? "#FFF" : "#333", whiteSpace: "nowrap" }}>
            {c}
            {i === 2 ? " ↓" : ""}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 698, height: 2, background: "#EEECE8" }} />
      {/* the review */}
      <div style={{ position: "absolute", left: 44, right: 44, top: 728 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, overflow: "hidden", flexShrink: 0 }}>
            <Face p={who} size={96} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 38, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 27, color: "#8E8E93", marginTop: 2 }}>{meta}</div>
          </div>
          <div style={{ alignSelf: "flex-start", marginTop: 4, padding: "7px 14px", borderRadius: 10, border: "2px solid #D9D6CF", fontFamily: MONO, fontSize: 21, letterSpacing: "0.08em", color: "#8E8E93" }}>DRAMATIZATION</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26 }}>
          <Stars on={stars} size={66} gap={10} big />
          <div style={{ fontSize: 29, color: "#8E8E93" }}>{when}</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 47, lineHeight: 1.38, letterSpacing: "-0.005em", color: "#1C1C1E" }}>
          {text.map((w, i) => (
            <React.Fragment key={i}>
              <Marked marks={w.marks}>{w.t}</Marked>
              {i < text.length - 1 ? " " : ""}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderRadius: 999, border: "2px solid #E3E1DC", fontSize: 29, fontWeight: 600 }}>
            <Icon name="thumbsUp" size={30} color="#333" stroke={2.2} /> Helpful · {helpful}
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 24px", borderRadius: 999, border: "2px solid #E3E1DC", fontSize: 29, fontWeight: 600 }}>Share</div>
        </div>
        {owner && own > 0 ? (
          <div style={{ marginTop: 26, padding: "22px 26px", borderRadius: 22, background: "#F4F3F0", opacity: own, transform: `translateY(${(1 - own) * 24}px)` }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#555" }}>Response from the owner</div>
            <div style={{ fontSize: 34, marginTop: 6, color: "#222" }}>{owner.text}</div>
          </div>
        ) : null}
      </div>
      {/* the next reviews, cut off by the screen (realism) */}
      {next.map((n, i) => (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: 0, right: 0, top: nextTop + i * 420, height: 2, background: "#EEECE8" }} />
          <div style={{ position: "absolute", left: 44, right: 44, top: nextTop + 30 + i * 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ width: 84, height: 84, borderRadius: 42, overflow: "hidden" }}>
                <Face p={n.who} size={84} />
              </div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{n.name}</div>
            </div>
            <div style={{ marginTop: 18 }}>
              <Stars on={[-1e9, -1e9, -1e9, -1e9, -1e9]} size={46} gap={6} />
            </div>
            <div style={{ marginTop: 14, fontSize: 40, lineHeight: 1.35, color: "#333" }}>{n.text}</div>
          </div>
        </React.Fragment>
      ))}
      </div>
      {/* app bar: fixed, the page scrolls under it */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 240, background: "#FFFFFF", zIndex: 5, boxShadow: scroll > 4 ? "0 2px 0 #EEECE8" : "none", display: "flex", alignItems: "center", padding: "120px 36px 0", boxSizing: "border-box", gap: 22 }}>
        <svg width={30} height={50} viewBox="0 0 12 20"><path d="M10 2 L 2 10 L 10 18" stroke="#111" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.01em" }}>Reviews</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 34, alignItems: "center" }}>
          <Icon name="search" size={42} color="#111" stroke={2.2} />
          <div style={{ fontSize: 44, lineHeight: 0.5, letterSpacing: 2 }}>···</div>
        </div>
      </div>
    </div>
  );
};

/** "4.9" rolling to "5.0" (or any a → b), odometer style. */
export const Roll: React.FC<{ a: string; b: string; at: number }> = ({ a, b, at }) => {
  const f = useCurrentFrame();
  const t = tw(f, at, at + 12, 0, 1, E.expoOut);
  return (
    <span style={{ display: "inline-block", position: "relative", height: "1.15em", overflow: "hidden", verticalAlign: "bottom" }}>
      <span style={{ display: "block", transform: `translateY(${-t * 100}%)` }}>{a}</span>
      <span style={{ display: "block", position: "absolute", top: "100%", left: 0, transform: `translateY(${-t * 100}%)`, color: t > 0.5 ? GOLD : "inherit" }}>{b}</span>
    </span>
  );
};

/* ── WhatsApp in dark mode (the 2 a.m. recreation) ── */
export const WN = { head: "#1F2C34", bg: "#0B141A", me: "#005C4B", them: "#202C33", text: "#E9EDEF", sub: "#8696A0", pill: "#182229" };
export const WaNight: React.FC<{ name: string; icon: React.ReactNode; sub?: string; scroll?: number; children: React.ReactNode }> = ({ name, icon, sub = "Business account", scroll = 0, children }) => (
  <div style={{ position: "absolute", inset: 0, background: WN.bg, fontFamily: IOS }}>
    <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(#FFFFFF 1.2px, transparent 1.3px)", backgroundSize: "34px 34px" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 250, bottom: 150, overflow: "hidden" }}>
      <div style={{ padding: "40px 36px 30px", display: "flex", flexDirection: "column", gap: 16, transform: `translateY(${-scroll}px)` }}>{children}</div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 250, background: WN.head }}>
      <div style={{ position: "absolute", left: 30, top: 150, display: "flex", alignItems: "center", gap: 18 }}>
        <svg width={30} height={50} viewBox="0 0 12 20"><path d="M10 2 L 2 10 L 10 18" stroke="#00A884" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden" }}>{icon}</div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 650, color: WN.text }}>{name}</div>
          <div style={{ fontSize: 26, color: WN.sub }}>{sub}</div>
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: WN.head, display: "flex", alignItems: "flex-start", padding: "22px 26px", gap: 18, boxSizing: "border-box" }}>
      <div style={{ flex: 1, height: 72, borderRadius: 36, background: "#2A3942" }} />
      <div style={{ width: 72, height: 72, borderRadius: 36, background: "#00A884", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="mic" size={36} color="#111B21" stroke={2.4} />
      </div>
    </div>
  </div>
);
export const NMsg: React.FC<{ at: number; me?: boolean; time: string; ai?: boolean; grow?: number; children: React.ReactNode; size?: number }> = ({ at, me, time, ai, grow = 0, children, size = 40 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = tw(f, at, at + 7, 0, 1, E.expoOut);
  const g = grow ? tw(f, at, at + grow, 0, 1, E.cubicInOut) : 1;
  return (
    <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 860, transform: `translateY(${(1 - s) * 22}px) scale(${mix(0.96, 1, s)})`, transformOrigin: me ? "100% 100%" : "0% 100%", opacity: s }}>
      <div style={{ padding: "14px 22px 10px", borderRadius: me ? "24px 24px 6px 24px" : "24px 24px 24px 6px", background: me ? WN.me : WN.them, fontSize: size, lineHeight: 1.3, color: WN.text, maxHeight: grow ? `${mix(1.4, 14, g)}em` : undefined, overflow: "hidden" }}>
        {ai ? <div style={{ fontSize: 24, fontWeight: 650, color: "#F28B8D", marginBottom: 4 }}>✨ AI assistant</div> : null}
        {children}
        <div style={{ fontSize: 22, color: me ? "#8FC7B9" : WN.sub, textAlign: "right", marginTop: 4 }}>
          {time}
          {me ? <span style={{ color: "#53BDEB", marginLeft: 8 }}>✓✓</span> : null}
        </div>
      </div>
    </div>
  );
};

/** A result card over the chat: the booking that actually happened. */
export const Booked: React.FC<{ at: number; x: number; y: number; title: string; meta: string; dark?: boolean; out?: number }> = ({ at, x, y, title, meta, dark = false, out = 1e9 }) => {
  const f = useCurrentFrame();
  if (f < at || f > out + 8) return null;
  const s = tw(f, at, at + 12, 0, 1, E.backOut) * (1 - tw(f, out, out + 8, 0, 1, E.expoIn));
  const chk = tw(f, at + 8, at + 16, 0, 1, E.expoOut);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 760, transform: `translate(-50%, -50%) scale(${mix(0.7, 1, s)}) rotate(${mix(-4, -1.5, s)}deg)`, opacity: clamp(s * 1.4), zIndex: 44, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "28px 32px", borderRadius: 30, background: dark ? "#16232B" : C.white, color: dark ? "#F2F4F5" : C.ink, boxShadow: "0 30px 70px rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,255,255,.08)" }}>
        <div style={{ width: 96, height: 96, borderRadius: 26, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="calendar" size={52} color="#FFF" stroke={2.3} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
          <div style={{ fontSize: 30, opacity: 0.7, marginTop: 4 }}>{meta}</div>
        </div>
        <div style={{ width: 70, height: 70, borderRadius: 35, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${chk})` }}>
          <Icon name="check" size={40} color="#FFF" stroke={3.2} />
        </div>
      </div>
    </div>
  );
};

/** TikTok-style counter sticker, e.g. a stopwatch "⏱ 0:20" or "attempt 3/6". */
export const CountSticker: React.FC<{ at: number; to: number; from?: number; until?: number; dur: number; x: number; y: number; fmt: (n: number) => string; done?: boolean; rot?: number; out?: number; size?: number }> = ({ at, to, from = 0, dur, x, y, fmt, rot = 0, out = 1e9, size = 58 }) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > out + 6) return null;
  const n = Math.round(tw(f, at, at + dur, from, to, E.linear));
  const s = tw(f, at, at + 6, 0.6, 1, E.backOut);
  const o = clamp((f - at + 1) / 3) * (1 - tw(f, out, out + 6, 0, 1, E.linear));
  const fin = f >= at + dur;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s * (fin ? 1 + 0.12 * Math.sin(clamp((f - at - dur) / 8) * Math.PI) : 1)})`, opacity: o, padding: `${size * 0.22}px ${size * 0.42}px`, borderRadius: size * 0.24, background: fin ? "#2E9C6A" : "#FFFFFF", color: fin ? "#FFFFFF" : "#161823", fontFamily: TT_FONT, fontSize: size, fontWeight: 800, whiteSpace: "nowrap", zIndex: 45, fontVariantNumeric: "tabular-nums" }}>
      {fmt(n)}
    </div>
  );
};

/** A TikTok text sticker that gets crossed out by the marker. */
export const StrikeSticker: React.FC<{ at: number; strikeAt: number; x: number; y: number; rot?: number; out?: number; size?: number; children: React.ReactNode }> = ({ at, strikeAt, x, y, rot = 0, out = 1e9, size = 54, children }) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > out + 6) return null;
  const s = tw(f, at, at + 6, 0.6, 1, E.backOut);
  const o = clamp((f - at + 1) / 3) * (1 - tw(f, out, out + 6, 0, 1, E.linear));
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`, opacity: o, zIndex: 45 }}>
      <div style={{ position: "relative", padding: `${size * 0.22}px ${size * 0.4}px`, borderRadius: size * 0.24, background: "#FFFFFF", color: "#161823", fontFamily: TT_FONT, fontSize: size, fontWeight: 800, whiteSpace: "nowrap" }}>
        {children}
        <Marker kind="strike" at={strikeAt} dur={7} width={9} />
      </div>
    </div>
  );
};

/** a hand-held jolt: a damped wobble (smooth, so the motion blur reads as one move, not flicker) */
export const shake = (f: number, at: number, amp = 10, dur = 10) => {
  const t = (f - at) / dur;
  if (f < at || t >= 1) return { x: 0, y: 0 };
  const k = (1 - t) * (1 - t);
  return { x: Math.sin((f - at) * 1.9) * amp * k, y: Math.sin((f - at) * 1.3) * amp * 0.6 * k }; // both start at 0: no jump on the first frame
};

// the light-mode WhatsApp chat moved to the kit (used by the case study and playbooks too)
export { AR, LMsg, WaDay } from "../../kit/chat";
