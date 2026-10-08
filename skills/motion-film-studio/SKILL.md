---
name: motion-film-studio
description: Make premium voice-over motion-graphics films — product ads, launch films, explainers, showreels — in 9:16, 16:9, 1:1 or 4:5, with word-synced kinetic type, springs, shine and camera moves, real product UI, an ElevenLabs or Fish Audio voice, frame-locked sound design and optional soft music, rendered as an 8-sample motion-blurred master with QA gates. Works for any brand, app or SaaS: brand_intake.py turns a website into a brand kit (colours, fonts, logo, CTA, product truth) that the user approves from a one-image preview; Brainfast is the default preset. Use to create, remake, re-voice, re-cut or fix such a video (prefer it over motion-video-ads for anything premium). Completion includes mandatory cleanup of temporary render frames after QA and packaging.
---

# Motion film studio

> [!IMPORTANT] Storage takes care of itself (keep it that way)
> Generation must never fill the disk. The pipeline cleans up automatically; don't bypass it.
> - `render_master.sh` **streams**: renders 90 frames, averages them, deletes their sub-frames, repeats (peak ≈ 5 GB per film, never ~27 GB). It refuses to start a chunk under 20 GB free, kills every browser it started, and deletes its bundle when done.
> - `package.py` deletes the averaged frames as soon as the poster, key frames and player page exist (`"keep_frames": true` in deliver.json to keep them).
> - `scripts/tidy.py` (the storage janitor) removes only regenerable leftovers: stale bundles (~600 MB each), Remotion temp and browser profiles, sub-frames of dead masters, old review stills (contact sheets kept), art download temp. Every master and stills batch runs it; a systemd `--user` timer (`mfs-tidy.timer`, installed by `new-project.sh`) runs `tidy.py --all --apply` every 30 min. Log: `~/.cache/mfs-tidy.log`.
> - Before a long batch: `python3 scripts/tidy.py --apply --ensure 20`. To stop a master: kill its `render_master.sh` (its renders and browsers stop with it). Never queue masters with a loop that calls `remotion render` directly.
> Still verify at hand-over that no bulk frame folder is left for a finished film ([the cleanup check](references/render-qa-delivery.md#mandatory-cleanup-after-qa-and-packaging)).

This is the studio behind the 30 Brainfast films the user called *"magnificent… far beyond and cooler"*: ads like *Every business runs on questions* and *The glass box*, the *AI, explained* episodes, native TikTok comment replies, the *1-star reviews* yapping series, and a real-customer case study with niche playbooks.

It gives you three things:

1. **A pipeline** that makes the hard parts reliable: voice, music, sound, the motion-blurred master and QA.
2. **A kit** of proven pieces: layout zones, kinetic type, springs, shine, product UI, camera and the end card.
3. **A library** of finished films to learn from: source, key-frame sheets and case studies.

It does not give you the film. Each new film should have its own idea, world and signature move, designed by you on purpose. The finished films are there to set the bar and teach technique. Don't copy them.

`$SKILL` = this directory. The reference projects, with every film and its git history, are `~/Developer/brainfast-showreel` (films 1–8) and `~/Developer/brainfast-films` (films 9 onward). Render stills from them any time you want to see a film move.

**Media lives outside the skill.** The fonts, the film-grain tile, the 42-effect SFX library, the Starter's voice and music, and the lookbook sheets are in the asset pack at `~/.local/share/motion-film-studio` (`MFS_ASSETS` overrides it). `assets.json` lists every file with its checksum, and `scripts/assets.sh` checks, installs, packs, unpacks and rebuilds them. `new-project.sh` copies them into each project. Keep the skill itself small (well under 10 MB): never add media to it. Put new media in the pack and list it in `assets.json` (`assets.sh adopt-sfx` does this for sound effects).

## Fixed and free

| Fixed: use the tools, don't reinvent | Free: yours to design |
|---|---|
| The voice is the clock: every beat is keyed to a spoken word, `T.ws(line, i)` | The concept, the world, the metaphor |
| The brand kit (`brand.json`: tokens, fonts, logo, CTA, narrator), the end card (`Lockup`), the product truth (`product.md`) | The structure: which acts, in what order, how long each runs |
| Layout zones and safe areas (`useLayout`, `Fit`), so every format works | Scenes, camera, transitions, pacing, composition |
| The audio chain: one take → split → music pieces → frame-locked cues → mix at −14 LUFS | Palette within the brand, backgrounds, textures, light, type treatment |
| The master (8-sample motion blur, `finish.py`) and the QA gate | The music genre and the character of the sound design |
| Delivery: README, player page, remote links | Which kit pieces you use, and the new components you write |

The fixed column is plumbing and quality. Every item in it was paid for with a bug or a user complaint ([pitfalls.md](references/pitfalls.md)), and the scripts exist so you never rebuild them. The free column is where films differ from each other. The numbers in [picture.md](references/picture.md) are proven starting values, not rules. Change them when your idea calls for it.

## The bar, for every film

- **The voice is the clock.** Write the script first and generate one continuous take. Key every visual beat to a spoken word, never to a hand-typed frame, so a new read re-times the whole film.
- **Always moving.** Nothing sits still and nothing hard-cuts. Every scene change is a designed move, and there is one focal point at a time. You choose the moves.
- **Shine where it lands.** When something arrives it gets light: a sheen, sparkles, a ring, a burst, light running along a line. This is the look of the showreel that the user loves most. Its form can be your own.
- **Product truth.** Use the product's real UI strings (grep the app), and show the *result* of each answer: a booked slot, a tracker, a lead card. No pricing talk. Flag every claim the product might not support in the README.
- **For everyone.** Use several industries and visibly different people (ages, genders, ethnicities), not only restaurants. Include one line in another language.
- **Legible everywhere.** Keep text inside the layout's safe zone. Every dark panel sets its text colour explicitly. Nothing gets cropped.
- **Its own film.** Give it a hook, world and signature move that no earlier film has ([films.md](references/films.md) lists what each one owns). Two films in a row shouldn't look like siblings.
- **Finished means cleaned up.** Render frames are temporary working files, often several GiB per film. Complete the cleanup step after QA and packaging; do not retain bulk frame folders for possible future edits.
- **Finished means verified.** Transcribe the master's audio and match it to the script. Hit −14 LUFS and ≤ −1.5 dBTP. The glitch scan must be clean. Review the stills of every beat. Then deliver.

## The user's taste

These are hard rules from direct feedback. Read [references/brand-brainfast.md](references/brand-brainfast.md) § Taste before you start.

- **Voice:** Michael C. Vincent, ElevenLabs `uju3wxzG5OhpWcoi3SMy`: *"keep using the same voice-over"*.
  - Sarah was rejected as "slow, boring, not smooth".
  - Liam was rejected as "sounds away from the microphone".
  - Customer cameo voices are fine.
- **Vibe:** upbeat and smooth, with shine, sparkle and springs. Bold kinetic type. Fill the frame.
- **Sound design over music:** *"sound effects are necessary, they give life to the video more than music does."* Every film gets a full `SOUND` track (taps, pops, whooshes, impacts, ambience on every beat). Music is **optional**: many films are better with none (`"music": null` in film.json). When there is music it stays **very soft** under the voice (`underVoiceDb` 18 by default, never louder than 14).
- **CTA:** "Build your first agent for free" or "Try it for free", then brainfast.ai. Never "Build your agent free".
- **Don't:** use black text on dark glass, busy dot-webs crossing the logo, counters that stop mid-roll, the same face for "different people", or cropped digits.
- **No code on screen for business audiences:** *"our target is not a client that reads code"*. Show a tool as the agent ⇄ the business's own system (`kit/systems` `SystemCard`), never a function call.
- **Generic:** no city, no named languages or countries ("in their own language"), so anyone anywhere relates.
- **Generated artwork (owner rule, Oct 2026):** images come from **Codex in a bb thread** using its `imagegen` skill: you write the prompt and attach the reference images. **Never call an image or video generation API yourself** (Higgsfield, OpenAI Images/Sora, Kling, fal, Replicate…), even when a key is in the environment. **No AI video clips** unless the user asks for them; motion comes from the film's own code. When a generation route fails or runs out, **ask the user** before switching to anything else. Procedure: [references/artwork.md](references/artwork.md).

## Workflow

Run everything from the project root. Pipeline commands take `. scripts/el-env.sh` first; it loads the ElevenLabs, Fish Audio and Deepgram keys (`~/.config/motion-film-studio/`) without printing them. Word timings come from Deepgram Nova-3 (`scripts/stt.py`). Never echo, log or commit a key.

### 0. Brand, project and film
**Another product than Brainfast?** Make its brand kit first ([references/brands.md](references/brands.md)): `brand_intake.py <url> <id>` drafts it from the website, you fix it, `brand-preview.sh` renders one approval image, and the user says OK. Then verify its `product.md` (every product claim in a film traces to it). No film starts from a draft kit.
```bash
python3 $SKILL/scripts/brand_intake.py https://acme.com acme  # draft kit → $MFS_ASSETS/brands/acme (+ intake.md, product.md draft)
bash $SKILL/scripts/new-project.sh ~/Developer/<project> [--brand acme]   # engine + kit + pipeline + Starter + media, already rebranded (default brainfast; on disk, never /tmp: it's RAM here)
bash $SKILL/scripts/brand-preview.sh ~/Developer/<project>   # → out/brand/preview.png for the user's OK
bash $SKILL/scripts/new-film.sh ~/Developer/<project> <slug> <PascalId> v,h   # a blank canvas, registered and typechecked
```
- A new film starts as a **blank canvas** with the plumbing connected:
  - voice timing
  - an *animatic* that shows every line as kinetic type on the frames it's spoken
  - the brand end card and the `SOUND` export
- It has no scenes. You design those.
- `--from <slug>` forks an existing film (code, configs, voice, music). Use it for a new cut or version of *that* film, not to start a new idea.
- Preview with `PORT=3151 npx vite` at `/?film=<slug>&format=v`. Expose that port with `bb connect expose` when the user is remote.
- On a machine without the asset pack, `new-project.sh` stops and says what's missing. Copy the pack over (`assets.sh pack` here, `assets.sh unpack` there), or rebuild it: `assets.sh fonts`, `assets.sh grain`, and `sfx.py` for the sound effects.

After editing the skill itself, run `bash $SKILL/scripts/selftest.sh [--master]`. It checks the asset pack and that the skill stays under 10 MB, scaffolds a project, typechecks, runs the audio chain, renders stills in all four formats, tests both kinds of new film, and optionally renders a master and runs QA.

### 1. Study, then design (before any code)
1. **Look** at the key-frame sheets: the lookbook in the asset pack (`$(bash $SKILL/scripts/assets.sh path)/lookbook/`) and the delivered films' `keyframes.png` in `~/Developer/brainfast/marketing/*/`. They're images, so open them. Note the level of finish: the density, the light, the type scale, the frame filled edge to edge.
2. **Read** [films.md](references/films.md) for what each film already owns. Then read two films' source in [references/examples/](references/examples/), choosing the two *furthest* from your idea. You're learning how a beat is keyed to a word, how a scene hands over, and how a result card lands. Take techniques, not scenes.
3. **Design the concept** in section 1 of `films/<slug>/brief.md`:
   - the idea in one sentence
   - the world
   - the signature move
   - the motion language
   - the look and the sound world
   - which existing film is closest and how this one differs
4. **With no direction from the user,** sketch 2–3 concepts in a line each and pick the strongest. Name the one you picked, and why, in your final message. **With a direction,** the concept serves it.

### 2. Message and script: [references/story.md](references/story.md)
- Fill in section 2 of the brief: angle, audience, hook, problem, turn, proof, reassurance, payoff and CTA.
- The story's shape follows the concept. story.md has a proven arc and alternatives to it.
- Write 95–110 words with expression tags for 35–42 s.
- Hook the viewer within the first 1.5 s.

### 3. Voice: [references/voice.md](references/voice.md)
```bash
.venv/bin/python scripts/vo_take.py films/<slug>/script.txt public/films/<slug>/vo --voice uju3wxzG5OhpWcoi3SMy --tempo 1.06
.venv/bin/python scripts/split_take.py public/films/<slug>/vo --counts <words per line> --extra <air before each line> --start 12
.venv/bin/python scripts/cast_lines.py films/<slug>/cast.json public/films/<slug>/cast     # optional customer voices
```
- Target 2.8–3.1 words per second after the edit.
- `split_take` writes `lines.json` and `words.json`, which the film imports. The animatic re-times itself, so preview it now: it's your timing grid.
- Tune `--extra` until each scene has room.

### 4. Music: [references/music.md](references/music.md)
- Pick the genre and instruments from the concept's sound world.
- Generate the music in **pieces**, then stitch them on the exact frames: `music_pieces.py films/<slug>/music.plan.json` → `stitch_music.py films/<slug>/music.stitch.json`.
  - A is the intro.
  - B starts with the turn on its first beat.
  - C is the final hit.
- A single long generation won't land the drop on the word.

### 4b. Artwork (only when the concept needs illustrations): [references/artwork.md](references/artwork.md)
- One Codex bb thread per batch with the `imagegen` skill: prompts + reference images in, PNGs saved into `public/films/<slug>/art/`.
- No generation APIs, no AI video unless the user asked. Look at every image before using it.

### 5. Picture: [references/picture.md](references/picture.md) · [references/formats.md](references/formats.md)
- Replace the animatic with your scenes, one at a time. Key each scene to `T.ws()`, add its beats to `SOUND`, and render stills as you go.
- Build from the kit in `src/remotion/kit` where it fits: `format` (useLayout, Fit), `fx`, `type` (Kinetic), `ui`, `camera`, `cube`, `lockup` and `sound`.
- When your idea needs something the kit lacks (a paper fold, a liquid morph, a card carousel in 3D, a particle system), write it. If it turns out reusable, add it to the project's kit. If it's good, add it to `$SKILL/engine` too.
- Positions come from the layout zones. UI is authored in a fixed design box and fitted into the stage. That's how one file serves every format.

### 6. Review loop, before any long render
Run `scripts/stills.sh <Id>-<fmt> out/review <frames…>` and look at **every** beat: hook, each hand-off, the turn, each card landing, the reveal moments, the final hit, the CTA and the last frame. Fix, then re-render the stills. Checklist: [references/render-qa-delivery.md](references/render-qa-delivery.md) § Review.

### 7. Sound: [references/sound.md](references/sound.md)
The film exports `SOUND: Cue[]`, built from its own beat constants with `cue()` and `moments.*`.
```bash
bun scripts/film_sound.ts src/remotion/films/<slug>/<Id>.tsx > public/films/<slug>/sound.json
.venv/bin/python scripts/mix_film.py films/<slug>/film.json --table      # → public/films/<slug>/mix.wav, −14 LUFS
```

### 8. Master, QA, deliver: [references/render-qa-delivery.md](references/render-qa-delivery.md)
```bash
scripts/render_master.sh <Id>-v <slug>          # SS render on the GPU (auto-resume) → finish → encode
.venv/bin/python scripts/qa.py out/<Id>-v.mp4 out/<Id>-v-final films/<slug>/script.txt
.venv/bin/python scripts/package.py films/<slug>/deliver.json   # poster, key frames, 720p inline player page
```
- Deliver to `~/Developer/brainfast/marketing/brainfast-<slug>-<secs>s/` with a README.
- Show the inline player page with `::inline-vis`.
- Serve the folder with `python3 -m http.server <port>` plus `bb connect expose <port>`, and link the mp4.

### 9. Cleanup (automatic, then verify)

`render_master.sh` already deleted the sub-frames chunk by chunk, and `package.py` deletes the averaged frames after packaging. Then verify, for every film and delivered format:
- `ls out/` shows no `<Id>-<fmt>-ss` or `<Id>-<fmt>-final` frame folder for a finished film (patch or retry folders included); the final video exists and opens.
- `python3 scripts/tidy.py --apply` reports nothing large left; mention a substantial recovery (`df -h .`).
- Keep final videos, audio, source, configs, QA reports, posters, keyframe sheets and selected review sheets. **Never delete the whole `out` directory.**

## Before you hand over

The user sees results, not process. Before anything reaches them, check each of these:

- [ ] The film has its own idea. The brief's concept section is filled in, the picture delivers it, and no hook, world or signature move is lifted from an earlier film.
- [ ] Stills of every beat reviewed in every delivered format. No overlaps, cropping, empty frames or unreadable text.
- [ ] `qa.py` PASSES on format, loudness, glitches and speech. A flagged frame is only acceptable when you've looked at it and it's a deliberate impact.
- [ ] The CTA wording is right, and the narrator is the approved voice.
- [ ] The README states the specs, script, concept, how it was made, the checks, and the illustrative content and claims. Every product claim traces to a line in the brand's `product.md`.
- [ ] The brand kit is `approved`, and nothing from another brand (name, URL, logo, colours) is in the film.
- [ ] **Disk clean:** no frame folders left for finished films (streaming master + `package.py` + `tidy.py`); final videos, audio, source, QA metadata and curated review assets remain.
- [ ] The source is committed in the film project. Nothing is pushed.
- [ ] The final message has the inline player, the mp4 link, the remote link, and one line per film on its idea.

## Budget

- **Voice:** a take costs about the script's characters. The Creator tier has 300k characters a month; check with `curl …/v1/user/subscription`.
- **Music:** 3 pieces per film, one request at a time. The account allows 2 concurrent requests, shared with anything else running.
- **Render:** a 40 s 9:16 film is about 9,600 sub-frames, roughly 25–35 min on the RTX 3060 with `--gl=angle-egl`. Finish and encode take about 2 min. Plan 2–3 review rounds of stills before the master.
- **Parallel films:** render one at a time or cap concurrency. Don't run two GPU renders at 6 concurrency each.
- **Disk:** masters stream (peak ≈ 5 GB per film, never the old ~27 GB) and stop by themselves under 20 GB free; queue them only through `render_master.sh`.

## Reference map

| Need | Read |
|---|---|
| Angle, hook, structures, script writing, CTA | [references/story.md](references/story.md) |
| Voice (ElevenLabs or Fish Audio), take editing, customer voices, re-voicing | [references/voice.md](references/voice.md) |
| Music pieces, prompts that worked, stitching | [references/music.md](references/music.md) |
| The kit, proven motion values, scene grammar, ideas to go further | [references/picture.md](references/picture.md) |
| 9:16 / 16:9 / 1:1 / 4:5, zones, Fit, re-composing | [references/formats.md](references/formats.md) |
| Illustrations / generated images: Codex `imagegen` thread, prompts, references, cut-outs, review | [references/artwork.md](references/artwork.md) |
| Sound cues, the 42-effect library, levels, the mix | [references/sound.md](references/sound.md) |
| Master render, QA gate, review checklist, packaging, delivery | [references/render-qa-delivery.md](references/render-qa-delivery.md) |
| Something looks or sounds wrong | [references/pitfalls.md](references/pitfalls.md) (read this first when debugging) |
| A new brand, app or SaaS: brand kit, intake, approval preview, product truth | [references/brands.md](references/brands.md) |
| Brainfast tokens, logo, lockup, real product strings, taste | [references/brand-brainfast.md](references/brand-brainfast.md) · `brands/brainfast/` |
| What each finished film owns, and how it was built | [references/films.md](references/films.md) · [references/examples/](references/examples/) · the lookbook in the asset pack |
| Where the media lives, and how to move or rebuild it | `scripts/assets.sh` (its header) · `assets.json` |
