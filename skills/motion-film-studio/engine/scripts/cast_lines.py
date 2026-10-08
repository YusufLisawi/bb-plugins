#!/usr/bin/env python3
"""A cast of one-line speakers (customers asking questions), each with its own
ElevenLabs v3 voice and language. Every line is generated, transcribed (to prove
no tag was spoken and to get word timings), trimmed to 40 ms before the first
word and 250 ms after the last, and written as <slug>.mp3 + <slug>.words.json
(the same format as the narrator's clips, so the film's timing code reads both).

cast.json: [{"slug": "c1", "voice": "<id>", "text": "[casual] Hi! Where's my order?", "lang": "eng"}, ...]
Usage: . scripts/el-env.sh && .venv/bin/python scripts/cast_lines.py cast.json public/<film>/cast [--reuse]
"""
import json, os, re, subprocess, sys, urllib.request
sys.path.insert(0, "scripts")
from audio import SR, load, write_wav

def tts(text, voice, key, stability=0.5):
    body = {"text": text, "model_id": "eleven_v3",
            "voice_settings": {"stability": stability, "similarity_boost": 0.8, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192",
                                 data=json.dumps(body).encode(),
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "User-Agent": "brainfast-showreel/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()

def stt(path, key, lang):
    out = subprocess.run(["curl", "-s", "-X", "POST", "https://api.elevenlabs.io/v1/speech-to-text",
                          "-H", f"xi-api-key: {key}", "-F", "model_id=scribe_v1", "-F", f"language_code={lang}",
                          "-F", "timestamps_granularity=word", "-F", f"file=@{path}"], capture_output=True, text=True).stdout
    d = json.loads(out)
    return d.get("text", ""), [w for w in d.get("words", []) if w.get("type") == "word"]

def main():
    cast = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    reuse = "--reuse" in sys.argv
    os.makedirs(out, exist_ok=True)
    key = os.environ["ELEVENLABS_API_KEY"]
    for c in cast:
        raw = os.path.join(out, f"{c['slug']}.raw.mp3")
        if not (reuse and os.path.exists(raw)):
            open(raw, "wb").write(tts(c["text"], c["voice"], key, c.get("stability", 0.5)))
        said, words = stt(raw, key, c.get("lang", "eng"))
        tags = [t.lower() for t in re.findall(r"\[([^\]]+)\]", c["text"])]
        leaked = [t for t in tags if t in said.lower()]
        x = load(raw)
        s = max(0.0, words[0]["start"] - 0.04)
        e = min(len(x) / SR, words[-1]["end"] + 0.25)
        seg = x[int(s * SR): int(e * SR)]
        n = int(0.015 * SR)
        seg[-n:] *= __import__("numpy").linspace(1, 0, n)[:, None]
        tmp = os.path.join(out, f"_{c['slug']}.wav")
        write_wav(tmp, seg)
        subprocess.run(["npx", "--yes", "remotion", "ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", tmp,
                        "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(out, f"{c['slug']}.mp3")], check=True, capture_output=True)
        os.remove(tmp)
        json.dump({"text": said.strip(), "duration": e - s,
                   "words": [{"w": w["text"], "s": round(w["start"] - s, 3), "e": round(w["end"] - s, 3)} for w in words]},
                  open(os.path.join(out, f"{c['slug']}.words.json"), "w"), indent=1)
        print(f"{c['slug']}  {e - s:4.2f}s  tags spoken: {leaked or 'none'}  | {said.strip()}")

if __name__ == "__main__":
    main()
