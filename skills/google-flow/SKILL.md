---
name: google-flow
description: Generate videos and images in Google Flow (flow.google.com) on the user's own account with one command per job, through a PinchTab browser, and get back JSON with the quoted and the actually spent credits and the downloaded files. Covers Omni 1.1 Flash and Veo 3.1 (Lite / Fast / Quality) image-to-video with start and end frames or ingredients, 16:9 or 9:16, 4/6/8/10 s, 360p preview or 720p, x1-x4, Nano Banana images with references, price quotes without spending, upscaled downloads (720p, 1080p, 2K), and Google sign-in. Use whenever the user wants something animated or generated "with Flow", "in Google Flow", with Omni, Veo or Nano Banana through their Flow account, wants Flow credit costs compared, or wants a Flow clip or image downloaded or upscaled.
---

# Google Flow automation

`scripts/flow.py` drives the user's Flow project in a PinchTab browser. Each command prints **one JSON object on stdout**
(progress goes to stderr), so a job costs a few hundred tokens: never snapshot or screenshot Flow yourself unless a command
fails and `flow.py shot` is not enough. Python 3.9+, standard library only; `ffprobe` (optional) adds duration and size.

```bash
F="python3 <skill-dir>/scripts/flow.py"
$F status                                    # signed in? credits, project
$F price video --model omni --res 360p --secs 4            # quote only, spends nothing
$F video --start shot.png -p "PROMPT" --secs 4 --out DIR   # upload, generate, wait, download, report credits
```

## First run on a machine

1. PinchTab must be installed (`pinchtab` on PATH; the `pinchtab` skill covers it). `flow.py setup` enables the two
   PinchTab permissions it needs (`allowEvaluate`, `allowCookies`) and the Google domains in `~/.pinchtab/config.json`
   (backup `config.json.bak-google-flow`), then restarts the server. It changes nothing else.
2. Sign in. **Preferred: `flow.py login`.** It serves a live view of the automation browser on `127.0.0.1:8790` with a secret
   path, starting at Google sign-in. In BB run it in the background, `bb connect expose 8790`, and give the user the public URL
   + the printed path. The user clicks and types their own password / 2FA there; the command exits by itself once Flow is
   signed in. Never type or ask for the password yourself. This gives the automation browser its own Google session.
   Fallback: `flow.py setup --cookies export.json` with a fresh Cookie-Editor / EditThisCookie export. Copied cookies are
   short-lived (Google rotates and device-binds them; expect a sign-out within about an hour) and `setup` refuses to replay
   them over a live session unless `--force`, because replaying stale rotated cookies signs the session out.
3. Choose the project: `flow.py setup --project https://flow.google.com/project/<id>` (stored in
   `~/.config/google-flow/config.json`), or `flow.py new-project --save`. `--project URL` works on any command.

The PinchTab profile directory is configured under `/tmp` on this machine, so a reboot signs Flow out: run `login` again.

## Commands

| Command | What it does |
|---|---|
| `status [--tiles N]` | account, credits left, reset date, project; optionally the newest N tiles |
| `price video\|image [settings]` | applies the settings and returns the quoted credits; no generation |
| `models [video\|image\|all]` | probes every model's options and the price of every duration/resolution (~10 s) |
| `video -p PROMPT [settings] [--start IMG] [--end IMG] [--ingredient IMG]...` | generates, waits, downloads, returns quoted vs spent credits |
| `image -p PROMPT [settings] [--ref IMG]...` | the same for images |
| `upload FILE [--name N]` | adds an image to the project |
| `list [video\|image] [--limit N]` | tiles newest first: index, kind, title, progress, failed |
| `download TILE [--quality Q] [--options]` | TILE = `latest`, an index or a title (substring); upscales on Flow's side |
| `new-project [--save]`, `login`, `setup`, `shot [--out F]` | project, sign-in, setup, debug screenshot |

Settings (all optional; defaults in the config file): `--model omni | veo-lite | veo-fast | veo-quality | nano | <full name>`,
`--aspect 16:9 | 9:16` (images also `4:3 1:1 3:4`), `--res 360p | 720p` and `--secs 4 | 6 | 8 | 10` (Omni only; Veo is
fixed 720p 8 s), `--count 1-4`. Generation flags: `--download original | best | gif | 720p | 1080p | 2k | none`,
`--out DIR`, `--name BASE`, `--max-credits N` (refuse when the quote is higher), `--dry-run` (set everything up and quote),
`--timeout MIN`.

`--start / --end / --ingredient / --ref` take a local file (uploaded with a unique name) or the name of an asset already in
the project, e.g. a generated image's title from `list`, so a Flow image can be animated without re-uploading.

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
menu items, `messages` when Flow refuses a prompt). Not signed in → `login`. A setting the model lacks → pick from
`offered`. Flow UI changed → `flow.py shot` and read [references/internals.md](references/internals.md); fix the selector
in `scripts/flow_page.js` (aria-labels and visible text only) and bump its `v` number.
