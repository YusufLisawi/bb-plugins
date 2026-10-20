---
name: story-studio
description: Make premium animated TikTok/Reels/Shorts episodes entirely in code — TV-style story pilots ("Part 1" of a series: apocalypse, crime, survival, mystery), motion-graphics explainers in the chess.history style, immersive "what if" shorts, and finance explainers — with code-designed sets, code-rigged characters, a 2.5D parallax camera, karaoke captions, survival-guide HUD devices, an emotional ElevenLabs v4 voice cast, generated sound design and score, a 4-sample motion-blur master and hard QA gates. Use whenever the user asks for a story short, an animated series episode, a "part 1/part 2", an explainer, a what-if video, a remake of a TikTok's idea or style, or more episodes in an existing series. Works for any model; the workflow is written so a cheaper model can follow it exactly.
---

# Story Studio

The engine is the project **`~/Developer/story-studio`** (Remotion + TypeScript + Python, git).
`THE LAST TRAIN · Part 1` (`src/episodes/last-train/`) is the reference episode: read it before
you write your own. This skill is the playbook: how to think, what to make, the exact commands,
and the bar.

> [!IMPORTANT] Storage is life-or-death on this machine
> A full disk shuts the user's PC down. `render.sh` renders straight to video (no frame folders),
> refuses to start under 30 GB free, and deletes its intermediate. You still must: run
> `df -h ~` before any render, never write renders to `/tmp` (it is RAM), never keep raw
> downloads or test renders, and run `scripts/clean.sh <slug>` after every finished episode.

## The bar (every episode)

1. **Hook in the first second.** First frame already shows the world in motion; the first line
   is a second-person rule or a claim the viewer can't scroll past ("If the outbreak starts
   while you're on a night train, don't get off at the next station.").
2. **It's a show, not a clip.** Cold open → title card (`TITLE · PART 1`) → named hero → rules
   or facts woven into the story → escalating problem → a twist line → end card with the
   next part's title + "FOLLOW FOR PART 2". Character dialogue in their own voices.
3. **The voice is the clock.** Every beat is keyed to a spoken word (`vo.at(line, word)`),
   never to a typed time. Re-voicing re-times the whole film.
4. **Always moving.** Every shot has a camera move (push, pull, track, rack focus), parallax
   layers, a live element (passing lights, motes, flicker, rocking). Nothing static; no hard
   pops — things spring, slide, wipe, flash.
5. **Clean and legible.** Captions in the safe zone (y≈1230), never covered; HUD text inside
   x 80–1000; dark panels set their text colour; characters always readable against the plate
   (rim light on).
6. **Sound design leads, music supports.** A cue on every visible event (≈ 0.6 cues/s);
   score soft under the voice; one stinger on the twist into near-silence.
7. **Verified, not assumed.** You look at stills of every shot before the master; STT of the
   final mix ≥ 98 %; −14 LUFS, ≤ −1.5 dBTP; you watch frames of the master.

## Formats

| Format | Read | Reference |
|---|---|---|
| **Story pilot** (apocalypse, crime, survival, mystery, horror) | [references/format-story.md](references/format-story.md) | `last-train` |
| **Explainer / finance** (chess.history style: bobble-head characters in 2.5D sets) | [references/format-explainer.md](references/format-explainer.md) | `cobra-effect` |
| **What if** (immersive, one running number, sound-led, often no narrator) | [references/format-whatif.md](references/format-whatif.md) | `trench` |
| **Cardboard** (paper-craft dioramas; the ONLY format with generated assets) | [references/format-cardboard.md](references/format-cardboard.md) | — |

The style studies of the 16 reference TikToks the user picked (what each does, frame by
frame) are summarised in [references/style-bible.md](references/style-bible.md).

## Workflow (commands run from the project; your worktree if you are a child)

```bash
cd ~/Developer/story-studio            # or your worktree: ~/Developer/story-studio-wt/<name>
df -h ~                                # ≥ 30 GB free before anything heavy
```

1. **Concept** (write `episodes/<slug>/brief.md`): one-sentence premise, the setting's
   built-in "why it's safe/unsafe", the hero, 3 rules/facts, the escalation, the twist line,
   the next part's title. Sketch 3 premises, pick the strongest, say why. → format file.
2. **Script** `episodes/<slug>/script.tsv` (`id⇥speaker⇥text with v4 tags⇥air after`) and
   `cast.json`. 220–260 words → 85–100 s. One emotion tag per line. → [references/voice.md](references/voice.md)
3. **Voice** `.venv/bin/python scripts/voice.py <slug>` then
   `.venv/bin/python scripts/stt_check.py <slug>` (≥ 0.97; numbers/spelling diffs are fine;
   re-check doubtful lines in isolation). `--reuse` re-times from the saved take for free.
4. **Sets** — designed in code, never generated (owner rule; only the cardboard format uses
   generated cut-outs): [references/sets.md](references/sets.md). Build each set as SVG
   parallax planes in `src/episodes/<slug>/sets.tsx` using `src/kit/sets.tsx` (perspective,
   light pools, glows, window holes). Render stills of every set before adding characters.
5. **Sound**: `episodes/<slug>/sfx.json` → `.venv/bin/python scripts/sfx.py <slug>`;
   `episodes/<slug>/music.json` → `.venv/bin/python scripts/music.py <slug>`. → [references/sound.md](references/sound.md)
6. **Picture** `src/episodes/<slug>/{beats.ts,<Id>.tsx,sound.ts}`; register in `src/Root.tsx`.
   Build shot by shot from the kit (§ Kit). Derive character anchors (floors, seat tops) from
   the set's own geometry/projection, never guess.
7. **Review loop** `scripts/stills.sh <Id> /tmp/<slug>-rN.jpg <sec> <sec> …` — a still of every
   shot, at its key moments. Open the sheet, fix, repeat (2–3 rounds is normal).
   Checklist: [references/review.md](references/review.md).
8. **Mix** `scripts/sound_export.sh <slug> <dir>` → `.venv/bin/python scripts/mix.py <slug>`
   → `stt_check.py <slug> public/<slug>/mix.wav`.
9. **Master** `scripts/render.sh <Id> <slug>` (≈ 7 min for 100 s; queues on the GPU lock).
   Test a slice first when unsure: `scripts/render.sh <Id> <slug> 44 49`.
10. **QA + deliver** (no-narrator episodes: `lines.json` = `[]`, silent `vo.wav`; mix and QA adapt) `.venv/bin/python scripts/qa.py <slug>` (format, loudness, black/frozen
    frames, speech) → `scripts/deliver.sh <slug>` (copies to `~/Videos/story-studio/`, poster,
    contact sheet) → `scripts/clean.sh <slug>` → commit.

## Kit (src/kit) — use it, extend it, don't fight it

| Module | What |
|---|---|
| `core/anim` | `useT()` seconds · `tw/keys/spring/win/prog` · `E.*` easings · `noise/fbm` (continuous) · `rnd` (layout only) |
| `core/vo` | `makeVO(lines)` → `vo.s(id) vo.e(id) vo.at(id, word) vo.w(id,i)` |
| `sets` | `World` (SVG in world px) · `proj/Persp` (one-point perspective) · `LightPool` `Haze` `Stripe` · reference sets in `src/episodes/last-train/sets.tsx` |
| `stage` | `Scene cam` + `Layer depth blur dof` (2.5D parallax + depth of field) · `Pic` · `Above y` (clip at a seat line) · `Glow` · `Motes` · `Vignette` · `Grade` · `Black` · `shake()` · `rock()` · fonts `F.*` |
| `puppet` | `Puppet o p` + `pose(...)`, `idle walk sit sitSide tremor bang talk`, `back`, `infected`, `turn`, `brow`, rim light · `OUTFITS` · explainer faces: `o.face {brows, beard, blush}`, `o.bobble`, hats `pith turban kepi cap conductor beanie hood` |
| `edu` | explainer devices: `PlaceCard Nameplate Notice(stamp) Counter RiseChart Bars GoldTitle QuoteCard`, palette `GOLD` |
| `creatures` | `Cobra Slither DeadCobra Rat` — animals in code; write new ones the same way (continuous motion) |
| `captions` | `Captions vo st` karaoke (keywords, speaker colours, hide ranges) |
| `hud` | `SeriesBar Stamp PhoneAlert RuleCard RouteMap Timers Speed SwitchDiagram TitleCard EndCard PassingLights typed` |
| `world` | `makeMotion` (speed → position) · `Outside`/`OutsideBox` (night world in windows) · `Skyline` (districts black out) · `TrainSide` |

New devices belong in the kit when they're reusable (a map, a meter, a dossier card…).

## Delegation (parent agents)

If you're the parent: [references/delegation.md](references/delegation.md) — worktrees, the
brief template, the review rubric, and what to send back. Never run two children in the same
checkout. Review every child's stills and master yourself before calling it done.

## Pitfalls (read when something looks wrong)

[references/pitfalls.md](references/pitfalls.md): every bug hit while building the engine,
with its fix (props that are functions, flip pivots, chroma, black heads on dark seats, sitting
legs, STT drift, music ignoring "silence" …).
