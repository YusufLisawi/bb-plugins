#!/usr/bin/env python3
"""One image-to-video take via the Gemini API (Interactions REST). Key: GEMINI_API_KEY / GOOGLE_API_KEY.
usage: omni.py START.jpg PROMPT.txt OUT.mp4 [--secs 10] [--model gemini-omni-1.2-flash] [--res 720p] [--aspect 9:16]
Synchronous (~1 min). Cost ≈ seconds × rate (Omni 1.2 Flash ≈ $0.07/s at 720p, Nov 2026). Prints duration and usage."""
import argparse, base64, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _keys import key
K = key("GEMINI_API_KEY", "GOOGLE_API_KEY")
p = argparse.ArgumentParser(); p.add_argument("start"); p.add_argument("prompt"); p.add_argument("out")
p.add_argument("--secs", type=int, default=10); p.add_argument("--model", default="gemini-omni-1.2-flash")
p.add_argument("--res", default="720p"); p.add_argument("--aspect", default="9:16")
a = p.parse_args()
text = (f"Image-to-video: the attached image is the exact first frame of the video. Generate a {a.secs}-second video in a single "
        f"continuous shot, no scene cuts. " + open(a.prompt).read().strip())
body = {"model": a.model, "store": False, "background": False, "stream": False,
        "input": [{"type": "image", "data": base64.b64encode(open(a.start, "rb").read()).decode(), "mime_type": "image/jpeg"}, {"type": "text", "text": text}],
        "response_format": {"type": "video", "aspect_ratio": a.aspect, "resolution": a.res}}
bf = a.out + ".req.json"; rf = a.out + ".res.json"; open(bf, "w").write(json.dumps(body))
subprocess.run(["curl", "-sS", "--max-time", "1500", "-X", "POST", "https://generativelanguage.googleapis.com/v1beta/interactions",
                "-H", f"x-goog-api-key: {K}", "-H", "Content-Type: application/json", "--data-binary", f"@{bf}", "-o", rf], check=True)
os.remove(bf); d = json.load(open(rf)); os.remove(rf)
if "error" in d: sys.exit("ERROR " + json.dumps(d["error"])[:400])
vid = next((c for st in d.get("steps", []) for c in (st.get("content") or []) if c.get("type") == "video"), None)
if not vid: sys.exit("no video: " + json.dumps(d)[:400])
if vid.get("data"): open(a.out, "wb").write(base64.b64decode(vid["data"]))
else: subprocess.run(["curl", "-sSL", "-H", f"x-goog-api-key: {K}", "-o", a.out, vid["uri"]], check=True)
dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.out], capture_output=True, text=True).stdout.strip()
print(json.dumps({"ok": True, "out": a.out, "seconds": dur, "usage": d.get("usage", {}).get("total_output_tokens")}))
