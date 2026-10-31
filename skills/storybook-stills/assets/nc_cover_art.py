#!/usr/bin/env python3
"""nc_cover_art.py [1..6] — art/covers-nc/raw/p<N>_{tall,wide}.png (Codex, 1024x1536 / 1536x1024, text-free) → public/covers/nc-p<N>/{tall,wide}.jpg (1080x1920 / 1920x1080, cover-cropped)."""
import sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
for n in [int(a) for a in sys.argv[1:]] or range(1, 7):
    out = ROOT / f"public/covers/nc-p{n}"; out.mkdir(parents=True, exist_ok=True)
    for kind, (W, H) in (("tall", (1080, 1920)), ("wide", (1920, 1080))):
        src = ROOT / f"art/covers-nc/raw/p{n}_{kind}.png"
        if not src.exists(): print("missing", src.name); continue
        im = Image.open(src).convert("RGB"); k = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS); l, t = (im.width - W) // 2, (im.height - H) // 2
        im.crop((l, t, l + W, t + H)).save(out / f"{kind}.jpg", quality=93); print("nc-p%d/%s.jpg" % (n, kind))
