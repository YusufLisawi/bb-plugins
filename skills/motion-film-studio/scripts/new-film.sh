#!/bin/bash
# Add a new film to a project. By default it gets a BLANK CANVAS: only the
# plumbing (voice timing, an animatic of the script as kinetic type, the brand
# end card, the SOUND export). The concept, scenes and motion are yours to design.
#
# --from <slug> forks an existing film instead: its code folder, configs and
# audio. Use it for a new cut or version of THAT film (re-voice, new CTA, other
# formats), not as the starting point for a new idea.
#
#   bash $SKILL/scripts/new-film.sh <project_dir> <slug> <PascalId> [formats=v] [--from <existing-slug>]
#   e.g. new-film.sh ~/Developer/brainfast-films ask-anything AskAnything v,h
#        new-film.sh ~/Developer/brainfast-films starter-cut StarterCut v --from starter
#
# Creates films/<slug>/ (brief, script, film.json, music plan + stitch, cast,
# deliver) and src/remotion/films/<slug>/<Id>.tsx, registers it, typechecks.
set -e
P=${1:?project dir}; SLUG=${2:?slug}; ID=${3:?PascalId}; FORMATS=v; FROM=""
shift 3
while [ $# -gt 0 ]; do
  case "$1" in
    --from) FROM=${2:?--from needs a film slug}; shift 2 ;;
    *) FORMATS=$1; shift ;;
  esac
done
UP=$(echo "$ID" | tr '[:lower:]' '[:upper:]')
FMTS=$(echo "$FORMATS" | sed 's/[a-z][a-z]*/"&"/g')
cd "$P"
[ -d "films/$SLUG" ] && { echo "films/$SLUG exists"; exit 1; }
CODE="src/remotion/films/$SLUG"
OUT="$CODE/$ID.tsx"

if [ -n "$FROM" ]; then
  SRC="src/remotion/films/$FROM"
  [ -d "$SRC" ] || { echo "no film at $SRC"; exit 1; }
  MAIN=$(grep -l "FilmDef = {" "$SRC"/*.tsx | head -1)
  FROM_ID=$(basename "$MAIN" .tsx); FROM_UP=$(echo "$FROM_ID" | tr '[:lower:]' '[:upper:]')
  mkdir -p "films/$SLUG" "public/films/$SLUG"
  cp -r "$SRC" "$CODE"
  mv "$CODE/$FROM_ID.tsx" "$OUT"
  find "$CODE" -name "*.ts" -o -name "*.tsx" | while read -r f; do
    sed -i "s#films/$FROM/#films/$SLUG/#g; s/slug: \"$FROM\"/slug: \"$SLUG\"/; s/\b$FROM_ID\b/$ID/g; s/\b$FROM_UP\b/$UP/g" "$f"
  done
  sed -i "s/formats: \[[^]]*\]/formats: [$FMTS]/" "$OUT"
  [ -d "public/films/$FROM" ] && cp -r "public/films/$FROM/." "public/films/$SLUG/"
  for f in films/"$FROM"/*.*; do [ -e "$f" ] && sed "s#films/$FROM/#films/$SLUG/#g; s/\"id\": \"$FROM\"/\"id\": \"$SLUG\"/" "$f" > "films/$SLUG/$(basename "$f")"; done
  for f in film-template/*.*; do [ -e "films/$SLUG/$(basename "$f")" ] || sed "s/{{slug}}/$SLUG/g; s/{{Id}}/$ID/g" "$f" > "films/$SLUG/$(basename "$f")"; done
  echo "forked $FROM ($FROM_ID) → $CODE/ (code, configs, voice and music)"
else
  mkdir -p "films/$SLUG" "public/films/$SLUG/vo" "public/films/$SLUG/music" "$CODE"
  for f in film-template/*.*; do sed "s/{{slug}}/$SLUG/g; s/{{Id}}/$ID/g" "$f" > "films/$SLUG/$(basename "$f")"; done
  # placeholder timing (the Starter's read) until split_take.py writes this film's own
  cp public/films/starter/vo/lines.json public/films/starter/vo/words.json "public/films/$SLUG/vo/"
  sed "s/{{slug}}/$SLUG/g; s/{{Id}}/$ID/g; s/{{UP}}/$UP/g; s/{{formats}}/$FMTS/g" film-template/code/Film.tsx.tmpl > "$OUT"
  echo "blank canvas → $OUT (voice timing, animatic, end card, SOUND)"
fi

python3 - "$SLUG" "$ID" "$UP" <<'PY'
import re, sys
slug, pid, up = sys.argv[1:4]
p = "src/remotion/films/registry.ts"
s = open(p).read()
imports = list(re.finditer(r"^import .*;$", s, re.M))
s = s[: imports[-1].end()] + f'\nimport {{ {up} }} from "./{slug}/{pid}";' + s[imports[-1].end():]
s = re.sub(r"export const FILMS: FilmDef\[\] = \[(.*?)\];", lambda m: f"export const FILMS: FilmDef[] = [{m.group(1)}, {up}];", s, flags=re.S)
open(p, "w").write(s)
PY
npx tsc --noEmit -p . && echo "typecheck ok"
echo "registered $ID (${FORMATS}) · preview: PORT=3151 npx vite → /?film=$SLUG&format=${FORMATS%%,*}"
if [ -z "$FROM" ]; then
  echo "next: study (lookbook + two examples + films.md) → concept in films/$SLUG/brief.md → script.txt → voice → your scenes → stills → sound → master"
fi
