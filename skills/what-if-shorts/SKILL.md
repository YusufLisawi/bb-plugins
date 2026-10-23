---
name: what-if-shorts
description: "Make flat-vector narrated shorts in the farm film's format (the @what_if_space style: \"If the zombie apocalypse starts while you're on a farm, do not drive into town\") for ANY niche — survival, money, science, space, history, health, animals, crime safety, how-it-works. Gives the story engines and line-by-line writing patterns, the pacing (a cut about every 1.6 s on a spoken word, 2–5-word captions), the scene types and HUD graphics, the flat look and character rigs (src/kit/flat), voice, sound, and the build + QA pipeline in ~/Developer/story-studio, with scaffold and lint scripts so any model can reach the reference quality. Use when the user asks for a video like the farm one, a what-if / survival / how-it-works short in this style, a sequel (Part 2+), or a 1:1 clone of a video in this style."
---

# What-If Shorts — the farm format, for any niche

A 60–75 s vertical film. A fast, friendly narrator tells one story in very easy English. A new picture lands on
almost every phrase: a cut about every 1.6 s, each one on a spoken word. Bold 2–5-word captions sit in one band,
and one keyword per chunk is orange (the key fact) or red (danger). Everything is **drawn in code**: flat soft
shapes, hazy light, blurred foregrounds, and characters with dot eyes and brow strokes who really walk and grip
things. Maps, cutaways and HUD cards make each fact visible. The film opens on a line you can't scroll past and
ends on a line that makes people comment.

- **Engine:** `~/Developer/story-studio` (Remotion + TypeScript + Python). The **story-studio** skill holds the shared
  plumbing: storage, the render queue, voice internals. This skill is the format, and it is complete on its own for
  building an episode.
- **Reference film:** `farm` ("If the zombie apocalypse starts on a farm", 65.3 s, 40 shots, graded A−):
  `src/episodes/farm/`, `episodes/farm/` (brief, shots, script, reference breakdown), the kit `src/kit/flat/`, and the
  master `~/Videos/story-studio/farm.mp4`. Read its `episodes/farm/brief.md` once before your first episode.
- **Source study:** @what_if_space. Its farm Part 1 has 3.2 M views; Parts 2–5, a high-rise series, and its science,
  build, POV and experiment shorts were measured to find what carries across niches ([references/writing.md](references/writing.md) § 1).

## The format in numbers

| | Target | Farm (measured) |
|---|---|---|
| Length | 60–75 s (owner: short wins) | 65.3 s |
| Script | 150–200 words, 14–20 lines, mean 9–12 words per line, a 2–7-word punch line after every 1–4 long ones | 185 words, 17 lines, mean 10.9 |
| Pace | 2.8–3.3 words/s while speaking, one seamless take, line gaps ≈ 0.3 s | 3.24 w/s, median gap 0.32 s |
| Shots | 35–45 shots, mean 1.4–1.9 s, 1–5 cuts per line, none over ≈ 3.3 s except the end card | 40 shots, mean 1.63 s (0.63–3.03) |
| Cuts | every cut on a word: `cut(line, wordIndex, frac)`, never a typed second | 37 of 37 word-anchored |
| Captions | one line, 2–5 words, y ≈ 1236, swap on the chunk's first word | 55 chunks, ≈ 1.1 s each |
| Graphic slams | 3 per film: a big correction word, a danger phrase, the twist | NO. · ALMOST IMPOSSIBLE · INSIDE THE BARN |
| Sound | a cue on every visible event (≥ 1.2 cues/s), a low score ducked under the voice, a drop to near-silence before the twist | 158 cues (2.0/s) |
| Master | 1080×1920, 60 fps (4-sample motion blur), −14 LUFS, ≤ −1.5 dBTP, speech-to-text ≥ 0.98 | PASS on all |

The ladder engines are the one big exception (§ Pick the engine): **one continuous camera journey** with 1–15 cuts
and sparse narration (50–150 words), carried by a giant counter.

## Owner rules (always; they override any reference)

1. **Drawn in code only:** SVG/React in Remotion. No generated images, no image or video APIs, no AI video.
2. **Very easy English:** a 3rd grader understands every line. Short sentences, one idea per line. Places and objects
   everyone knows (home, car, phone, school, money, the supermarket). No niche jobs or jargon.
3. **True:** every rule or fact is real and checkable. Its source goes in `brief.md`, and its cause is told in one
   sentence. Legends are labelled as legends.
4. **Hook in the first second, and an ending that makes people comment.**
5. **No series bar, show name or "PART N" label at the top of the frame.** Don't open by saying the series name or
   the part number either; open on the hook or the recap. A closing end card that teases the next part
   ("PART 2 · SOMETHING IS IN THE BARN") is fine and was approved on farm.
6. **Characters:** faces you can relate to, right proportions (about 3.5 heads tall), real walks, hands that hold
   things. The head is always the top layer, hands never flip, and a held prop sits in a closed hand.
7. **Voice:** one seamless take (the owner: "it should feel smooth"; no stitched lines, no slow-downs). Fish Audio is the engine.
   ElevenLabs has had no credits since 2026-10-21, so don't call it until the owner says it's topped up. Never use
   the Fish voice "adam adam".
8. **Stories are series (owner, 2026-10-21):** every story film is Part 1 of a series. It ends on a cliffhanger
   that opens Part 2, and it gets a series bible (`episodes/<slug>/series.md`: lore, cast, plants, Part 2 plan)
   ([references/series.md](references/series.md)).
9. **Make it feel crucial (owner, 2026-10-21):** when the world breaks, show it breaking. Show the chaos in the
   systems people depend on (hospitals mid-surgery, roads, planes, water, power), and give the hero a personal
   mission inside it (twelve babies on oxygen, a little sister). The first draft of "blind" was a quiet list of
   consequences, and the owner rejected it as not crucial enough.
10. **Storage and the render queue:** run `df -h ~` before renders (≥ 30 GB free). Only `scripts/stills.sh`,
   `render.sh` and `deliver.sh` render, and `scripts/clean.sh <slug>` runs after delivery. Never render to `/tmp`.

## Pick the story engine

Every film runs on ONE engine. Pick it from the premise, then follow its beat sheet in
[references/engines.md](references/engines.md). Premise ideas per niche are in [references/niches.md](references/niches.md).

| Engine | Line 1 template | Fits | Channel proof |
|---|---|---|---|
| **1 · Survival rules** (the farm) | "If [event] starts while you're [everyday place], do not [obvious instinct]." | disasters, zombies, safety, wilderness, history, money traps ("If you win the lottery, do not…") | farm P1 3.2 M · P2 1.6 M |
| **2 · Problem → fix build** | "If you [naive version], you have a [goal]." then "But [failure]. So you [fix]." ×4–6 | engineering, DIY, the body, how money systems work | tornado shelter 0.5 M |
| **3 · Scale ladder** | "What if you [repeated action] [N] times?" | doubling, folding, saving, growth, space | paper fold 6.7 M · rice 0.93 M |
| **4 · Zoom ladder** | "What if you zoomed in until [everyday thing] [touched/ended]?" | cells, atoms, the city, the universe | fingers 2.3 M |
| **5 · POV time-skip** | "[Everyone/every X] just [vanished/stopped]. Except you." | social what-ifs, "last person", history POV | last woman 2.7 M |
| **6 · Experiment story** | "This guy [does odd thing] every day for a month." | nature, food, money and habit experiments | anthill 0.06 M (needs a stronger reveal) |

Score the concept with the gate in [references/writing.md](references/writing.md) § 2 before writing anything. A talky list
("these 3 things are wrong") was the channel's weakest format (26 K views), so make it a ladder or a story instead.

## Workflow (child agents: work only in your worktree)

```bash
cd ~/Developer/story-studio && WT=$(scripts/new-worktree.sh <slug>) && cd "$WT"   # branch ep/<slug>
df -h ~                                                                          # ≥ 30 GB free
SK=~/Developer/bb-plugins/skills/what-if-shorts
python3 $SK/scripts/new_episode.py docs <slug> <Component> --engine survival   # brief, script, cast, shots plan
```

1. **Concept → `episodes/<slug>/brief.md`.** Write 3 premises, score them, pick one, and say why. Fill the fact ledger
   (each fact with its source and cause), the plants → payoffs ledger, and the ending ([writing.md](references/writing.md)).
2. **Script → `episodes/<slug>/script.tsv`**, following the engine's beat sheet.
   `python3 $SK/scripts/lint_script.py episodes/<slug>/script.tsv --engine <engine>` must pass with no errors; read
   every warning.
3. **Voice.** `.venv/bin/python scripts/voice.py <slug>`, sampling 4–6 takes and picking by measurement, then
   `.venv/bin/python scripts/stt_check.py <slug>` (≥ 0.98). See [voice-and-sound.md](references/voice-and-sound.md).
4. **Cast.** Design or reuse the characters and render a model sheet plus a walk strip ([look.md](references/look.md) § 5,
   [build.md](references/build.md) § 6).
   **CHECKPOINT 0:** stop and report the script, lint output, voice stats and model sheet. Wait for review.
5. **Shot plan → `episodes/<slug>/shots.tsv`** (id, line, word, frac, shot type, what we see, devices), from
   [pacing-and-shots.md](references/pacing-and-shots.md). Then `lint_script.py … --shots episodes/<slug>/shots.tsv --lines public/<slug>/vo/lines.json`
   must pass (measured timing), and
   `python3 $SK/scripts/new_episode.py code <slug> <Component>` writes a timed animatic: every shot is a placeholder card
   with live captions.
6. **Build every shot** with the kit ([build.md](references/build.md)): sets → characters → acting → devices. After each
   batch, run `scripts/stills.sh <Component> out/<slug>-rN.jpg <secs…>` and look at the sheet
   ([qa.md](references/qa.md) § 2). Expect 2–3 rounds.
   **CHECKPOINT 1:** a still of every shot (clone: next to the reference). Wait for review.
7. **Sound.** Write the score synth, the foley cues in `sound.ts` (driven by the same beats as the picture), and the
   mix, then run STT on the mix ([voice-and-sound.md](references/voice-and-sound.md)). **Reuse library sounds**
   (`scripts/find_sfx.py <words>`, then `{"lib": "<name>"}` in sfx.json). Generate one only when nothing fits or it's
   genuinely new (needs a `"why"`). New sounds are generated on the **local GPU with Sony Woosh** (the default engine; the ElevenLabs API only
   with `"engine": "elevenlabs"`), and `sfx.py` adds every new sound to the shared library automatically.
8. **Master and QA.** Run motion-test slices, then `FPS=60 scripts/render.sh <Component> <slug>`. After that, the
   frame-difference scan, frame QA in 2 passes, and `qa.py` ([qa.md](references/qa.md) § 3–5).
   **CHECKPOINT 2:** `qa.py` PASS, the QA sheet and the fix log. On approval: `scripts/deliver.sh <slug>`,
   `scripts/clean.sh <slug>`, then commit (with `public/<slug>/{mix.wav,sfx,music,vo}`).
9. **Cover (every episode).** Art image (text-free, one per series, `public/covers/<art>/{tall,wide}.jpg`) + text in
   code from `public/covers/covers.json`, rendered with `scripts/cover.sh <slug>` before `r2_sync.py videos`
   (story-studio SKILL.md step 12).

A 1:1 clone of a reference video follows [references/clone.md](references/clone.md) at steps 1, 5 and 6.
A sequel follows [references/series.md](references/series.md) at steps 1–2 and uses `--engine sequel`. **Every Part 2+
opens with the recap-hook:** a red cold open with the premise line and a silent PART N slam, then polaroids of the last
part's real shots landing one per recap line (the last one is the cliffhanger), a clock pill that runs all part, and the
prop close-up that starts the new story. Use `src/kit/flat/recap.tsx` and `scripts/splice_intro.py`
([series.md](references/series.md) § "Building the recap-hook"; example `src/episodes/burn2/shotsIntro.tsx`).

## What to read

| You are… | Read |
|---|---|
| choosing a premise, writing lines, hooks, endings, the fact and plant ledgers | [references/writing.md](references/writing.md) |
| following an engine's beat sheet (timings, line templates, shot mix, ending) | [references/engines.md](references/engines.md) |
| looking for premise ideas in a niche | [references/niches.md](references/niches.md) |
| writing Part 2+ of a series | [references/series.md](references/series.md) |
| an image version (AI stills + motion graphics) | [references/image-version.md](references/image-version.md) |
| planning shots, cuts, camera, captions, HUD devices | [references/pacing-and-shots.md](references/pacing-and-shots.md) |
| drawing sets, colour, light, characters, animals, a new niche's world | [references/look.md](references/look.md) |
| building in the project (files, kit API, commands, 60 fps rules) | [references/build.md](references/build.md) |
| casting and recording the voice, the score, foley, the mix | [references/voice-and-sound.md](references/voice-and-sound.md) |
| reviewing stills, the master, checkpoints, known pitfalls | [references/qa.md](references/qa.md) |
| cloning a reference video shot for shot | [references/clone.md](references/clone.md) |

## Scripts (in this skill)

| Script | Does |
|---|---|
| `scripts/new_episode.py docs <slug> <Component> --engine <e> [--series <slug> --part N]` | writes `episodes/<slug>/{brief.md, script.tsv, cast.json, shots.tsv}` from the engine's template (never overwrites) |
| `scripts/new_episode.py code <slug> <Component>` | after the voice exists: writes `src/episodes/<slug>/{<Component>.tsx, beats.ts, shots.tsx, sound.ts}` with every cut on its word, caption chunks with keyword colours, a placeholder card per shot, then runs `gen_root.py` |
| `scripts/lint_script.py <script.tsv> --engine <e> [--shots shots.tsv] [--lines public/<slug>/vo/lines.json]` | checks the script against the format (length, line shape, punches, connectors, numbers, banned filler, hook, ending) and the shot plan (rhythm, word anchors, shot-type mix) |
| `scripts/diffscan.py <master.mp4>` (run with the project's `.venv/bin/python`) | the frame-difference scan: spikes must be cuts or intended flashes |
| `scripts/ref_cuts.py <ref.mp4> <transcript.json> <script.tsv>` | clone mode: the reference's cuts mapped onto your script's words, written as `shots.tsv` rows |
| `scripts/compare_ref.py <ours_sheet.jpg> <scale> <out.jpg> --ref … --refwords … --lines … <secs…>` | clone mode: reference and ours side by side at the same spoken word |

All of them were tested on the farm film. The linter passes its script and shot plan with 0 warnings, and the scaffold
turns them into a compiling, timed animatic. `ref_cuts.py` finds the reference's 40 shots and puts 34 of the 37
hand-measured cuts on the exact same word (the other 3 are within 0.15 s, at a line boundary).

## Done means

- [ ] The brief has 3 scored premises, a fact ledger with sources, a plants → payoffs ledger and the ending type.
- [ ] `lint_script.py` passes on the script and the shot plan, and the voice is one take with STT ≥ 0.98.
- [ ] Frame 0 already shows the hook in motion. Every shot moves, and every cut sits on its word.
- [ ] Characters are on-model, grounded and gripping their props. Captions are never covered.
- [ ] Two frame-QA passes are fixed, the diff scan is clean, `qa.py` PASSes, and you looked at the QA sheet.
- [ ] Delivered, `clean.sh` run, everything committed, and the brief has a delivery record with lessons.
