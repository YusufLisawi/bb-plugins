# The CTA end card (`card.kind = "cta"`)

Every series part ends on a cliffhanger question; the end card turns it into engagement (comments, follows) in 6–10 s, in code, on the
film's own look (charcoal + blurred last picture + inked paper pieces). Reusable: only the strings and the anchors change.
Built for FLIGHT DELAYED Part 1 v2 (`src/kit/stills/cards2.tsx`, `CtaCard`); last 10 s of `episodes/flight1v2/plan.py`.

## What the viewer sees (timings are anchors into the last narration line)
| beat | what happens | anchor |
|---|---|---|
| 0 | blurred, darkened last picture + drifting dust; the question TYPES on two lines, big (HIDE in yellow, RUN in red) with a caret | line start (`ask`), 16 chars/s |
| 1 | option card **1 · HIDE** pops (backOut), border pulses; the stairs pictogram | `options[0].at` ("hidden") |
| 2 | option card **2 · RUN** pops, an animated running figure + door arrow | `options[1].at` ("run") |
| 3 | a paper pill "Comment 1 or 2" with a red speech bubble and a bouncing arrow types itself | `commentAt` (the "exit?" word + 0.3) |
| 4 | the question shrinks to the top-left, options + comment pill slide into the left column; the PART 2 polaroid (taped, tilted, teaser picture, **STRANDED**, red PART 2 tag) flies in from the right | `partAt` ("Part") |
| 5 | the next part's hook types under the polaroid, three short lines ("The doors are locked. / The phones are dead. / And they are getting smarter.") | `hookAt` |
| 6 | the red **FOLLOW FOR PART 2** pill pops with a ringing bell, a pulsing ring and a tapping finger; then the fade to black | `followAt` (narration end + 0.1) |

## Plan entry
```python
C({"kind": "cta", "question": ["WOULD YOU HIDE UPSTAIRS", "OR RUN FOR THE EXIT?"], "hi": ["HIDE", "RUN"],
   "options": [{"n": "1", "label": "HIDE", "sub": "WAIT IT OUT UPSTAIRS", "icon": "stairs", "at": "ask.hidden-0.1"},
               {"n": "2", "label": "RUN", "sub": "TAKE THE EXIT", "icon": "run", "at": "ask.run-0.1"}],
   "comment": "Comment 1 or 2", "commentAt": "ask.exit+0.3",
   "partAt": "ask.Part-0.1", "part": "PART 2", "title": "STRANDED",
   "hook": ["The doors are locked.", "The phones are dead.", "And they are getting smarter."], "hookAt": "ask.Part+0.9",
   "img": "66_teaser", "bg": "65_horror", "followAt": "ask.end+0.1", "follow": "FOLLOW FOR PART 2"}, "ask")
```
`img` = the teaser picture (a Part-2 picture drawn for this: the glass terminal at night with a crowd frozen at the glass); `bg` = the
picture blurred behind everything (the last story picture). Both are art names (no extension). `icon`: `stairs` | `run`.

## Rules
- The question is the narrator's last question, shortened to two lines of ≤ 24 characters (the typewriter is sized for that).
- Two answers only, numbered, one word each; the viewer answers with "1" or "2" (fast to type = more comments).
- The teaser is a *situation* (locked doors, dead phones, they are getting smarter), never a spoiler of the answer.
- Narration for the last line: question, then "Part two: <title>" and a silent tail of ≥ 3 s (`tail` in the plan) so FOLLOW has time to land.
- No fake poll results, no "link in bio", no loud sound: the card is silent except the room bed fading out.
- Total 6–10 s: shorter feels cut, longer bleeds retention. The card's own fade-out is the film's `fadeOut`.
