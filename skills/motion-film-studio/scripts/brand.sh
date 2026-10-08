#!/bin/bash
# Brand kits: one folder per brand with brand.json (+ product.md, fonts/, logo).
# Presets that are pure text live in the skill ($SKILL/brands/<id>); kits made by
# brand_intake.py (they carry font and logo files = media) live in the asset
# pack ($MFS_ASSETS/brands/<id>). See references/brands.md.
#
#   brand.sh list                      every kit and its status
#   brand.sh path  <id|dir>            where a kit lives
#   brand.sh check <id|dir>            validate brand.json (+ files it points to)
#   brand.sh apply <id|dir> <project>  write the kit into a project (theme, fonts, logo, product.md)
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
PACK=$(bash "$SKILL/scripts/assets.sh" path 2>/dev/null || echo "${MFS_ASSETS:-$HOME/.local/share/motion-film-studio}")
resolve() {
  if [ -f "$1/brand.json" ]; then (cd "$1" && pwd); return; fi
  for d in "$SKILL/brands/$1" "$PACK/brands/$1"; do [ -f "$d/brand.json" ] && { echo "$d"; return; }; done
  echo "no brand kit '$1' (looked in $SKILL/brands and $PACK/brands)" >&2; exit 1
}
check() {
  python3 - "$1" "$2" "$PACK" <<'PY'
import json, os, re, sys
kit, proj, pack = sys.argv[1], sys.argv[2], sys.argv[3]
b = json.load(open(f"{kit}/brand.json"))
err = []
for k in ["id", "name", "wordmark", "url", "tagline", "cta", "colors", "fonts", "logo", "status"]:
    if k not in b: err.append(f"missing key: {k}")
cols = ["bg", "surface", "white", "ink", "night", "accent", "accentDeep", "accentLight", "accentTint", "gray", "gray2", "line", "success", "successTint"]
for c in cols:
    v = b.get("colors", {}).get(c)
    if not v or not re.fullmatch(r"#[0-9A-Fa-f]{6}", v): err.append(f"colors.{c} must be #RRGGBB (got {v!r})")
for role in ["sans", "mono"]:
    f = b.get("fonts", {}).get(role, {})
    if not f.get("family") or not f.get("faces"): err.append(f"fonts.{role} needs family + faces")
    for face in f.get("faces", []):
        name = face.get("file", "")
        if not (os.path.exists(f"{kit}/fonts/{name}") or os.path.exists(f"{pack}/fonts/{name}") or (proj and os.path.exists(f"{proj}/public/fonts/{name}"))):
            err.append(f"font file not found: {name} (put it in {kit}/fonts/)")
lg = b.get("logo", {})
if lg.get("type") == "stroke":
    if not lg.get("parts"): err.append("logo.parts (stroke paths) missing")
elif lg.get("type") == "image":
    if not lg.get("file") or not os.path.exists(f"{kit}/{lg['file']}"): err.append(f"logo file not found in kit: {lg.get('file')}")
else:
    err.append("logo.type must be 'stroke' or 'image'")
if lg.get("icon") and not os.path.exists(f"{kit}/{lg['icon']}"): err.append(f"logo.icon file not found in kit: {lg['icon']}")
if len(lg.get("viewBox", [])) != 2: err.append("logo.viewBox must be [w, h]")
if not isinstance(b.get("tagline"), list): err.append("tagline must be a list of words (lit one by one on the end card)")
if b.get("status") != "approved": print(f"note: status is {b.get('status')!r}; get the user's OK on the brand preview, then set \"approved\"")
if err:
    print("\n".join("✗ " + e for e in err)); sys.exit(1)
print(f"✓ {b['id']} ({b['name']}) · logo {lg['type']} · {b['fonts']['sans']['family']} + {b['fonts']['mono']['family']}")
PY
}
case "$1" in
  list)
    for d in "$SKILL"/brands/*/ "$PACK"/brands/*/; do [ -f "$d/brand.json" ] && python3 -c "import json,sys;b=json.load(open(sys.argv[1]+'/brand.json'));print(f\"{b['id']:<18} {b.get('status','?'):<9} {sys.argv[1]}\")" "${d%/}" || true; done ;;
  path) resolve "$2" ;;
  check) K=$(resolve "$2"); check "$K" "${3:-}" ;;
  apply)
    K=$(resolve "$2"); P=${3:?usage: brand.sh apply <id|dir> <project>}
    [ -f "$P/src/remotion/theme.ts" ] || { echo "$P is not a motion-film project"; exit 1; }
    mkdir -p "$P/public/fonts" "$P/brand"
    [ -d "$K/fonts" ] && cp "$K"/fonts/* "$P/public/fonts/"
    check "$K" "$P"
    cp "$K/brand.json" "$P/src/remotion/brand.json"
    for LOGO in $(python3 -c "import json,sys;l=json.load(open(sys.argv[1]))['logo'];print(' '.join(x for x in [l.get('file') if l['type']=='image' else '', l.get('icon','')] if x))" "$K/brand.json"); do
      mkdir -p "$P/public/$(dirname "$LOGO")"; cp "$K/$LOGO" "$P/public/$LOGO"
    done
    [ -f "$K/product.md" ] && cp "$K/product.md" "$P/brand/product.md"
    cp "$K/brand.json" "$P/brand/brand.json"
    echo "applied $(basename "$K") → $P (theme, fonts, logo, brand/product.md)" ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
