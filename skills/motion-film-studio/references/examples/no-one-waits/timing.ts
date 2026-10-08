import l01 from "../../../public/wait/vo/l01.words.json";
import l02 from "../../../public/wait/vo/l02.words.json";
import l03 from "../../../public/wait/vo/l03.words.json";
import l04 from "../../../public/wait/vo/l04.words.json";
import l05 from "../../../public/wait/vo/l05.words.json";
import l06 from "../../../public/wait/vo/l06.words.json";
import l07 from "../../../public/wait/vo/l07.words.json";
import l08 from "../../../public/wait/vo/l08.words.json";
import l09 from "../../../public/wait/vo/l09.words.json";
import l10 from "../../../public/wait/vo/l10.words.json";
import l11 from "../../../public/wait/vo/l11.words.json";

/** Film #6 "No one waits" — 1080×1920, 30 fps. Narrator: Michael C. Vincent (ElevenLabs v3, one continuous take). */
export const WFPS = 30;
export const WDUR = 1170;
export const VO = { l01: 12, l02: 104, l03: 212, l04: 315, l05: 397, l06: 523, l07: 663, l08: 749, l09: 861, l10: 925, l11: 1017 } as const;
export type Line = keyof typeof VO;
type Words = { text: string; duration: number; words: { w: string; s: number; e: number }[] };
const WORDS: Record<Line, Words> = { l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11 };
export const ws = (line: Line, i: number) => VO[line] + WORDS[line].words[i].s * WFPS;
export const we = (line: Line, i: number) => VO[line] + WORDS[line].words[i].e * WFPS;
export const nwords = (line: Line) => WORDS[line].words.length;
