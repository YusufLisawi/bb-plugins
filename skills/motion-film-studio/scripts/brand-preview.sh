#!/bin/bash
# Render the brand preview the user approves before any film:
# palette + type + logo + sample UI (BrandSheet) next to the real end card (BrandEnd).
#
#   bash $SKILL/scripts/brand-preview.sh <project> [out.png]
# Writes <project>/out/brand/preview.png (default). Show it to the user; on OK set
# "status": "approved" in the kit's brand.json (and re-apply it with brand.sh).
set -e
P=${1:?usage: brand-preview.sh <project> [out.png]}
cd "$P"
OUT=${2:-out/brand/preview.png}
mkdir -p out/brand
B=/tmp/mfs-brand-bundle-$(basename "$PWD")
npx remotion bundle src/remotion/index.ts --out-dir "$B" --log=error >/dev/null
npx remotion still "$B" BrandSheet out/brand/sheet.png --frame=0 --gl=angle --log=error >/dev/null
npx remotion still "$B" BrandEnd out/brand/end.png --frame=115 --gl=angle --log=error >/dev/null
.venv/bin/python - "$OUT" <<'PY'
import sys
from PIL import Image
a, b = Image.open("out/brand/sheet.png"), Image.open("out/brand/end.png")
W = Image.new("RGB", (a.width + b.width + 40, a.height), "#DDDDDD")
W.paste(a, (0, 0)); W.paste(b, (a.width + 40, 0))
W = W.resize((W.width // 2, W.height // 2), Image.LANCZOS)
W.save(sys.argv[1]); print("brand preview →", sys.argv[1])
PY
