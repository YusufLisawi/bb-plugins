import React from "react";
import { Icon, IconName } from "../../components/Icons";
import { C, FONT, MONO } from "../../theme";
import { AgentDot, Biz, BizBadge } from "./Biz";

/** Presentational pieces of the business chat widget (film #4). World units. */
export const CARD = { x: 100, y: 560, w: 880, h: 1140 };

export const Header: React.FC<{ b: Biz | null; roll?: number; prev?: Biz | null }> = ({ b, roll = 1, prev }) => {
  const Row: React.FC<{ bb: Biz | null }> = ({ bb }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 20, height: 150 }}>
      {bb ? <BizBadge b={bb} size={76} /> : <AgentDot size={76} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.025em", color: C.ink }}>{bb ? bb.name : "Your AI agent"}</div>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 4 }}>
          {bb ? `${bb.kind.toUpperCase()} · AI AGENT` : "TRAINED ON YOUR BUSINESS"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: "#2E9C6A" }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#35B97B" }} />
        ONLINE
      </div>
    </div>
  );
  return (
    <div style={{ position: "relative", height: 150, overflow: "hidden", padding: "0 40px", borderBottom: "2px solid #F0EDE6" }}>
      {prev !== undefined && roll < 1 ? (
        <div style={{ position: "absolute", left: 40, right: 40, top: 0, transform: `translateY(${-roll * 100}%)`, opacity: 1 - roll }}>
          <Row bb={prev} />
        </div>
      ) : null}
      <div style={{ position: roll < 1 ? "absolute" : "relative", left: roll < 1 ? 40 : undefined, right: roll < 1 ? 40 : undefined, top: 0, transform: `translateY(${(1 - roll) * 100}%)` }}>
        <Row bb={b} />
      </div>
    </div>
  );
};

export const MeBubble: React.FC<{ b: Biz; text: string; s?: number; style?: React.CSSProperties }> = ({ b, text, s = 1, style }) => (
  <div style={{ alignSelf: "flex-end", maxWidth: 640, transform: `scale(${0.6 + 0.4 * s})`, transformOrigin: "100% 100%", opacity: Math.min(1, s * 2), ...style }}>
    <div style={{ padding: "24px 32px", borderRadius: "40px 40px 12px 40px", background: b.color, color: "#FFFFFF", fontFamily: FONT, fontSize: 38, fontWeight: 550, lineHeight: 1.25, letterSpacing: "-0.015em" }} dir="auto">
      {text}
    </div>
  </div>
);

export const AgentBubble: React.FC<{ lines: string[]; s?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ lines, s = 1, style, children }) => (
  <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "flex-end", gap: 14, transform: `scale(${0.6 + 0.4 * s})`, transformOrigin: "0% 100%", opacity: Math.min(1, s * 2), ...style }}>
    <AgentDot size={54} />
    <div style={{ position: "relative", padding: "24px 32px", borderRadius: "40px 40px 40px 12px", background: C.white, boxShadow: "inset 0 0 0 2px #ECE8E0", color: C.ink, fontFamily: FONT, fontSize: 38, fontWeight: 500, lineHeight: 1.25, letterSpacing: "-0.015em", whiteSpace: "nowrap", overflow: "hidden" }} dir="auto">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {children}
    </div>
  </div>
);

export const Typing: React.FC<{ f: number; color?: string }> = ({ f, color = C.gray2 }) => (
  <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "flex-end", gap: 14 }}>
    <AgentDot size={54} />
    <div style={{ display: "flex", gap: 10, padding: "30px 32px", borderRadius: "40px 40px 40px 12px", background: C.white, boxShadow: "inset 0 0 0 2px #ECE8E0" }}>
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ width: 14, height: 14, borderRadius: 7, background: color, transform: `translateY(${-8 * Math.max(0, Math.sin((f / 7) * Math.PI - k * 0.9))}px)` }} />
      ))}
    </div>
  </div>
);

export const ResultChip: React.FC<{ b: Biz; icon: IconName; text: string; s?: number }> = ({ b, icon, text, s = 1 }) => (
  <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 14, padding: "18px 30px 18px 20px", borderRadius: 999, background: b.tint, color: b.color, fontFamily: FONT, fontSize: 32, fontWeight: 700, letterSpacing: "-0.015em", transform: `scale(${0.5 + 0.5 * s})`, opacity: Math.min(1, s * 2), position: "relative", overflow: "hidden" }}>
    <div style={{ width: 52, height: 52, borderRadius: 26, background: b.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={28} color="#FFFFFF" stroke={2.4} />
    </div>
    {text}
  </div>
);

/** What the agent *did*, per business — the proof under each answer. */
export const Result: React.FC<{ k: "store" | "clinic" | "homes" | "hotel" | "saas"; b: Biz; f: number; at: number; s: number }> = ({ k, b, f, at, s }) => {
  const prog = Math.max(0, Math.min(1, (f - at - 4) / 16));
  const ease = 1 - Math.pow(1 - prog, 3);
  const base: React.CSSProperties = {
    alignSelf: "stretch",
    marginLeft: 68,
    position: "relative",
    overflow: "hidden",
    padding: "28px 32px",
    borderRadius: 36,
    background: C.white,
    boxShadow: `0 24px 50px rgba(23,23,23,.08), inset 0 0 0 2px ${b.tint}`,
    fontFamily: FONT,
    color: C.ink,
    transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + 0.15 * s})`,
    transformOrigin: "0% 0%",
    opacity: Math.min(1, s * 2),
  };
  const Title: React.FC<{ icon: IconName; t: string; sub: string }> = ({ icon, t, sub }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: b.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={34} color="#FFFFFF" stroke={2.3} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em" }}>{t}</div>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
  if (k === "store") {
    const steps = ["Ordered", "Shipped", "On its way", "Delivered"];
    const fill = ease * (2 / 3);
    return (
      <div style={base}>
        <Title icon="truck" t="Out for delivery" sub="ORDER #4521 · TODAY BY 6 PM" />
        <div style={{ position: "relative", height: 70, marginTop: 26 }}>
          <div style={{ position: "absolute", left: 14, right: 14, top: 20, height: 8, borderRadius: 4, background: "#EEEBE4" }} />
          <div style={{ position: "absolute", left: 14, top: 20, height: 8, borderRadius: 4, width: `calc((100% - 28px) * ${fill})`, background: b.color }} />
          {steps.map((st, i) => {
            const on = fill >= i / 3 - 0.001;
            return (
              <div key={st} style={{ position: "absolute", left: `calc(14px + (100% - 28px) * ${i / 3})`, top: 12, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: on ? b.color : "#DDD9D0", boxShadow: on ? `0 0 0 6px ${b.tint}` : "none" }} />
                <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: "0.06em", color: on ? b.color : C.gray2, whiteSpace: "nowrap" }}>{st.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (k === "hotel") {
    return (
      <div style={base}>
        <Title icon="bed" t="Doble · vista al mar" sub="VIE → DOM · 2 NOCHES" />
        <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
          {["VIE", "SÁB", "DOM"].map((d, i) => (
            <div key={d} style={{ flex: 1, height: 64, borderRadius: 18, background: ease > i / 3 ? b.color : "#F1EEE8", color: ease > i / 3 ? "#FFFFFF" : C.gray, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 22, letterSpacing: "0.1em" }}>{d}</div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 20px", borderRadius: 18, background: b.tint, color: b.color, fontSize: 24, fontWeight: 700 }}>ES</div>
        </div>
      </div>
    );
  }
  if (k === "clinic") {
    return (
      <div style={{ ...base, display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ width: 150, borderRadius: 26, overflow: "hidden", boxShadow: `inset 0 0 0 2px ${b.tint}`, flexShrink: 0, textAlign: "center" }}>
          <div style={{ background: b.color, color: "#FFFFFF", fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", padding: "8px 0" }}>FRI</div>
          <div style={{ fontSize: 50, fontWeight: 700, letterSpacing: "-0.04em", padding: "10px 0 12px" }}>10:30</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em" }}>Appointment moved</div>
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 6 }}>DR. AMAL · CHECK-UP</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 26, fontWeight: 600, color: b.color }}>
            <Icon name="check" size={26} color={b.color} stroke={3} />
            Calendar updated
          </div>
        </div>
      </div>
    );
  }
  if (k === "homes") {
    return (
      <div style={base}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: "#F6D5D1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em" }}>Maria L.</div>
            <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 4 }}>VIEWING · SAT 11:00</div>
          </div>
          <div style={{ padding: "10px 18px", borderRadius: 999, background: b.color, color: "#FFFFFF", fontSize: 24, fontWeight: 700 }}>New lead</div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          {["2-bed · Palm St", "Budget ✓", "Added to CRM"].map((t, i) => (
            <div key={t} style={{ padding: "12px 18px", borderRadius: 16, background: "#F5F2EC", fontSize: 23, fontWeight: 600, color: C.ink, opacity: ease > i * 0.28 ? 1 : 0.25 }}>{t}</div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...base, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <AgentDot size={64} />
        <div style={{ width: 70 * ease, height: 4, background: b.color, margin: "0 8px", borderRadius: 2 }} />
        <div style={{ width: 64, height: 64, borderRadius: 32, background: "#F4E6C8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: C.ink, transform: `scale(${0.5 + 0.5 * ease})` }}>S</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em" }}>Sam · Support</div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray, marginTop: 4 }}>FULL CONTEXT HANDED OVER</div>
      </div>
      <Icon name="headset" size={40} color={b.color} stroke={2.2} />
    </div>
  );
};

export const Composer: React.FC<{ b: Biz | null }> = ({ b }) => (
  <div style={{ position: "absolute", left: 32, right: 32, bottom: 32, height: 96, borderRadius: 48, background: "#F5F2EC", display: "flex", alignItems: "center", padding: "0 12px 0 36px", fontFamily: FONT, fontSize: 30, color: C.gray2 }}>
    <div style={{ flex: 1 }}>{b ? `Message ${b.name}…` : "Message…"}</div>
    <div style={{ width: 72, height: 72, borderRadius: 36, background: b ? b.color : C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name="send" size={32} color="#FFFFFF" />
    </div>
  </div>
);
