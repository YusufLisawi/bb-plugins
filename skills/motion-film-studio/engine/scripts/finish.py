#!/usr/bin/env python3
"""Motion-blur finishing pass + master encode.

Averages the SS sub-frames of a "<Film>-SS" render (a 180° shutter centred on
each frame) in float32, adds film grain per output frame (same tile and
offsets as the composition's <Grain>, overlay blend), writes 8-bit PNGs and,
with --encode, muxes them with the pre-mixed soundtrack into an H.264 High /
AAC 320k master tagged BT.709 (CRF 14, faststart).

Usage:
  .venv/bin/python scripts/finish.py <ss_dir> <final_dir> [first last] [--encode out.mp4] [--encode-only]
  env: FPS=30  AUDIO=public/films/<id>/mix.wav  GRAIN=0.045  SS=8
  --consume (or <ss_dir>/.consume-subframes) frees each group of inputs only
  after its averaged output has been atomically saved and verified.

  [first last] limits the AVERAGING (e.g. re-finish only a patched range);
  --encode ALWAYS encodes every frame in <final_dir> from f0000 — it refuses a
  gappy sequence (encoding from the patch start silently dropped the film's
  beginning once).
"""
import math, os, re, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image

SS = int(os.environ.get("SS", 8))
GRAIN_OPACITY = float(os.environ.get("GRAIN", 0.045))
FPS = int(os.environ.get("FPS", 30))
AUDIO = os.environ.get("AUDIO")
TILE = np.asarray(Image.open("public/img/grain.png").convert("L"), dtype=np.float32) / 255.0
FF = ["npx", "--yes", "remotion", "ffmpeg", "-hide_banner", "-v", "error", "-y"]

def rnd(seed):  # same hash as src/remotion/lib/ease.ts
    x = math.sin(seed * 127.1 + 311.7) * 43758.5453123
    return x - math.floor(x)

def grain(base, n):
    h, w, _ = base.shape
    x = math.floor(rnd(n * 1.7) * 512)
    y = math.floor(rnd(n * 3.1 + 9) * 512)
    ys = (np.arange(h) + 512 - y) % 512
    xs = (np.arange(w) + 512 - x) % 512
    g = TILE[np.ix_(ys, xs)][:, :, None]
    over = np.where(base <= 0.5, 2 * base * g, 1 - 2 * (1 - base) * (1 - g))
    return base + (over - base) * GRAIN_OPACITY

_index = {}
def frame_path(src, i):
    """Remotion pads [frame] to the width of the range, so look names up by number."""
    if src not in _index:
        names = (f for f in os.listdir(src) if f.startswith("s") and f.endswith(".png"))
        # Prefer the canonical padded filename if a prior single-frame repair
        # left an additional unpadded name for the same frame index.
        _index[src] = {int(f[1:-4]): os.path.join(src, f) for f in sorted(names, key=len)}
    return _index[src][i]

def job(args):
    src, dst, n = args[:3]
    consume = len(args) > 3 and args[3]
    acc = None
    for j in range(SS):
        im = np.asarray(Image.open(frame_path(src, n * SS + j)).convert("RGB"), dtype=np.float32)
        acc = im if acc is None else acc + im
    base = acc / (SS * 255.0)
    out = np.clip(grain(base, n) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    # A killed finishing worker must not leave a plausible but truncated PNG.
    final = f"{dst}/f{n:04d}.png"
    temp = f"{final}.tmp"
    Image.fromarray(out).save(temp, format="PNG", compress_level=1)
    os.replace(temp, final)
    if consume:
        with Image.open(final) as image:
            image.verify()
        for j in range(SS):
            os.unlink(frame_path(src, n * SS + j))
    return n

def encode(dst, out):
    frames = sorted(int(m.group(1)) for f in os.listdir(dst) if (m := re.match(r"f(\d{4})\.png$", f)))
    if not frames or frames[0] != 0 or frames[-1] != len(frames) - 1:
        sys.exit(f"refusing to encode: {dst} must hold a contiguous f0000…fNNNN sequence (found {len(frames)} frames, first {frames[:1]}, last {frames[-1:]})")
    for n in frames:
        with Image.open(f"{dst}/f{n:04d}.png") as image:
            image.verify()
    if not AUDIO or not os.path.exists(AUDIO):
        sys.exit("set AUDIO=<path to the film's mix.wav>")
    cmd = FF + ["-framerate", str(FPS), "-start_number", "0", "-i", f"{dst}/f%04d.png", "-i", AUDIO,
                "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-profile:v", "high",
                "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
                "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
                "-c:a", "libfdk_aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(f"encoded {out}: {len(frames)} frames ({len(frames) / FPS:.2f}s), {os.path.getsize(out) / 1e6:.1f} MB")

def main():
    argv = sys.argv[1:]
    enc = None
    if "--encode" in argv:
        k = argv.index("--encode")
        enc = argv[k + 1]
        argv = argv[:k] + argv[k + 2:]
    args = [a for a in argv if not a.startswith("--")]
    src, dst = args[0], args[1]
    consume = "--consume" in sys.argv or os.path.exists(os.path.join(src, ".consume-subframes"))
    os.makedirs(dst, exist_ok=True)
    if "--encode-only" not in sys.argv:
        total = len([f for f in os.listdir(src) if f.startswith("s") and f.endswith(".png")])
        first = int(args[2]) if len(args) > 2 else 0
        last = int(args[3]) if len(args) > 3 else total // SS - 1
        # Each worker holds eight full-size float frames; cap the pool so the
        # 15 GiB render host does not swap or kill a worker near completion.
        have = {int(f[1:-4]) for f in os.listdir(src) if f.startswith("s") and f.endswith(".png")}
        # Resuming a streamed master: a frame already written whose sub-frames were consumed is done.
        todo = [n for n in range(first, last + 1)
                if not (os.path.exists(f"{dst}/f{n:04d}.png") and any(n * SS + j not in have for j in range(SS)))]
        with Pool(min(4, max(1, (os.cpu_count() or 4) - 2))) as pool:
            for k, _ in enumerate(pool.imap_unordered(job, [(src, dst, n, consume) for n in todo])):
                if k % 100 == 0:
                    print(f"  {k}/{last - first + 1} frames", flush=True)
        print(f"averaged {last - first + 1} frames x {SS} samples -> {dst}")
        if consume:
            print("released subframes after verified averaging")
    if enc:
        encode(dst, enc)

if __name__ == "__main__":
    main()
