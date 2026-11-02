---
name: codex-video-production
description: "Hand a whole Story Studio part or film to Codex: Claude is the DIRECTOR (story, script, voice, hook/end plan), one Codex PRODUCER thread (gpt-6.1-sol, ultra) owns the production end to end (shot list, art direction, image workers, Flow Omni clips, build, sound, render, upload), and cheap Codex WORKER threads (gpt-6-luna, low) only run image prompts with the built-in imagegen tool and a quick slop check. Use whenever the owner says 'let Codex produce it', 'pass it to Codex Sol', 'you are just the director', or wants a part built overnight without reviews."
---

# Codex video production (director → producer → workers)

## Roles
- **Director (Claude, the parent thread):** writes the season bible and the part's script (`episodes/_series/<series>/season-1.md`,
  `episodes/<slug>/script.tsv`), generates the voice (`scripts/voice.py <slug>`, Gemini or Fish per `cast.json`, then
  `scripts/trim_take.py <slug> --tight 0.25` + `voice.py <slug> --reuse`), plans the hook and end shots, writes the producer brief, spawns
  the producer, and does NOT review unless the owner asks.
- **Producer (Codex `gpt-6.1-sol`, reasoning `ultra`):** owns everything after the brief: the shot list (one picture per line beat,
  a new picture every 2–3 s), the cast sheets and place plates FIRST, prompts, the worker threads, picking/redoing pictures, the Flow Omni
  clips, the build (storybook-stills engine), motion graphics, sound, render, upload, notes, commit. Talks to the director only for real blockers.
- **Workers (Codex `gpt-6-luna`, reasoning `low`):** each gets a numbered batch of finished prompts (≤ 15) + reference image paths. Per prompt:
  ONE built-in `image_gen` call (attach the listed refs), look at the result once for slop (extra/missing hands, fingers, arms or legs, a
  hand not traced to its shoulder, melted faces, off-model cast, pseudo-text, impossible physics or perspective), redo ONCE if bad, then copy
  the PNG to the exact path given. Reply: path + "ok" or "redone: <why>" per prompt. No creative decisions, no git, no other files.

## Spawning
```bash
bb thread spawn --project <proj> --environment <env> --parent-self --provider codex --model gpt-6.1-sol --reasoning-level ultra \
  --title "Producer · <series> Part N" --prompt-file <brief.md>            # director → producer
bb thread spawn --project <proj> --environment <env> --parent-self --provider codex --model gpt-6-luna --reasoning-level low \
  --title "Images · <slug> batch A" --prompt-file <batch.md>              # producer → workers
```
- At most **5 Codex threads at once** on this PC (RAM): the producer + up to 4 workers. Workers finish and stay idle; reuse them with
  `bb thread tell` for the next batch instead of spawning new ones.
- Worker briefs: copy `assets`-style template below; every batch repeats the STYLE block and the cast references.
- Each generated picture also stays in `~/.codex/generated_images`; the producer deletes that cache for the episode at the end.

## Pictures (Codex imagegen, not Flow)
1. **Cast sheets first:** one sheet per main character (front + 3/4 + side, expressions), on a plain background, in the series style.
   Then **place plates** (each main location, empty, the light of its scene). The producer reviews these at full size and fixes them before any scene.
2. **Scenes:** every prompt names the cast/place references to attach, the camera (wide / medium / close / insert / POV), the light/time of day,
   one clear action, and the exclusions ("exactly two arms and two legs per person, no text, no logos").
3. **No text in pictures:** screens, signs, papers stay blank; all words are code (phone UI, captions ≤ 2 words, rule cards, labels).
4. The producer checks every picture once more at full size before it goes into the plan; redo by EDIT for small faults.

## Motion (Flow Omni only where it matters)
- The **hook** (the first 2–4 shots, 6–10 s each) and the **end scene** are animated with Google Flow Omni from the approved Codex pictures:
  `python3 ~/Developer/bb-plugins/skills/google-flow/scripts/flow.py video --start <png> -p "<style lock>. <one action>. <camera move>. <exclusions>" --model omni --res 720p --secs 6|10 --account auto`
  (the Google guard: one job at a time, pauses, caps). **Mute the clip audio**; our foley/score carry the sound. Everything else is stills
  with camera moves, parallax, code graphics (the storybook-stills engine).

## Build, sound, render, deliver
- Engine: `src/kit/stills` (storybook-stills skill: plan, word anchors, fx/cards, word-by-word text, nothing at the top of the frame,
  captions ≤ 2 words in a rounded pill), `scripts/stills_build.py <slug>`, dev player `scripts/devplayer.sh <Comp>`.
- Sound: library first (`scripts/find_sfx.py`), ElevenLabs SFX for new ones; music: Lyria via `gemini_audio.py music` or the library;
  ducked under the voice; no stingers.
- Render with the remotion-render-farm skill (`farm render`), `scripts/qa.py <slug>` must PASS, look at frames of the master, upload with
  `scripts/r2put.py` to a NEW key, verify with a `?v=` ranged GET, delete local mp4s, commit locally (never push).
- Final message to the director: the link, length, QA line, credits spent, and anything left undone. Keep it short.

## Worker batch template
```text
You are an image worker. Use the built-in image_gen tool. Work in ~/Developer/story-studio. Make ONE image per prompt below.
STYLE: <series style block + reference image paths>
CAST REFS: <name: path, …>
For each prompt: generate once with the listed refs attached → look once for: extra/missing hands, fingers, arms or legs (trace each hand to its
shoulder), melted/warped faces, off-model cast, any text or letters, impossible physics → if bad, regenerate once → copy the final PNG to the
exact path. Never overwrite an existing file. No git. Reply per prompt: "<path> ok" or "<path> redone: <reason>".
01 → art/<slug>/raw/01_<id>.png · refs: … · <prompt>
…
```
