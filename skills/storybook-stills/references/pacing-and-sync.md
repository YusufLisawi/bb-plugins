# Pacing, sync, highlights and spoken-only text (round-2 rules)

The owner's notes on FLIGHT DELAYED Part 1 v2 (2026-10-25): "he rushed a lot of the motion (the rules, the day card and more); in some places it
doesn't even feel synced. There is a lot of circling and highlighting of things that aren't necessary, obvious things, and they are rushed too, we can't
even notice them. Highlighting is good so viewers understand, but it shouldn't be rushed. When there are boxes with text inside, the text must never
overflow." and later "on-screen text should be what is READ or SPOKEN, no piles of text the narrator doesn't say" and "remove the heartbeat / BPM meter".
These are now rules of the format. v3 of the film (`episodes/flight1v3/plan.py`) is the worked example.

## 1. Nothing rushed: the hold rule
- A card is on screen **at least (the time to read all its words aloud) + 1 s** (words ÷ 2.8 s + 1). Its animation finishes early (typing, draw-on,
  counting done within ~60 % of the hold) and then **breathes** (a slow push, a pulse): the viewer gets time with the finished card.
- **The narration waits for the graphic, not the other way round.** Put air after the sentence a card illustrates: the `air` column of script.tsv
  (`+2.4` = 2.4 s of silence). Typical: rule sentence → +1.3…2.4 s; the sentence that a diagram recaps → +2.4…3.6 s; a line before a name card → +1.2 s.
- **Split a long rule into two lines** (`rule1a` "Rule one. Don't fight the flow." / `rule1b` "Move with it, and slowly cut across it, toward the edge.")
  with their own air: the first gets the rule card, the second gets pictures, and the diagram plays in the silence after it.
- Pictures: 1.0–3.5 s. A picture under ~1 s only on a hit or a reaction. A graphic that must stay ≥ 1.5 s needs a shot of ≥ 2 s (or a card).
- Budget: v3 is 2:58 with the extra air: every second of air is paid for by tighter pictures elsewhere, never by squeezing a card.

## 2. Everything lands on its word (sync)
- **Cuts** at the word that names the new thing, **0.08 s early** (`"bite.bites-0.08"`): the picture is already there when the word is heard.
- **Every other beat starts ON its word, with no offset**: stamp (`WRONG MONEY` on "wrong"), counter, pip, ring, typed label, bubble, tag, board flip,
  a card's typed lines (`titleAt` / `titleTo`: type from the first word to the LAST word of the phrase, so typing ends when the narrator ends),
  the plane landing on "Seoul" (`flyAt` → `toAt`), the red 10th pip on "man". A beat between words is a bug unless it is a reaction (+0.1…0.3 s after).
- **Hits** (shake + burst + sound) on the word itself, or +0.1 s inside it.
- Diagram cards that play in the silence after a sentence run on their own clock (their items use seconds since the card began); the cut is on the
  last word. Their internals are exempt from the audit.
- **`python3 scripts/sync_audit.py <slug> [--tol 0.15]`** prints every cut, fx start, hit and card time with the narrator word it is nearest to and the
  distance (`!` = more than tol from any word start; `~` = the graphic comes BEFORE its word by > 0.25 s: it spoils the word). It also prints each card's
  hold against the read-aloud rule (`LOW <<<`) and shots that are too short / long. Read the table against the script: the semantic check (is that the
  word the graphic shows?) is yours. Intentional offsets are written down in the plan next to the line.
- Anchors: `"line.word"`, `"line.word#2"`, `"line.end"` (the last word's end), `"+0.3"`/`"-0.1"` offsets; hyphenated words work (`"who.twenty-seven,"`);
  punctuation is part of the word only to tell two occurrences apart (`"who.Chicago,"`). A word's own end: use `"line.end"` for a last word.

## 3. Fewer, better highlights
Keep a ring / arrow / label only when it teaches something the viewer would otherwise MISS: the bandage, the far-away man and officer (a loupe), the
badge reader's LED, the staircase sign next to "a grey door with a staircase on it", the escape route on a diagram. Never circle the obvious (a girl
standing alone, a door we are looking at, "the whole hall").
- Draw-on **0.7–0.8 s** (`dur`), the label types after the ring, the highlight **holds 2.2 s** (`hold`), then fades (0.4 s); it never lives on a shot < 2 s.
- Count highlights per film: v3 has 4 rings / labels + 5 name tags + 1 loupe + 1 LED; v2 had 25 rings and nobody could read them.
- Counters, pips, tags and stamps are not "highlights": they are the narrator's numbers and names made visible (200 people, ten ahead, DANI, WRONG MONEY).

## 4. On-screen text = what is read or spoken
- Labels, notes, cards, bubbles and tags carry **the narrator's own words** (or one keyword of them): FLIGHT ATTENDANT, DANI, KIT · nine · travelling alone,
  CHICAGO → SEOUL · SOUTH KOREA, 20 MINUTES AGO, ZOMBIE OUTBREAK, WRONG MONEY, NO SIGNAL, PEOPLE 200, CRUSH, BREATHE, the rule titles, the question.
- No unspoken clocks, day cards, BPM meters, sub-labels ("PEOPLE PER SQUARE METRE"), field names on documents. Cards have a **bare** mode: `gauge bare`
  (only the zone words you list), `guard bare` (ARMS UP / BREATHE typed on their words), `passport bare` (just the name, typed on "Leo."), `plan` without labels.
- Allowed non-narrated text: in-world signage (the Korean airport sign, a PA bubble) and the end card's call to action (COMMENT, FOLLOW, PART 2).
- **No heartbeat / BPM meter** (the owner called it unnecessary). A subtle heartbeat SOUND under one tense beat (−16 dB, every 0.9 s) is fine.
- A sound or a graphic is never added "for rhythm"; if nothing is said, the graphic is a recap diagram or the picture simply holds.

## 5. Same words, richer film: reuse the voice
FLIGHT DELAYED v2 → v3 changed the opening (three new hooks) and the air, not the voice: copy `public/<old>/vo/raw`, run `voice.py <slug> --reuse`
(it re-cuts the raw take for new `air` values; only a changed word needs a new take). For a new hook the whole narrator take is regenerated (one
continuous take keeps the flow), so write hooks first, then the rest.

## 6. Hooks (three variants before the film)
The first 2 s decide everything: say WHAT it is (a zombie outbreak) and put a stranger inside it. Never a vague phrase ("the dead got smarter").
Write three genuinely different openings (a question, the action, the trap), 12–20 s each, ending where the story flows into the next scene; answer
"who is the hero, where is he from, where has he landed" inside the first ~10 s (right after the hook line). Each hook is its own composition
(`FlightHookA/B/C`, plans in `episodes/flighthooks/plans.py`, bodies reusable in the film via `BODIES[x](h, end="queue.Your")`) and a short clip on R2
(`story-studio/tests/flight-hook-{a,b,c}.mp4`; a re-uploaded object keeps being served from Cloudflare's cache: use a NEW key for a fixed clip, `-b2`).
