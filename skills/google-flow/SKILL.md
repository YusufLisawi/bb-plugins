---
name: google-flow
description: Generate videos, images, speech and music with the user's Google AI Pro accounts. Flow (flow.google.com) through four persistent PinchTab accounts (google1-google4, --account auto picks the one with room), one command per job, JSON back with quoted and spent credits and the files: Omni 1.1 Flash and Veo 3.1 image-to-video, Nano Banana images, price quotes, upscaled downloads, Google sign-in on a live view, a daily keep-alive. Speech and music through the Gemini API (gemini_audio.py, the DEFAULT: Gemini 3.8 Flash TTS with styles, tags, multi-speaker, Spanish/Arabic/German, long texts; Lyria 3.5 music). Use whenever the user wants something animated or generated "with Flow", Omni, Veo, Nano Banana, wants a Gemini or Google voice-over / TTS / music track, wants Flow credit costs compared, or a Flow clip or image downloaded or upscaled.
---

# Google Flow + Gemini audio

**Speech and music: use the Gemini API first** (`scripts/gemini_audio.py`, details in
[references/gemini-api.md](references/gemini-api.md)): no browser, no account pacing, key in `~/.config/google-flow/gemini.env`
(never print or copy it). Speech: `gemini-3.8-flash-tts`; music: `lyria-3.5` (or the 30 s clip model). The AI Studio browser
route (`aistudio_tts.py`, [references/aistudio-tts.md](references/aistudio-tts.md)) is only the fallback.

```bash
G="python3 <skill-dir>/scripts/gemini_audio.py"
$G tts --voice Arlo --style "Narration, calm" --text "…<whispers> …" --out a.wav [--mp3] [--lang es] [--speakers JSON] [--text-file F]
$G music --prompt "…" [--seconds 30] [--instrumental] [--wav] --out m.mp3
$G voices [--language es] [--gender female] [--search NAME]   |   $G models   |   $G usage
```

Each command prints one JSON object (`ok`, files, `duration`, `usage`, `est_cost_usd`; a 429 is `rate_limited: true` with
`retry_after_s`). Long text is cut at sentences (3,000 characters) and joined with a 0.25 s pause; direction goes in `--style`
(a style line inside the text is read aloud); tags are `<whispers> <gasp> <laugh> <sigh> <short pause>` (square `[tags]`
are converted). Story Studio: `"provider": "gemini"` in `cast.json` (`scripts/voice.py`).

**Flow:** `scripts/flow.py` drives the user's Flow projects in PinchTab browsers, one persistent profile per Google account
(**google1 … google4**, [references/accounts.md](references/accounts.md)). Each command prints **one JSON object on stdout**
(progress goes to stderr), so a job costs a few hundred tokens: never snapshot or screenshot Flow yourself unless a command
fails and `flow.py shot` is not enough. Python 3.9+, standard library only; `ffprobe` (optional) adds duration and size.

```bash
F="python3 <skill-dir>/scripts/flow.py"
$F accounts                                  # all four accounts: signed in? email, credits, today's usage (no generation)
$F status                                    # signed in? credits, project (of the account used last)
$F price video --model omni --res 360p --secs 4            # quote only, spends nothing
$F video --start shot.png -p "PROMPT" --secs 4 --out DIR   # --account auto (default): the signed-in account with the most room
```

## First run on a machine

1. PinchTab must be installed (`pinchtab` on PATH; the `pinchtab` skill covers it). Nothing else to set up: a **dedicated
   PinchTab server** for the accounts (port 9877, its own config and token under `~/.local/share/pinchtab/google/`, profiles in
   a persistent folder) is created and started on demand. The shared PinchTab server (9867) is never touched; **never stop or
   restart any PinchTab server** (its shutdown kills every PinchTab-launched Chrome on the machine). See references/accounts.md.
2. Sign each account in: `flow.py login --account google2` serves a live view of that account's browser on
   `127.0.0.1:8790+N` (secret path); in BB run it in the background, `bb connect expose PORT`, and give the owner the URL + path
   to sign in himself, one account at a time. Never type or ask for a password. Alternative: `flow.py setup --account NAME
   --cookies export.json` (a Cookie-Editor / EditThisCookie JSON export); the private copy `accounts/NAME/cookies.json` (0600)
   is refreshed from the live browser (Google rotates `SIDTS`/`SIDCC`) and re-applied automatically when the browser is found
   signed out. Never print cookie values.
3. Give each account its Flow project: `flow.py new-project --save --account NAME`, or `flow.py setup --account NAME --project
   https://flow.google.com/project/<id>` (a project belongs to one account; `--project URL` works on any command).
4. Check: `flow.py accounts`. Daily: `flow.py keepalive --quiet` (cron / automation; no generation; exit 2 = someone signed out).

Browser profiles are persistent (`~/snap/chromium/common/pinchtab-profiles`: the snap Chromium cannot use `~/.local` or
`/tmp` across reboots), so a reboot only restarts the browsers; the logins stay.

## Defaults: "animate this picture"

`video --start PICTURE -p PROMPT` with nothing else = **Omni 1.1 Flash, the picture as the start frame, 720p, 4 s, one take,
the 720p original downloaded, 7 credits**. The aspect follows the picture (portrait -> 9:16, landscape -> 16:9) unless
`--aspect` is given. Defaults live in `~/.config/google-flow/config.json` (`video` / `image` blocks); the user prefers clips
under 5 s and Omni unless they ask for another model.

## Consistent characters and multiple attachments

Flow has two ways to feed references, and they do different jobs:

- **Frames** (`--start`, `--end`): the video starts (and ends) on exactly that picture, so the art style, the cast and the
  place stay as drawn. Best fidelity. One start + one end at most.
- **Ingredients** (`--character NAME`, `--ingredient FILE_OR_ASSET`, each repeatable; videos, voices and avatars work too):
  the model composes a new shot from several references. More freedom, less style fidelity (in tests the street changed,
  sign-like pseudo-text appeared, faces got more detailed). A video uses frames OR ingredients, never both.
- **Flow characters** hold a name, a portrait, a body image and a description, reused across shots:
  `character create --name Ren --portrait ren_portrait.png --body ren_body.png --info "..."`, plus `character list`,
  `character update --name Ren --body ... --info ...` and `character delete --name Ren`. Give stylised characters your own
  body image: a single full-body view on a plain background (crop one view out of a turnaround sheet; a 4-view sheet as the
  body risks four copies of the character).

**Best recipe for a consistent shot (tested):**
1. Reference art once per series, drawn by Codex in the house style: a portrait and a single full-body image per character
   on plain backgrounds, plus an empty plate per place. Create a Flow character from each.
2. Keyframe for free: `image --character Ren --character Giant --ref street_plate.png -p "..."` (Nano Banana, 0 credits
   on Pro). Look at it and bug-check it (arms, legs, text) before spending credits.
3. Animate the approved keyframe: `video --start "<keyframe title from the result>" -p "..."`.
This kept the street, both characters and the ink style, where an ingredients-only video drifted.

**Prompt rules that mattered in tests:**
- Open with the style lock ("Hand-drawn cartoon storybook ink illustration, exactly the style of the references: ...").
- Name each character as in Flow and repeat its 3-4 key traits; say which reference is the setting ("the street reference").
- One clear action per 4 s, then the camera move ("Slow push-in").
- Close with the exclusions: "Only these two characters, no new creatures, exactly two arms and two legs each, no text".
- Avoid nouns a model can turn into a thing: "a giant shadow" became a shadow monster; write "the shadow of an unseen giant
  falls over the street (no creature visible)".
- Clothe humanoid creatures: a bare mannequin-like giant reference was refused as "sexual content"; the same giant in a torn
  shirt and trousers passed. Refused jobs are refunded automatically (the result says so in `message`).

## Account safety (always on: scripts/google_guard.py)

Every command that touches Google goes through one guard, shared by flow.py, aistudio_tts.py and any new Google script:
- **One job at a time:** a lock across all processes, agents **and accounts**; a second caller waits (up to 30 min), never runs in parallel.
- **Human pace:** a random 20–60 s pause between generations, global: switching account does not shorten it.
- **Daily caps per account:** 60 images, 12 videos, 80 speech clips per local day *each*; over the cap the job is refused.
- **Back-off per account:** any "unusual activity", rate-limit, quota or refusal text pauses THAT account for 120 min; the
  others keep working. No automatic retries anywhere: when a job is refused, stop and report.
- **`--account auto`** (default for video / image / speak): the signed-in account with the most room today, no cool-down,
  credits left and a Flow project; ties round-robin. `list` / `download` / `status` without `--account` use the account that
  generated last (tiles live in one account's project).
Settings live in `~/.config/google-flow/config.json` under `"guard"` (`pause_s`, `cap`, `cooldown_min`, `wait_min`); usage and
cool-downs show per account in `flow.py accounts` and `flow.py status` → `guard`. `GOOGLE_GUARD_OFF=1` bypasses it: the owner's call
only. Never run two agents on one account at once (an "unusual activity" warning once came from Flow and AI Studio jobs overlapping).
The Gemini API route (`gemini_audio.py`) is not behind this guard: it is an API key, not an account session.

## Commands

| Command | What it does |
|---|---|
| `accounts [--cached] [--only google2,…] [--force]` | every account: signed in, email Google shows, credits, project, today's usage, cool-down; no generation |
| `keepalive [--quiet]` | daily: open each signed-in account's Flow home, confirm sign-in, refresh the cookie copy; exit 2 if one signed out |
| `login --account NAME [--port P]` | live view for the OWNER to sign NAME in; saves email, credits, cookie copy |
| `status [--tiles N]` | account, credits left, reset date, project; optionally the newest N tiles |
| `price video\|image [settings]` | applies the settings and returns the quoted credits; no generation |
| `models [video\|image\|all]` | probes every model's options and the price of every duration/resolution (~10 s) |
| `video -p PROMPT [settings] [--start IMG] [--end IMG] [--ingredient IMG]...` | generates, waits, downloads, returns quoted vs spent credits |
| `image -p PROMPT [settings] [--ref IMG]...` | the same for images |
| `upload FILE [--name N]` | adds an image to the project |
| `list [video\|image] [--limit N]` | tiles newest first: index, kind, title, progress, failed |
| `download TILE [--quality Q] [--options]` | TILE = `latest`, an index or a title (substring); upscales on Flow's side |
| `character create\|update\|delete\|list [--name N --portrait IMG --body IMG --info TEXT]` | Flow characters for consistency |
| `new-project [--save]`, `setup [--cookies F] [--project URL] [--mode headless\|headed]`, `shot [--out F]` | project, per-account setup, debug screenshot |

Every command takes `--account google1 | google2 | google3 | google4 | auto | shared` (`shared` = the old shared-PinchTab
default profile). Settings (all optional; defaults in the config file): `--model omni | veo-lite | veo-fast | veo-quality | nano | <full name>`,
`--aspect 16:9 | 9:16` (images also `4:3 1:1 3:4`), `--res 360p | 720p` and `--secs 4 | 6 | 8 | 10` (Omni only; Veo is
fixed 720p 8 s), `--count 1-4`. Generation flags: `--download original | best | gif | 720p | 1080p | 2k | none`,
`--out DIR`, `--name BASE`, `--max-credits N` (refuse when the quote is higher), `--dry-run` (set everything up and quote),
`--timeout MIN`.

`--start / --end / --ingredient / --ref` take a local file (uploaded with a unique name) or the name of an asset already in
the project, e.g. a generated image's title from `list`, so a Flow image can be animated without re-uploading.
`--character` takes a Flow character name (`character list`); it works for `video` (ingredients) and `image` (references).

## Recipes

- **Cheap preview, then quality:** `video ... --res 360p --secs 4 --download none` (4 credits), look at it with
  `download latest --quality original --out /tmp/p`, then `download latest --quality best` for the free 720p upscale. A 360p
  clip upscales only to 720p; 1080p is offered only for 720p originals, so when the final must be 1080p, re-generate the
  chosen take at 720p (same prompt and frame) and `--download 1080p`.
- **Vertical:** `--aspect 9:16` with a 9:16 start frame (Flow centre-crops a mismatched frame).
- **Longer:** `--secs 6|8|10` on Omni; Veo is always 8 s (trim locally if a shorter cut is needed).
- **Compare models on the same shot:** run `video` once per `--model` with the same `--start` and prompt, then compare
  `credits_spent`; `models` gives every quote up front.
- **Several takes:** `--count 3` returns three results (`_1`, `_2`, `_3`) in one job.
- **Image then animate:** `image -p ... --ref style.png --aspect 9:16`, then `video --start "<its title>" ...`.

Read [references/models-and-prices.md](references/models-and-prices.md) for the measured option and price matrix and the
download options per source.

## Output and money

`video` / `image` return `quoted_credits`, `credits_before`, `credits_after`, `credits_spent` (measured from the account
balance), `generation_seconds` and per result `title`, `failed` and `download` (`path`, `quality`, `bytes`, `width`, `height`,
`duration`). Report the spent credits to the user. A user request to generate authorizes a normal generation; respect any
budget they give with `--max-credits`, and quote first (`price` or `--dry-run`) when they ask what something costs.
The script presses generate once, confirms the job was accepted, and retries only when nothing was submitted, so it never
double-spends; do not loop `video` yourself after an unclear error: run `list` first to see whether a tile exists.
Downloads (all qualities, upscales included) are taken from the page directly, not from the browser's downloads folder.

## When something fails

Every failure is `{"ok": false, "error": ...}` with context (`offered` options for an unsupported setting, `available`
menu items, `messages` when Flow refuses a prompt). Not signed in → `login --account NAME`. A setting the model lacks → pick from
`offered`. Flow UI changed → `flow.py shot` and read [references/internals.md](references/internals.md); fix the selector
in `scripts/flow_page.js` (aria-labels and visible text only) and bump its `v` number.
