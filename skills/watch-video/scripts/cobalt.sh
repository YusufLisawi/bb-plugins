#!/usr/bin/env bash
# cobalt.sh <url> <workdir>
# Fallback downloader for links yt-dlp can't fetch without login (Vimeo, Instagram carousels, ...).
# Starts the local cobalt API (installed by setup.sh) when it isn't already running, downloads the
# first video into <workdir>/video.mp4, and stops the API again if this script started it.
set -euo pipefail
URL="${1:?usage: cobalt.sh <url> <workdir>}"; WORK="${2:?workdir}"
API_DIR="${WATCH_VIDEO_HOME:-$HOME/.local/share/watch-video}/cobalt/api"
PORT="${COBALT_PORT:-9009}"; API="http://127.0.0.1:$PORT/"
[ -d "$API_DIR" ] || { echo "cobalt not installed: run setup.sh" >&2; exit 1; }

started=""
if ! curl -sf -m 2 "$API" >/dev/null; then
  (cd "$API_DIR" && API_URL="$API" API_PORT="$PORT" API_LISTEN_ADDRESS=127.0.0.1 \
    exec node src/cobalt.js > "$WORK/cobalt.log" 2>&1) &
  echo $! > "$WORK/cobalt.pid"
  started=1
  for _ in $(seq 40); do curl -sf -m 1 "$API" >/dev/null && break; sleep 0.5; done
fi
stop() { if [ -n "$started" ]; then kill "$(cat "$WORK/cobalt.pid")" 2>/dev/null || true; fi; rm -f "$WORK/cobalt.pid" "$WORK/cobalt.log"; }
trap stop EXIT

RESP="$(curl -s -m 60 -X POST "$API" -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"url": sys.argv[1], "videoQuality": "1080", "alwaysProxy": True}))' "$URL")")"
MEDIA="$(python3 -c '
import json, sys
d = json.loads(sys.argv[1])
s = d.get("status")
if s in ("tunnel", "redirect"):
    print(d["url"])
elif s == "picker":
    vids = [p["url"] for p in d.get("picker", []) if p.get("type") in ("video", "gif")]
    if not vids:
        sys.exit("cobalt: post has no video (photos only)")
    if len(vids) > 1:
        print(f"cobalt: post has {len(vids)} videos, using the first", file=sys.stderr)
    print(vids[0])
else:
    sys.exit("cobalt: " + json.dumps(d.get("error", d)))
' "$RESP")"
# alwaysProxy: cobalt streams the file itself; some CDNs (Vimeo) refuse direct links.
curl -sfL -m 900 -o "$WORK/video.mp4" "$MEDIA" || { echo "cobalt: download failed (the site refused the file)" >&2; exit 1; }
python3 -c 'import json,sys; json.dump({"webpage_url": sys.argv[1], "downloader": "cobalt"}, open(sys.argv[2], "w"), indent=1)' "$URL" "$WORK/info.json"
