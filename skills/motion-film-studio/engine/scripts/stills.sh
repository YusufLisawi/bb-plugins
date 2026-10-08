#!/bin/bash
# Review stills: render any frames of a composition and a labelled contact
# sheet — seconds per still instead of minutes per render. Review EVERY beat
# (hand-offs, the drop, each card landing, the lockup, the CTA) before a master.
#
#   scripts/stills.sh <Composition> <out_dir> <frame> [frame…]
#   env: FPS=30 (labels)  GL=angle (GPU; swangle = software)  JOBS=6
#
# The first frame renders alone: on a fresh project Remotion downloads its
# headless browser on first use, and parallel first-runs race on that download.
set -e
export TMPDIR=${TMPDIR_REMOTION:-$HOME/.cache/remotion-tmp}; mkdir -p "$TMPDIR"
COMP=$1; OUT=$2; shift 2
mkdir -p "$OUT"
BUNDLE=${BUNDLE:-$HOME/.cache/remotion-tmp/mfs-bundle-$(basename "$PWD")-$COMP}  # per composition: parallel batches never share a bundle
FPS=${FPS:-30}; GL=${GL:-angle-egl}; JOBS=${JOBS:-6}
python3 scripts/reap_browsers.py --stale || true
python3 scripts/tidy.py --quick --apply >/dev/null 2>&1 || true
LOG="$OUT/_errors.log"; : > "$LOG"
npx remotion bundle src/remotion/index.ts --out-dir "$BUNDLE" --log=error >>"$LOG" 2>&1
one() { npx remotion still "$BUNDLE" "$COMP" "$OUT/f-$1.png" --frame="$1" --gl="$GL" --log=error >>"$LOG" 2>&1 || echo "still $1 failed (see $LOG)"; }
FIRST=$1; shift
one "$FIRST"
for f in "$@"; do
  one "$f" &
  while [ "$(jobs -r | wc -l)" -ge "$JOBS" ]; do sleep 0.2; done
done
wait
set -- "$FIRST" "$@"
.venv/bin/python - "$OUT" "$FPS" "$@" <<'PY'
import os, sys
from PIL import Image, ImageDraw
out, fps, frames = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
frames = [f for f in frames if os.path.exists(f"{out}/f-{f}.png")]
ims = [Image.open(f"{out}/f-{f}.png").convert("RGB") for f in frames]
w0, h0 = ims[0].size
w = 480 if h0 >= w0 else 640
h = round(w * h0 / w0)
cols = min(4 if h0 >= w0 else 3, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, (h + 22) * rows), "white")
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, frames)):
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 22))
    d.text((x + 6, y + 5), f"f{f}  {int(f) / fps:.2f}s", fill=(0, 0, 0))
sheet.save(f"{out}/_sheet.png")
print(f"{out}/_sheet.png", len(ims), "frames")
PY
