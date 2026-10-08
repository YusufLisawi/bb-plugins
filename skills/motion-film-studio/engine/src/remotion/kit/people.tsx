import React from "react";
import { mixColor } from "../lib/ease";
import { FONT, MONO, C } from "../theme";

/**
 * Flat illustrated people, so "different people" really look different
 * (age, gender, skin, hair) at thumbnail size. Pure SVG, deterministic.
 *
 *   <Face p={PEOPLE.tom} size={72} />
 */
export type HairStyle = "short" | "long" | "bun" | "curly" | "bald" | "bob" | "waves" | "hijab" | "fade";
export type FaceSpec = { name: string; skin: string; hair: string; style: HairStyle; glasses?: boolean; beard?: boolean; grey?: boolean; shirt: string; bg: string };

export const PEOPLE = {
  tom: { name: "Tom", skin: "#F1C7A8", hair: "#B9B4AE", style: "short", beard: true, glasses: true, shirt: "#5E6AD2", bg: "#E7E9FB" },
  aisha: { name: "Aisha", skin: "#8D5A3B", hair: "#1E1512", style: "curly", shirt: "#D4861C", bg: "#FAEBD4" },
  ken: { name: "Ken", skin: "#EFCBA3", hair: "#16120F", style: "fade", glasses: true, shirt: "#1C9A83", bg: "#DCF2EC" },
  lucia: { name: "Lucía", skin: "#D9A07A", hair: "#4A2A1A", style: "waves", shirt: "#D95759", bg: "#F6D5D1" },
  maya: { name: "Maya", skin: "#C98E68", hair: "#2A1B14", style: "long", shirt: "#E27BA0", bg: "#FBE0EA" },
  omar: { name: "Omar", skin: "#B57A55", hair: "#1B1411", style: "short", beard: true, shirt: "#2B86CC", bg: "#DCEDFA" },
  grace: { name: "Grace", skin: "#6B4430", hair: "#161110", style: "bun", shirt: "#7B55C7", bg: "#ECE4F8" },
  eleanor: { name: "Eleanor", skin: "#F4D2BC", hair: "#E4E0DA", style: "bob", glasses: true, shirt: "#1C9A83", bg: "#DCF2EC" },
  dana: { name: "Dana", skin: "#E8B894", hair: "#9A4B25", style: "bob", shirt: "#5E6AD2", bg: "#E7E9FB" },
  priya: { name: "Priya", skin: "#A86D4A", hair: "#1A1210", style: "hijab", shirt: "#2B86CC", bg: "#DCEDFA" },
  jonas: { name: "Jonas", skin: "#F3CFB3", hair: "#D8B26A", style: "short", shirt: "#D4861C", bg: "#FAEBD4" },
  wei: { name: "Wei", skin: "#EDC9A0", hair: "#141111", style: "bob", shirt: "#E27BA0", bg: "#FBE0EA" },
  marcus: { name: "Marcus", skin: "#5C3A28", hair: "#141010", style: "bald", beard: true, shirt: "#1C9A83", bg: "#DCF2EC" },
  ines: { name: "Inês", skin: "#E0AE87", hair: "#3B2418", style: "long", glasses: true, shirt: "#2B86CC", bg: "#DCEDFA" },
} satisfies Record<string, FaceSpec>;

const HairTop: React.FC<{ p: FaceSpec }> = ({ p }) => {
  const h = p.hair;
  switch (p.style) {
    case "short":
      return <path d="M30.5 44 C 29 25, 42 17.5, 52 18.5 C 64 19.5, 72 27, 69.5 44 C 66 35, 57 30.5, 45 31.5 C 38 32.5, 33.5 37, 30.5 44 Z" fill={h} />;
    case "fade":
      return (
        <>
          <path d="M31 42 C 30 25, 43 17, 52 18 C 63 19, 71 26, 69 42 C 67 33, 58 28.5, 46 29.5 C 39 30, 34 35, 31 42 Z" fill={h} />
          <path d="M31 42 C 31 47, 31.5 50, 32.5 52 L 34 44 Z M69 42 C 69 47, 68.5 50, 67.5 52 L 66 44 Z" fill={h} opacity={0.55} />
        </>
      );
    case "bun":
      return (
        <>
          <circle cx="50" cy="15.5" r="8.5" fill={h} />
          <path d="M31 44 C 29 26, 41 20, 50 20 C 60 20, 71 26, 69 44 C 66 35, 58 30, 50 30 C 42 30, 34 35, 31 44 Z" fill={h} />
        </>
      );
    case "curly":
      return (
        <g fill={h}>
          {[[34, 30, 8], [42, 23, 8.5], [51, 20.5, 9], [60, 23, 8.5], [67, 30, 8], [30.5, 39, 6.5], [70, 39, 6.5], [46, 28, 7], [56, 28, 7]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "bob":
      return <path d="M28.5 58 C 25 28, 39 18.5, 50 18.5 C 62 18.5, 76 27, 71.5 58 C 69 50, 68.5 41, 62 33.5 C 54 37.5, 41 37, 34 39 C 32 45, 31 51, 28.5 58 Z" fill={h} />;
    case "long":
    case "waves":
      return <path d="M29.5 50 C 27 27, 40 18.5, 50 18.5 C 61 18.5, 73 27, 70.5 50 C 68 40, 63 33, 55 31 C 49 34, 40 35.5, 33 39 C 31.5 43, 30.5 46, 29.5 50 Z" fill={h} />;
    case "hijab":
      return <path d="M30.5 43 C 32 27, 42 23.5, 50 23.5 C 58 23.5, 68 27, 69.5 43 C 63 33.5, 37 33.5, 30.5 43 Z" fill={h} />;
    case "bald":
      return p.grey ? <path d="M31 46 C 31 40, 33 37, 35 36 L 34 47 Z M69 46 C 69 40, 67 37, 65 36 L 66 47 Z" fill={h} /> : null;
  }
};

export const Face: React.FC<{ p: FaceSpec; size: number; ring?: string; style?: React.CSSProperties }> = ({ p, size, ring, style }) => {
  const neck = mixColor(p.skin, "#000000", 0.14);
  const brow = p.style === "bald" ? mixColor(p.skin, "#000000", 0.55) : mixColor(p.hair, "#000000", 0.15);
  const back = p.style === "long" || p.style === "waves";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: p.bg, flexShrink: 0, boxShadow: ring ? `0 0 0 ${Math.max(2, size * 0.045)}px ${ring}` : undefined, ...style }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
        {back ? (
          p.style === "waves" ? (
            <path d="M28 42 C 25 24, 75 24, 72 42 C 74 55, 79 64, 75 74 C 79 80, 76 88, 74 94 L 26 94 C 24 88, 21 80, 25 74 C 21 64, 26 55, 28 42 Z" fill={p.hair} />
          ) : (
            <path d="M28 42 C 26 22, 74 22, 72 42 L 75 90 L 25 90 Z" fill={p.hair} />
          )
        ) : null}
        {p.style === "hijab" ? <path d="M22 100 C 20 62, 24 20, 50 18 C 76 20, 80 62, 78 100 Z" fill={p.hair} /> : null}
        <path d="M13 102 C 15 81, 30 72, 50 72 C 70 72, 85 81, 87 102 Z" fill={p.shirt} />
        {p.style !== "hijab" ? <rect x="43" y="57" width="14" height="18" rx="6" fill={neck} /> : null}
        {p.style !== "hijab" ? (
          <>
            <ellipse cx="31" cy="47" rx="4" ry="6" fill={p.skin} />
            <ellipse cx="69" cy="47" rx="4" ry="6" fill={p.skin} />
          </>
        ) : null}
        <ellipse cx="50" cy="45" rx="19" ry="22" fill={p.skin} />
        {p.beard ? <path d="M31.5 48 C 32.5 65, 42 69.5, 50 69.5 C 58 69.5, 67.5 65, 68.5 48 C 64.5 58.5, 58 61, 50 61 C 42 61, 35.5 58.5, 31.5 48 Z" fill={p.hair} /> : null}
        <HairTop p={p} />
        <path d="M38.5 40.5 Q 42.5 38 46.5 40" stroke={brow} strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <path d="M53.5 40 Q 57.5 38 61.5 40.5" stroke={brow} strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <ellipse cx="42.8" cy="46.5" rx="2.1" ry="2.5" fill="#241B17" />
        <ellipse cx="57.2" cy="46.5" rx="2.1" ry="2.5" fill="#241B17" />
        <circle cx="38.5" cy="53" r="3.2" fill="#E8836F" opacity={0.18} />
        <circle cx="61.5" cy="53" r="3.2" fill="#E8836F" opacity={0.18} />
        <path d="M44.5 55.5 Q 50 60.5 55.5 55.5" stroke={p.beard ? "#F3E6DC" : "#8B3A2E"} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {p.glasses ? (
          <g fill="none" stroke="#1D1B1A" strokeWidth="1.7">
            <circle cx="42.8" cy="46.5" r="5.6" />
            <circle cx="57.2" cy="46.5" r="5.6" />
            <path d="M48.4 46 Q 50 44.8 51.6 46" />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

/** A face with a name and a small caption (who is asking). */
export const Who: React.FC<{ p: FaceSpec; size?: number; caption?: string; dark?: boolean; style?: React.CSSProperties }> = ({ p, size = 56, caption, dark = false, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.28, fontFamily: FONT, ...style }}>
    <Face p={p} size={size} />
    <div>
      <div style={{ fontSize: size * 0.46, fontWeight: 700, letterSpacing: "-0.02em", color: dark ? C.cream : C.ink, lineHeight: 1.1, whiteSpace: "nowrap" }}>{p.name}</div>
      {caption ? <div style={{ fontFamily: MONO, fontSize: size * 0.3, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? "rgba(250,249,245,.6)" : C.gray, marginTop: 4, whiteSpace: "nowrap" }}>{caption}</div> : null}
    </div>
  </div>
);
