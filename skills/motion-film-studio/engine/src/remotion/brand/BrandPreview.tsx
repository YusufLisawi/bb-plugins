import React from "react";
import { AbsoluteFill } from "remotion";
import brand from "../brand.json";
import { loadFonts } from "../fonts";
import { C, FONT, MONO, BRAND } from "../theme";
import { Mark } from "./Mark";
import { MARK_H, MARK_W } from "../lib/logo";
import { Lockup } from "../kit/lockup";
import { SystemCard } from "../kit/systems";

loadFonts();

/**
 * The brand preview the user approves before any film (scripts/brand-preview.sh):
 * BrandSheet = palette, type, the logo, sample UI in the brand's colours;
 * BrandEnd = the real end card (Lockup) with the CTA and URL.
 */
const SW: [string, string][] = [
  ["bg", C.cream], ["surface", C.sand], ["white", C.white], ["ink", C.ink], ["night", C.night],
  ["accent", C.coral], ["accentDeep", C.coralDeep], ["accentLight", C.coralLight], ["accentTint", C.coralTint],
  ["gray", C.gray], ["gray2", C.gray2], ["line", C.line], ["success", C.green], ["successTint", C.greenTint],
];

export const BrandSheet: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream, fontFamily: FONT, color: C.ink, padding: 70 }}>
    <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: C.gray }}>BRAND PREVIEW · {brand.status.toUpperCase()}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 24 }}>
      <Mark height={170} color={C.coral} />
      <div>
        <div style={{ fontSize: 76, fontWeight: BRAND.wordmarkWeight, letterSpacing: `${BRAND.wordmarkTracking}em`, lineHeight: 1 }}>{BRAND.wordmark || BRAND.name}</div>
        <div style={{ fontSize: 30, color: C.gray, marginTop: 10 }}>{BRAND.url} · logo {brand.logo.type} {MARK_W}×{MARK_H}</div>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14, marginTop: 50 }}>
      {SW.map(([n, v]) => (
        <div key={n}>
          <div style={{ height: 96, borderRadius: 18, background: v, boxShadow: "inset 0 0 0 2px rgba(0,0,0,.08)" }} />
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 8 }}>{n}</div>
          <div style={{ fontFamily: MONO, fontSize: 17, color: C.gray }}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 50, fontSize: 112, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>
      Every question, <span style={{ color: C.coral }}>answered.</span>
    </div>
    <div style={{ display: "flex", gap: 34, marginTop: 20, fontSize: 40 }}>
      <span style={{ fontWeight: 400 }}>Regular 400</span><span style={{ fontWeight: 600 }}>Semibold 600</span><span style={{ fontWeight: 800 }}>Black 800</span><span style={{ fontStyle: "italic" }}>Italic</span>
    </div>
    <div style={{ fontFamily: MONO, fontSize: 30, marginTop: 14, color: C.gray }}>{brand.fonts.sans.family} · {brand.fonts.mono.family} 0123456789</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 44, padding: 26, borderRadius: 36, background: C.sand }}>
      <div style={{ alignSelf: "flex-end", padding: "14px 22px", borderRadius: "26px 26px 8px 26px", background: C.coralTint, fontSize: 36 }}>Do you have this in medium?</div>
      <div style={{ alignSelf: "flex-start", padding: "14px 22px", borderRadius: "26px 26px 26px 8px", background: C.white, fontSize: 36 }}>Yes! 12 left, want the link? 🙂</div>
    </div>
    <SystemCard at={-60} doneAt={-40} x={70} y={1300} w={940} system={{ label: "Your store", icon: "bag", color: C.coral }} doing="Checking stock…" done="In stock, ready to ship" facts={["Medium", "12 left ✓"]} />
  </AbsoluteFill>
);

export const BrandEnd: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream, fontFamily: FONT }}>
    <Lockup hit={10} tag={BRAND.tagline.map((_, i) => 28 + i * 3)} ctaAt={60} urlAt={70} />
  </AbsoluteFill>
);
