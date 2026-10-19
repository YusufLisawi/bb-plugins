#!/usr/bin/env bash
# transcribe.sh <workdir> [language]   e.g. language=es; omit for auto-detect.
# GPU faster-whisper (large-v3-turbo). Writes transcript.json (segments + words) and transcript.txt.
set -euo pipefail
WORK="${1:?usage: transcribe.sh <workdir> [lang]}"
PY="${WATCH_VIDEO_HOME:-$HOME/.local/share/watch-video}/venv/bin/python"
[ -x "$PY" ] || { echo "run setup.sh first" >&2; exit 1; }
SP="$("$PY" -c 'import site; print(site.getsitepackages()[0])')"
export LD_LIBRARY_PATH="$SP/nvidia/cublas/lib:$SP/nvidia/cudnn/lib:${LD_LIBRARY_PATH:-}"
exec "$PY" "$(dirname "$0")/transcribe.py" "$WORK" "${2:-}"
