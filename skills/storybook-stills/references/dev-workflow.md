# Dev mode: watch the film BEFORE it is rendered

The owner wants to scrub a cut in a browser, spot problems, and send them back, without waiting five minutes for a render. Two ways, both hot-reloading:

## 1. A single-video player (preferred by the owner: one video, no Studio chrome)
`scripts/devplayer.sh <CompId> [port=3124]` serves ONE composition in the Remotion Player from `public/` (esbuild --watch + a static server; no render, no
Studio) and reloads the page on every change. Expose it to the owner's remote BB with `bb connect expose <port>` (it prints the public URL; give the link
as markdown). The composition id is the exported component name registered in `src/Root.tsx` (`FlightDelayed1v3`, `FlightHookA`, `FitLab`, `Fx2Lab`).

## 2. Remotion Studio (all compositions)
`npx remotion studio src/index.ts --port 3123` (long-running; keep it up) hot-reloads code and `public/<slug>/stills.json`; the owner dislikes it for review
("all videos"), but it is the quickest way to look at a frame range while working. Expose it the same way (`bb connect expose 3123`).

## The loop (what makes "fix it" cheap)
1. Every variant is its **own composition**: `src/episodes/<slug>/<Comp>.tsx` (the 8-line wrapper `stills_new.py` writes) + `python3 scripts/gen_root.py`.
   Hooks A / B / C, v2, v3, labs: all registered, so the owner can scrub each and say "B, but…".
2. The data the player reads is `public/<slug>/stills.json` (and `mix.wav`): rebuild it after every plan change with
   `python3 scripts/stills_build.py <slug>` (`--no-mix` while the sound is not the point: the player does not need to re-mix; `--placeholders` before the art exists).
   Art changes need the same build (it re-crops pictures that are newer than their jpg).
3. Edit `plan.py` (or `plan.json`), rebuild, the page reloads; scrub to the second the owner names (the sync audit prints the same seconds).
4. Before telling the owner "look at X": the Studio / player must show the NEW file. A stale tab keeps the old `stills.json` in memory: reload the page.
5. Only render (`scripts/render.sh`, ~5 min) when the owner has accepted the dev view; QA and upload the render, never the dev view.

## Looking from the terminal (no browser)
`scripts/peek.sh <slug> <Comp> t1,t2,… [scale] [cols]` renders stills of the REAL composition (30 s per call): the fastest way to check an fx position or a card
(`GRID=1` overlays a 10 % grid to read x / y fractions). After the render, look at frames of the FINAL mp4 (`ffmpeg -ss T -i out/<slug>.mp4 -frames:v 1`):
the render adds motion blur / grain / encoding and has caught things the preview did not.
