# Story writing: the writers' room method + series canon

Use this for **any story**: a short, a series part, a long-form YouTube episode or a remake. It sits on top of the
[Writers Room Story Engine](writers-room/README.md) (MIT, vendored) and adds the owner's rules. Format files
(`format-*.md`, what-if-shorts `writing.md`) cover line craft and pacing. This file covers whether the story *works*.

> [!IMPORTANT] Owner rules (each one came from a rejected draft)
> 1. **Story first.** Write the story doc, get an explicit "approved", and only then voice or build anything.
> 2. **No plot holes and no loose lore.** Every world rule is shown on screen and then **tested**. Every twist comes from a planted detail.
> 3. **Momentum.** Every chapter ends on a hook. Beats link with *but* or *therefore*, never *and then*.
> 4. **Simple words** that anyone understands. Few numbers. No ages. A male lead unless the user asks otherwise.
> 5. **Canon persists.** One series bible per world. Read it before writing; update it after approval.

## 1 · Diagnose the stage (writers-room `designing-stories.md`)
Ask what already exists: a premise, a core, an ending direction, a protagonist, beats, a world, a draft.
Build only what's missing, in order. **Sequels and long-forms start from the bible** (§ 4), never from memory.

## 2 · The foundation (`creating-story-foundations.md`)
Put these at the top of the story doc, in tables:
- **3 seeds → the strongest one, and why** (skip this when continuing an approved series)
- **Logline**, **what it's really about** (the theme in one line), **ending direction** (what the climax must test)
- **Protagonist engine:** want, need, lie, ghost, spine, comfort zone, pressure, stakes, and how he changes. The climax must
  test the **lie**. Give him a small visible habit that carries the arc (Jake counts things, so in the end he counts *people*).
- **Story Spine:** Once upon a time / Every day / But one day / Because of that ×2 / Until finally / Ever since then

## 3 · The world as pressure (`building-storyworlds.md`)
Write a **rules table**: rule, where it's planted, where it's tested. Use 3–5 rules. Each rule must change a choice or cost
something. If a rule never pressures the hero, cut it.

## 4 · The series bible: canon that persists across generations
For each world, keep `episodes/_series/<series>/bible.md` (example: `dead-quiet/bible.md`). It holds:
- **world rules**, **people** (the facts that must stay true), **places**, **supplies or state** at the end of each part,
  a **timeline**, **open threads** and a **change log**
- a status on every fact: `CANON` (aired or approved) or `DRAFT`

**Before writing:** read the whole bible, and the scripts of every aired part (`episodes/<slug>/script.tsv`).
List any new facts your draft adds.
**After approval:** turn those DRAFT facts into CANON, extend the timeline, and close the threads you paid off.
**Changing canon:** only with the user's explicit OK, and logged in the change log.
**Retcon test:** for each scene, ask whether it contradicts something a viewer has already seen (a number, a name, a
rule, a look, a time of day). If it does, rewrite the scene, not the canon. A detail an earlier part *left unexplained* (a
glow, a blink) is the best place to plant the next twist.

## 5 · Chapters and scenes (`writing-story-scenes.md`)
For each chapter, write: the length, **But / Therefore** beats, the rule taught or tested, the **twist**, and the
**cliffhanger line**. Every scene needs an objective, an obstacle and a turn. Never let a chapter just stop.
Show the lie in action at least once before the midpoint. The midpoint must change direction (in Dead Quiet, Jake leaves the farm).

## 6 · Plot-hole Q&A, then revision (`revising-stories.md`)
End the doc with 10 or more "why didn't they just…?" questions, each answered *by the story*. Then run the revision
diagnostics, highest-level failure first: passive hero? and-then beats? coincidence rescue? an ending that doesn't test the
core? Fix the structure before polishing lines.

## 7 · Long-form (YouTube 16:9, 10–15 min)
- **Pace:** about 2.3–2.5 words a second (shorts run 2.8–3.0), a cut about every 3 s, longer holds on faces, real silences before twists.
  That's about 2,000 words for 13–14 minutes.
- **Structure:** 6–8 chapters of 1:40–2:00. Each one ends on a cliffhanger, so it can be cut into a Short or Reel later.
  Open each Short on a "rule" line in the what-if style.
- **Reuse:** an aired Part 1 becomes Chapter 1, re-framed for 16:9. Keep its lines, and add only what sets up the arc (the ghost).
- **Voice:** a steady narrator (Fish "Adrian", `bf322df2096a46f18c579d0baa36f41d`, or as the user asks). Audition about 20 s before the full record.

## 8 · Doc template
`episodes/_series/<series>/<part>.md`: the core table, the protagonist table, the rules table, the cast, a chapter
flow (mermaid), the chapters, a collapsible plot-hole Q&A, cutting notes for Shorts, and an approval checklist.
Example: `episodes/_series/dead-quiet/long-form-1.md`.
