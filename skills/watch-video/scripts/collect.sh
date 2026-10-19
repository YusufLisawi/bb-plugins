#!/usr/bin/env bash
# collect.sh <workdir> <frame-thread-id>
# Saves the frame agent's final output as frames.md and builds timeline.md.
set -euo pipefail
WORK="${1:?usage: collect.sh <workdir> <thread-id>}"; TID="${2:?thread id}"
bb thread output "$TID" > "$WORK/frames.md"
grep -q '^## \[' "$WORK/frames.md" || { echo "frame agent output has no frame blocks; check @thread:$TID" >&2; exit 1; }
python3 "$(dirname "$0")/timeline.py" "$WORK"
