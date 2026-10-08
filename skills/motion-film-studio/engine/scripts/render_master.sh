#!/bin/bash
# One command from a reviewed cut to a finished master — STREAMING, so a film never
# holds more than one chunk of sub-frames on disk:
#   for each chunk of CHUNK frames:
#     1. render its CHUNK×8 sub-frames (<Comp>-SS) on the GPU
#     2. average them in float + grain (scripts/finish.py --consume deletes each
#        group of sub-frames as soon as its frame is safely written)
#   then encode H.264 High CRF 14 BT.709 + AAC 320k with the film's mix.
#
#   scripts/render_master.sh <Comp> <id> [concurrency=4] [gl=angle-egl]
#     <Comp>  the composition id WITHOUT "-SS", e.g. Starter-v
#     <id>    the film id: expects public/films/<id>/mix.wav; writes out/<Comp>.mp4
#   env: CHUNK=90          frames per chunk (≈ 720 sub-frames ≈ 2.3 GB on disk at once)
#        MIN_FREE_GB=20    never start a chunk with less free disk: stop (exit 3) instead
#        CHUNK_TIMEOUT=1800  seconds per render attempt; ATTEMPTS=4 per chunk, then stop
#
# Why: an 8-sample master of a 35 s film is ~8,500 PNGs ≈ 27 GB. Rendering whole films
# before averaging (several queued, from several projects) filled the disk on 2026-10-08,
# and a retry loop leaked headless Chrome. Now the peak is one chunk (~2.3 GB) plus the
# averaged frames (~2.6 GB), every browser this master starts is killed after each chunk
# and on any exit, and nothing retries forever. Re-running the same command resumes; a
# changed cut (different source hash) starts clean instead of reusing stale frames.
set -eo pipefail
cd "$(dirname "$0")/.."
# One master at a time on this machine (parallel builders share one GPU and one disk).
exec 9>/tmp/pillowtales-master.lock
flock -n 9 || { echo "another master is rendering: waiting for the GPU…"; flock 9; }
COMP=$1; ID=$2; CONC=${3:-4}; GL=${4:-angle-egl}  # angle-egl = the real NVIDIA GPU; plain "angle" falls back to SwiftShader (CPU)
CHUNK=${CHUNK:-90}; MIN_FREE_GB=${MIN_FREE_GB:-20}; CHUNK_TIMEOUT=${CHUNK_TIMEOUT:-1800}; ATTEMPTS=${ATTEMPTS:-4}
SS=8
SSDIR=out/$COMP-ss; FINAL=out/$COMP-final; MP4=out/$COMP.mp4
LOG="out/$COMP-master.render.log"
mkdir -p out

free_gb() { df -P --block-size=1G "$PWD" | awk 'NR==2 {print $4}'; }
disk_guard() {
  local f; f=$(free_gb)
  if [ "$f" -lt "$MIN_FREE_GB" ]; then
    echo "STOP: only ${f} GB free (< MIN_FREE_GB=${MIN_FREE_GB}). Free space, then re-run to resume."
    exit 3
  fi
}
# Headless Chrome detaches into its own session (it escapes process-group kills and is
# re-parented to the systemd reaper, not PID 1). So this master gets its OWN temp dir:
# every browser it launches carries --user-data-dir=$MTMP/…, and kill_ours kills exactly
# those (never another project's renders or this project's review stills).
MTMP=$HOME/.cache/remotion-tmp/$(basename "$PWD")-master-$COMP
mkdir -p "$MTMP"; export TMPDIR=$MTMP; echo $$ > "$MTMP/owner.pid"
kill_ours() {
  python3 scripts/reap_browsers.py --dir "$MTMP" || true
  rm -rf "$MTMP"/puppeteer_dev_chrome_profile-* 2>/dev/null || true
}
# Browsers of any master that died without cleaning up (crash, kill -9): reap them first,
# then clear stale generation leftovers (old bundles, temp dirs) before the disk guard.
python3 scripts/reap_browsers.py --stale || true
python3 scripts/tidy.py --quick --apply | tail -1 || true
# Run a render with a hard time limit as a waitable child (signals are handled at once).
CHILD=""
run_limited() {
  local t=$1; shift
  timeout --kill-after=15 "$t" "$@" 9>&- &
  CHILD=$!
  local rc=0
  wait "$CHILD" || rc=$?
  CHILD=""
  kill_ours
  return $rc
}
cleanup() { [ -n "$CHILD" ] && kill -TERM "$CHILD" 2>/dev/null; sleep 2; kill_ours; }
trap cleanup EXIT
trap 'echo "interrupted: stopping the render and its browsers" >&2; exit 130' INT TERM

disk_guard
# A different cut must never reuse frames from an older one.
HASH=$(cat $(find src/remotion -type f | sort) "public/films/$ID/mix.wav" 2>/dev/null | sha1sum | cut -c1-16)
if [ -d "$FINAL" ] && [ "$(cat "$FINAL/.source-hash" 2>/dev/null)" != "$HASH" ]; then
  echo "source changed since the last render: clearing $FINAL and $SSDIR"
  find "$FINAL" -maxdepth 1 -name 'f*.png*' -delete; find "$SSDIR" -maxdepth 1 -name 's*.png' -delete 2>/dev/null || true
fi
mkdir -p "$SSDIR" "$FINAL"; echo "$HASH" > "$FINAL/.source-hash"

# Bundle once; every chunk reuses it.
BUNDLE=$HOME/.cache/mfs-bundles/$(basename "$PWD")-$COMP-master
npx remotion bundle src/remotion/index.ts --out-dir "$BUNDLE" --log=error >"$LOG" 2>&1
DUR=$(npx remotion compositions "$BUNDLE" 2>/dev/null | awk -v c="$COMP-SS" '$1==c {print $4}')
[ -n "$DUR" ] || { echo "composition $COMP-SS not found"; exit 1; }
FRAMES=$(( DUR / SS )); FRAMES=${LIMIT:-$FRAMES}  # LIMIT: test on the first N frames
echo "rendering $COMP: $FRAMES frames × $SS sub-frames, streaming $CHUNK frames at a time ($(free_gb) GB free)"

# chunk_state <a> <b> <check>: first missing sub-frame of the chunk (-1 = none);
# with check=1, deletes truncated sub-frames (crash leftovers) so they re-render.
chunk_state() {
  .venv/bin/python - "$SSDIR" "$FINAL" "$1" "$2" "$SS" "$3" <<'PY'
import os, sys
from PIL import Image
ss, fin, a, b, n, check = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:])
files = {int(x[1:-4]): os.path.join(ss, x) for x in os.listdir(ss) if x.startswith("s") and x.endswith(".png")}
done = {int(x[1:5]) for x in os.listdir(fin) if x.startswith("f") and x.endswith(".png")}
need = [s for f in range(a, b + 1) if f not in done for s in range(f * n, f * n + n)]
if check:
    for s in need:
        if s in files:
            try:
                with Image.open(files[s]) as im:
                    im.verify()
            except Exception:
                os.unlink(files[s]); del files[s]
missing = [s for s in need if s not in files]
print(missing[0] if missing else -1)
PY
}

for (( A=0; A<FRAMES; A+=CHUNK )); do
  B=$(( A + CHUNK - 1 )); [ $B -ge $FRAMES ] && B=$(( FRAMES - 1 ))
  C=$CONC
  for (( attempt=1; ; attempt++ )); do
    FIRST=$(chunk_state "$A" "$B" 1)
    [ "$FIRST" = "-1" ] && break
    [ $attempt -gt $ATTEMPTS ] && { echo "STOP: frames $A-$B failed after $ATTEMPTS attempts (see $LOG). Re-run to resume."; exit 1; }
    disk_guard
    LAST=$(( (B + 1) * SS - 1 ))
    echo "frames $A-$B: sub-frames $FIRST-$LAST (attempt $attempt, concurrency $C, $(free_gb) GB free)"
    if ! run_limited "$CHUNK_TIMEOUT" npx remotion render "$BUNDLE" "$COMP-SS" "$SSDIR" --sequence --image-format=png \
        --image-sequence-pattern="s[frame].[ext]" --frames="$FIRST-$LAST" \
        --concurrency="$C" --gl="$GL" --timeout=90000 --log=error >>"$LOG" 2>&1; then
      grep -E "Error" "$LOG" | tail -1 || true
      C=$(( C > 2 ? C - 2 : 1 ))
    fi
  done
  # Average this chunk now and free its sub-frames immediately.
  FPS=30 .venv/bin/python scripts/finish.py "$SSDIR" "$FINAL" "$A" "$B" --consume 9>&- | tail -1
done

FPS=30 AUDIO=public/films/$ID/mix.wav .venv/bin/python scripts/finish.py "$SSDIR" "$FINAL" --encode "$MP4" --encode-only
rmdir "$SSDIR" 2>/dev/null || true
rm -rf "$BUNDLE"   # ~0.3–0.7 GB; re-bundled on the next master
echo "master: $MP4   finished frames: $FINAL  (package.py releases them after packaging)"
