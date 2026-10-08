// Print a film's SOUND cues (and its beat constants) as JSON, straight from the
// scene code, so sound can never drift from picture.
//
//   bun scripts/film_sound.ts src/remotion/films/<id>/<Film>.tsx > public/films/<id>/sound.json
//
// The module must `export const SOUND: Cue[]` (see src/remotion/kit/sound.ts) and
// may export `BEATS` (any JSON) for reference. Compositions load fonts at import
// time, so the browser APIs they touch are stubbed here.
(globalThis as any).FontFace = class {
  load() {
    return new Promise(() => {});
  }
};
(globalThis as any).document = { fonts: { add() {} }, createElement: () => ({ getContext: () => null }) };

const file = process.argv[2];
if (!file) {
  console.error("usage: bun scripts/film_sound.ts <film module .tsx>");
  process.exit(2);
}
const mod = await import(new URL(file, `file://${process.cwd()}/`).href);
if (!Array.isArray(mod.SOUND)) {
  console.error(`${file} has no exported SOUND: Cue[]`);
  process.exit(1);
}
console.log(JSON.stringify({ sound: mod.SOUND, beats: mod.BEATS ?? null }, null, 1));
process.exit(0);
