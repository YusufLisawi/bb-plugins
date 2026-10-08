#!/bin/bash
# Render a supersampled composition into a PNG sequence, resuming from the first
# missing sub-frame whenever a browser tab crashes (long GPU renders sometimes do).
# Usage: scripts/render_resume.sh <Composition> <out_dir> <total_subframes> [concurrency] [gl]
# Keep <out_dir> on disk (the project's out/), never on a RAM-backed /tmp. The bundle
# and Chrome's temp files go to ~/.cache/remotion-tmp (RENDER_TMP overrides).
COMP=$1; OUT=$2; TOTAL=$3; CONC=${4:-4}; GL=${5:-angle}
cd "$(dirname "$0")/.."
mkdir -p "$OUT"
LOG="$OUT.render.log"
# bundle ONCE, on disk: the bundle copies public/ (hundreds of MB); a RAM-backed /tmp
# fills up across retries ("system error -122") and starves the browser tabs
export TMPDIR=${RENDER_TMP:-$HOME/.cache/remotion-tmp}; mkdir -p "$TMPDIR"
BUNDLE="$TMPDIR/bundle-$(basename "$OUT")"
rm -rf "$BUNDLE"; npx remotion bundle src/remotion/index.ts --out-dir "$BUNDLE" --log=error >"$LOG" 2>&1 || { echo "bundle failed (see $LOG)"; exit 1; }
trap 'rm -rf "$BUNDLE"' EXIT
for attempt in 1 2 3 4 5 6; do
  FIRST=$(.venv/bin/python -c "
import os
have=set(int(n[1:-4]) for n in os.listdir('$OUT') if n.startswith('s') and n.endswith('.png'))
print(next((i for i in range($TOTAL) if i not in have), -1))")
  if [ "$FIRST" = "-1" ]; then echo "complete: $TOTAL sub-frames"; exit 0; fi
  echo "attempt $attempt: rendering $FIRST-$((TOTAL-1))"
  npx remotion render "$BUNDLE" "$COMP" "$OUT" --sequence --image-format=png \
    --image-sequence-pattern="s[frame].[ext]" --frames="$FIRST-$((TOTAL-1))" \
    --concurrency="$CONC" --gl="$GL" --timeout=90000 --log=error >"$LOG" 2>&1
  grep -E "^Error|Error:" "$LOG" | head -2
  if grep -q "ran out of memory or disk space" "$LOG"; then
    CONC=$(( CONC > 2 ? CONC - 2 : 1 ))
    echo "  → out of memory/disk: check 'free -g' and 'df -h' (is /tmp RAM-backed and full?), retrying with concurrency $CONC"
  fi
done
echo "gave up after 6 attempts (see $LOG)"; exit 1
