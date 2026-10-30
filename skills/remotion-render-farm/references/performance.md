# Performance: measured numbers

All measured on 2026-10-30 with Chromium 155 and Remotion 4.0.539. The machines:
- **this:** this PC, 12 threads, RTX 3060;
- **mouad:** 12 threads, RTX 3050.

The test film is OPERADOR: 6,257 frames, 1920×1080, 30 fps, 3:28.
Use these numbers to set expectations; a different composition scales by how heavy its frames are.

## Machines and windows (whole film, full size, everything rendered)

| Setup | Time |
| --- | --- |
| this, 1 window, vsync on | 122 s |
| this, 1 window | 87.9 s |
| this, 3 windows | 68.1 s |
| this, 4 windows | 62.5 s |
| mouad, 1 / 3 / 4 windows | 106.1 / 74.0 / 71.3 s |
| this + mouad, 3 + 3 (the default) | 50.2 s (45 s through the API) |
| this + mouad, 4 + 4 | 59.6 s, slower than 3 + 3 |

- **More windows:** they share one CPU and one GPU, so gains flatten after 3. More speed comes from more GPU machines:
  roughly 33–38 s with a third PC and 25–30 s with a fourth (estimates).
- **Vsync:** off by default (`--disable-gpu-vsync --disable-frame-rate-limit`), which saves 28% in one window. `--slow`
  turns it back on.
- **CPU only:** 23 fps instead of 88 on the 3D section, 9 instead of 87 on the product screens. A GPU is needed.

## Resolution (whole film, both machines, everything rendered)

| Size | Time | File |
| --- | --- | --- |
| 1080p | 46.4 s | 113 MB |
| 540p (`farm preview`) | 31.1 s; 25.2 s in the chunked farm | 37 MB |
| 270p | 26.8 s | 15 MB |

Each frame still runs the same page work (React, layout, capture). Only drawing and encoding shrink.

## Re-rendering only what changed

| Case | Time |
| --- | --- |
| Nothing changed | 0.3–0.7 s (the join) |
| One label edited (2 s on screen), master | 2 of 70 chunks, ~10 s without a rebuild |
| One colour edited in the opening (8 s on screen), master | 3 of 70 chunks, 14.6–17.2 s with the ~5 s rebuild |
| Same edit, preview right after the master | 4.6 s (reuses the build and the scan) |
| Cold master with a mapped mix file | 57.4 s (scan 6.2, render 40, first AAC encode of the mix 9.4) |

Where the time of an edit goes:
- page rebuild, about 5 s;
- probe, 0.9 s;
- scan, about 3 s;
- the changed chunks, 3–6 s;
- join, 0.3–1.5 s.

## The scan

- **Speed:** about 1,000 frames a second per window on DOM content. The whole film takes about 3 s on 6 windows,
  split by each frame's cost (the product screens cost 3× the rest).
- **Composition sound:** with the sound fingerprinted (each frame's samples extracted), the film scan takes 19 s.
- **WebGL:** each canvas is read back at full size. The Minecraft scene's 240 frames took 6.8 s.
- **Reliability:** fingerprints are identical between two scans, from any start frame, and on both machines (0
  differences in 1,200 frames). One frame of the GTA-style scene differs between scans, so its chunk always re-renders.

## Sound

- **Mapped mix file:** encoded to AAC once per content. The full size uses the default coder at 320 kbps (9.4 s for
  3:28). Previews use the fast coder at 256 kbps (2.8 s).
- **Composition's own sound:** the first render takes 70 chunks across 6 windows, about 32 s. After that, only changed
  chunks re-render.
- **Accuracy:** checked against the source mix, the offset is 0 samples. The difference is −51 dB over the whole film,
  which is AAC. No click at any of the 69 seams (worst ±10 ms window: −50.5 dB).

## Modes per scene (seconds; Remotion CLI / Chrome capture / default mode)

| Scene | CLI | Capture | Default |
| --- | --- | --- | --- |
| Stickman physics (180 frames) | 6.3 | 3.6 | 13.5 |
| Minecraft-style (240) | 9.7 | 4.6 | 5.4 |
| GTA-style street (240) | 10.4 | 6.8 | 13.1 |
| Three.js looks (180) | 7.6 | 6.5 | 9.5 |

## Quality between machines

A film split across both machines matched one rendered in a single window: median 51 dB, worst frame 38.1 dB PSNR.
GPU rounding differs slightly between machines; it isn't visible.

## Why not Lambda

AWS Lambda adds startup and transfer time. It also uses another encoder (joining needs a re-encode) and another Chrome.
A Lambda + GPU hybrid was estimated at 35–45 s, against about 50 s for the farm and seconds for re-renders.
