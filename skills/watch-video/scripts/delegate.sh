#!/usr/bin/env bash
# delegate.sh <workdir> "<focus questions>"
# Spawns a child BB thread (Codex GPT Luna 6, medium reasoning) to view every frame,
# and prints its thread id. Collect the result with collect.sh once the child reports.
set -euo pipefail
WORK="${1:?usage: delegate.sh <workdir> \"<focus questions>\"}"
FOCUS="${2:-General description: what happens, who appears, what is shown and written on screen.}"
DIR="$(cd "$(dirname "$0")" && pwd)"
N="$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$WORK/frames.json")"
PROMPT="$WORK/frame-agent-prompt.md"
python3 - "$DIR/frame-agent-prompt.md" "$PROMPT" "$WORK" "$N" "$FOCUS" <<'PY'
import sys
src, dst, work, n, focus = sys.argv[1:]
t = open(src).read().replace("{{WORK}}", work).replace("{{N}}", n).replace("{{FOCUS}}", focus)
open(dst, "w").write(t)
PY
bb thread spawn --project "${BB_PROJECT_ID:?not in a BB thread}" --parent-self \
  --provider codex --model "${WATCH_VIDEO_MODEL:-gpt-6-luna}" --reasoning-level "${WATCH_VIDEO_EFFORT:-medium}" \
  --environment "${BB_ENVIRONMENT_ID}" \
  --title "Frames: $(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('title','video')[:50])" "$WORK/info.json" 2>/dev/null || basename "$WORK")" \
  --prompt-file "$PROMPT" --json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('thread') or d).get('id') or d)"
