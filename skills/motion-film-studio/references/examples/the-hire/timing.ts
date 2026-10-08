import l01 from "../../../public/hire/vo/l01.words.json";
import l02 from "../../../public/hire/vo/l02.words.json";
import l03 from "../../../public/hire/vo/l03.words.json";
import l04 from "../../../public/hire/vo/l04.words.json";
import l05 from "../../../public/hire/vo/l05.words.json";
import l06 from "../../../public/hire/vo/l06.words.json";
import l07 from "../../../public/hire/vo/l07.words.json";
import l08 from "../../../public/hire/vo/l08.words.json";
import l09 from "../../../public/hire/vo/l09.words.json";
import l10 from "../../../public/hire/vo/l10.words.json";
import l11 from "../../../public/hire/vo/l11.words.json";
import l12 from "../../../public/hire/vo/l12.words.json";
import l13 from "../../../public/hire/vo/l13.words.json";

/** Film #7 "The hire" — 1080×1920, 30 fps. Narrator: Michael C. Vincent (ElevenLabs v3, one continuous take). */
export const HFPS = 30;
export const HDUR = 1275;
export const VO = { l01: 10, l02: 94, l03: 162, l04: 229, l05: 282, l06: 348, l07: 410, l08: 521, l09: 642, l10: 795, l11: 955, l12: 1038, l13: 1130 } as const;
export type Line = keyof typeof VO;
type Words = { text: string; duration: number; words: { w: string; s: number; e: number }[] };
const WORDS: Record<Line, Words> = { l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12, l13 };
export const ws = (line: Line, i: number) => VO[line] + WORDS[line].words[i].s * HFPS;
export const we = (line: Line, i: number) => VO[line] + WORDS[line].words[i].e * HFPS;
export const nwords = (line: Line) => WORDS[line].words.length;
