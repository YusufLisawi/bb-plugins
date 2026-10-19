#!/usr/bin/env bash
# Idempotent installer for the watch-video toolchain on this machine:
# yt-dlp (standalone binary), uv, and a Python 3.12 venv with faster-whisper + CUDA 12 libs.
set -euo pipefail
HOME_DIR="${WATCH_VIDEO_HOME:-$HOME/.local/share/watch-video}"
BIN="$HOME/.local/bin"
mkdir -p "$BIN" "$HOME_DIR"
export PATH="$BIN:$PATH"

command -v ffmpeg >/dev/null || { echo "ffmpeg missing: sudo apt install ffmpeg" >&2; exit 1; }

if [ ! -x "$BIN/yt-dlp" ]; then
  curl -fsSL -o "$BIN/yt-dlp" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux
  chmod +x "$BIN/yt-dlp"
else
  "$BIN/yt-dlp" -U >/dev/null 2>&1 || true
fi

command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null

if [ ! -x "$HOME_DIR/venv/bin/python" ]; then
  uv venv --python 3.12 "$HOME_DIR/venv" >/dev/null 2>&1
fi
uv pip install --quiet --python "$HOME_DIR/venv/bin/python" \
  faster-whisper nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"

echo "yt-dlp $("$BIN/yt-dlp" --version)"
"$HOME_DIR/venv/bin/python" -c "import faster_whisper, ctranslate2; print('faster-whisper', faster_whisper.__version__, '| CUDA devices:', ctranslate2.get_cuda_device_count())"
