#!/usr/bin/env python3
"""Several takes of ONE speaker with ONE voice: a multi-turn Omni session (Gemini API). Turn 1 starts from an image;
each next turn extends the same video (previous_interaction_id), so the voice carries over.
usage: omni_chain.py SPEC.json OUTDIR
SPEC = {"model": "gemini-omni-1.2-flash", "aspect": "9:16", "res": "720p", "start": "still.jpg",
        "voice": "Her voice, identical in every line: ...", "lock": "Static camera ... No music, no text.",
        "turns": ["From the very first frame she says: \\"...\\"", "Continuing, she says: \\"...\\""]}
Writes OUTDIR/t1.mp4, t2.mp4 … (each the extended video so far). Key: GEMINI_API_KEY / GOOGLE_API_KEY."""
import base64, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _keys import key
K = key("GEMINI_API_KEY", "GOOGLE_API_KEY")
spec, out = json.load(open(sys.argv[1])), sys.argv[2]; os.makedirs(out, exist_ok=True)
RF = {"type": "video", "aspect_ratio": spec.get("aspect", "9:16"), "resolution": spec.get("res", "720p")}
prev = None
for i, turn in enumerate(spec["turns"], 1):
    text = f"{turn} {spec.get('voice', '')} {spec.get('lock', '')}".strip()
    inp = [{"type": "text", "text": text}]
    if i == 1: inp.insert(0, {"type": "image", "data": base64.b64encode(open(spec["start"], "rb").read()).decode(), "mime_type": "image/jpeg"})
    body = {"model": spec.get("model", "gemini-omni-1.2-flash"), "store": True, "response_format": RF, "input": inp}
    if prev: body["previous_interaction_id"] = prev
    bf, rf = f"{out}/t{i}.req.json", f"{out}/t{i}.res.json"; open(bf, "w").write(json.dumps(body))
    subprocess.run(["curl", "-sS", "--max-time", "1500", "-X", "POST", "https://generativelanguage.googleapis.com/v1beta/interactions",
                    "-H", f"x-goog-api-key: {K}", "-H", "Content-Type: application/json", "--data-binary", f"@{bf}", "-o", rf], check=True)
    os.remove(bf); d = json.load(open(rf)); os.remove(rf)
    if "error" in d: sys.exit(f"turn {i} ERROR " + json.dumps(d["error"])[:400])
    vid = next((c for st in d.get("steps", []) for c in (st.get("content") or []) if c.get("type") == "video"), None)
    if not vid: sys.exit(f"turn {i}: no video")
    p = f"{out}/t{i}.mp4"
    if vid.get("data"): open(p, "wb").write(base64.b64decode(vid["data"]))
    else: subprocess.run(["curl", "-sSL", "-H", f"x-goog-api-key: {K}", "-o", p, vid["uri"]], check=True)
    prev = d.get("id"); print(json.dumps({"turn": i, "out": p, "id": prev}))
