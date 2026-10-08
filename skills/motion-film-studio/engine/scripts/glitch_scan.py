#!/usr/bin/env python3
"""Flag one-frame glitches: a frame that differs from BOTH neighbours while the
neighbours match each other (a pop, a flash, a missing element for one frame).
Usage: .venv/bin/python scripts/glitch_scan.py [out/final]"""
import sys
from multiprocessing import Pool
import numpy as np
from PIL import Image

DIR = sys.argv[1] if len(sys.argv) > 1 else "out/final"

def load(n):
    im = Image.open(f"{DIR}/f{n:04d}.png").convert("L")
    w, h = im.size
    im = im.resize((240, round(240 * h / w)), Image.BILINEAR)
    return np.asarray(im, dtype=np.float32)

if __name__ == "__main__":
    import glob
    N = len(glob.glob(f"{DIR}/f*.png"))
    with Pool(10) as p:
        F = np.stack(p.map(load, range(N)))
    d = np.abs(np.diff(F, axis=0)).mean(axis=(1, 2))      # d[n] = |f[n+1] - f[n]|
    skip = np.abs(F[2:] - F[:-2]).mean(axis=(1, 2))       # |f[n+1] - f[n-1]|, n = 1..898
    cand = []
    for n in range(1, N - 1):
        a, b, c = d[n - 1], d[n], skip[n - 1]
        score = min(a, b) - c
        if min(a, b) > 2.5 and score > 1.0:
            cand.append((round(float(score), 2), n, round(float(a), 1), round(float(b), 1), round(float(c), 1)))
    cand.sort(reverse=True)
    print("one-frame spikes (score, frame, d_prev, d_next, d_skip):", cand[:12] if cand else "none")
    top = sorted(int(n) + 1 for n in np.argsort(d)[::-1][:12])
    print("largest changes (frame: diff):", ", ".join(f"{n}: {d[n - 1]:.1f}" for n in top))
