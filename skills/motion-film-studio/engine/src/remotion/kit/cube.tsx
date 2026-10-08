import React from "react";
import { Mark } from "../brand/Mark";
import { C, ACCENT_RGB } from "../theme";

/**
 * A CSS-3D cube that turns from a matte black box into glass. `glass` 0 → 1
 * cross-fades every face; `glow` lights the coral rim; `inner` (0 → 1) reveals
 * the Brainfast mark and the conversations orbiting inside.
 */
export const GlassCube: React.FC<{
  size: number;
  rx: number;
  ry: number;
  glass: number;
  glow?: number;
  inner?: number;
  led?: number;
  sheen?: number;
  children?: React.ReactNode;
}> = ({ size, rx, ry, glass, glow = 0, inner = 0, led = 0, sheen = -1, children }) => {
  const h = size / 2;
  const faces: { key: string; t: string; shade: number }[] = [
    { key: "front", t: `translateZ(${h}px)`, shade: 1 },
    { key: "back", t: `rotateY(180deg) translateZ(${h}px)`, shade: 0.55 },
    { key: "right", t: `rotateY(90deg) translateZ(${h}px)`, shade: 0.75 },
    { key: "left", t: `rotateY(-90deg) translateZ(${h}px)`, shade: 0.65 },
    { key: "top", t: `rotateX(90deg) translateZ(${h}px)`, shade: 0.9 },
    { key: "bottom", t: `rotateX(-90deg) translateZ(${h}px)`, shade: 0.4 },
  ];
  return (
    <div style={{ position: "relative", width: size, height: size, transformStyle: "preserve-3d", transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }}>
      {/* what lives inside: a billboard at the centre */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateY(${-ry}deg) rotateX(${-rx}deg)`, opacity: inner }}>
        <div style={{ position: "absolute", width: size * 1.1, height: size * 1.1, borderRadius: "50%", background: `radial-gradient(circle, rgba(${ACCENT_RGB},.55) 0%, rgba(${ACCENT_RGB},0) 65%)` }} />
        <Mark height={size * 0.42} color={C.coral} />
        {children}
      </div>
      {faces.map((fc) => (
        <div key={fc.key} style={{ position: "absolute", inset: 0, transform: fc.t, backfaceVisibility: "visible" }}>
          {/* matte black */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(145deg, rgb(${Math.round(34 * fc.shade)},${Math.round(33 * fc.shade)},${Math.round(37 * fc.shade)}) 0%, #050506 100%)`,
              boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.07)",
              opacity: 1 - glass,
            }}
          />
          {/* glass */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(145deg, rgba(255,255,255,${0.16 * fc.shade}) 0%, rgba(255,255,255,0.03) 55%, rgba(255,235,228,${0.08 * fc.shade}) 100%)`,
              boxShadow: `inset 0 0 0 2.5px rgba(255,226,218,${0.28 + 0.4 * glow}), inset 0 0 ${60 + 60 * glow}px rgba(${ACCENT_RGB},${0.12 + 0.35 * glow})`,
              opacity: glass,
            }}
          />
          {/* a sweep of light across the faces */}
          {sheen >= 0 && sheen <= 1 ? (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-50%", bottom: "-50%", width: "30%", left: `${-40 + sheen * 170}%`, transform: "rotate(20deg)", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.55), rgba(255,255,255,0))", opacity: glass * 0.9 + 0.2 }} />
            </div>
          ) : null}
          {fc.key === "front" && led > 0 ? (
            <div style={{ position: "absolute", right: size * 0.1, bottom: size * 0.1, width: 16, height: 16, borderRadius: 8, background: C.coral, boxShadow: `0 0 ${20 * led}px ${6 * led}px rgba(${ACCENT_RGB},${0.6 * led})`, opacity: led * (1 - glass) }} />
          ) : null}
        </div>
      ))}
    </div>
  );
};
