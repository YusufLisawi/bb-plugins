---
name: wide-to-vertical
description: "Turn a 16:9 long-form part or film from Story Studio into a 9:16 vertical for TikTok / Reels / Shorts without touching the film: the published master plays unchanged in the middle, its own picture blurred behind it, a short 'What if…' hook above and 'Part N' below as TikTok-style white line boxes, and at the film's end card a comment ask plus an animated 'Follow for Part N+1' button. Rendered on the remotion render farm, uploaded to R2 and shown in the Story Studio gallery (a 16:9 / Vertical 9:16 switch and a download). Use whenever the user wants a vertical, 9:16, TikTok or Shorts version of a horizontal / wide / long-form part, series or film, or asks to convert long form to vertical."
---

# Wide to vertical

The owner set this look on 2026-10-31 (Flight Delayed, the first series converted). Keep it unless they ask otherwise.

## The look (locked)

- **The film, unchanged:** the published master at full width, 1080×608, centred (y 656). No crop, no re-edit, the master's own mixed sound.
- **Backdrop:** the same frame blown up to fill 1080×1920, `blur(40px) brightness(0.7) saturate(1.5)`, with a light dark gradient at the top and bottom. Its colour follows every shot.
- **Hook, above the film:** 2 short lines in sentence case (not all caps), e.g. "What if zombies / hit your airport?". **Short**: at most about 20 characters a line, and the idea has to be clear in one read. Barlow Condensed ExtraBold, 76 px, black on white.
- **TikTok-style boxes:** one white box per line, merged by an SVG goo filter so the joints get smooth inner curves. The text sits on a separate layer so it stays sharp.
- **Part, below the film:** "Part 1", 84 px, in the same white box. No title.
- **Nothing else on screen:** the owner removed the series name / status row, the dots and the progress line. Don't add them back.
- **CTA, synced to the film's own end card:**
  - At `questionAt` the hook springs into a comment ask (2 lines: "Hide or run?" / "Comment 1 or 2", or "Who cut the tape?" / "Comment a name").
  - At `partAt` "Part N" springs into a red pulsing "+" with a "Follow for Part N+1" box.
  - At `followAt` the plus spins a quarter turn and a tick pops in.
  - The finale says "Follow for Season 2".
  - Films without a storybook end card get the last 10 s.
- **The owner's rejects:**
  - all text in one big box;
  - yellow-on-black for the hook (they tried it and went back to white);
  - text too big;
  - all caps;
  - long hooks.

## How to run it

The code lives in `~/Developer/story-studio/vertical/`. It's its own Remotion 4.0.539 project, because the farm needs 4.0.539+ and the main project stays on 4.0.399.
- `src/Vertical.tsx`: the layout.
- `src/Root.tsx`: reads `src/comps.gen.json`.
- `build.py`: the pipeline.
- `series/<series>.json`: one entry per part.

1. **Write `series/<series>.json`:** `{"series", "fps": 30, "parts": [{"slug", "part": "Part 1", "hook": [2 lines], "ctaTop": [2 lines], "follow": "Follow for Part 2"}]}`. Base the hooks on the cover line and the part's question in `public/covers/covers.json` / `scripts/<series>_gallery.py`. Show them to the owner, who picks the hooks.
2. **Quick example first:** `python3 build.py series/<s>.json <slug> --first 12` makes `out/<slug>-vertical-12s.mp4`, with the CTA in its last 5 s. Look at stills (`ffmpeg -ss <t> -i … -frames:v 1`) before the full run.
3. **Every part:** `python3 build.py series/<s>.json`. It does one part at a time:
   - downloads the master from `faceless.clipaf.com/story-studio/videos/<niche>/<slug>/<slug>.mp4`;
   - cuts it into JPEG frames plus `mix.wav`;
   - runs `farm render` (full size; the mix is muxed as it is);
   - checks the frame count;
   - writes `~/Videos/story-studio/<slug>-vertical.mp4`;
   - **deletes the frames**.

   A part takes ~2–3 min on this PC + mouad (3 + 3 windows).
4. **Upload and gallery:** from `~/Developer/story-studio`, run `uv run --with boto3 scripts/r2_sync.py videos --delete-local`.
   - It uploads `<slug>-vertical.mp4` next to the master in R2.
   - It rebuilds the gallery. `gallery/build.py` maps the file to `vv`; `app.js` shows a 16:9 / Vertical 9:16 switch and a "Vertical 9:16" download.
   - Never probe a key before uploading it: the CDN caches the 404 for 1 h.
   - `--delete-local` also deletes the other local mp4s it has confirmed in R2.
5. **Clean up:** `vertical/public/<slug>/` and `vertical/out/` should be empty after a run. Delete any leftovers.

## Rules

- The film in the middle is never re-rendered or edited, only placed. Fixes to a film go in its own project, then re-run this.
- Capture mode: frames are `<Img>` JPEG sequences (no OffthreadVideo). Everything is a function of the frame (springs, no randomness).
- If the farm fails with "Error loading image", the frame names and `padStart` disagree (5 digits).
