#!/usr/bin/env python3
"""List missing or truncated PNG subframes left by a browser page crash.

render_resume.sh checks filenames. A crash can leave a filename whose PNG
is incomplete, so the finishing pass needs one integrity check before it
starts averaging.
"""
import sys
from pathlib import Path
from PIL import Image

folder = Path(sys.argv[1])
total = int(sys.argv[2])
width = len(str(total - 1))
bad = []
for frame in range(total):
    # Remotion pads [frame] to the width of the requested range. The full
    # sequence's canonical names are s0000... for a four-digit frame count.
    path = folder / f"s{frame:0{width}d}.png"
    try:
        with Image.open(path) as image:
            image.verify()
    except Exception:
        bad.append(frame)
print(" ".join(map(str, bad)))
