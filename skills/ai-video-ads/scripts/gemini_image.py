#!/usr/bin/env python3
"""Still image (start frame) via the Gemini API. Key: GEMINI_API_KEY / GOOGLE_API_KEY (env or --env-file).
usage: gemini_image.py OUT.jpg PROMPT.txt [REF.jpg ...] [--model gemini-nano-banana-2.1] [--aspect 9:16] [--size 2K]
Models: gemini-nano-banana-2.1 (cheaper, candid look), gemini-3-pro-image (polished)."""
import argparse, base64, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _keys import key
K = key("GEMINI_API_KEY", "GOOGLE_API_KEY")
p = argparse.ArgumentParser(); p.add_argument("out"); p.add_argument("prompt"); p.add_argument("refs", nargs="*")
p.add_argument("--model", default="gemini-nano-banana-2.1"); p.add_argument("--aspect", default="9:16"); p.add_argument("--size", default="2K")
a = p.parse_args()
parts = [{"inline_data": {"mime_type": "image/png" if r.lower().endswith("png") else "image/jpeg",
                          "data": base64.b64encode(open(r, "rb").read()).decode()}} for r in a.refs]
parts.append({"text": open(a.prompt).read().strip()})
body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": a.aspect, "imageSize": a.size}}}
bf = a.out + ".req.json"; open(bf, "w").write(json.dumps(body))
r = subprocess.run(["curl", "-sS", "--max-time", "300", "-X", "POST", f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent",
                    "-H", f"x-goog-api-key: {K}", "-H", "Content-Type: application/json", "--data-binary", f"@{bf}"], capture_output=True, text=True)
os.remove(bf)
d = json.loads(r.stdout or "{}")
if "error" in d: sys.exit("ERROR " + json.dumps(d["error"])[:400])
for part in d.get("candidates", [{}])[0].get("content", {}).get("parts", []):
    x = part.get("inlineData") or part.get("inline_data")
    if x:
        tmp = a.out + ".tmp"; open(tmp, "wb").write(base64.b64decode(x["data"]))
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-q:v", "2", a.out], check=True); os.remove(tmp)
        print("ok", a.out); break
else: sys.exit("no image: " + json.dumps(d)[:300])
