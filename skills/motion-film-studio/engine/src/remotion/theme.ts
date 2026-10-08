import brand from "./brand.json";

/**
 * Brand tokens, read from `brand.json` (written by scripts/brand.sh from a
 * brand kit; the default preset is Brainfast). Never hard-code a brand colour,
 * font, name or URL in a film: use these.
 *
 * The keys keep their original names so every kit piece and example works for
 * any brand: `coral*` = the brand ACCENT, `cream` = the background, `sand` =
 * a surface, `green*` = success.
 */
const k = brand.colors;
export const C = {
  cream: k.bg,
  sand: k.surface,
  white: k.white,
  ink: k.ink,
  night: k.night,
  coral: k.accent,
  coralDeep: k.accentDeep,
  coralLight: k.accentLight,
  coralTint: k.accentTint,
  gray: k.gray,
  gray2: k.gray2,
  line: k.line,
  green: k.success,
  greenTint: k.successTint,
} as const;

export const SANS = brand.fonts.sans.family;
export const MONO_FAMILY = brand.fonts.mono.family;
export const FONT = `"${SANS}", system-ui, sans-serif`;
export const MONO = `"${MONO_FAMILY}", ui-monospace, monospace`;

/** Brand strings used by the lockup, the CTA and QA. */
export const BRAND = {
  id: brand.id,
  name: brand.name,
  wordmark: brand.wordmark,
  tagline: brand.tagline,
  url: brand.url,
  ctaDefault: brand.cta,
  wordmarkWeight: brand.fonts.wordmarkWeight ?? 600,
  wordmarkTracking: brand.fonts.wordmarkTracking ?? -0.025,
};

/** Every font face to load (brand sans + mono, plus TikTok Sans for native TikTok UI). */
export const FONT_FACES: [string, string, FontFaceDescriptors][] = [
  ...brand.fonts.sans.faces.map((f) => [SANS, `fonts/${f.file}`, { weight: f.weight, style: f.style ?? "normal" }] as [string, string, FontFaceDescriptors]),
  ...brand.fonts.mono.faces.map((f) => [MONO_FAMILY, `fonts/${f.file}`, { weight: f.weight, style: (f as { style?: string }).style ?? "normal" }] as [string, string, FontFaceDescriptors]),
  ["TikTok Sans", "fonts/TikTokSans-VF.ttf", { weight: "300 900", style: "normal" }],
];

/** The accent as "r,g,b" for rgba() glows, shadows, bokeh and sheens. */
export const ACCENT_RGB = [1, 3, 5].map((i) => parseInt(k.accent.slice(i, i + 2), 16)).join(",");
