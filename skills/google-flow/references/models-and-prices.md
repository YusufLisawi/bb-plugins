# Flow models, options and prices

Measured 2026-10-31 on a Google AI Pro account (1,050 monthly credits) with `flow.py models all`. Prices change: run
`flow.py models` or `flow.py price` before quoting a budget. Credits are per output (x2 doubles it).

## Video (Frames or Ingredients, 16:9 or 9:16)

| Model | Resolution | 4 s | 6 s | 8 s | 10 s |
|---|---|---|---|---|---|
| Omni 1.1 Flash | 360p | 4 | 5 | 6 | 7 |
| Omni 1.1 Flash | 720p | 7 | 10 | 12 | 15 |
| Veo 3.1 - Lite | 720p, fixed 8 s | | | 10 | |
| Veo 3.1 - Fast | 720p, fixed 8 s | | | 20 | |
| Veo 3.1 - Quality | 720p, fixed 8 s | | | 100 | |

Measured jobs: Omni 720p 4 s = 7 credits (~40 s render); Omni 360p 4 s = 4 credits (~28 s render). Spent always matched
the quote. Clips come with an audio track.

## Images

Nano Banana Pro, Nano Banana 2 Lite and Nano Banana 2.1 (default): 16:9, 4:3, 1:1, 3:4, 9:16, x1-x4, **0 credits** on
this plan. A Nano Banana 2.1 image with one reference took about 1 min.

## Download options (by the source tile)

| Source | Options | Notes |
|---|---|---|
| 720p video | 270p Animated GIF, 720p Original size, 1080p Upscaled, 4K Upscaled | 4K is disabled on Pro (Ultra only) |
| 360p video | 270p Animated GIF, 360p Original size, 720p Upscaled | no 1080p from a 360p source |
| Image | 1K Original size, 2K Upscaled, 4K Upscaled | 4K disabled on Pro |

Upscales cost no credits. The first 1080p / 2K request for a tile renders on Flow's side (seconds to a few minutes);
repeats are instant. `--quality best` takes the highest enabled option, `original` the source file.
