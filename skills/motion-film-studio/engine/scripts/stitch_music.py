#!/usr/bin/env python3
"""Join music pieces at exact times: spec JSON = {"out": wav, "dur": s,
"parts": [[path, at_s, src_start_s, src_end_s, fade_in_s, fade_out_s], ...]}.
Usage: .venv/bin/python scripts/stitch_music.py spec.json"""
import json, sys
import numpy as np
sys.path.insert(0, "scripts")
from audio import SR, load, write_wav

spec = json.load(open(sys.argv[1]))
out = np.zeros((int(spec["dur"] * SR), 2), np.float32)
for path, at, s0, s1, fi, fo in spec["parts"]:
    x = load(path)
    seg = x[int(s0 * SR): int(s1 * SR) if s1 else len(x)].copy()
    n = len(seg)
    if fi > 0:
        k = min(n, int(fi * SR)); seg[:k] *= np.linspace(0, 1, k)[:, None]
    if fo > 0:
        k = min(n, int(fo * SR)); seg[-k:] *= np.linspace(1, 0, k)[:, None]
    a = int(at * SR); b = min(len(out), a + n)
    out[a:b] += seg[: b - a]
write_wav(spec["out"], out)
print(spec["out"], f"{len(out) / SR:.2f}s")
