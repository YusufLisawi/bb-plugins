import React from "react";
import { useCurrentFrame } from "remotion";
import { E, clamp, mix, tw } from "../lib/ease";
import { C, FONT, MONO, ACCENT_RGB } from "../theme";
import { springAt } from "./fx";
import { Icon, IconName } from "./ui";
import { Mark } from "../brand/Mark";

/**
 * The agent using one of the business's own systems, shown the way a business
 * owner thinks about it — no code. Two tiles (the agent ↔ "your store", "your
 * calendar", "your listings"…), a live connection with light travelling along
 * it, one plain sentence ("Checking sizes and stock in your store…"), then the
 * result as simple facts. Replaces kit/agentic's code-style ToolCall for
 * business audiences (user feedback: "our target is not a client that reads code").
 *
 *   <SystemCard at={a} doneAt={b} x={70} y={1100} w={940}
 *     system={{ label: "Your store", icon: "bag", color: "#2B86CC" }}
 *     doing="Checking sizes and stock in your store…" done="In stock"
 *     facts={["Black jacket · M", "12 left"]} />
 */
export type SystemSpec = { label: string; icon: IconName; color: string; sub?: string };
export const SystemCard: React.FC<{
  at: number;
  doneAt: number;
  x: number;
  y: number;
  w: number;
  system: SystemSpec;
  doing: string;
  done: string;
  facts?: string[];
  out?: number;
  scale?: number;
}> = ({ at, doneAt, x, y, w: W, system, doing, done, facts = [], out = 1e9, scale = 1 }) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > out + 10) return null;
  const s = springAt(f, at, 30, 13, 170) * (1 - tw(f, out, out + 10, 0, 1, E.expoIn));
  const ok = f >= doneAt;
  const okT = tw(f, doneAt, doneAt + 8, 0, 1, E.expoOut);
  const lineW = W - 2 * 150 - 60;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, transform: `translateY(${(1 - clamp(s)) * 50}px) scale(${mix(0.92, 1, clamp(s)) * scale})`, transformOrigin: "50% 0", opacity: clamp(s * 2), zIndex: 30, fontFamily: FONT }}>
      <div style={{ borderRadius: 36, background: C.white, boxShadow: "0 30px 80px rgba(23,23,23,.18), inset 0 0 0 2px #EEEBE3", padding: "28px 30px 30px" }}>
        {/* agent ⇄ their system */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 10px 24px rgba(${ACCENT_RGB},.35)` }}>
              <Mark height={54} color={C.cream} stroke={26} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.gray }}>Your agent</div>
          </div>
          <div style={{ position: "relative", width: lineW, height: 10, borderRadius: 5, background: "#EFEBE4", marginBottom: 34 }}>
            {Array.from({ length: 3 }, (_, i) => {
              const p = ((f - at) * 0.045 + i / 3) % 1;
              const back = ok ? 1 - p : p;
              return <div key={i} style={{ position: "absolute", left: `${back * 100}%`, top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: 10, background: ok ? C.green : C.coral, opacity: 0.35 + 0.65 * Math.sin(p * Math.PI), boxShadow: `0 0 14px ${ok ? C.green : C.coral}` }} />;
            })}
          </div>
          <div style={{ width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: system.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(23,23,23,.18)" }}>
              <Icon name={system.icon} size={52} color="#FFFFFF" stroke={2.2} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, textAlign: "center", lineHeight: 1.15 }}>{system.label}</div>
          </div>
        </div>
        {/* one plain sentence */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16, fontSize: 38, fontWeight: 750, color: C.ink, letterSpacing: "-0.02em" }}>
          {ok ? (
            <div style={{ width: 48, height: 48, borderRadius: 24, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.4, 1, okT)})`, flexShrink: 0 }}>
              <Icon name="check" size={30} color="#FFF" stroke={3.2} />
            </div>
          ) : (
            <svg width={48} height={48} viewBox="0 0 48 48" style={{ transform: `rotate(${(f - at) * 12}deg)`, flexShrink: 0 }}>
              <circle cx={24} cy={24} r={18} fill="none" stroke="#EFEBE4" strokeWidth={6} />
              <path d="M24 6 A 18 18 0 0 1 42 24" fill="none" stroke={C.coral} strokeWidth={6} strokeLinecap="round" />
            </svg>
          )}
          <span>{ok ? done : doing}</span>
        </div>
        {facts.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
            {facts.map((t, i) => {
              const c = tw(f, doneAt + 3 + i * 3, doneAt + 11 + i * 3, 0, 1, E.backOut);
              return <div key={t} style={{ padding: "10px 18px", borderRadius: 999, background: i === facts.length - 1 ? C.greenTint : "#F4F1EA", color: i === facts.length - 1 ? C.green : C.ink, fontSize: 28, fontWeight: 700, transform: `scale(${c})`, opacity: clamp(c * 2) }}>{t}</div>;
            })}
          </div>
        ) : null}
        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 18, letterSpacing: "0.12em", color: C.gray2 }}>CONNECTED TO THE TOOLS YOU ALREADY USE{system.sub ? ` · ${system.sub.toUpperCase()}` : ""}</div>
      </div>
    </div>
  );
};
