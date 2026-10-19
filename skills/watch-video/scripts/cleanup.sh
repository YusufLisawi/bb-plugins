#!/usr/bin/env bash
# cleanup.sh <workdir> [--all]
# Default: deletes the video, frames and captions; keeps transcript.*, frames.md, timeline.md, info.json (small text).
# --all: deletes the whole work dir.
set -euo pipefail
WORK="${1:?usage: cleanup.sh <workdir> [--all]}"
case "$WORK" in */watch-video/*) ;; *) echo "refusing: $WORK is not a watch-video work dir" >&2; exit 1;; esac
if [ "${2:-}" = "--all" ]; then rm -rf "$WORK"; echo "removed $WORK"; exit 0; fi
rm -rf "$WORK/frames"
find "$WORK" -maxdepth 1 \( -name 'video.*' -o -name '*.vtt' -o -name 'probe.json' -o -name 'frames.json' \) -delete
du -sh "$WORK"
