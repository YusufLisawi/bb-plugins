import React from "react";
import { useCurrentFrame } from "remotion";
import { E, mix, tw } from "../lib/ease";
import { C } from "../theme";
import { Icon } from "./ui";
import { IOS } from "./screenrec";

/* ── WhatsApp in light mode, bottom-anchored like the real app: each new
      message grows in and pushes the older ones up (no hand-tuned scroll) ── */
export const AR = '"Noto Sans Arabic", "Noto Naskh Arabic", "DM Sans", sans-serif';
export const WaDay: React.FC<{ name: string; icon: React.ReactNode; sub?: string; bottom?: number; children: React.ReactNode }> = ({ name, icon, sub = "Business account", bottom = 1420, children }) => (
  <div style={{ position: "absolute", inset: 0, background: "#EFE7DE", fontFamily: IOS }}>
    <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(#6B5B4B 1.2px, transparent 1.3px)", backgroundSize: "34px 34px" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 250, height: bottom - 250, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 36px", boxSizing: "border-box" }}>{children}</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 250, background: "#F6F6F6", borderBottom: "1px solid #DDD" }}>
      <div style={{ position: "absolute", left: 30, top: 150, display: "flex", alignItems: "center", gap: 18 }}>
        <svg width={30} height={50} viewBox="0 0 12 20"><path d="M10 2 L 2 10 L 10 18" stroke="#0A84FF" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden" }}>{icon}</div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 650, color: "#111" }}>{name}</div>
          <div style={{ fontSize: 26, color: "#6E6E73" }}>{sub}</div>
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "#F6F6F6", display: "flex", alignItems: "flex-start", padding: "22px 26px", gap: 18, boxSizing: "border-box" }}>
      <div style={{ flex: 1, height: 72, borderRadius: 36, background: "#FFF", border: "1px solid #DDD" }} />
      <div style={{ width: 72, height: 72, borderRadius: 36, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="mic" size={36} color="#FFF" stroke={2.4} />
      </div>
    </div>
  </div>
);
export const LMsg: React.FC<{ at: number; me?: boolean; time: string; ai?: boolean; rtl?: boolean; size?: number; children: React.ReactNode }> = ({ at, me, time, ai, rtl, size = 40, children }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const g = tw(f, at, at + 9, 0, 1, E.cubicInOut); // height grows → older messages glide up
  const s = tw(f, at + 2, at + 10, 0, 1, E.expoOut);
  return (
    <div style={{ maxHeight: g * 420, overflow: "hidden", flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 16 * g }}>
      <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 840, opacity: s, transform: `scale(${mix(0.94, 1, s)})`, transformOrigin: me ? "100% 100%" : "0% 100%" }}>
        <div style={{ padding: "14px 22px 10px", borderRadius: me ? "24px 24px 6px 24px" : "24px 24px 24px 6px", background: me ? "#D9FDD3" : "#FFFFFF", boxShadow: "0 1px 1px rgba(0,0,0,.12)", fontSize: size, lineHeight: 1.3, color: "#111" }}>
          {ai ? <div style={{ fontSize: 24, fontWeight: 650, color: C.coral, marginBottom: 4 }}>✨ AI assistant</div> : null}
          <div dir={rtl ? "rtl" : undefined} style={rtl ? { fontFamily: AR, fontSize: size * 1.02, textAlign: "right" } : undefined}>{children}</div>
          <div style={{ fontSize: 22, color: "#8A8A8E", textAlign: "right", marginTop: 4 }}>
            {time}
            {me ? <span style={{ color: "#53BDEB", marginLeft: 8 }}>✓✓</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
