# Text never overflows: the fit rule (`src/kit/stills/fit.ts`)

The owner's screenshot: the taped note "STOP LISTENING TO THE WORDS" ran past the right edge of its box. The cause was a box sized from a guessed
character count. **Rule: every boxed text measures itself with the real font, wraps at word boundaries, shrinks if it must, and the box is derived from
the measured text, never guessed. A box also stays inside the VISIBLE frame (the camera push crops the picture).**

## The helpers
| helper | what it does |
|---|---|
| `measure(txt, {family, weight, size, ls})` | width in px (canvas 2D with the real font; cache dropped when a web font finishes loading) |
| `wrap(txt, font, maxW)` | greedy word wrap; a single word wider than `maxW` is broken between characters (Korean, URLs) |
| `fit(txt, font, maxW, {maxLines, minScale, maxH})` → `{lines, size, lh, w, h}` | one line at the nominal size, then wrapped (≤ maxLines), then smaller down to 28 %; **never returns a line wider than maxW** |
| `fit1(txt, font, maxW)` → `{text, size, w}` | ONE line that must stay one line (a title, a button, a status): shrinks to 30 %, only a pathological string ends in "…" |
| `fitAll(texts, font, maxW)` | several texts that share ONE size (the lines of a note, the rows of a card): the smallest size any needs |
| `wordCut(text, n, options?)` | renders the FULL final line as stable word spans; only opacity/colour changes. Returns a React node, never a substring. SVG default; HTML uses `{as: "span"}` |
| `typedLines(lines, n, options?)` | full already-wrapped lines with every word retained in place; applies the same fixed-layout reveal line by line |
| `typedN(len, t, at, to, cps)` | characters typed at time t: linear `at → to` (finishes with the narrator's phrase) or `cps` from `at` |
| `safeRect(cam, W, H)` / `keepInside(cx, cy, w, h, rect, rot)` | the part of the frame still visible under the shot's zoom / origin / drift, and a box slid inside it (rotation aware) |

## Fixed layout during voice sync (owner rule, 2026-11-02)

Lay out and measure the **whole final line before the first word appears**. Render every word from the first frame, including the unspoken words. Hide those words with `opacity: 0`, or use a dim state near 30% and highlight the spoken word. Animate only opacity and colour (or a fixed rounded highlight); never append, remove, resize, translate or re-wrap individual words during the reveal. The final line's anchor and the box's dimensions must remain unchanged.

`wordCut`, `typedLines`, and `typed` now return React word spans containing the full text. Render the returned node inside `<text>`; do not call string operations on it, measure it, concatenate it, or pass it to `fit`. Fit the original full string once. HTML callers request `{as: "span"}`. Optional `{dim: 0.3, colour: (word, index) => ...}` controls the dim/highlight style without changing geometry. Existing `n`, `cps` and timing windows control visibility only. Where word timings exist, use each word's actual timestamp.

This is the default throughout the engine, including bubbles, signs, notes, captions, phone chat, rule cards and CTA text. Chunked captions may replace a complete phrase at a chunk boundary, but each phrase must retain its final layout throughout its reveal. Run `bun scripts/test-stills-reveal.tsx` in story-studio and inspect frames before, during and after a reveal.

For **HE STILL CALLS**, titles and rule cards use **Barlow Condensed ExtraBold (800)**. Small labels and page text use clean **Barlow/Inter sans**. No handwriting, marker, typewriter or decorative font. Create the Hitchcock mood through framing, black/off-white and one red accent.

## Where it is applied (all of them; add it to any new boxed text)
notes (width from `fitAll`, height from the lines, clamped), tags (text + typed sub-line), speech / translation bubbles (box sized from the largest content it
will ever hold: text, its replacement, the translation), stamps (text + sub, 2 lines max), counter pills (sized from the widest value), circle / arrow labels
(clamped inside the safe rect), sign text (one line fitted to the sign rectangle), and every card: day, rule (title 2 lines max, small text 3), ledger, tally, flight
labels, ago, plan labels / texts, gauge, guard, passport name, and the CTA (question: ONE size for both lines so the wider fits the frame; options, comment, follow,
polaroid caption, hook lines).

## Verify (never skip)
`episodes/fitlab/plan.json` (`FitLab`) renders every boxed text with absurdly long English and Korean strings; look at its frames
(`scripts/peek.sh fitlab FitLab <times> 0.5 2`) after ANY change to a boxed text, and look at the real film's frames. Add the new case to FitLab when you add a boxed text.
`python3 scripts/check_fx.py` also fails when a declared fx / card kind has no render case (a switch with a missing `case` renders NOTHING and TypeScript is
silent: the `ripple` rings were missing for hours after a refactor, found only by looking at a frame).

## Korean (or any non-Latin) text in code
- The art stays text-free; real signage is typed in code: `{"kind": "signtext", x, y, w, h, text: "출구", ko: true, at: "q.where"}` (the four blank rows of the big
  blue sign in `05_sign`: 출구 exit · 입국심사 immigration · 수하물 baggage · 계단 stairs), or a bubble `{"kind": "bubble", ..., "ko": true, "text": "승객 여러분, 비상 상황입니다.", "sub": "(translation)", "subAt": …}`.
- Font stack `FONT_KR` (src/kit/flat/fonts.ts): Noto Sans CJK KR installed on this machine; Apple SD Gothic Neo / Malgun Gothic on a viewer's device. No web font
  (a Korean web font is tens of MB). Check the glyphs on a frame: a missing font draws boxes.
- A translation line is shown only when the narrator does not say the meaning; if the hero cannot read it, leave it untranslated (that is the point of the scene).
