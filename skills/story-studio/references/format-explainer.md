# Format: the explainer (chess.history style)

The user: *"I love this style, I adore it for explainers and actually any possible video — its
animations and directing are great."* Reference episode: **`cobra-effect`** (THE COBRA EFFECT,
67 s): `src/episodes/cobra-effect/{beats.ts, sets.tsx, CobraEffect.tsx, sound.ts}`.

## How I think about an explainer

1. **Pick a concept people half-know, told as a story with a turn.** Not "what is X" but "a
   government paid for dead cobras… and got more cobras". History, money, psychology, physics —
   anything with a cause → surprising effect. Name the concept only after the story has earned it
   ("Economists call it… the cobra effect"), then generalise it in one sentence, then give 2–3
   modern echoes (schools/tests, clicks), then a famous one-line law, then a question to the viewer.
2. **Short punchy fragments.** "It worked." "Then the numbers kept going up. And up." "They let
   them go." 150–200 words for 60–70 s. Narrator: Michael (approved) `uju3wxzG5OhpWcoi3SMy`,
   tempo 1.03, one v4 tag per line (`[intrigued] [confident] [amused, low] [dramatic] [grim]
   [explaining] [thoughtful] [quiet, intriguing]`).
3. **Honesty.** If the famous story is anecdotal, say so in the script ("so the story goes") and keep
   numbers illustrative and round. Verifiable details (Hanoi 1902 rat tails, Goodhart's law) are
   stated plainly.
4. **One visual idea per line.** Write the shot list next to the script before any code: place card
   → character + prop → a document that changes (notice → CANCELLED) → a number that climbs →
   the turn (lids fly off) → before/after → the gold title → a diagram → the modern split-screen →
   the metaphor (shoot the arrow, paint the target around it) → the question.

## Visual language (from the chess.history videos)

| Element | How | Kit |
|---|---|---|
| Characters | bobble heads: skin-tone face, brows, nose, blush, beard/moustache, period hats (pith, turban, kepi), `bobble: 1.5` | `Puppet` with `o.face`, `o.bobble`, `o.hat` |
| Sets | frontal flat-vector compositions in 3–4 parallax planes (far gate/sky, mid buildings, near awnings), strong depth of field (`Layer depth dof`), warm practical light, deep teal shadows | `src/episodes/cobra-effect/sets.tsx` |
| Place/time | spaced gold serif capitals between thin gold rules: `DELHI · 1890s` | `PlaceCard` |
| Documents | paper notice slides in, a stamp slams across it | `Notice stampAt` |
| Numbers | big gold Anton counters that settle on round values; a gold line chart that runs off its panel; before/after bars | `Counter`, `RiseChart`, `Bars` |
| The concept's name | gold serif title with a moving sheen, the hero object behind it | `GoldTitle` |
| Diagrams | REWARD → THE NUMBER ↑ / THE RESULT ✕ boxes with drawn arrows | inline in the episode |
| Animals/props | code SVG with continuous motion (cobra sway + tongue, slithering, running rats) | `src/kit/creatures.tsx` |
| Transitions | a hard-edged wipe with a glowing gold seam (the film's own move) | `Wipe` in CobraEffect.tsx |
| Captions | Nunito 900, white with black stroke, active word lime `#9BDD4F`, keywords gold/coral, up to 4 words | `Captions st={{ font: F.nunito, weight: 900, … }}` |

Palette: ink `#10191A`, teal `#123D3B`, brown `#49301F`, cream `#F0DFB8`, gold `#E9B84D`,
coral `#F06C59`, lime `#9BDD4F`. Music: playful curious documentary (pizzicato, light tabla or a
period colour), sections on the story beats; SFX on every object (paper, stamp, coins, hiss, lids,
squeaks, brush strokes, arrow thunk, gold title hit).

## Finance explainers (same style)

Same grammar with money: a named character with a problem (Tom has £100,000 he can't explain),
the mechanism step by step with documents and counters (cash-only shop, fake sales, the tax paid,
the clean remainder), the concept's name card (THE LAUNDROMAT / PLACEMENT · LAYERING · INTEGRATION),
a modern echo, the question. Keep it educational and non-instructional (explain how investigators
catch it too).
