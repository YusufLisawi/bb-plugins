#!/usr/bin/env bash
# fetch.sh <url-or-local-file> [workdir]
# Downloads (or copies) a video into a fresh work dir and prints the work dir path.
# Layout: <workdir>/video.<ext>, info.json (title, uploader, description), probe.json.
set -euo pipefail
SRC="${1:?usage: fetch.sh <url-or-file> [workdir]}"
ROOT="${BB_THREAD_STORAGE:-/tmp}/watch-video"
WORK="${2:-$ROOT/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$WORK"
trap '[ -s "$WORK/probe.json" ] || { echo "fetch failed; removed $WORK" >&2; rm -rf "$WORK"; }' EXIT
export PATH="$HOME/.local/bin:$PATH"

if [ -f "$SRC" ]; then
  ext="${SRC##*.}"
  ln -sf "$(realpath "$SRC")" "$WORK/video.$ext"
  echo "local" > "$WORK/source.txt"
else
  echo "$SRC" > "$WORK/source.txt"
  # <=1080p keeps downloads fast; frames are scaled to 1024px anyway.
  if ! yt-dlp --no-playlist --no-progress --quiet --no-warnings \
    --js-runtimes node \
    -f "bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b" \
    --merge-output-format mp4 \
    --write-info-json \
    -o "$WORK/video.%(ext)s" "$SRC" \
    ${YTDLP_COOKIES_BROWSER:+--cookies-from-browser "$YTDLP_COOKIES_BROWSER"}; then
    echo "yt-dlp failed; trying cobalt" >&2
    rm -f "$WORK"/video.*
    "$(dirname "$0")/cobalt.sh" "$SRC" "$WORK"
  fi
  # Keep only the useful metadata (the full dump is ~100 KB).
  [ -f "$WORK/video.info.json" ] && python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
keys = ["title", "uploader", "channel", "upload_date", "duration", "webpage_url", "description",
        "view_count", "like_count", "comment_count", "tags", "width", "height", "fps"]
json.dump({k: d[k] for k in keys if d.get(k) is not None}, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
' "$WORK/video.info.json" "$WORK/info.json" && rm -f "$WORK/video.info.json"
fi

VID="$(ls "$WORK"/video.* | grep -vE '\.(vtt|json)$' | head -1)"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height \
  -of json "$VID" > "$WORK/probe.json"
echo "$WORK"
