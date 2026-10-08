import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Confetti, Grain, Sparkles, Stamp, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic, KWord } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, PEOPLE } from "../../kit/people";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/edu-maze/vo/lines.json";
import words from "../../../../public/films/edu-maze/vo/words.json";

loadFonts();

/**
 * EDUCATION · EXPLAINED: Guide, don't solve. A maze is the homework. A typical
 * chatbot draws a grey line straight through the walls to the exit — the answer,
 * handed over. The tutoring agent works differently: it's given the course
 * material and one rule, asks a question back when the student is stuck, and
 * lights the next corridor as a hint, then a smaller one, with the right lesson
 * page. Signature: the student walks out of the maze on their own. A second
 * student who's really lost gets their teacher. No music: footsteps, chalky taps.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const HOMEWORK = w("l01", 7);
const HAND = w("l02", 3);
const ANSWER = w("l02", 6);
const DROP = w("l03", 0) - 2;
const MATERIAL = w("l04", 5);
const RULE = w("l04", 8);
const GUIDE = w("l04", 9);
const SOLVE = w("l04", 11);
const STUCK = w("l05", 5);
const ASKS = w("l05", 7);
const HINT = w("l06", 3);
const SMALLER = w("l06", 6);
const PAGE = w("l06", 13);
const FINDS = w("l07", 2);
const OWN = w("l07", 8);
const LOST = w("l08", 4);
const TEACHER = w("l08", 8);
const HIT = T.VO.l09 - 8;
const TAG = [18, 21, 24, 27, 30].map((d) => HIT + d);
const CTA = w("l09", 2) + 4;
const URL = w("l09", T.nwords("l09") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l09") + 50);

const BG = "#EEF0FB";
const WALL = "#3B3F8F";
const PATH_HINT = "#FFC94A";

/* ── the maze: deterministic DFS on an 8 × 10 grid, solved by BFS ── */
const COLS = 8, ROWS = 10, CELL = 108, OX = 540 - (COLS * CELL) / 2, OY = 560;
type Cell = { r: number; c: number };
const MAZE = (() => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const open = new Set<string>(); // "r,c|r2,c2" passages
  const key = (a: Cell, b: Cell) => [`${a.r},${a.c}`, `${b.r},${b.c}`].sort().join("|");
  const seen = new Set<string>(["0,0"]);
  const stack: Cell[] = [{ r: 0, c: 0 }];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => ({ r: cur.r + dr, c: cur.c + dc })).filter((n) => n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS && !seen.has(`${n.r},${n.c}`));
    if (!nb.length) { stack.pop(); continue; }
    const n = nb[Math.floor(rand() * nb.length)];
    open.add(key(cur, n)); seen.add(`${n.r},${n.c}`); stack.push(n);
  }
  // BFS path from (0,0) to (ROWS-1, COLS-1)
  const prev = new Map<string, string>();
  const q: Cell[] = [{ r: 0, c: 0 }]; const vis = new Set(["0,0"]);
  while (q.length) {
    const cur = q.shift()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { r: cur.r + dr, c: cur.c + dc };
      const k = `${n.r},${n.c}`;
      if (n.r < 0 || n.r >= ROWS || n.c < 0 || n.c >= COLS || vis.has(k) || !open.has(key(cur, n))) continue;
      vis.add(k); prev.set(k, `${cur.r},${cur.c}`); q.push(n);
    }
  }
  const path: Cell[] = [];
  let k: string | undefined = `${ROWS - 1},${COLS - 1}`;
  while (k) { const [r, c] = k.split(",").map(Number); path.unshift({ r, c }); k = prev.get(k); }
  // walls: every cell edge that isn't a passage
  const walls: [number, number, number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1 && !open.has(key({ r, c }, { r, c: c + 1 }))) walls.push([c + 1, r, c + 1, r + 1]);
      if (r < ROWS - 1 && !open.has(key({ r, c }, { r: r + 1, c }))) walls.push([c, r + 1, c + 1, r + 1]);
    }
  return { path, walls };
})();
const P = MAZE.path;
const cx = (c: number) => OX + c * CELL + CELL / 2;
const cy = (r: number) => OY + r * CELL + CELL / 2;
const STUCK_AT = Math.floor(P.length * 0.3);
const H1 = Math.floor(P.length * 0.55);
const H2 = Math.floor(P.length * 0.78);

/** position along the solution path at progress u ∈ [0, len-1] */
const along = (u: number) => {
  const i = Math.max(0, Math.min(P.length - 1, Math.floor(u)));
  const j = Math.min(P.length - 1, i + 1);
  const t = u - i;
  return { x: mix(cx(P[i].c), cx(P[j].c), t), y: mix(cy(P[i].r), cy(P[j].r), t) };
};

const Lantern: React.FC<{ at: number; from: number; to: number; label: string }> = ({ at, from, to, label }) => {
  const f = useCurrentFrame();
  const g = tw(f, at - 2, at + 14, 0, 1, E.cubicInOut);
  if (g <= 0) return null;
  const pts = P.slice(from, to + 1);
  const n = Math.max(1, Math.round(g * (pts.length - 1)));
  const d = pts.slice(0, n + 1).map((p, i) => `${i ? "L" : "M"}${cx(p.c)} ${cy(p.r)}`).join(" ");
  const tip = pts[n];
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={d} fill="none" stroke={PATH_HINT} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <path d={d} fill="none" stroke={PATH_HINT} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", ...(cx(tip.c) > 640 ? { right: 1080 - cx(tip.c) + 30 } : { left: cx(tip.c) + 30 }), top: cy(tip.r) - 40, padding: "10px 18px", borderRadius: 16, background: "#FFF6D6", border: `3px solid ${PATH_HINT}`, fontSize: 28, fontWeight: 800, color: "#6B4E00", whiteSpace: "nowrap", opacity: tw(f, at + 4, at + 10, 0, 1, E.linear), zIndex: 20 }}>💡 {label}</div>
    </>
  );
};

export const EduMaze: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const draw = tw(f, 2, HOMEWORK, 0, 1, E.cubicInOut);
  // the chatbot's straight line through the walls, then reset at the drop
  const cheat = tw(f, HAND - 4, ANSWER, 0, 1, E.cubicInOut) * (1 - tw(f, DROP - 6, DROP + 2, 0, 1, E.linear));
  // the student's walk: to the junction, stuck, then out
  const u = f < DROP ? 0 : f < STUCK ? tw(f, DROP + 8, STUCK - 4, 0, STUCK_AT, E.cubicInOut) : f < FINDS ? STUCK_AT + tw(f, HINT, SMALLER, 0, H1 - STUCK_AT, E.cubicInOut) * (f >= HINT ? 1 : 0) + tw(f, SMALLER + 2, PAGE, 0, H2 - H1, E.cubicInOut) * (f >= SMALLER + 2 ? 1 : 0) : H2 + tw(f, FINDS - 2, OWN, 0, P.length - 1 - H2, E.cubicInOut);
  const cheatJump = f >= HAND && f < DROP ? tw(f, ANSWER - 4, ANSWER + 4, 0, 1, E.expoOut) : 0;
  const pos = cheatJump > 0 ? { x: mix(cx(0), cx(COLS - 1), cheatJump), y: mix(cy(0), cy(ROWS - 1), cheatJump) } : along(u);
  const stuckShake = f >= STUCK - 2 && f < STUCK + 14 ? Math.sin((f - STUCK) * 1.0) * 8 * (1 - (f - STUCK + 2) / 16) : 0;
  const out2 = tw(f, LOST - 8, LOST, 0, 1, E.expoIn);
  const headline = (k: string, from: number, to: number, ws: KWord[]) => <Kinetic key={k} from={from} to={to} y={150} size={76} width={980} align="center" color={WALL} hi={C.coral} words={ws} />;
  const hk = f < HAND - 4 ? "a" : f < DROP - 2 ? "b" : f < STUCK - 6 ? "c" : f < FINDS - 4 ? "d" : f < LOST - 6 ? "e" : "f";
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: BG }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: "0.2em", color: "#7C80C2" }}>AI, EXPLAINED · FOR SCHOOLS</div>
        {hk === "a" ? headline("a", T.VO.l01, HAND - 8, [{ t: "Can AI help students", at: w("l01", 0), br: true }, { t: "without doing", at: w("l01", 4) }, { t: "their homework?", at: w("l01", 6), hi: true }]) : null}
        {hk === "b" ? headline("b", HAND - 4, DROP - 8, [{ t: "Most chatbots", at: w("l02", 0) }, { t: "hand over", at: HAND, br: true }, { t: "the answer.", at: ANSWER, hi: true }]) : null}
        {hk === "c" ? headline("c", DROP + 2, STUCK - 10, [{ t: "One rule:", at: RULE, br: true }, { t: "guide,", at: GUIDE, hi: true }, { t: "don't solve.", at: SOLVE }]) : null}
        {hk === "d" ? headline("d", STUCK - 4, FINDS - 8, [{ t: "Stuck?", at: STUCK, hi: true }, { t: "A question back.", at: ASKS, br: true }, { t: "A hint.", at: HINT }, { t: "A smaller one.", at: SMALLER, hi: true }]) : null}
        {hk === "e" ? headline("e", FINDS - 2, LOST - 10, [{ t: "Out of the maze,", at: FINDS, br: true }, { t: "on their own.", at: w("l07", 6), hi: true }]) : null}
        {hk === "f" ? headline("f", LOST - 4, HIT - 10, [{ t: "Really lost?", at: LOST, hi: true, br: true }, { t: "The teacher knows.", at: TEACHER }]) : null}

        {/* the maze */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - out2 * 0.85, transform: `scale(${1 - out2 * 0.08})`, transformOrigin: "50% 60%" }}>
          <div style={{ position: "absolute", left: OX - 26, top: OY - 26, width: COLS * CELL + 52, height: ROWS * CELL + 52, borderRadius: 40, background: "#FFFFFF", boxShadow: "0 30px 70px rgba(59,63,143,.16)" }} />
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <rect x={OX} y={OY} width={COLS * CELL} height={ROWS * CELL} fill="none" stroke={WALL} strokeWidth={10} strokeDasharray={`${CELL * 0.9} 0`} pathLength={1} />
            {MAZE.walls.map(([x1, y1, x2, y2], i) => {
              const v = clamp(draw * MAZE.walls.length * 1.2 - i * 1.0, 0, 1);
              return v > 0 ? <line key={i} x1={OX + x1 * CELL} y1={OY + y1 * CELL} x2={OX + mix(x1, x2, v) * CELL} y2={OY + mix(y1, y2, v) * CELL} stroke={WALL} strokeWidth={10} strokeLinecap="round" /> : null;
            })}
          </svg>
          {/* start + exit flags */}
          <div style={{ position: "absolute", left: OX - 6, top: OY - 70, fontSize: 30, fontWeight: 850, color: WALL }}>START</div>
          <div style={{ position: "absolute", left: OX + COLS * CELL - 90, top: OY + ROWS * CELL + 28, fontSize: 30, fontWeight: 850, color: C.green }}>EXIT 🏁</div>

          {/* the chatbot cheat: a grey line straight through the walls */}
          {cheat > 0.01 ? (
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <line x1={cx(0)} y1={cy(0)} x2={mix(cx(0), cx(COLS - 1), cheat)} y2={mix(cy(0), cy(ROWS - 1), cheat)} stroke="#9AA0B4" strokeWidth={16} strokeDasharray="4 22" strokeLinecap="round" />
            </svg>
          ) : null}
          {f >= HAND - 4 && f < DROP ? (
            <div style={{ position: "absolute", left: 600, top: 380, display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderRadius: 22, background: "#E3E5EE", color: "#4A5065", fontSize: 32, fontWeight: 800, opacity: tw(f, HAND - 4, HAND + 4, 0, 1, E.linear), transform: `rotate(-3deg) scale(${tw(f, HAND - 4, HAND + 6, 0.6, 1, E.backOut)})` }}>
              <Icon name="message" size={34} color="#4A5065" stroke={2.2} /> "The answer is 4."
            </div>
          ) : null}
          {f < DROP - 4 ? <Stamp at={ANSWER + 6} text="LEARNED NOTHING" x={540} y={1180} rot={-10} size={70} color="#8A90A6" /> : null}

          {/* hints */}
          {f >= HINT - 2 && f < LOST ? <Lantern at={HINT} from={STUCK_AT} to={H1} label="Isolate x first" /> : null}
          {f >= SMALLER - 2 && f < LOST ? <Lantern at={SMALLER} from={H1} to={H2} label="Subtract 3 from both sides" /> : null}

          {/* the student */}
          <div style={{ position: "absolute", left: pos.x - 44 + stuckShake, top: pos.y - 44, zIndex: 25, transform: `scale(${f < DROP ? 1 : 1 + 0.05 * Math.sin(f / 4)})` }}>
            <Face p={PEOPLE.wei} size={88} ring={C.coral} />
            {f >= STUCK - 2 && f < HINT ? <div style={{ position: "absolute", left: 70, top: -40, fontSize: 64, fontWeight: 900, color: C.coral, transform: `scale(${tw(f, STUCK - 2, STUCK + 6, 0.4, 1, E.backOut)})` }}>?</div> : null}
          </div>
          {f >= OWN - 2 && f < LOST ? <Confetti at={OWN - 2} x={cx(COLS - 1)} y={cy(ROWS - 1)} n={50} /> : null}
          {f >= OWN && f < LOST ? (
            <div style={{ position: "absolute", left: 140, top: 1720, display: "flex", alignItems: "center", gap: 14, padding: "16px 28px", borderRadius: 999, background: C.green, color: "#FFF", fontSize: 38, fontWeight: 850, transform: `scale(${tw(f, OWN, OWN + 8, 0.6, 1, E.backOut)})` }}>
              <Icon name="check" size={36} color="#FFF" stroke={3.4} /> Solved it myself
            </div>
          ) : null}
        </div>

        {/* l04: course material + the rule, into the agent */}
        {f >= DROP - 2 && f < STUCK + 2 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1690, display: "flex", justifyContent: "center", gap: 18, opacity: 1 - tw(f, STUCK - 6, STUCK, 0, 1, E.linear) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px 14px 14px", borderRadius: 26, background: C.coral, color: "#FFF", fontSize: 32, fontWeight: 850, transform: `scale(${tw(f, DROP - 2, DROP + 8, 0.5, 1, E.backOut)})` }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mark height={34} color="#FFF" stroke={26} /></div> Tutor agent
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 26, background: "#FFF", color: WALL, fontSize: 30, fontWeight: 800, opacity: tw(f, MATERIAL - 4, MATERIAL + 2, 0, 1, E.linear), transform: `scale(${tw(f, MATERIAL - 4, MATERIAL + 6, 0.5, 1, E.backOut)})` }}><Icon name="book" size={32} color="#5E6AD2" stroke={2.3} /> Your course</div>
          </div>
        ) : null}

        {/* l05: the question back */}
        {f >= ASKS - 4 && f < FINDS ? (
          <div style={{ position: "absolute", left: 60, right: 60, top: 1660, display: "flex", alignItems: "flex-end", gap: 16, opacity: tw(f, ASKS - 4, ASKS + 2, 0, 1, E.linear) * (1 - tw(f, FINDS - 6, FINDS, 0, 1, E.linear)) }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Mark height={44} color={C.cream} stroke={26} /></div>
            <div style={{ padding: "18px 26px", borderRadius: "30px 30px 30px 8px", background: "#FFF", boxShadow: "0 14px 34px rgba(59,63,143,.14)", fontSize: 36, color: C.ink }}>
              {f < PAGE ? "What do you already know about the first step?" : <>Lesson 4, page 12 has an example like this one 📖</>}
            </div>
          </div>
        ) : null}

        {/* l08: a second student, really lost → the teacher */}
        {f >= LOST - 8 ? (
          <div style={{ position: "absolute", inset: 0 }}>
            {(() => {
              const s = springAt(f, LOST - 6, 30, 12, 160);
              const t = springAt(f, TEACHER - 4, 30, 12, 170);
              return (
                <>
                  <div style={{ position: "absolute", left: 120, top: 760, transform: `scale(${clamp(s)})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div style={{ transform: `rotate(${Math.sin(f / 5) * 10}deg)` }}><Face p={PEOPLE.jonas} size={200} /></div>
                    <div style={{ fontSize: 34, fontWeight: 800, color: WALL }}>Sam · question 3</div>
                    <div style={{ fontSize: 30, color: C.gray }}>5 tries, still lost</div>
                  </div>
                  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: tw(f, TEACHER - 6, TEACHER, 0, 1, E.linear) }}>
                    <path d="M 400 860 C 520 760, 600 760, 700 860" fill="none" stroke={C.coral} strokeWidth={8} strokeDasharray="14 14" strokeDashoffset={-f * 2} />
                  </svg>
                  <div style={{ position: "absolute", left: 700, top: 760, transform: `scale(${clamp(t)})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <Face p={PEOPLE.eleanor} size={200} />
                    <div style={{ fontSize: 34, fontWeight: 800, color: WALL }}>Ms. Eleanor</div>
                  </div>
                  <div style={{ position: "absolute", left: 80, right: 80, top: 1140, padding: "26px 30px", borderRadius: 30, background: "#FFF", boxShadow: "0 20px 50px rgba(59,63,143,.16)", opacity: tw(f, TEACHER + 2, TEACHER + 10, 0, 1, E.linear), transform: `translateY(${(1 - tw(f, TEACHER + 2, TEACHER + 12, 0, 1, E.expoOut)) * 60}px)` }}>
                    <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.coral }}>TEACHER NOTIFIED</div>
                    <div style={{ fontSize: 40, fontWeight: 800, color: C.ink, marginTop: 8 }}>Sam is stuck on question 3. Summary + the hints already given.</div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}
        {f >= OWN ? <Sparkles x={560} y={1500} w={460} h={300} at={OWN} color="#FFC94A" size={40} seed={2} /> : null}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/edu-maze/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  cue(2, "draw", -8, "the maze draws itself"),
  cue(30, "draw", -12, "walls"),
  cue(HAND - 4, "receive", -7, "chatbot answer"),
  cue(HAND, "whoosh", -8, "line through the walls"),
  cue(ANSWER - 4, "zoom", -9, "student teleports"),
  cue(ANSWER + 6, "seal", -5, "LEARNED NOTHING"),
  cue(DROP - 6, "scratch", -6, "rewind"),
  cue(DROP - 2, "poweron", -6, "tutor agent"),
  cue(MATERIAL - 4, "pop", -8, "course material"),
  cue(RULE, "chime", -8, "the rule"),
  ...Array.from({ length: 5 }, (_, i) => cue(DROP + 10 + i * 8, "tap", -13, `step ${i + 1}`)),
  cue(STUCK - 2, "miss", -6, "stuck"),
  cue(ASKS - 4, "receive", -6, "a question back"),
  cue(HINT - 2, "shimmer", -7, "hint lantern"),
  cue(SMALLER - 2, "shimmer", -8, "smaller hint"),
  cue(PAGE - 4, "paper", -7, "lesson page"),
  ...Array.from({ length: 6 }, (_, i) => cue(FINDS + i * 6, "tap", -12, `walk out ${i + 1}`)),
  cue(OWN - 2, "spark", -5, "out of the maze"),
  cue(OWN, "check", -6, "solved it myself"),
  cue(LOST - 6, "whoosh", -9, "a lost student"),
  cue(TEACHER - 4, "ping", -6, "teacher notified"),
  cue(TEACHER + 2, "pop", -9, "summary card"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, HIT, CTA, URL, DUR };

export const EDUMAZE: FilmDef = { id: "EduMaze", slug: "edu-maze", title: "Education · Explained · The maze", component: EduMaze, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/edu-maze/mix.wav" };
