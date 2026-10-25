# Build, QA and delivery

## Render
```bash
python3 scripts/gen_root.py            # registers src/episodes/<slug>/<Comp>.tsx (SIZE from the wrapper)
PUBLIC_ONLY="<slug>" MIN_FREE_GB=4 SAMPLES=1 CRF1=18 scripts/render.sh <Comp> <slug>    # → out/<slug>.mp4
```
- `PUBLIC_ONLY` bundles only public/<slug> (MBs instead of ~8 GB of public/): always use it for this engine (it loads nothing
  else). If fx/cards reference props under another folder, copy them into public/<slug>/ and point `src` there.
- `SAMPLES=1` (no motion blur: slow pans don't need it), 30 fps. A 45 s film renders in ~1 minute.
- Check stills before a full render: bundle once, then `npx remotion still <bundle> <Comp> /tmp/x.png --frame=<n> --scale=0.4
  --props='{"audio":false}'` for a few frames, tile them, look.

## Looking before rendering
```bash
python3 scripts/stills_build.py <slug> --placeholders        # grey stand-in frames for art that does not exist yet: check timing + graphics while Codex draws
scripts/peek.sh <slug> <Comp> 12.5,14.3,20 0.5 3             # bundle once, render stills at those seconds, tile them → /tmp/peek-<slug>.jpg (~30 s)
GRID=1 scripts/peek.sh <slug> <Comp> 43.0,56.3 0.5 2         # + a labelled 10 % grid: read fx x/y fractions off the picture
python3 scripts/art_sheet.py art/<slug>/raw 12 13 14 --cols 1 --w 1000   # review sheet of the art (prefixes work)
ffmpeg -ss 130 -i out/<slug>.mp4 -frames:v 1 …               # frames of the FINAL video: check every graphic in context before upload
```
A 178 s film renders in ~2.8 min (CONC=4) + ~2 min encode (never touch `public/<slug>/mix.wav` while it runs: the encode reads it at the end); `peek.sh` is the loop for fx placement (about ten iterations on the first cut).

## Before a render (30 s, catches what the eye misses)
```bash
python3 scripts/check_fx.py                    # every declared fx / card kind has a render case; every plan uses known kinds (a switch with a missing case renders NOTHING)
python3 scripts/sync_audit.py <slug>           # every beat vs the narrator's words + each card's hold vs read-aloud + 1 s (pacing-and-sync.md)
npx tsc --noEmit -p .
```

## QA (must pass)
`.venv/bin/python scripts/qa.py <slug>`: format PASS, loudness PASS (−14 LUFS), picture 0 freezes (a freeze = a held frame
≥ 1.5 s: add motion; a card that waits for the narrator needs the engine's slow drift, which is built in), speech PASS (≥ 0.97 of words heard). The speech check knows plates read letter by letter, digit-by-digit
numbers after a plate, 911, 2001–2009 and a few name spellings; a FAIL that's only spelling is a false alarm: run
`scripts/stt_check.py <slug> <wav>` to see the mismatches before re-rendering.
Then look at `out/<slug>-qa.jpg`.

## Delivery
- **A re-uploaded R2 object keeps being served from Cloudflare's cache** (cf-cache-status HIT, no purge token): a FIXED clip gets a NEW key (`flight-hook-b2.mp4`, `…-p1-v3.mp4`); verify with a plain `curl -sI` (200, content-length = the local file) and check `cf-cache-status`.
- Test cuts: upload to R2 for the owner (`story-studio/tests/<name>.mp4` on https://faceless.clipaf.com) and share the link;
  delete the local mp4 after the upload is verified.
- Series parts / films: covers (`public/covers/covers.json` + `scripts/cover.sh`, top PART banner), gallery entry
  (`gallery/series.json`, `scripts/s1_gallery.py`-style metadata), `scripts/deliver.sh`, `scripts/r2_sync.py videos --delete-local`.
- Never publish to YouTube / TikTok without the owner.

## Traps we hit
- A shot's `at` must be later than the previous one (the build stops and names the shot).
- Anchors fail loudly when a word isn't in the line: fix the plan, not the voice.
- Disk: keep ≥ 5 GB free; render one thing at a time; never edit `render.sh` while it runs. Leftover headless browsers
  (`chrome-headless-shell`) from killed renders can pile up; clean them only when no render runs.
- Image versions of earlier series (S1 engine, `src/episodes/_s1`) are a different format; don't mix the engines in one film.
