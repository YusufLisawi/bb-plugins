#!/bin/bash
# One command from a reviewed cut to a finished master:
#   1. render the <Comp>-SS composition (8 sub-frames per frame) on the GPU,
#      resuming automatically if a browser tab crashes
#   2. average the sub-frames in float + grain (scripts/finish.py)
#   3. encode H.264 High CRF 14 BT.709 + AAC 320k with the film's mix
#
#   scripts/render_master.sh <Comp> <id> [concurrency=5] [gl=angle]
#     <Comp>  the composition id WITHOUT "-SS", e.g. Starter-v
#     <id>    the film id: expects public/films/<id>/mix.wav; writes out/<Comp>.mp4
#
# Time: ~0.2 s per sub-frame on the RTX 3060 with --gl=angle (a 40 s film ≈ 25–35 min);
# swangle (software) is ~2× slower and looks identical. Keep concurrency ≤ 6 when
# anything else renders on the machine.
set -e
cd "$(dirname "$0")/.."
COMP=$1; ID=$2; CONC=${3:-5}; GL=${4:-angle}
DUR=$(npx remotion compositions src/remotion/index.ts 2>/dev/null | awk -v c="$COMP-SS" '$1==c {print $4}')
[ -n "$DUR" ] || { echo "composition $COMP-SS not found"; exit 1; }
SSDIR=out/$COMP-ss; FINAL=out/$COMP-final; MP4=out/$COMP.mp4
echo "rendering $COMP-SS: $DUR sub-frames -> $SSDIR"
scripts/render_resume.sh "$COMP-SS" "$SSDIR" "$DUR" "$CONC" "$GL"
FPS=30 AUDIO=public/films/$ID/mix.wav .venv/bin/python scripts/finish.py "$SSDIR" "$FINAL" --encode "$MP4"
echo "master: $MP4   finished frames: $FINAL"
