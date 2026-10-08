#!/usr/bin/env python3
"""Audition narrators by measurement (they can't be listened to here).

Every candidate reads the same tagged passage with ElevenLabs v3. For each take:
  * pace      words per second over the spoken span (from speech-to-text timestamps)
  * range     pitch variation in semitones (std of F0 over voiced frames) — monotone
              reads sit ~1.5 st, lively commercial reads 3+ st
  * energy    loudness variation between words (dB std of per-word RMS) — flat vs dynamic
  * accuracy  share of script words recognised by speech-to-text
Usage: . scripts/el-env.sh && .venv/bin/python scripts/voice_audition.py out/audition <id:name> [...] [--passage file.txt]
"""
import json, os, re, subprocess, sys, urllib.request, urllib.error
import numpy as np
sys.path.insert(0, "scripts")
from audio import SR, load

PASSAGE = ("[warm] It's eleven forty-seven p.m. You've closed for the night… [knowing] your customers haven't. "
           "[confident] Meet your Brainfast agent. [upbeat] It answers in seconds, books the table, and saves every lead. "
           "[impressed] It even picks up the phone.")

def tts(voice, key, text, stability=0.5):
    body = {"text": text, "model_id": os.environ.get("MFS_EL_MODEL", "eleven_v4"),
            "voice_settings": {"stability": stability, "similarity_boost": 0.8, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192",
                                 data=json.dumps(body).encode(),
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "User-Agent": "brainfast-showreel/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()

def stt(path, key):
    out = subprocess.run(["curl", "-s", "-X", "POST", "https://api.elevenlabs.io/v1/speech-to-text",
                          "-H", f"xi-api-key: {key}", "-F", "model_id=scribe_v1", "-F", "language_code=eng",
                          "-F", "timestamps_granularity=word", "-F", f"file=@{path}"], capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except Exception:
        return {"text": "", "words": []}

def f0_track(x, sr=SR):
    """Simple autocorrelation pitch tracker (70–320 Hz), 40 ms frames, 10 ms hop."""
    mono = x.mean(axis=1)
    n, hop = int(0.04 * sr), int(0.01 * sr)
    lo, hi = int(sr / 320), int(sr / 70)
    f0 = []
    for s in range(0, len(mono) - n, hop):
        fr = mono[s:s + n] * np.hanning(n)
        if np.sqrt(np.mean(fr ** 2)) < 0.01:
            continue
        ac = np.correlate(fr, fr, mode="full")[n - 1:]
        ac /= ac[0] + 1e-9
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.45:
            f0.append(sr / k)
    return np.array(f0)

def main():
    global PASSAGE
    if "--passage" in sys.argv:  # audition on another film's lines: --passage file.txt
        i = sys.argv.index("--passage")
        PASSAGE = open(sys.argv[i + 1]).read().strip()
        del sys.argv[i:i + 2]
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    key = os.environ["ELEVENLABS_API_KEY"]
    ref = re.findall(r"[a-z]+", re.sub(r"\[[^\]]+\]", "", PASSAGE).lower().replace("brainfast", "brain fast"))
    print(f"{'voice':28} {'pace':>6} {'range':>6} {'energy':>7} {'acc':>5}  transcript")
    for arg in sys.argv[2:]:
        vid, name = arg.split(":", 1)
        path = os.path.join(out_dir, f"{name}.mp3")
        if not os.path.exists(path):
            try:
                open(path, "wb").write(tts(vid, key, PASSAGE))
            except urllib.error.HTTPError as e:
                print(f"{name:28} ERROR {e.code} {e.read()[:160].decode(errors='replace')}")
                continue
        res = stt(path, key)
        words = [w for w in res.get("words", []) if w.get("type") == "word"]
        if not words:
            print(f"{name:28} no transcript"); continue
        span = words[-1]["end"] - words[0]["start"]
        x = load(path)
        f0 = f0_track(x)
        st = 12 * np.log2(f0 / np.median(f0)) if len(f0) else np.array([0.0])
        per_word = [x[int(w["start"] * SR): int(w["end"] * SR)] for w in words if w["end"] - w["start"] > 0.08]
        rms_db = [20 * np.log10(np.sqrt(np.mean(np.square(p))) + 1e-9) for p in per_word]
        got = re.findall(r"[a-z]+", res.get("text", "").lower().replace("brainfast", "brain fast"))
        acc = sum(1 for w in ref if w in got) / len(ref)
        print(f"{name:28} {len(words) / span:6.2f} {np.std(st):6.2f} {np.std(rms_db):7.2f} {acc:5.2f}  {res.get('text','')[:60]}")
        json.dump({"pace": len(words) / span, "range": float(np.std(st)), "energy": float(np.std(rms_db)), "acc": acc,
                   "f0_median": float(np.median(f0)) if len(f0) else 0},
                  open(os.path.join(out_dir, f"{name}.json"), "w"))

if __name__ == "__main__":
    main()
