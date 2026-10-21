#!/usr/bin/env python3
"""compare_ref.py <ours_sheet.jpg> <scale> <out.jpg> --ref <ref.mp4> --refwords <transcript.json> --lines <lines.json> <t1> <t2> …

Clone mode, checkpoint 1: the reference | ours, side by side, at the same SPOKEN WORD.
`ours_sheet.jpg` is the contact sheet scripts/stills.sh made at the SAME seconds (in order) with SCALE=<scale> (stills.sh's
SCALE env, default 0.3). Each of our times is mapped to the reference through the word starts of both takes
(the reference's watch-video transcript.json, our public/<slug>/vo/lines.json), the reference frame is pulled from
ref.mp4 and the pairs are tiled 3 per row with labels. Needs Pillow and ffmpeg (run it with the project's .venv/bin/python).
"""
import argparse, json, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("sheet"); ap.add_argument("scale", type=float); ap.add_argument("out")
ap.add_argument("--ref", required=True); ap.add_argument("--refwords", required=True); ap.add_argument("--lines", required=True)
ap.add_argument("times", nargs="+", type=float)
a = ap.parse_args()

tr = json.load(open(a.refwords))
if isinstance(tr, dict) and "segments" in tr:
    rs = [w["start"] for s in tr["segments"] for w in s.get("words", [])]
else:  # a flat [{w, s, e}] list
    rs = [w["s"] for w in tr]
os_ = [w["s"] for l in json.load(open(a.lines)) for w in l["words"]]
n = min(len(rs), len(os_))
if abs(len(rs) - len(os_)) > 3:
    print(f"warning: {len(rs)} reference words vs {len(os_)} of ours — the mapping drifts where they differ", file=sys.stderr)
rs, os_ = rs[:n], os_[:n]


def to_ref(t):
    if t <= os_[0]:
        return max(0.0, rs[0] - (os_[0] - t))
    for i in range(n - 1):
        if os_[i] <= t < os_[i + 1]:
            p = (t - os_[i]) / (os_[i + 1] - os_[i])
            return rs[i] + p * (rs[i + 1] - rs[i])
    return rs[-1] + (t - os_[-1])


S = Image.open(a.sheet).convert("RGB")
cnt = len(a.times)
cols = min(5, cnt)
w, h = round(1080 * a.scale), round(1920 * a.scale)
ours = []
for i in range(cnt):  # stills.sh layout: cols = min(5, n), 8 px gutters, a 22 px label band per row
    x, y = 8 + (i % cols) * (w + 8), 8 + (i // cols) * (h + 30) + 22
    ours.append(S.crop((x, y, x + w, y + h)))
refs = []
with tempfile.TemporaryDirectory() as tmp:
    for i, t in enumerate(a.times):
        rt = to_ref(t)
        f = Path(tmp) / f"r{i:03d}.jpg"
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{rt:.3f}", "-i", a.ref, "-frames:v", "1",
                        "-vf", f"scale={w}:{h}", str(f)], check=True)
        refs.append((Image.open(f).convert("RGB"), rt))
per = 3
rows = (cnt + per - 1) // per
G = Image.new("RGB", (per * (2 * w + 24) + 8, rows * (h + 34) + 8), "#1c1c1c")
d = ImageDraw.Draw(G)
for i in range(cnt):
    x, y = 8 + (i % per) * (2 * w + 24), 8 + (i // per) * (h + 34)
    G.paste(refs[i][0], (x, y + 26)); G.paste(ours[i], (x + w + 6, y + 26))
    d.text((x + 4, y + 6), f"REF {refs[i][1]:.2f}s", fill="#9fd3ff")
    d.text((x + w + 10, y + 6), f"OURS {a.times[i]:.2f}s", fill="#ffcc66")
G.save(a.out, quality=88)
print(a.out, cnt, "pairs")
