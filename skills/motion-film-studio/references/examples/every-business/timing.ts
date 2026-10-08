import c1 from "../../../public/answers/cast/c1.words.json";
import c2 from "../../../public/answers/cast/c2.words.json";
import c3 from "../../../public/answers/cast/c3.words.json";
import c4 from "../../../public/answers/cast/c4.words.json";
import c5 from "../../../public/answers/cast/c5.words.json";
import l01 from "../../../public/answers/vo/l01.words.json";
import l02 from "../../../public/answers/vo/l02.words.json";
import l03 from "../../../public/answers/vo/l03.words.json";
import l04 from "../../../public/answers/vo/l04.words.json";
import l05 from "../../../public/answers/vo/l05.words.json";
import l06 from "../../../public/answers/vo/l06.words.json";
import l07 from "../../../public/answers/vo/l07.words.json";
import l08 from "../../../public/answers/vo/l08.words.json";
import l09 from "../../../public/answers/vo/l09.words.json";
import l10 from "../../../public/answers/vo/l10.words.json";
import l11 from "../../../public/answers/vo/l11.words.json";

/**
 * Film #4 — "Every business runs on questions". 1080×1920, 30 fps.
 * Four customers ask (four ElevenLabs v3 voices, one in Spanish), then the
 * narrator (Liam, one continuous take) carries the film. Music take a2 (Music
 * v2.5, 120 BPM) starts 2.0 s into the file so its kick enters with the
 * narrator (6.0 s) and its drop lands on the mark reveal (14.0 s = f420).
 */
export const AFPS = 30;
export const AW = 1080;
export const AH = 1920;
export const ADUR = 1215;
export const DROP = 420;
export const HIT = 1020;

/** customer questions (the hook) */
export const CAST = { c1: 3, c2: 39, c3: 88, c4: 123, c5: 0 } as const;
/** narrator lines */
export const VO = { l01: 177, l02: 243, l03: 342, l04: 446, l05: 593, l06: 720, l07: 813, l08: 870, l09: 941, l10: 1016, l11: 1100 } as const;
export type Line = keyof typeof VO;
export type Cast = keyof typeof CAST;

type Words = { text: string; duration: number; words: { w: string; s: number; e: number }[] };
const WORDS: Record<Line | Cast, Words> = { c1, c2, c3, c4, c5, l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11 };
const START: Record<Line | Cast, number> = { ...CAST, ...VO };

/** Frame where word `i` of a line (or a customer's question) starts / ends. */
export const ws = (line: Line | Cast, i: number) => START[line] + WORDS[line].words[i].s * AFPS;
export const we = (line: Line | Cast, i: number) => START[line] + WORDS[line].words[i].e * AFPS;
export const lineEnd = (line: Line | Cast) => we(line, WORDS[line].words.length - 1);
export const nwords = (line: Line | Cast) => WORDS[line].words.length;
