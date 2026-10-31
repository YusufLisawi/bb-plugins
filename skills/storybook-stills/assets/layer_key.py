#!/usr/bin/env python3
"""layer_key.py [names…] — turn the Codex layer paintings (art/<slug>/layers/*.png, keyed on flat #FF00FF) into the files the 2.5-D scenes load:
  keyed layers → public/nc-layers/<name>.png (RGBA, decontaminated edges), opaque layers (sky_*, sea_*, isl_deep) → <name>.jpg, and public/nc-layers/meta.json:
  {name: {bbox:[x0,y0,x1,y1] of the opaque content, windows:[[x,y,r],…] for plane_*}}.   Without names: every layer found in art/nc1/layers + art/nc*/layers."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/nc-layers"; OUT.mkdir(parents=True, exist_ok=True)
OPAQUE = ("sky_", "sea_", "isl_deep", "plate_")
meta = json.load(open(OUT / "meta.json")) if (OUT / "meta.json").exists() else {}
srcs = {}
for d in sorted(ROOT.glob("art/nc*/layers")):
    for f in sorted(d.glob("*.png")): srcs[f.stem] = f
want = sys.argv[1:] or list(srcs)
for n in want:
    f = srcs[n]; im = Image.open(f).convert("RGB"); a = np.asarray(im).astype(np.float32)
    if n.startswith(OPAQUE):
        im.save(OUT / f"{n}.jpg", quality=93); meta[n] = {"opaque": True, "size": list(im.size)}; print("opaque", n); continue
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.minimum(r, b) - g
    al = np.clip(1 - (mag - 70) / 90, 0, 1)                       # >160 magenta-ness → transparent, <70 → opaque
    al = np.where(mag > 150, 0, al)
    al = ndimage.grey_erosion(al, size=(2, 2)) if n.startswith("plane") or n.startswith("tail") else al   # trim the pink fringe on hard-edged objects
    m = np.array([255, 0, 255], np.float32)
    safe = np.maximum(al, 0.04)[..., None]
    col = np.clip((a - (1 - al)[..., None] * m) / safe, 0, 255)  # remove the magenta that bled into semi-transparent edge pixels
    col[..., 0] = np.minimum(col[..., 0], col[..., 1] + 70); col[..., 2] = np.minimum(col[..., 2], col[..., 1] + 70)   # despill leftovers
    rgba = np.dstack([col, al * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / f"{n}.png", optimize=True)
    ys, xs = np.where(al > 0.5); info = {"bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None, "size": list(im.size)}
    if n == "plane_side":   # the cabin windows: a regular row (pitch ≈ 24.85 px, y ≈ 598); keep those whose centre is really dark (not hidden by the wing)
        lum = (r * 0.3 + g * 0.59 + b * 0.11); ws = []
        for i in range(36):
            x, y = int(round(421 + i * 24.85)), 598
            if x < 1480 and lum[y - 2:y + 3, x - 2:x + 3].mean() < 110 and al[y, x] > 0.9: ws.append([x, y, 6, 8])
        info["windows"] = ws   # tail → nose
    meta[n] = info; print("keyed", n, info.get("bbox"), len(info.get("windows", [])) or "")
json.dump(meta, open(OUT / "meta.json", "w"))
