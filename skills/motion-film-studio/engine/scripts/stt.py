"""Speech-to-text with word timestamps, for the voice take (timing drives the picture) and QA.

transcribe(path, lang="en") -> (text, [{"text", "start", "end", "type": "word"}], engine)

Engine: $MFS_STT (deepgram | elevenlabs | fish) or the first key available, in this order:
  deepgram    Nova-3, true per-word timestamps (best; DEEPGRAM_API_KEY)
  elevenlabs  Scribe v1, per-word timestamps (ELEVENLABS_API_KEY)
  fish        Fish ASR, segment timestamps split per word by length (FISH_API_KEY; approximate)
Keys come from scripts/el-env.sh (~/.config/motion-film-studio/*.env). Never print them.
"""
import json, os, subprocess


def _deepgram(path, lang):
    out = subprocess.run(["curl", "-s", "-X", "POST",
                          f"https://api.deepgram.com/v1/listen?model=nova-3&language={lang}&punctuate=true&smart_format=false",
                          "-H", f"Authorization: Token {os.environ['DEEPGRAM_API_KEY']}", "-H", "Content-Type: audio/*",
                          "--data-binary", f"@{path}"], capture_output=True, text=True).stdout
    alt = json.loads(out)["results"]["channels"][0]["alternatives"][0]
    words = [{"text": w.get("punctuated_word", w["word"]), "start": w["start"], "end": w["end"], "type": "word"} for w in alt["words"]]
    return alt["transcript"], words


def _elevenlabs(path, lang):
    code = {"en": "eng", "es": "spa", "fr": "fra", "ar": "ara"}.get(lang, lang)
    out = subprocess.run(["curl", "-s", "-X", "POST", "https://api.elevenlabs.io/v1/speech-to-text",
                          "-H", f"xi-api-key: {os.environ['ELEVENLABS_API_KEY']}", "-F", "model_id=scribe_v1", "-F", f"language_code={code}",
                          "-F", "timestamps_granularity=word", "-F", f"file=@{path}"], capture_output=True, text=True).stdout
    d = json.loads(out)
    return d.get("text", ""), [w for w in d.get("words", []) if w.get("type") == "word"]


def _fish(path, lang):
    out = subprocess.run(["curl", "-s", "-X", "POST", "https://api.fish.audio/v1/asr", "-H", f"Authorization: Bearer {os.environ['FISH_API_KEY']}",
                          "-F", f"audio=@{path}", "-F", f"language={lang}", "-F", "ignore_timestamps=false"], capture_output=True, text=True).stdout
    d = json.loads(out)
    words = []
    for seg in d.get("segments", []):
        ws = seg["text"].split()
        if not ws: continue
        total = sum(len(w) + 1 for w in ws); t = seg["start"]; span = seg["end"] - seg["start"]
        for w in ws:
            dt = span * (len(w) + 1) / total
            words.append({"text": w, "start": t, "end": t + dt * 0.85, "type": "word"}); t += dt
    return d.get("text", ""), words


ENGINES = {"deepgram": ("DEEPGRAM_API_KEY", _deepgram), "elevenlabs": ("ELEVENLABS_API_KEY", _elevenlabs), "fish": ("FISH_API_KEY", _fish)}


def engine():
    want = os.environ.get("MFS_STT")
    if want:
        if not os.environ.get(ENGINES[want][0]): raise SystemExit(f"MFS_STT={want} but {ENGINES[want][0]} is not set (source scripts/el-env.sh)")
        return want
    for name, (key, _) in ENGINES.items():
        if os.environ.get(key): return name
    raise SystemExit("no speech-to-text key: source scripts/el-env.sh (Deepgram, ElevenLabs or Fish)")


def transcribe(path, lang="en"):
    name = engine()
    text, words = ENGINES[name][1](path, lang)
    return text, words, name
