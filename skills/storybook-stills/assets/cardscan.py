# scan every card segment of every master for frames whose background fell to black (the capture fallback)
import json, subprocess, sys, io
from PIL import Image
import numpy as np
ROOT = "/home/yusuf/Developer/story-studio"
bad = []
for n in range(1, 7):
    d = json.load(open(f"{ROOT}/public/nc{n}/stills.json"))
    segs = [(s["t0"], s["t1"], s["card"]["kind"]) for s in d["shots"] if isinstance(s.get("card"), dict) and s["card"]["kind"] in ("hook", "island2d", "device", "cta", "rule", "scene", "map3d")]
    for t0, t1, kind in segs:
        t = t0 + 0.2
        while t < t1 - 0.15:
            raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{t:.2f}", "-i", f"{ROOT}/out/nc{n}.mp4", "-frames:v", "1", "-vf", "scale=64:36", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
            a = np.asarray(Image.open(io.BytesIO(raw)).convert("RGB")).astype(int)
            corners = [a[1, 1], a[1, -2], a[-2, 1], a[-2, -2]]
            if kind in ("hook", "island2d") and all(c.sum() < 6 for c in corners): bad.append((n, kind, round(t, 2), "black corners"))
            t += 0.5 if kind in ("hook", "island2d") else 1.0
print("bad frames:", bad[:40], len(bad))
