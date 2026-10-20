# Pitfalls: symptom → cause → fix (all hit while building THE LAST TRAIN)

| Symptom | Cause | Fix |
|---|---|---|
| Master render: `Minified React error #130` (element type undefined) | a React component passed through Composition `defaultProps` — props are serialised to JSON | bind components at module level (`makeMB(C)` in Root.tsx), never pass functions as props |
| A mirrored plate vanished / the bay showed only the window | `scaleX(-1)` on a full-size div flips around its CENTRE (world x → 1080 − x) | wrapper `left:0 top:0` with `transformOrigin: "0 0"` |
| Seated people looked like they were standing | front-view sitting with long vertical shins | `sit()` (front, thighs foreshortened, knees apart) or `sitSide(dir)` (profile, thighs horizontal) — match the seat's view |
| One leg pointed up in profile sitting | the right leg's knee angle is mirrored in the rig | `sitSide` gives legR the same knee sign as legL (fixed in the kit) |
| Heads invisible above dark seats | black head, back view, navy upholstery | rim light (on by default), hair/hood shapes, slightly larger heads |
| Back views showed lapels/buttons | front details drawn regardless of view | `back` hides all front details (fixed in the kit) |
| Window showed a giant black blob | the Outside layer's near "trees" scaled up by the window zoom | OutsideBox horizon on the window's middle; small trees; fewer layers |
| Whisper says words are ~1 s late around dialogue | Whisper timestamp drift after cast-line gaps | trust the ElevenLabs alignment (verified against the audio envelope); re-check a doubtful line in isolation |
| STT "missing" numbers | digits vs words ("11 40pm" vs "eleven forty p.m.") | stt_check normalises numbers, grey/gray, possessives |
| `mmss` showed a nonsense placeholder (99:00) | a timer before its value exists | return `NaN` → shows `--:--` |
| Music model ignored "near silence" and exact hit times | sections are honoured loosely | shape with `MUSIC` automation (−22 dB under the twist) + SFX hits; check per-second loudness: `ffmpeg -i score.mp3 -ac 1 -ar 8000 -f f32le - | python -c "…rms per second…"` |
| True peak −1.41 dBTP after loudnorm | linear loudnorm doesn't limit | target −2.2 dBTP in the second pass |
| 42 font network requests warning | loading every weight | load only the weights used, `subsets: ["latin"]` |
| Stills silently missing from the sheet | parallel stills racing / errors hidden | stills.sh retries and prints `FAILED <sec>` with the error; labels come from the file names |
| A finishing render killed another agent's stills browsers | shared TMPDIR + a broad pkill | per-project TMPDIR `~/.cache/remotion-tmp/<project>/` and pkill scoped to it |
| Editing a script while it runs breaks the run | bash reads scripts incrementally | edit running scripts only with `sed -i` / atomic replace, or wait |
| Out-of-memory kills Chrome during renders | `earlyoom` prefers chrome/ffmpeg; 15 GB RAM | max 3 agents at once, render CONC ≤ 6 (4 when others work), stills switch to software GL while a master holds the GPU |
| `/tmp` filled RAM | `/tmp` is tmpfs here | renders/bundles under `~/.cache` and `out/` only |
| Frame folders filling the disk | rendering image sequences | `render.sh` renders straight to H.264 at 120 fps and blends with ffmpeg `tmix` → 30 fps; intermediate deleted |
| A Luna/Codex agent described the wrong video's frames | it opened files from another folder | brief with absolute paths and "if it doesn't look like X you opened the wrong files" |
| `ffmpeg` in a `while read` loop ate the input list | ffmpeg reads stdin | always `-nostdin` |
| **Counters/timers/captions look doubled or "overprinted" in the master** (found by a frame-by-frame Luna QA, invisible in stills) | the 120 fps master averages 4 sub-samples; a number that changes between them shows 4 values at once | use `useTq()` (time snapped to the output frame) for every digit, counter, typed text and caption word state; keep `useT()` for motion. The kit's Captions/Counter/Timers/Speed/Stamp already do |
| `pkill -f <pattern>` killed the shell running it (exit 144) | the shell's own command line contains the pattern | `.venv/bin/python scripts/stop-renders.py <project>` (skips itself and its parents), or kill exact PIDs |
| `clean.sh` deleted a running render's temp folder | cleanup ran while a master held the GPU | clean.sh skips caches while `/tmp/story-studio-gpu.lock` is held |
| A failed QA didn't stop a `render && qa && render …` chain | `qa.py … | tail` — the pipe's exit code is tail's | don't pipe commands whose exit code you rely on, or use `set -o pipefail` |
| `mix.py` took > 10 min under load | moving averages via `np.convolve(x, ones(k))` = O(n·k) | cumulative-sum moving average (O(n)) — now ~20 s |
| First frame black (bad thumbnail) | a fade-in from black at t = 0 | never fade from black at 0; frame 0 is the thumbnail |
| A hard cut shows one frame of both shots blended ("ghosting at cuts", found by frame QA) | the Shot switch used `useT()`: 2 of the 4 blur sub-samples see the old shot | switch shots (and any hard on/off) on `useTq()`; keep `useT()` inside the shot for motion |
| **Videos "unplayable" on the user's phone** from the share link | (1) `python3 -m http.server` has no HTTP Range support (phones need 206 partial content to stream mp4); (2) masters were full-range `yuvj420p` at H.264 level 5.0 | serve `~/Videos/story-studio` with its `serve.py` (range-capable); `render.sh` now encodes TV-range `yuv420p` High@4.1; `deliver.sh` adds a 720p copy for streaming. Check with `curl -I -H "Range: bytes=0-99" …` → 206 and `ffprobe … pix_fmt` → yuv420p |
| Banging/waving arms smear into a mess under motion blur | ≥ 2.5 Hz large arm swings | ≤ 1.5 Hz, smaller amplitude, or accept and keep it brief |

## Do a frame-by-frame QA of every master with the watch-video skill

Stills can't show motion artefacts. After `qa.py`, run the master through watch-video
(`fetch.sh <mp4>`, `frames.py --max 60`, `delegate.sh` with a harsh-critic focus: cut-off/overlapping
text, accidental crops, floating characters, black/static frames, glitches, caption collisions;
"rank the 10 fixes"), fix what it finds, re-render. It found the counter ghosting above.
