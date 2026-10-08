import { SANS } from "../theme";
import React from "react";
import { useCurrentFrame } from "remotion";
import { E, clamp, tw } from "../lib/ease";
import { Face, FaceSpec } from "./people";

/**
 * TikTok-native overlays, measured from a real "reply to comment" video.
 *  - <ReplySticker>: the white "Reply to <name>'s comment" card TikTok burns in
 *    when you answer a comment with a video. It sits still for the whole video.
 *  - <AutoCaption>: TikTok's auto-caption look (white bold, dark outline).
 * Font: TikTok Sans (OFL, github.com/tiktok/TikTokSans), loaded in fonts.ts.
 */
export const TT_FONT = `"TikTok Sans", "${SANS}", system-ui, sans-serif`;
export const TT_INK = "#161823";

export const ReplySticker: React.FC<{
  name: string;
  text: string;
  avatar?: FaceSpec;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
}> = ({ name, text, avatar, x = 94, y = 252, w = 590, size = 43 }) => {
  const s = size / 43;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, fontFamily: TT_FONT, zIndex: 50 }}>
      <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 14 * s, padding: `${30 * s}px ${18 * s}px ${34 * s}px ${22 * s}px` }}>
        <div style={{ display: "flex", gap: 18 * s }}>
          <div style={{ width: 70 * s, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, maxWidth: 350 * s, fontSize: 27 * s, fontWeight: 520, fontVariationSettings: '"wdth" 114, "wght" 520', lineHeight: 1.1, color: "#8E8E93", letterSpacing: "-0.004em" }}>
            Reply to {name}'s comment
          </div>
        </div>
        <div style={{ display: "flex", gap: 18 * s, marginTop: 12 * s, alignItems: "flex-start" }}>
          <div style={{ width: 70 * s, height: 70 * s, borderRadius: 35 * s, overflow: "hidden", flexShrink: 0, background: "#E9E9EB", marginTop: 2 * s }}>
            {avatar ? <Face p={avatar} size={70 * s} /> : null}
          </div>
          <div style={{ flex: 1, minWidth: 0, fontSize: size, fontWeight: 720, fontVariationSettings: '"wdth" 114, "wght" 720', lineHeight: 1.24, color: TT_INK, letterSpacing: "-0.004em", wordBreak: "break-word" }}>{text}</div>
        </div>
        {/* the tail, flush with the left edge */}
        <svg width={40 * s} height={28 * s} viewBox="0 0 40 28" style={{ position: "absolute", left: 0, bottom: -26 * s }}>
          <path d="M0 0 L 40 0 L 3 27 Q 0 29 0 25 Z" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
};

/** One auto-caption phrase, shown on its words (TikTok style). */
export type CapPhrase = { text: string; from: number; to: number };
export const AutoCaptions: React.FC<{ phrases: CapPhrase[]; y?: number; size?: number; w?: number }> = ({ phrases, y = 1450, size = 66, w = 900 }) => {
  const f = useCurrentFrame();
  const p = phrases.find((ph) => f >= ph.from && f < ph.to);
  if (!p) return null;
  const pop = tw(f, p.from, p.from + 4, 0.92, 1, E.expoOut);
  return (
    <div style={{ position: "absolute", left: (1080 - w) / 2, top: y, width: w, textAlign: "center", fontFamily: TT_FONT, fontSize: size, fontWeight: 800, fontVariationSettings: '"wdth" 108, "wght" 800', lineHeight: 1.18, letterSpacing: "-0.005em", wordSpacing: "0.14em", color: "#FFFFFF", textShadow: "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0px -5px 0 #000, 0px 5px 0 #000, -5px 0px 0 #000, 5px 0px 0 #000, 0 6px 18px rgba(0,0,0,.35)", transform: `scale(${pop})`, zIndex: 40 } as React.CSSProperties}>
      {p.text}
    </div>
  );
};

/** Build caption phrases from word timings: a new phrase every `maxWords` or at sentence ends. */
export const phrasesFrom = (ws: { t: string; at: number }[], endAt: number, maxWords = 5): CapPhrase[] => {
  const out: CapPhrase[] = [];
  let cur: { t: string; at: number }[] = [];
  const flush = (next: number) => {
    if (!cur.length) return;
    out.push({ text: cur.map((c) => c.t).join(" "), from: cur[0].at - 2, to: next - 2 });
    cur = [];
  };
  ws.forEach((wd, i) => {
    cur.push(wd);
    const sentence = /[.?!,:]["”’')]*$/.test(wd.t); // a sentence can end inside a closing quote
    if (cur.length >= maxWords || sentence) flush(ws[i + 1]?.at ?? endAt);
  });
  flush(endAt);
  return out;
};

/** A TikTok "classic" text sticker (white rounded block, bold ink text). */
export const TextSticker: React.FC<{ at: number; x: number; y: number; children: React.ReactNode; size?: number; rot?: number; bg?: string; color?: string; out?: number }> = ({ at, x, y, children, size = 50, rot = 0, bg = "#FFFFFF", color = TT_INK, out = 1e9 }) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > out + 6) return null;
  const s = tw(f, at, at + 6, 0.6, 1, E.backOut);
  const o = clamp((f - at + 1) / 3) * (1 - tw(f, out, out + 6, 0, 1, E.linear));
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`, opacity: o, padding: `${size * 0.22}px ${size * 0.4}px`, borderRadius: size * 0.24, background: bg, color, fontFamily: TT_FONT, fontSize: size, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.01em", whiteSpace: "nowrap", zIndex: 45, textAlign: "center" }}>
      {children}
    </div>
  );
};
