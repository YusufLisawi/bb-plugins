#!/bin/bash
# Self-test for the skill: check the asset pack (media lives outside the skill,
# scripts/assets.sh), scaffold a fresh project, typecheck, run the audio chain
# on the Starter (no API calls — its voice and music come from the pack),
# render review stills in all four formats, create a blank-canvas film and a
# fork and render them, and optionally a full master + QA.
#
#   bash $SKILL/scripts/selftest.sh [--master]
# Prints PASS/FAIL per stage; leaves the project in ~/.cache/mfs-selftest for inspection.
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
P=${MFS_SELFTEST_DIR:-$HOME/.cache/mfs-selftest}   # on disk: /tmp is RAM-backed (tmpfs) on this machine and renders fill it
rm -rf "$P"
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; exit 1; }
cues() { python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))['sound']))" "$1"; }
bash "$SKILL/scripts/assets.sh" check >/dev/null && ok "asset pack ($(bash "$SKILL/scripts/assets.sh" path))" || { bash "$SKILL/scripts/assets.sh" check; bad "asset pack"; }
SIZE=$(du -sm "$SKILL" | cut -f1); [ "$SIZE" -lt 10 ] && ok "skill stays small (${SIZE} MB < 10 MB)" || bad "skill is ${SIZE} MB: move media into the asset pack"
bash "$SKILL/scripts/new-project.sh" "$P" >$P.log 2>&1 && ok "scaffold + media install + typecheck" || bad "scaffold (see $P.log)"
cd "$P"
if [ -f public/films/starter/music/piece-hA.mp3 ] && [ -f public/films/starter/vo/l01.mp3 ]; then
  .venv/bin/python scripts/stitch_music.py films/starter/music.stitch.json >>$P.log 2>&1 && ok "music stitch" || bad "music stitch"
  bun scripts/film_sound.ts src/remotion/films/starter/Starter.tsx > public/films/starter/sound.json 2>>$P.log && ok "sound export ($(cues public/films/starter/sound.json) cues)" || bad "sound export"
  OUT=$(.venv/bin/python scripts/mix_film.py films/starter/film.json 2>&1 | grep loudness) && echo "$OUT" | grep -qE "\-1[34]\.[0-9] LUFS" && ok "mix: $OUT" || bad "mix: $OUT"
else
  echo "SKIP  music + mix (the asset pack has no Starter voice/music)"
fi
bash "$SKILL/scripts/brand.sh" check brainfast "$P" >>$P.log 2>&1 && ok "brand kit: brainfast" || bad "brand kit (brand.sh check brainfast)"
bash "$SKILL/scripts/brand-preview.sh" "$P" >>$P.log 2>&1 && [ -f out/brand/preview.png ] && ok "brand preview (out/brand/preview.png)" || bad "brand preview"
for fmt in v h sq p; do
  scripts/stills.sh "Starter-$fmt" "out/st-$fmt" 125 330 >>$P.log 2>&1
  [ -f "out/st-$fmt/f-125.png" ] && [ -f "out/st-$fmt/f-330.png" ] && ok "stills $fmt" || bad "stills $fmt"
done

# a new film = a blank canvas: plumbing only (timing, animatic, end card, SOUND)
bash "$SKILL/scripts/new-film.sh" "$P" probe-film ProbeFilm v,h >>$P.log 2>&1 && npx remotion compositions src/remotion/index.ts 2>/dev/null | grep -q "ProbeFilm-h-SS" && ok "new-film (blank canvas): scaffold + register + typecheck" || bad "new-film blank canvas"
grep -q "Concept" films/probe-film/brief.md && ! grep -q "QUESTIONS" src/remotion/films/probe-film/ProbeFilm.tsx && ok "blank canvas has the concept brief and no Starter scenes" || bad "blank canvas content"
for fmt in v h; do
  scripts/stills.sh "ProbeFilm-$fmt" "out/probe-$fmt" 60 150 260 410 >>$P.log 2>&1
  n=$(ls out/probe-$fmt/f-*.png 2>/dev/null | wc -l)
  [ "$n" = 4 ] && ok "blank canvas stills $fmt (animatic + end card)" || bad "blank canvas stills $fmt ($n/4)"
done
bun scripts/film_sound.ts src/remotion/films/probe-film/ProbeFilm.tsx > public/films/probe-film/sound.json 2>>$P.log && ok "blank canvas sound export ($(cues public/films/probe-film/sound.json) cues)" || bad "blank canvas sound export"

# --from forks a film (code, configs, voice, music) for a new cut of it
bash "$SKILL/scripts/new-film.sh" "$P" starter-cut StarterCut v --from starter >>$P.log 2>&1 && npx remotion compositions src/remotion/index.ts 2>/dev/null | grep -q "StarterCut-v-SS" && ok "new-film --from starter: fork + register + typecheck" || bad "new-film --from"
scripts/stills.sh StarterCut-v out/fork-v 330 >>$P.log 2>&1
[ -f out/fork-v/f-330.png ] && [ -f public/films/starter-cut/vo/lines.json ] && grep -q "public/films/starter-cut/" films/starter-cut/film.json && ok "fork renders, with its own voice + configs" || bad "fork content"

if [ "${1:-}" = "--master" ]; then
  scripts/render_master.sh Starter-v starter 6 angle >>$P.log 2>&1 && ok "master render" || bad "master render"
  .venv/bin/python scripts/qa.py out/Starter-v.mp4 out/Starter-v-final films/starter/script.txt --no-stt | tee -a $P.log | grep -q FAIL && bad "qa" || ok "qa (format, loudness, glitches)"
fi
echo "selftest complete — project at $P, contact sheets in $P/out/*/_sheet.png"
