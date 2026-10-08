import React from "react";

/** Flat product illustrations for shop scenes (drawn, so there's no stock-photo licensing). */
export type ProductKind = "jacket" | "belt" | "sneaker" | "tee" | "bag" | "cap";
export const Product: React.FC<{ kind: ProductKind; color: string; size: number; accent?: string }> = ({ kind, color, size, accent = "#FFFFFF" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {kind === "jacket" ? (
      <>
        <path d="M30 18 L 42 12 L 50 22 L 58 12 L 70 18 L 86 40 L 76 48 L 72 40 L 72 88 L 28 88 L 28 40 L 24 48 L 14 40 Z" fill={color} />
        <path d="M50 22 L 50 88" stroke={accent} strokeWidth={2} opacity={0.6} />
        <path d="M42 12 L 50 34 L 58 12" fill="none" stroke={accent} strokeWidth={2.5} opacity={0.7} />
        <rect x={34} y={58} width={10} height={3} rx={1.5} fill={accent} opacity={0.6} />
        <rect x={56} y={58} width={10} height={3} rx={1.5} fill={accent} opacity={0.6} />
      </>
    ) : kind === "belt" ? (
      <>
        <path d="M8 44 C 30 36, 70 36, 92 44 L 92 56 C 70 48, 30 48, 8 56 Z" fill={color} />
        <rect x={40} y={38} width={20} height={20} rx={4} fill="none" stroke="#C9A96E" strokeWidth={4} />
        <rect x={48} y={44} width={4} height={8} fill="#C9A96E" />
      </>
    ) : kind === "sneaker" ? (
      <>
        <path d="M8 62 C 8 52, 22 49, 34 47 L 46 34 C 51 29, 60 29, 64 36 L 72 47 C 82 49, 93 51, 95 58 L 95 66 L 8 66 Z" fill={color} />
        <path d="M7 65 L 96 65 L 96 71 C 70 74, 30 74, 7 71 Z" fill={accent} />
        <circle cx={48} cy={51} r={2.4} fill={accent} opacity={0.8} />
        <circle cx={56} cy={48} r={2.4} fill={accent} opacity={0.8} />
        <circle cx={64} cy={50} r={2.4} fill={accent} opacity={0.8} />
      </>
    ) : kind === "tee" ? (
      <path d="M30 20 L 42 15 C 45 21, 55 21, 58 15 L 70 20 L 86 36 L 76 44 L 70 40 L 70 86 L 30 86 L 30 40 L 24 44 L 14 36 Z" fill={color} />
    ) : kind === "cap" ? (
      <>
        <path d="M20 60 C 20 36, 72 32, 74 60 Z" fill={color} />
        <path d="M62 60 L 94 60 C 94 67, 72 69, 62 64 Z" fill={color} opacity={0.8} />
      </>
    ) : (
      <>
        <path d="M34 34 C 34 18, 66 18, 66 34" fill="none" stroke={color} strokeWidth={5} />
        <rect x={20} y={34} width={60} height={50} rx={8} fill={color} />
      </>
    )}
  </svg>
);
