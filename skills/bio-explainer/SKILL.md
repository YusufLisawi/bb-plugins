---
name: bio-explainer
description: "The Story Studio 'biography explainer' format (MUSK ES, 2026-11, Spanish, 16:9, ~10 min): a flat 2-D stickman history of one person in about 160 Nano Banana pictures (Google Flow, free) with code motion graphics on most beats (chapter cards, cheque, money bars, bets, price bars, FALLÓ/ÓRBITA stamps, calendar pages, route map, charts, timeline, career map, end card) and two Omni clips (hook + finale). Use for any 'La historia completa de X' / 'The full story of X' video, biography, company history or explainer in this look, in any language: it gives the film.py table (one row per picture with word anchor, prompt, refs, fx), the cast-sheet-first recipe, the Flow batch runner, the audit loop and the traps we hit."
---

# Biography explainer (flat stickman, Nano Banana + code graphics)

First built for **MUSK ES** (`episodes/musk-es/`, composition `MuskES`, branch `ep/musk-es`, owner-approved milestone 1 on 2026-11-01).
Look = the flat-stickman skill's cousin: big round PLAIN WHITE heads, thick black outlines, two dot eyes, thin stick limbs, round white
mitten hands, flat colour clothes, soft oval shadows, cream backgrounds for gags, detailed-but-flat places. Accents: red Tesla/crisis, blue
space/Twitter, gold money, purple AI. **Our own compositions, never a redraw of the reference video's frames; no real logos (names are code tags).**

## Production split (owner, 2026-11-01: use this from the next film on)

Google flagged "unusual activity" after ~5 h of nonstop Flow image jobs, so the bulk work moves to Codex:
- **Nano Banana (Flow, free): at most 6 images per film, only as references for Codex** (e.g. the main character sheet, 1–2 more
  cast/prop sheets, 2–3 style frames). Through `flow.py` under the Google guard. Every other image, including any extra cast sheets, is Codex.
- **Codex imagegen for every scene picture:** up to 5 parallel Codex threads (RAM limit), each with the cast-sheet crops + the style frames as
  references and the full bug checklist, ~30 pictures per thread. `gpt-6-luna` at `high` for places, props and object inserts; `max` for shots with
  people. Nothing touches the Google account, so it can run overnight unattended. Copy each final out of `~/.codex/generated_images` into
  `art/<slug>/raw/` (and clean that cache afterwards).
- **Omni (Flow) only for the hook and the finale** (2 clips, ~20 credits), animated from the approved Codex/Nano keyframes; clip audio muted.
- **Thumbnails:** 3 concepts, each made by both Nano Banana and Codex, so the owner picks winners for A/B tests (Codex won on detail and likeness
  in MUSK ES; Nano Banana was 25× faster). Real faces as drawn caricatures, never stickmen; text spelled exactly, in the film's language.
- **Check real products/events against current photos** before drawing them (MUSK ES drew the old 2008 Roadster and an invented ramp first).

## The pipeline (all in ~/Developer/story-studio)

1. **Script** (`episodes/<slug>/script.md`, simple Spanish/English, ~1,560 words ≈ 10–11 min at 2.6–2.8 w/s). Fact-check every number that goes on screen (WebSearch) and
   write the corrections into `NOTES.md` (MUSK ES: "sin conductor", 175 M not 180, "otras nueve grandes marcas", beanbag not "kicked awake").
   `[R]` lines keep the "según los medios / según varias publicaciones" framing.
2. **Voice**: Fish `drama-3-preview`, tags kept, `cast.json` `"lang": "es"`; `voice.py` (+ `scripts/lang_es.py`, `align.py` LANG, `stt_check.py`) are language-aware;
   `trim_take.py --tight 0.3` then `voice.py --reuse`. Speed: 1.0 = 2.33 w/s (too slow), **1.14 = 2.70 w/s**. Holds go in the script's air column (`+0.9` before a chapter card,
   `+1.5` for the finale launch, `+1.9` for the thrown-away vs reused diagram): re-cut with `--reuse` after any change. Speech check ≥ 0.97 (MUSK ES 0.992).
3. **Cast sheets FIRST** (`episodes/<slug>/gen/jobs_cast.py` → `scripts/flow_batch.py`): the style-test sheet is the `--ref` of every sheet; one sheet per character age/outfit, one for
   family/bullies, workers, suits, a crowd, and props/vehicles/places. Crop ONE full-body front view of each (PIL, `art/<slug>/refs/<key>.png`) and upload them with
   `flow.py upload FILE --name mx_<key>.png` (**the name needs the `.png` extension or the upload is never found**). Every scene passes the 1–3 relevant refs.
4. **`film.py` = the whole film as one table**: `S(id, anchor, prompt, refs, fx=[…])` for a picture, `C(card, anchor)` for a full-frame card, `K(id, …)` for a keyframe only,
   `SOUND` list, `REDO` dict (lines appended to a prompt after an audit). `python3 episodes/<slug>/film.py [--until N]` writes `plan.json` and `gen/jobs_all.json`.
   Anchors are narrator words (`"c1b.sordo"`, `"c4a.muy"`): `stills_build.py` names the missing word. Density: ~160 pictures + ~25 cards in 10:15 (a shot every 3.3 s).
5. **Pictures**: `python3 scripts/flow_batch.py gen/jobs_all.json` (ONE Flow browser, one job at a time, 2 candidates, ~50 s each, 0 credits). Review as 2-candidate sheets
   (`scripts/pair.py`, `sheet3.py`: three scenes per sheet at 75 %), pick with `scripts/pick.py name idx "what was checked"` → `art/<slug>/pick/`; `notes_audit.py` writes the audit table.
6. **Independent audits**: 4 Codex threads (`gpt-6-luna`, max) × ~36 pictures with `gen/audit-brief.md`, read-only, report per picture. Triage hard: see "audit false alarms".
7. **Omni clips** (hook and finale): `flow.py video --start <pick.jpg> --model omni --res 720p --secs 6` (10 credits each), frames → `public/<slug>/<dir>/%04d.jpg`
   (1920×1080), played by a `seq` shot (`{"dir","n","fps","hold"}`; `hold` = seconds the first frame stays before the clip runs). Clip audio is never used.
8. **Graphics** in `src/kit/stills/bio.tsx` (cards: chapter, cheque, moneybar, bets, pricebars, launches, chart bars|line, route, stairs, words3, timeline, career, split, birdx, outro; fx: bigword, num, calpage, pin, stamp2).
   All text word by word, Spanish number format (`fmt`: 1.500), fitted (`fit.ts`), nothing at the top of the frame. `check_fx.py` knows them; `peek.sh` shows frames.
9. Dev player (`scripts/devplayer.sh MuskES 3124`, `bb connect expose 3124`) → owner review (M1 after the cast + hook + 2 chapters, M2 after the whole film) → delivery below.

## Delivery (the 2026-11-01 run, ~25 min after the owner's M2 OK)

- **Render on the farm.** Slim folder `public-<x>/<slug>/` of hard links (`cp -l *.jpg`, `stills.json`, `cp -rl` the clip frame folders) + `mix.wav` padded (`ffmpeg -af apad=pad_dur=0.6`);
  `farm.json` → `"public": "public-<x>"`, `"audio": {"<Comp>": "public-<x>/<slug>/mix.wav"}` (restore `farm.json` after: it is tracked and the Nobody Came config lives there); `farm render . <Comp>`:
  10:18 = 207 chunks in 158 s on this PC + mouad. A later fix re-renders only the changed chunks (a one-card change: ~40 s). `cp out/farm/<Comp>@1080p.mp4 out/<slug>.mp4; scripts/qa.py <slug>`
  (the speech check reads `"lang": "es"`); scan the card frames of the master for black corners (the capture-mode gradient trap).
- **Covers**: `scripts/cover.sh <slug>` (text in code over `public/covers/<art>/{tall,wide}.jpg`, `covers.json` entry with `"num": false`). Nano Banana art with a prompt that puts the WHOLE scene in the upper 55–60 %
  and leaves the lower 40 % empty sand (the title block and the shade take the bottom half); the wide cover got its small figure lifted out of the dark band by cut-and-paste on the flat ground (PIL, mask = difference from a patch of the same rows).
  Send the owner a contact sheet of both before publishing.
- **Gallery**: `scripts/musk_gallery.py meta|media` is the pattern for a standalone film: `episodes.json` entry (`niche`, `wide: true`), `meta.json` post info in the film's language with the chapter timestamps,
  a new niche in `gallery/series.json`, master + 720p + poster + 12-frame sheet in `~/Videos/story-studio`; `uv run --with boto3 scripts/r2_sync.py videos` (the R2 folder is the niche slug: "Historia y éxito" → `historia-y-xito`).
- **Verticals** (wide-to-vertical): `vertical/series/<slug>.json` (hook 2 lines ≤ 20 characters, ctaTop 2 lines, follow, a bottom text instead of "Part N"), `python3 build.py series/<slug>.json <slug> --first 14` for a sample, then the full run
  (≈ 8 min for 10 min, both versions, captions from `public/<slug>/vo/lines.json`, so Spanish words and accents are right); `build.py` reads the end card kinds `cta` and `outro`. Then `r2_sync.py videos --delete-local` (verifies by byte count before deleting) and ranged-GET each URL.
- **Disk**: delete the clip frame folders, the slim folder, `out/farm`, `vertical/out`, farm cache. The masters live in R2.


## Traps (MUSK ES)

- **Never run two Flow jobs at once** (two `flow_batch.py` or a batch + an upload): the tile tracking crosses and files come back under the WRONG names (`c16_home_3.jpg` was a different scene).
  Chain jobs with one script that waits for the previous one; kill by PID (`pkill -f flow_batch` kills your own shell if the pattern is in its command line).
- Flow Nano Banana ignores orientation words ("car faces the ramp") half the time: say where each object is in the frame, check with a zoom, regenerate.
- Crowd extras copy the hero's tuft: every crowd prompt lists extras' hair (bald, buzz, afro, ponytail, cap, bun) and says "none has a swept dark tuft"; ask for "plain flat white heads, no shading" (cinema backs came out lavender/pink).
- Paper, newspapers, screens and boards come with grey bars that read as pseudo-writing: say "plain blank white sheet, no lines, bars or marks" in every prompt that has paper.
- Letters sneak in as sleep "Z" marks, "!" and "?" in bubbles: say "empty bubble"; draw Zzz/! as code fx.
- A young mother (Maye ~30, short blonde hair) needs her own sheet; the same face with grey hair is the 2010s version.
- The audit threads are literal: they flagged the original Roadster as "closed roof", a shower scene as "bare torso" and stranger extras as "not Elon". Fix real bugs (extra limbs, text, orientation, tuft clones, ringed eyes), log the false alarms in NOTES.md.

## Lessons from the owner-fix round (2026-11-01 evening)

- **Check the product against current photos before drawing it**: the "new Roadster" was drawn as the old red convertible until the owner supplied photos. For any real product, vehicle or place, fetch reference pictures first, make a prop sheet from them, then scenes.
- **Stunt choreography needs the real structure**: describe the shape in letters ("a C: floor, wall, ceiling bar facing down") and which way every object points ("nose LEFT, tail RIGHT; the row broadside, all facing left"); Nano Banana drifts on orientation. For Omni, start from the key frame of the MOST unusual state (the car upside down on the top bar) and describe one motion; end the prompt with where it must land ("the EMPTY road well past the last vehicle", "never touches any parked vehicle").
- **Widen a composition with PIL** when a keyframe lacks empty room: stretch the leftmost 130 px, blur it, blend 130 px, rescale to 16:9 and extend the top and bottom edge rows (deterministic, seamless on flat night backgrounds).
- **On-screen words**: at most 2 words, a number / name / key word, a rounded pill with padding (never a yellow square box); vertical captions are chosen by emphasis (spelled numbers → numerals, names once, key words, one per 6 s), not by transcript.
- **Google Flow can block automation** ("We noticed some unusual activity", then the generate click is never accepted) after hundreds of jobs; credits are not charged. Stop, do not retry in a loop, cool down for minutes, and have a fallback (a Codex image thread) for stills.
- **The niche slug must drop accents** (`historia-y-exito`): `r2_sync.py slug()` and `vertical/build.py niche_of()` use the same NFKD rule now; an upload under an older folder name stays on R2 and the gallery map ignores it.
- `splice_line.py <slug> h1:h3` re-voices a BLOCK of lines (any count of new lines for the old ones) and speaks them with the cast language (Spanish whisper alignment: a splice with English whisper matched 3 of 59 words).

