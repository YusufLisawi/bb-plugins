/**
 * The voice is the clock. `scripts/split_take.py` writes, per film:
 *   public/films/<id>/vo/lines.json          { "l01": 12, "l02": 104, … }   line start frames
 *   public/films/<id>/vo/lNN.words.json      word timings inside each clip (seconds)
 * `makeTiming` turns them into frame helpers. Every animation that belongs to a
 * word is keyed to ws(line, i) — never to a hand-typed frame number — so a new
 * read re-times the whole film automatically.
 */
export type Words = { text: string; duration: number; words: { w: string; s: number; e: number }[] };

export const makeTiming = <K extends string>(lines: Record<K, number>, words: Record<K, Words>, fps = 30) => {
  const VO = lines;
  /** frame where word i of a line starts */
  const ws = (line: K, i: number) => VO[line] + words[line].words[Math.max(0, Math.min(i, words[line].words.length - 1))].s * fps;
  /** frame where word i of a line ends */
  const we = (line: K, i: number) => VO[line] + words[line].words[Math.max(0, Math.min(i, words[line].words.length - 1))].e * fps;
  const nwords = (line: K) => words[line].words.length;
  const lineEnd = (line: K) => we(line, nwords(line) - 1);
  /** the spoken words of a line, e.g. to build a Kinetic headline quickly */
  const said = (line: K) => words[line].words.map((w, i) => ({ t: w.w, at: ws(line, i) }));
  return { VO, ws, we, nwords, lineEnd, said, fps };
};

/** Seconds → frames (for placeholder timings before the voice exists). */
export const sec = (s: number, fps = 30) => Math.round(s * fps);
