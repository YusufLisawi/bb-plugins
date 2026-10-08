#!/bin/bash
# Scaffold a motion-film project from the skill's engine (kit + pipeline + the
# Starter film), copy in the media from the asset pack that lives OUTSIDE the
# skill (fonts, film grain, the SFX library, the Starter's voice + music — see
# scripts/assets.sh), install dependencies and the Python venv, and prove it
# compiles.
#
#   bash $SKILL/scripts/new-project.sh <target_dir> [--brand <id|kit_dir>]
#
# --brand applies a brand kit (scripts/brand.sh; default: brainfast). Make a kit
# for a new product with scripts/brand_intake.py, approve its preview, then scaffold.
#
# Existing Brainfast projects to learn from (all films, full git history):
#   ~/Developer/brainfast-showreel (films 1–8) · ~/Developer/brainfast-films (films 9+)
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DEST=${1:?usage: new-project.sh <target_dir> [--brand <id|kit_dir>]}
BRAND_KIT=brainfast
[ "${2:-}" = "--brand" ] && BRAND_KIT=${3:?--brand needs an id or a kit folder}
bash "$SKILL/scripts/brand.sh" path "$BRAND_KIT" >/dev/null
if [ -e "$DEST/package.json" ]; then echo "$DEST already has a project — add a film with new-film.sh instead"; exit 1; fi
# the media is not in the skill: stop early (before scaffolding) if the pack is missing
bash "$SKILL/scripts/assets.sh" check >/dev/null || { bash "$SKILL/scripts/assets.sh" check; exit 1; }
mkdir -p "$DEST"
cp -r "$SKILL/engine/." "$DEST/"
bash "$SKILL/scripts/assets.sh" install "$DEST"
bash "$SKILL/scripts/brand.sh" apply "$BRAND_KIT" "$DEST"
cd "$DEST"
chmod +x scripts/*.sh
echo "installing node dependencies…"
(command -v bun >/dev/null && bun install >/dev/null 2>&1) || npm install --silent
echo "python venv (numpy, pillow)…"
if [ -x "$HOME/Developer/brainfast-showreel/.venv/bin/python" ] && [ ! -e .venv ]; then
  ln -s "$HOME/Developer/brainfast-showreel/.venv" .venv   # reuse the proven venv on this machine
else
  python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
fi
.venv/bin/python -c "import numpy, PIL" && echo "venv ok"
[ -f public/sfx/library.json ] || .venv/bin/python scripts/sfx_library.py
npx tsc --noEmit -p . && echo "typecheck ok"
git init -q 2>/dev/null && git add -A && git commit -qm "scaffold from motion-film-studio" 2>/dev/null || true
# Storage janitor: one systemd --user timer for the whole machine (every 30 min, see engine/scripts/tidy.py).
systemctl --user is-enabled mfs-tidy.timer >/dev/null 2>&1 || python3 "$SKILL/engine/scripts/tidy.py" --install-timer || echo "note: could not install the tidy timer; run scripts/tidy.py --apply by hand"
echo "ready: $DEST   (preview: PORT=3151 npx vite  →  /?film=starter&format=v)"
