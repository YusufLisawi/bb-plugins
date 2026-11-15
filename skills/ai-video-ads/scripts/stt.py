#!/usr/bin/env python3
"""Word-timed transcript of a take or a final (ElevenLabs speech-to-text, scribe_v1). Key: ELEVENLABS_API_KEY.
usage: stt.py CLIP.mp4 [--lang spa]   → prints the text and word[start-end]; writes CLIP.mp4.stt.json ([word, start, end] list)
Add --diarize to label speakers when checking a two-person clip."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _keys import key
K = key("ELEVENLABS_API_KEY")
args = sys.argv[1:]; diar = "--diarize" in args; args = [x for x in args if x != "--diarize"]
lang = args[args.index("--lang") + 1] if "--lang" in args else None
f = args[0]
cmd = ["curl", "-sS", "https://api.elevenlabs.io/v1/speech-to-text", "-H", f"xi-api-key: {K}", "-F", "model_id=scribe_v1",
       "-F", "timestamps_granularity=word", "-F", f"file=@{f}"] + (["-F", f"language_code={lang}"] if lang else []) + (["-F", "diarize=true"] if diar else [])
d = json.loads(subprocess.run(cmd, capture_output=True, text=True).stdout or "{}")
if "words" not in d: sys.exit("STT failed: " + json.dumps(d)[:300])
W = [[w["text"], round(w["start"], 2), round(w["end"], 2)] + ([w.get("speaker_id")] if diar else []) for w in d["words"] if w["type"] == "word"]
json.dump(W, open(f + ".stt.json", "w"), ensure_ascii=False)
print(d.get("text")); print("  " + " ".join(f"{w[0]}[{w[1]}-{w[2]}]" for w in W))
