#!/usr/bin/env python3
"""One continuous voice-over take, edited like a VO editor would.

1. The voice engine reads the WHOLE script in one go (expression tags inline), so
   the delivery flows — lines generated one by one sound stitched and flat.
   --provider elevenlabs (default; eleven_v4, --el-model eleven_v3 for the old model) or fish (Fish Audio, --model s2.1-pro).
   Default provider: $MFS_TTS, else elevenlabs. --voice is the provider's voice id
   (ElevenLabs voice_id, or a Fish Audio model/reference id).
2. Speech-to-text gives word timestamps (scripts/stt.py: Deepgram Nova-3 first, then
   ElevenLabs Scribe, then Fish ASR; $MFS_STT forces one); tags must not be spoken.
3. Pauses are tightened: after a sentence to `--sent` s, after a comma/dash to
   `--comma` s, elsewhere never longer than `--word` s. Cuts land in the middle of
   silence with short crossfades, so no word is touched.
4. Optional pitch-preserving speed-up (`--tempo`, ffmpeg atempo).
5. The edited take is transcribed again: those timestamps drive the picture.

Output: <out>/take.mp3, <out>/take.words.json ({text, duration, words:[{w,s,e}]})
Usage: . scripts/el-env.sh && .venv/bin/python scripts/vo_take.py script.txt out_dir --voice <id>
       [--provider elevenlabs|fish] [--model s2.1-pro] [--tempo 1.08] [--sent 0.34] [--comma 0.14]
       [--word 0.09] [--stability 0.5] [--temperature 0.7] [--reuse]
"""
import argparse, json, os, re, subprocess, sys, urllib.request
import numpy as np
sys.path.insert(0, "scripts")
from audio import SR, load, write_wav
from stt import transcribe

def tts(text, voice, key, stability, model="eleven_v4"):
    body = {"text": text, "model_id": model,
            "voice_settings": {"stability": stability, "similarity_boost": 0.8, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192",
                                 data=json.dumps(body).encode(),
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "User-Agent": "brainfast-showreel/1.0"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()

def tts_fish(text, voice, key, model, temperature):
    body = {"text": text, "reference_id": voice, "format": "mp3", "mp3_bitrate": 192, "latency": "normal",
            "temperature": temperature, "top_p": 0.7, "normalize": True}
    req = urllib.request.Request("https://api.fish.audio/v1/tts", data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "model": model})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()

def tighten(x, words, sent, comma, word_gap, xf=0.012):
    """Rebuild the take with every inter-word gap clamped to its target length."""
    keep = []  # (start_sample, end_sample) segments to keep, in order
    cur = 0
    for a, b in zip(words, words[1:]):
        gap = b["start"] - a["end"]
        tail = a["text"].strip()
        target = sent if re.search(r"[.!?…]$", tail) else comma if re.search(r"[,;:—–-]$", tail) else word_gap
        if gap > target + 0.04:
            mid_cut_a = a["end"] + target / 2
            mid_cut_b = b["start"] - target / 2
            keep.append((cur, int(mid_cut_a * SR)))
            cur = int(mid_cut_b * SR)
    keep.append((cur, len(x)))
    n = int(xf * SR)
    out = x[keep[0][0]:keep[0][1]].copy()
    for s, e in keep[1:]:
        seg = x[s:e].copy()
        if len(out) > n and len(seg) > n:
            ramp = np.linspace(0, 1, n)[:, None]
            out[-n:] = out[-n:] * (1 - ramp) + seg[:n] * ramp
            seg = seg[n:]
        out = np.concatenate([out, seg])
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script"); ap.add_argument("out")
    ap.add_argument("--voice", required=True)
    ap.add_argument("--tempo", type=float, default=1.0)
    ap.add_argument("--sent", type=float, default=0.34)
    ap.add_argument("--comma", type=float, default=0.14)
    ap.add_argument("--word", type=float, default=0.09)
    ap.add_argument("--stability", type=float, default=0.5)
    ap.add_argument("--reuse", action="store_true", help="reuse raw.mp3 if present (re-edit only)")
    ap.add_argument("--provider", choices=["elevenlabs", "fish"], default=os.environ.get("MFS_TTS", "elevenlabs"))
    ap.add_argument("--model", default="s2.1-pro", help="Fish Audio model (s2.1-pro, s2-pro, s1, …)")
    ap.add_argument("--el-model", default=os.environ.get("MFS_EL_MODEL", "eleven_v4"), help="ElevenLabs model (eleven_v4, eleven_v3)")
    ap.add_argument("--temperature", type=float, default=0.7, help="Fish Audio expressiveness 0–1")
    a = ap.parse_args()
    if a.provider == "fish" and not os.environ.get("FISH_API_KEY"): sys.exit("FISH_API_KEY not set: source scripts/el-env.sh")
    if a.provider == "elevenlabs" and not os.environ.get("ELEVENLABS_API_KEY"): sys.exit("ELEVENLABS_API_KEY not set: source scripts/el-env.sh")
    os.makedirs(a.out, exist_ok=True)
    text = open(a.script).read().strip()
    raw = os.path.join(a.out, "raw.mp3")
    if not (a.reuse and os.path.exists(raw)):
        audio = tts(text, a.voice, os.environ["ELEVENLABS_API_KEY"], a.stability, a.el_model) if a.provider == "elevenlabs" \
            else tts_fish(text, a.voice, os.environ["FISH_API_KEY"], a.model, a.temperature)
        open(raw, "wb").write(audio)
    said, words, eng = transcribe(raw)
    tags = [t.lower() for t in re.findall(r"\[([^\]]+)\]", text)]
    leaked = [t for t in tags if t in said.lower()]
    x = load(raw)
    span0 = words[-1]["end"] - words[0]["start"]
    y = tighten(x, words, a.sent, a.comma, a.word)
    # trim to 60 ms before the first word, keep a short tail
    tmp = os.path.join(a.out, "_edit.wav")
    write_wav(tmp, y)
    final = os.path.join(a.out, "take.mp3")
    af = f"atempo={a.tempo}" if abs(a.tempo - 1) > 1e-3 else "anull"
    subprocess.run(["npx", "--yes", "remotion", "ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", tmp,
                    "-af", af, "-c:a", "libmp3lame", "-b:a", "192k", final], check=True, capture_output=True)
    os.remove(tmp)
    said2, words2, eng = transcribe(final)
    dur = len(load(final)) / SR
    json.dump({"text": said2, "duration": dur,
               "words": [{"w": w["text"], "s": w["start"], "e": w["end"]} for w in words2]},
              open(os.path.join(a.out, "take.words.json"), "w"), indent=1)
    span = words2[-1]["end"] - words2[0]["start"]
    print(f"raw  {span0:5.2f}s spoken, {len(words) / span0:4.2f} words/s")
    print(f"voice: {a.provider} {a.voice}" + (f" ({a.model})" if a.provider == "fish" else f" ({a.el_model})") + f" · word timings: {eng}")
    print(f"edit {span:5.2f}s spoken, {len(words2) / span:4.2f} words/s  (tempo {a.tempo}) -> {final} ({dur:.2f}s)")
    print("tags spoken:", leaked or "none")
    print("transcript:", said2)

if __name__ == "__main__":
    main()
