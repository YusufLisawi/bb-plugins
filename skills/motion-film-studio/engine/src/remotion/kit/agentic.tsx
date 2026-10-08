import React from "react";
import { useCurrentFrame } from "remotion";
import { E, clamp, mix, tw } from "../lib/ease";
import { C, FONT, MONO } from "../theme";
import { springAt } from "./fx";

/**
 * Agentic moments: the agent calling one of the business's own tools (a custom
 * API tool in Brainfast), shown as a live function call that resolves into a
 * result. Use it wherever a film claims the agent "checks", "looks up" or
 * "books" something — it makes the action visible instead of implied.
 *
 *   <ToolCall at={f0} x={70} y={1200} w={940} tool="listings.search"
 *     args={[["bedrooms", "2"], ["near", "a park"], ["max_price", "400,000"]]}
 *     resultAt={f1} result="214 listings · 3 match" />
 */
export const ToolCall: React.FC<{
  at: number;
  resultAt: number;
  x: number;
  y: number;
  w: number;
  tool: string;
  args: [string, string][];
  result: string;
  out?: number;
  label?: string;
  scale?: number;
}> = ({ at, resultAt, x, y, w, tool, args, result, out = 1e9, label = "TOOL CALL", scale = 1 }) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > out + 10) return null;
  const s = springAt(f, at, 30, 13, 170) * (1 - tw(f, out, out + 10, 0, 1, E.expoIn));
  const argT = (i: number) => tw(f, at + 4 + i * 3, at + 9 + i * 3, 0, 1, E.expoOut);
  const done = f >= resultAt;
  const res = tw(f, resultAt, resultAt + 8, 0, 1, E.expoOut);
  const spin = (f - at) * 14;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translateY(${(1 - clamp(s)) * 50}px) scale(${mix(0.92, 1, clamp(s)) * scale})`, transformOrigin: "0 0", opacity: clamp(s * 2), zIndex: 30 }}>
      <div style={{ borderRadius: 28, background: "#131316", boxShadow: "0 30px 70px rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,255,255,.07)", padding: "26px 30px 28px", fontFamily: MONO, color: "#E9E6DF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, letterSpacing: "0.14em", color: "#8C8A85" }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: done ? "#3DDC84" : C.coral, boxShadow: done ? "0 0 12px #3DDC84" : `0 0 12px ${C.coral}` }} />
          {label}
        </div>
        <div style={{ marginTop: 12, fontSize: 40, fontWeight: 500, color: "#FFFFFF" }}>
          <span style={{ color: C.coralLight }}>{tool}</span>(
        </div>
        {args.map(([k, v], i) => (
          <div key={k} style={{ fontSize: 32, marginLeft: 34, marginTop: 4, opacity: argT(i), transform: `translateX(${(1 - argT(i)) * 20}px)` }}>
            <span style={{ color: "#8FB8FF" }}>{k}</span>
            <span style={{ color: "#8C8A85" }}>: </span>
            <span style={{ color: "#F2D38A" }}>{v}</span>
          </div>
        ))}
        <div style={{ fontSize: 40, color: "#FFFFFF" }}>)</div>
        <div style={{ marginTop: 16, height: 2, background: "rgba(255,255,255,.1)" }} />
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontSize: 34, fontWeight: 700 }}>
          {done ? (
            <>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: "#3DDC84", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.4, 1, res)})`, color: "#0B2A17", fontSize: 26 }}>✓</div>
              <span style={{ opacity: res }}>{result}</span>
            </>
          ) : (
            <>
              <svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: `rotate(${spin}deg)` }}>
                <circle cx={20} cy={20} r={15} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={5} />
                <path d="M20 5 A 15 15 0 0 1 35 20" fill="none" stroke={C.coral} strokeWidth={5} strokeLinecap="round" />
              </svg>
              <span style={{ color: "#8C8A85" }}>calling…</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** A small channel badge (Instagram / WhatsApp / website) drawn in CSS. */
export const ChannelBadge: React.FC<{ ch: "instagram" | "whatsapp" | "web"; size?: number }> = ({ ch, size = 64 }) => {
  const bg = ch === "instagram" ? "linear-gradient(45deg,#F9CE34,#EE2A7B 55%,#6228D7)" : ch === "whatsapp" ? "#25D366" : C.ink;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {ch === "instagram" ? (
        <div style={{ width: size * 0.56, height: size * 0.56, borderRadius: size * 0.18, border: `${size * 0.07}px solid #fff`, position: "relative", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", width: size * 0.22, height: size * 0.22, marginLeft: -size * 0.11, marginTop: -size * 0.11, borderRadius: "50%", border: `${size * 0.06}px solid #fff`, boxSizing: "border-box" }} />
        </div>
      ) : ch === "whatsapp" ? (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" fill="#fff" /><path d="M8.6 7.6c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4-.1.6l-.5.6c-.1.2-.1.3 0 .5a6.6 6.6 0 0 0 3.2 2.8c.2.1.4 0 .5-.1l.6-.7c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4 0 .5-.2 1.4-1 1.8-.8.5-2 .6-3.8-.2A10 10 0 0 1 8.4 11c-.6-1-.8-2.1 0-3.4z" fill="#25D366" /></svg>
      ) : (
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><circle cx={12} cy={12} r={9} /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
      )}
    </div>
  );
};
