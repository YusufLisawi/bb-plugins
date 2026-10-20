#!/usr/bin/env bash
# collect.sh <workdir> <frame-thread-id>
# Saves the frame agent's final output as frames.md and builds timeline.md.
set -euo pipefail
WORK="${1:?usage: collect.sh <workdir> <thread-id>}"; TID="${2:?thread id}"
# The agent normally writes frames.md itself; fall back to its final reply.
if ! grep -q '^## \[' "$WORK/frames.md" 2>/dev/null; then bb thread output "$TID" > "$WORK/frames.md"; fi
grep -q '^## \[' "$WORK/frames.md" || { echo "frame agent output has no frame blocks; check @thread:$TID" >&2; exit 1; }
python3 "$(dirname "$0")/timeline.py" "$WORK"
