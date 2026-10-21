#!/usr/bin/env python3
"""diffscan.py <master.mp4> [--top 60] — the frame-difference scan of a master.

Mean |Δ| between consecutive frames (216×384 grey), divided by its local median. Every spike must be a planned cut,
a caption swap or an intended flash; anything else is a hop, a pop, a doubled limb or a smear — check it on stills.
Reads the frame rate from the file (30 or 60 fps). Needs ffmpeg and numpy.
"""
import argparse, json, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("mp4")
ap.add_argument("--top", type=int, default=60)
a = ap.parse_args()
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                                "-of", "json", a.mp4], capture_output=True, text=True).stdout)
num, den = pr["streams"][0]["r_frame_rate"].split("/")
fps = float(num) / float(den)
W, H = 216, 384
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", a.mp4, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                     capture_output=True).stdout
n = len(raw) // (W * H)
if n < 3:
    sys.exit("could not decode frames")
f = np.frombuffer(raw[: n * W * H], np.uint8).reshape(n, H, W).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
base = np.array([np.median(d[max(0, i - 6): i + 7]) for i in range(len(d))])
ratio = d / np.maximum(base, 0.15)
print(f"{n} frames at {fps:g} fps · median Δ {np.median(d):.2f}")
print("   time      Δ   ×local   (spikes: each must be a cut / caption swap / intended flash)")
for i in sorted(np.argsort(-ratio)[: a.top]):
    print(f"{(i + 1) / fps:7.2f}s {d[i]:6.2f}  ×{ratio[i]:5.1f}")
