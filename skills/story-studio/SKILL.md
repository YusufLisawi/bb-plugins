---
name: story-studio
description: "Make premium animated TikTok/Reels/Shorts episodes entirely in code. MAIN format: CARDBOARD 2.0 — photoreal paper-craft dioramas, jointed cut-out puppets with measured eyes on 12 fps steps, the maker's hand and paper motion graphics, built from a shared asset library for any niche (history, finance, science, animals, crime, horror, kids). Also illustrated-drama story pilots, chess.history-style explainers, immersive \"what if\" shorts and crayon picture books — with a 2.5D parallax camera, karaoke captions, a measured voice cast (Fish Audio / ElevenLabs), generated sound design and score, a motion-blur master through a shared render queue and hard QA gates. Use whenever the user asks for a short, an animated episode, an explainer, a what-if video, a remake of a TikTok's idea or style, or more episodes in an existing series. Written so a cheaper model can follow it exactly."
---

# Story Studio

The engine is the project **`~/Developer/story-studio`** (Remotion + TypeScript + Python, git;
bb project `Story Studio`). It holds 12 finished episodes in `src/episodes/` — read the ones in
your format before writing your own: stories `last-train` (the reference), `fake-taxi`,
`deep-shift`, `thirteenth-floor`, `three-oh-seven`, `night-ferry`; explainers `cobra-effect`
(reference), `lindy`, `dirty-money`; what-ifs `trench` (reference), `sun-gone`; **cardboard (the MAIN format)
`cobra-cardboard` (THE reference)**, `squirrels`, `otters`, `crows`. Delivered masters + a gallery: `~/Videos/story-studio/` (index.html). This skill is the playbook: how to think, what to make, the exact commands,
and the bar.

> [!IMPORTANT] Storage is life-or-death on this machine
> A full disk shuts the user's PC down. `render.sh` renders straight to video (no frame folders),
> refuses to start under 30 GB free, and deletes its intermediate. You still must: run
> `df -h ~` before any render, never write renders to `/tmp` (it is RAM), never keep raw
> downloads or test renders, and run `scripts/clean.sh <slug>` after every finished episode.

> [!CAUTION] Render through the queue — never around it
> Agents share one GPU, 12 cores and 15 GB RAM. Only `scripts/stills.sh`, `scripts/render.sh`, `scripts/deliver.sh`
> and `scripts/stt_check.py` render or transcribe; they take the locks (`/tmp/story-studio-{stills,gpu,encode,whisper}.lock`):
> one stills batch, one GPU master, one encode, one Whisper job at a time across all worktrees. Never call
> `npx remotion render/still` yourself, never delete a lock, never start renders in parallel. `scripts/queue.sh` shows
> the slots; a busy slot just waits.

## The bar (every episode)

0. **Short, easy, true (owner content rules — every format).** ENGAGING and SHORT: 55–75 s, aim ≤ 72 s. VERY easy
   English a 3rd grader understands: short sentences, one idea per line. Very few numbers and names; no jargon unless
   explained in kid words. Fun, clear, surprising beats beat completeness. Facts true; anecdotes labelled. Details
   and a worked example: [format-cardboard.md § 1](references/format-cardboard.md).
1. **Hook in the first second.** First frame already shows the world in motion; the first line
   is a second-person rule or a claim the viewer can't scroll past ("If the outbreak starts
   while you're on a night train, don't get off at the next station.").
2. **It's a show, not a clip — but no series branding.** Hook → named hero in an everyday
   situation → rules shown as actions → escalation → a twist line → a CTA question that begs
   for comments. **Never** a top series bar, show name or "PART 1" label (owner rule, 2026-10-20).
   Easy English, relatable situations. Character dialogue in their own voices.
3. **The voice is the clock.** Every beat is keyed to a spoken word (`vo.at(line, word)`),
   never to a typed time. Re-voicing re-times the whole film.
4. **Always moving.** Every shot has a camera move (push, pull, track, rack focus), parallax
   layers, a live element (passing lights, motes, flicker, rocking). Nothing static; no hard
   pops — things spring, slide, wipe, flash.
5. **Clean and legible.** Captions in the safe zone (y≈1230; cardboard 1430), never covered; HUD text inside
   x 80–1000; dark panels set their text colour; characters always readable against the plate
   (rim light on).
6. **Sound design leads, music supports.** A cue on every visible event (≈ 0.6 cues/s);
   score soft under the voice; one stinger on the twist into near-silence.
7. **Verified, not assumed.** You look at stills of every shot before the master; STT of the
   final mix ≥ 98 %; −14 LUFS, ≤ −1.5 dBTP; you watch frames of the master.

> [!IMPORTANT] Puppet rules (owner): the head is ALWAYS the top layer of a character (never under an arm, hand or
> prop), and hands never flip (no upside-down or mirrored hands). True-crime reference: `heather`. See format-cardboard.md § 9.

## Formats

| Format | Read | Reference |
|---|---|---|
| **CARDBOARD 2.0 — the MAIN format, any niche** (paper-craft dioramas, cut-out puppets with measured eyes on 12 fps steps, the maker's hand, paper motion graphics; shared library `public/_lib/cardboard` + kit `src/kit/cardboard`; the ONLY format with generated assets) | [references/format-cardboard.md](references/format-cardboard.md) | **`cobra-cardboard`** |
| **Illustrated drama** (story pilots: survival, disaster, crime — rigged 3-D characters with real faces, iso inserts) | [references/format-drama.md](references/format-drama.md) | `black-sky`, `low-tide` |
| Story pilot (older silhouette-puppet style) | [references/format-story.md](references/format-story.md) | `last-train` |
| **Explainer / finance** (chess.history style: bobble-head characters in 2.5D sets) | [references/format-explainer.md](references/format-explainer.md) | `cobra-effect` |
| **What if** (immersive, one running number, sound-led, often no narrator) | [references/format-whatif.md](references/format-whatif.md) | `trench` |
| **Crayon picture book** (wax crayon on toothy paper, watercolour wash with white-wax resist; WebGL engine in `src/kit/crayon/`, README there) | [references/format-crayon.md](references/format-crayon.md) | `tern` |
| **HD-2D** (flat pixel sprites in a lit, fogged 3-D diorama through a tilt-shift lens; vertical survival-rules shorts with RPG UI plates, Fish Ethan voice, fully synthesized sound; WebGL engine in `src/kit/hd2d/`, on branch `ep/hollow` until merged) | [references/format-hd2d.md](references/format-hd2d.md) | `hollow` |

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
   `cast.json`. ≈ 150–180 words → 55–72 s (owner: short). One emotion tag per line. → [references/voice.md](references/voice.md)
   (cardboard: the Fish narrator, sampled takes at speed 1.0)
3. **Voice** `.venv/bin/python scripts/voice.py <slug>` (seamless: see voice.md), `.venv/bin/python scripts/envelope.py <slug>` (lip sync), then
   `.venv/bin/python scripts/stt_check.py <slug>` (≥ 0.97; numbers/spelling diffs are fine;
   re-check doubtful lines in isolation). `--reuse` re-times from the saved take for free.
4. **Sets** — designed in code, never generated (owner rule; only the cardboard format uses
   generated cut-outs — its shared library first, a Codex imagegen thread only for pieces unique to the story):
   [references/sets.md](references/sets.md). Build each set as SVG
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
9. **Master** `scripts/render.sh <Id> <slug>` (≈ 7 min for 100 s; a 72 s cardboard master ≈ 13 min at the default
   8 samples; queues on the GPU lock).
   Test a slice first when unsure: `scripts/render.sh <Id> <slug> 44 49`.
10. **Frame QA**: run the master through the `watch-video` skill with a harsh-critic focus (pitfalls.md § frame-by-frame QA); fix and re-render.
11. **QA + deliver** (no-narrator episodes: `lines.json` = `[]`, silent `vo.wav`; mix and QA adapt) `.venv/bin/python scripts/qa.py <slug>` (format, loudness, black/frozen
    frames, speech) → `scripts/deliver.sh <slug>` (copies to `~/Videos/story-studio/`, poster,
    contact sheet) → `scripts/clean.sh <slug>` → commit.

## Kit (src/kit) — use it, extend it, don't fight it

| Module | What |
|---|---|
| `core/anim` | `useT()` seconds (motion) · `useTq()` frame-snapped (digits, counters, captions — avoids motion-blur ghosting) · `tw/keys/spring/win/prog` · `E.*` easings · `noise/fbm` (continuous) · `rnd` (layout only) |
| `core/vo` | `makeVO(lines)` → `vo.s(id) vo.e(id) vo.at(id, word) vo.w(id,i)` |
| `sets` | `World` (SVG in world px) · `proj/Persp` (one-point perspective) · `LightPool` `Haze` `Stripe` · reference sets in `src/episodes/last-train/sets.tsx` |
| `stage` | `Scene cam` + `Layer depth blur dof` (2.5D parallax + depth of field) · `Pic` · `Above y` (clip at a seat line) · `Glow` · `Motes` · `Vignette` · `Grade` · `Black` · `shake()` · `rock()` · fonts `F.*` |
| `actor/*` | **The Actor rig** (use for all new stories): 3-D skeleton, faces, hair, gaits, actions, lip sync — see format-drama.md |
| `drama` `iso` | house graphics (Chapter, TipCard, BigClock, Post, Callout, Headline, Icon, Finish) · isometric dioramas (IsoBox, IsoTile, IsoWindows, IsoCyl, IsoPipe, IsoLabel) |
| `puppet` | `Puppet o p` + `pose(...)`, `idle walk sit sitSide tremor bang talk`, `back`, `infected`, `turn`, `brow`, rim light · `OUTFITS` · explainer faces: `o.face {brows, beard, blush}`, `o.bobble`, hats `pith turban kepi cap conductor beanie hood` |
| `edu` | explainer devices: `PlaceCard Nameplate Notice(stamp) Counter RiseChart Bars GoldTitle QuoteCard`, palette `GOLD` |
| `creatures` | `Cobra Slither DeadCobra Rat` — animals in code; write new ones the same way (continuous motion) |
| `cardboard/*` | **the main format's kit**: `CardStage Plane Piece camKeys camY` · `VIBES` · `Room Street Table Outdoors` · `Puppet PuppetSide` + poses · `Face Eyes` · `MakerHand` · paper MG (`FlipCounter Stamp Sticky TapeLabel IndexCard StringChart …`) · `Shots` transitions · `LIB` — see format-cardboard.md § 5 |
| `captions` | `Captions vo st` karaoke (keywords, speaker colours, hide ranges) |
| `hud` | `SeriesBar Stamp PhoneAlert RuleCard RouteMap Timers Speed SwitchDiagram TitleCard EndCard PassingLights typed` |
| `world` | `makeMotion` (speed → position) · `Outside`/`OutsideBox` (night world in windows) · `Skyline` (districts black out) · `TrainSide` |

More kit (contributed by episodes, reuse them): `rain` (Rain, Ripples, GlassDrops, wipers) ·
`car` (SedanSide/Rear/Front, CarPlan) · `city` (CityFlow, RoadAhead, NeonGlyph) · `phone` (Phone,
RideMap, RideSheet, CallChip, Notification) · `devices` (PhoneShell, CallScreen, EtaPill) ·
`elevator` (FloorDisplay, CableDiagram, Callout) · `ferry` (Sea, Fog, ShipSide, ShipBow) ·
`scenery` (makeRoom/RoomShell one-point rooms, Shaft) · `craft` (stop-motion: useStepT, boil, Cut,
Googly, Marker/WriteOn, Tape, Odometer, Bulb, Dust) · `hud` also has Meter, CallCard, TimeLadder,
PlateCheck, MapCard, Gauge, DepthMeter, Roster, PhoneLine, KnockMarks.
New devices belong in the kit when they're reusable (a map, a meter, a dossier card…).
**Registering an episode:** don't edit `src/Root.tsx` by hand — run `python3 scripts/gen_root.py`
(it registers every `src/episodes/<slug>/<Id>.tsx` that exports `<Id>` and `DUR`).

## Delegation (parent agents)

If you're the parent: [references/delegation.md](references/delegation.md) — worktrees, the
brief template, the review rubric, and what to send back. Never run two children in the same
checkout. Review every child's stills and master yourself before calling it done.

## Pitfalls (read when something looks wrong)

[references/pitfalls.md](references/pitfalls.md): every bug hit while building the engine,
with its fix (props that are functions, flip pivots, chroma, black heads on dark seats, sitting
legs, STT drift, music ignoring "silence" …).
