#!/usr/bin/env python3
"""Gemini API audio: speech (Gemini TTS) and music (Lyria) with the owner's API key. The DEFAULT route for speech and music.

No browser, no Google-account guard: this talks to https://generativelanguage.googleapis.com with the key in
~/.config/google-flow/gemini.env (GEMINI_API_KEY, mode 600; the GEMINI_API_KEY environment variable wins). The key is
never printed, logged or copied. Python 3.9+, standard library only (ffmpeg for --mp3, trimming and WAV→MP3).
Each command prints ONE JSON object on stdout (`ok`, files, usage, est_cost_usd); progress goes to stderr.

  gemini_audio.py tts --voice Arlo --text "..." [--style "..."] [--lang es] [--model gemini-3.8-flash-tts] --out a.wav [--mp3]
  gemini_audio.py tts --voice Arlo --text-file script.txt --out a.wav            # long text: cut at sentences, joined
  gemini_audio.py tts --speakers '{"Joe":"Arlo","Jane":{"voice":"Kore","style":"tired"}}' --text $'Joe: Hi.\\nJane: <sigh> Hi.' --out d.wav
  gemini_audio.py music --prompt "..." [--seconds 30] [--instrumental] [--model lyria-3.5] [--wav] --out song.mp3
  gemini_audio.py voices [--language es] [--gender female] [--search NAME] [--limit 40] [--refresh]
  gemini_audio.py models | usage

Rate limits / quota: a 429 (or RESOURCE_EXHAUSTED) is retried ONCE after the server's retryDelay when that is short;
a daily-quota 429 is never retried. The error comes back as {"ok": false, "rate_limited": true, "retry_after_s": N}.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import audio_utils as au  # noqa: E402

API = os.environ.get("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")  # the override is for tests
CONF_DIR = Path(os.environ.get("FLOW_CONFIG_DIR", Path.home() / ".config" / "google-flow"))
KEY_FILE = CONF_DIR / "gemini.env"
VOICES_CACHE = CONF_DIR / "gemini_voices.json"
USAGE_FILE = CONF_DIR / "gemini_usage.json"

TTS_DEFAULT = "gemini-3.8-flash-tts"
MUSIC_DEFAULT = "lyria-3.5"
MUSIC_CLIP = "lyria-3-clip-preview"
# USD per 1M tokens (text in, audio out) for speech; per song / clip for music. From ai.google.dev/gemini-api/docs/pricing
# (checked 2026-11-01). The 3.8 TTS prices double on 2027-01-01. Estimates only: the account's bill is the truth.
PRICES = {
    "gemini-3.8-flash-tts": {"in": 0.50, "out": 9.00},
    "gemini-3.8-flash-lite-tts": {"in": 0.50, "out": 6.00},
    "gemini-3.1-flash-tts-preview": {"in": 1.00, "out": 20.00},
    "lyria-3.5": {"song": 0.08}, "lyria-3-pro-preview": {"song": 0.08}, "lyria-3-clip-preview": {"song": 0.04},
}
AUDIO_TOKENS_PER_S = 25
TAG_SQ = re.compile(r"\[([A-Za-z][A-Za-z \-]{0,24})\]")
TAG_AN = re.compile(r"<[A-Za-z][A-Za-z \-]{0,24}>")
SENT_END = re.compile(r"(?<=[.!?…؟。！？])[\"'”’»)\]]*\s+")
RETRY_DELAY = re.compile(r'"retryDelay"\s*:\s*"([\d.]+)s"')


def log(*a):
    print("[gemini]", *a, file=sys.stderr, flush=True)


class GeminiError(RuntimeError):
    def __init__(self, msg, status=None, rate_limited=False, retry_after=None, transient=False):
        super().__init__(msg)
        self.status, self.rate_limited, self.retry_after, self.transient = status, rate_limited, retry_after, transient


def die(msg, **extra):
    print(json.dumps({"ok": False, "error": msg, **extra}, ensure_ascii=False))
    sys.exit(1)


# ---- key and HTTP -----------------------------------------------------------------------------------------------
def api_key() -> str:
    k = os.environ.get("GEMINI_API_KEY")
    if not k and KEY_FILE.exists():
        for line in KEY_FILE.read_text().splitlines():
            if line.startswith("GEMINI_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not k:
        die(f"no Gemini API key: put GEMINI_API_KEY=... in {KEY_FILE} (mode 600) or export GEMINI_API_KEY")
    return k


def _scrub(text: str) -> str:
    return text.replace(api_key(), "***") if text else text


def call(path: str, body=None, method="POST", timeout=300, retry=True):
    """One API call. Retries ONCE: a short-delay 429 after its retryDelay, a 5xx after 4 s. Never loops."""
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(2):
        req = urllib.request.Request(API + path, data=data, method=method,
                                     headers={"x-goog-api-key": api_key(), "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            raw = _scrub(e.read().decode(errors="replace"))
            try:
                msg = json.loads(raw)["error"]["message"]
            except Exception:
                msg = raw[:300]
            m = RETRY_DELAY.search(raw)
            delay = float(m.group(1)) if m else None
            if e.code == 429 or "RESOURCE_EXHAUSTED" in raw:
                per_day = bool(re.search(r"PerDay|per day|daily", raw, re.I))
                if retry and attempt == 0 and not per_day and (delay or 20) <= 90:
                    log(f"429 rate limit: waiting {delay or 20:.0f} s, one retry")
                    time.sleep((delay or 20) + 1)
                    continue
                raise GeminiError(f"Gemini API rate limit / quota (HTTP {e.code}): {msg[:300]}", e.code, True, delay)
            if e.code >= 500 and retry and attempt == 0:
                log(f"HTTP {e.code}: one retry in 4 s")
                time.sleep(4)
                continue
            raise GeminiError(f"Gemini API HTTP {e.code}: {msg[:400]}", e.code, transient=e.code >= 500)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if retry and attempt == 0:
                log(f"network error ({e}): one retry in 4 s")
                time.sleep(4)
                continue
            raise GeminiError(f"network error talking to the Gemini API: {e}", transient=True)


def note_usage(**add):
    """Per-day counters in gemini_usage.json (best effort; never fails a job)."""
    try:
        u = {}
        if USAGE_FILE.exists():
            u = json.loads(USAGE_FILE.read_text())
        day = u.setdefault(time.strftime("%Y-%m-%d"), {})
        for k, v in add.items():
            day[k] = round(day.get(k, 0) + v, 6)
        keep = time.strftime("%Y-%m-%d", time.localtime(time.time() - 14 * 86400))
        u = {k: v for k, v in u.items() if k >= keep}
        CONF_DIR.mkdir(parents=True, exist_ok=True)
        tmp = USAGE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(u, indent=1))
        tmp.replace(USAGE_FILE)
    except Exception:
        pass


# ---- text: tags, chunks, speakers ---------------------------------------------------------------------------------
def norm_tags(text: str, mode: str) -> str:
    """Gemini's documented tags are <angle>. `angle` turns [square] tags (ElevenLabs style) into <angle>; `keep` leaves the
    text alone; `strip` removes every short tag, [..] and <..>."""
    if mode == "keep":
        return text
    if mode == "strip":
        text = TAG_AN.sub("", TAG_SQ.sub("", text))
        return re.sub(r"[ \t]{2,}", " ", text).strip()
    return TAG_SQ.sub(lambda m: f"<{m.group(1).lower()}>", text)


def split_sentences(par: str, limit: int) -> list:
    out = []
    for s in SENT_END.split(par.strip()):
        s = s.strip()
        while len(s) > limit:   # a sentence longer than a chunk: cut at the last comma / semicolon / space before the limit
            cut = max((s.rfind(c, 0, limit) for c in (", ", "; ", ": ", "، ")), default=-1)
            if cut < limit // 3:
                cut = s.rfind(" ", 0, limit)
            if cut <= 0:
                cut = limit
            out.append(s[:cut + 1].strip())
            s = s[cut + 1:].strip()
        if s:
            out.append(s)
    return out


def chunk_text(text: str, limit: int) -> list:
    """Cut `text` into pieces of at most `limit` characters at paragraph, then sentence boundaries."""
    sents = []   # (sentence, starts_a_paragraph)
    for par in [p for p in re.split(r"\n\s*\n", text) if p.strip()]:
        for i, s in enumerate(split_sentences(re.sub(r"\s*\n\s*", " ", par), limit)):
            sents.append((s, i == 0))
    chunks, cur = [], ""
    for s, new_par in sents:
        if cur and (len(cur) + 1 + len(s) > limit or (new_par and len(cur) >= limit * 0.6)):
            chunks.append(cur)
            cur = ""
        cur = (cur + (" " if cur else "") + s)
    if cur:
        chunks.append(cur)
    return chunks


def parse_speakers(spec: str) -> dict:
    """{"Joe": "Arlo", "Jane": {"voice": "Kore", "style": "tired"}} (JSON, or @file.json) → {name: {voice, style}}"""
    raw = Path(spec[1:]).expanduser().read_text() if spec.startswith("@") else spec
    try:
        d = json.loads(raw)
    except json.JSONDecodeError as e:
        die(f"--speakers is not valid JSON: {e}")
    out = {}
    for name, v in (d.items() if isinstance(d, dict) else [(x["speaker"], x) for x in d]):
        out[name] = {"voice": v, "style": None} if isinstance(v, str) else {"voice": v["voice"], "style": v.get("style")}
    if not out:
        die("--speakers needs at least one speaker")
    return out


def parse_turns(text: str, speakers: dict) -> list:
    """'Joe: line' / 'Joe (whispering): line' turns → [(speaker, style, text)]. Other lines continue the previous turn."""
    names = "|".join(re.escape(n) for n in sorted(speakers, key=len, reverse=True))
    head = re.compile(rf"^\s*({names})\s*(?:\(([^)]*)\))?\s*:\s*(.*)$")
    turns = []
    for ln in text.splitlines():
        m = head.match(ln)
        if m:
            turns.append([m.group(1), (m.group(2) or "").strip() or None, m.group(3).strip()])
        elif ln.strip() and turns:
            turns[-1][2] += " " + ln.strip()
        elif ln.strip():
            die(f"the text must start with a speaker label ({', '.join(speakers)}): got {ln.strip()[:60]!r}")
    return [tuple(t) for t in turns if t[2]]


# ---- speech ---------------------------------------------------------------------------------------------------------
def vcfg(voice: str) -> dict:
    """voice_… / voicekey_… = a custom voice id; anything else a prebuilt voice by display name or id ('Arlo', 'en-us-arlo', 'kore')."""
    if voice.startswith(("voice_", "voicekey_")):
        return {"voice": voice}
    return {"prebuiltVoiceConfig": {"voiceName": voice}}


LOCALE_ID = re.compile(r"^([a-z]{2,3})-([a-z]{2}|\d{3})-", re.I)


def send_lang(voices: list, lang):
    """The languageCode to send. A locale voice id (es-es-advisor-2, en-us-arlo) exists only in its own locale, so the API
    rejects `--lang es` for it ("No matching speaker voice"): send that locale instead (several locales: none). Display names
    ('Arlo') and the 30 prebuilt voices ('Kore') take any language."""
    locs = {f"{m.group(1).lower()}-{m.group(2).upper() if m.group(2).isalpha() else m.group(2)}"
            for m in (LOCALE_ID.match(v) for v in voices if v) if m}
    if len(locs) == 1:
        return locs.pop()
    return None if locs else lang


def tts_once(model, parts, voice=None, speakers=None, lang=None, temperature=None):
    """One generateContent call → (wav bytes, usage). `parts`: [{"text", "speechMetadata": {"style", "speaker"}}]."""
    sc = {}
    if speakers:
        sc["multiSpeakerVoiceConfig"] = {"speakerVoiceConfigs": [{"speaker": n, "voiceConfig": vcfg(v)} for n, v in speakers.items()]}
    else:
        sc["voiceConfig"] = vcfg(voice)
    lang = send_lang(list(speakers.values()) if speakers else [voice], lang)
    if lang:
        sc["languageCode"] = lang
    gc = {"responseModalities": ["AUDIO"], "speechConfig": sc}
    if temperature is not None:
        gc["temperature"] = temperature
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": gc}
    for attempt in range(2):
        d = call(f"/models/{model}:generateContent", body, timeout=300)
        cand = (d.get("candidates") or [{}])[0]
        for p in (cand.get("content") or {}).get("parts", []):
            inl = p.get("inlineData")
            if inl and inl.get("data"):
                use = d.get("usageMetadata", {})
                rate = re.search(r"rate=(\d+)", inl.get("mimeType", ""))
                blob = base64.b64decode(inl["data"])
                if blob[:4] != b"RIFF":   # raw L16 PCM: wrap it
                    blob = au.make_wav(blob, int(rate.group(1)) if rate else 24000)
                return blob, {"input_tokens": use.get("promptTokenCount", 0), "output_tokens": use.get("candidatesTokenCount", 0)}
        why = cand.get("finishReason") or (d.get("promptFeedback") or {}).get("blockReason") or "no audio in the response"
        if attempt == 0 and why in ("OTHER", "no audio in the response"):   # the TTS model sometimes answers with text tokens: not billed, one retry
            log(f"no audio returned ({why}): one retry")
            time.sleep(3)
            continue
        raise GeminiError(f"the model returned no audio ({why})", transient=True)


def plan_requests(a, text: str, speakers: dict | None, limit: int) -> list:
    """The list of API requests for the job: each {parts, voice | speakers, label}."""
    reqs = []
    style = a.style or None
    if not speakers:
        for ch in chunk_text(text, limit):
            part = {"text": ch}
            if style:
                part["speechMetadata"] = {"style": style}
            reqs.append({"parts": [part], "voice": a.voice})
        return reqs
    turns = parse_turns(text, speakers)
    units = []   # long turns are cut at sentences; every piece keeps its speaker and style
    for who, st, t in turns:
        for piece in chunk_text(t, limit):
            units.append((who, st or speakers[who].get("style") or style, piece))
    native = len(speakers) <= 2 and not any(s["voice"].startswith(("voice_", "voicekey_")) for s in speakers.values())
    if native:   # up to two prebuilt speakers in ONE request: the model hears the whole exchange
        cur, size = [], 0
        for who, st, t in units:
            if cur and size + len(t) > limit:
                reqs.append(cur)
                cur, size = [], 0
            cur.append((who, st, t))
            size += len(t)
        if cur:
            reqs.append(cur)
        return [{"parts": [{"text": t, "speechMetadata": {"speaker": w, **({"style": s} if s else {})}} for w, s, t in grp],
                 "speakers": {n: v["voice"] for n, v in speakers.items()}} for grp in reqs]
    for who, st, t in units:   # more than two speakers, or custom voices: one request per turn, one voice each
        part = {"text": t}
        if st:
            part["speechMetadata"] = {"style": st}
        reqs.append({"parts": [part], "voice": speakers[who]["voice"]})
    return reqs


def cmd_tts(a):
    t0 = time.time()
    if a.text == "-":
        text = sys.stdin.read()
    elif a.text_file:
        text = Path(a.text_file).expanduser().read_text()
    else:
        text = a.text
    if not text or not text.strip():
        die("tts needs --text or --text-file")
    speakers = parse_speakers(a.speakers) if a.speakers else None
    if not speakers and not a.voice:
        die("tts needs --voice (see `voices`) or --speakers")
    text = norm_tags(text, a.tags)
    reqs = plan_requests(a, text, speakers, a.chunk_chars)
    if not reqs:
        die("nothing to say after cleaning the text")
    log(f"{a.model}: {len(text)} chars in {len(reqs)} request(s)" + (f", voice {a.voice}" if a.voice else ", speakers " + "/".join(speakers)))

    def run(r):
        return tts_once(a.model, r["parts"], r.get("voice"), r.get("speakers"), a.lang, a.temperature)

    try:
        if a.parallel > 1 and len(reqs) > 1:
            with ThreadPoolExecutor(max_workers=a.parallel) as ex:
                got = list(ex.map(run, reqs))
        else:
            got = [run(r) for r in reqs]
        blob = au.join_wavs([g[0] for g in got], a.pause)
    except GeminiError as e:
        die(str(e), **({"rate_limited": True, "retry_after_s": e.retry_after} if e.rate_limited else {}), status=e.status)
    out = Path(a.out).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(blob)
    info = au.wav_info(out)
    res = {"ok": True, "provider": "gemini", "model": a.model, "style": a.style, "lang": a.lang, "chunks": len(reqs),
           "chars": len(text), "out": str(out), **info}
    res.update({"speakers": {n: s["voice"] for n, s in speakers.items()}} if speakers else {"voice": a.voice})
    tin, tout = sum(g[1]["input_tokens"] for g in got), sum(g[1]["output_tokens"] for g in got)
    pr = PRICES.get(a.model, {})
    cost = round((tin * pr.get("in", 0) + tout * pr.get("out", 0)) / 1e6, 5) if pr else None
    res["usage"] = {"requests": len(reqs), "input_tokens": tin, "output_tokens": tout}
    res["est_cost_usd"] = cost
    note_usage(tts_requests=len(reqs), tts_chars=len(text), tts_audio_s=info.get("duration", 0), est_cost_usd=cost or 0)
    if a.mp3:
        mp3 = out.with_suffix(".mp3")
        res["lufs"] = round(au.to_mp3(out, mp3, a.lufs), 2)
        res["mp3"] = str(mp3)
    res["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(res, ensure_ascii=False))


# ---- music ----------------------------------------------------------------------------------------------------------
def cmd_music(a):
    t0 = time.time()
    out = Path(a.out).expanduser().resolve()
    wav = a.wav or out.suffix.lower() == ".wav"
    model = a.model
    if not model:   # lyria-3.5 never returns less than ~60 s: a short ask goes to the 30 s clip model
        model = MUSIC_CLIP if (a.seconds and a.seconds <= 30) else MUSIC_DEFAULT
    prompt = a.prompt.strip()
    if a.instrumental and not re.search(r"instrumental|no vocals", prompt, re.I):
        prompt = "Instrumental only, no vocals. " + prompt
    if a.seconds and model != MUSIC_CLIP:
        prompt += f" Target length: about {a.seconds} seconds."
    body = {"model": model, "input": prompt,
            "response_format": {"type": "audio", "mime_type": "audio/wav" if wav else "audio/mp3"}}
    log(f"{model}: {'WAV' if wav else 'MP3'}" + (f", about {a.seconds} s" if a.seconds else ""))
    try:
        d = call("/interactions", body, timeout=600)
    except GeminiError as e:
        die(str(e), **({"rate_limited": True, "retry_after_s": e.retry_after} if e.rate_limited else {}), status=e.status)
    audio, text = None, []
    for st in d.get("steps", []):
        for c in st.get("content", []):
            if c.get("type") == "audio" and c.get("data"):
                audio = (c.get("mime_type"), base64.b64decode(c["data"]))
            elif c.get("type") == "text":
                text.append(c.get("text", ""))
    if not audio:
        die("the model returned no audio", status=d.get("status"), text=" ".join(text)[:300])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio[1])
    res = {"ok": True, "provider": "gemini", "model": model, "mime": audio[0], "out": str(out), "bytes": len(audio[1]),
           "prompt": prompt, "structure": " ".join(re.findall(r"\[\[(\w+)\]\]", " ".join(text))) or None,
           "text": " ".join(text)[:500] or None}
    res["duration_generated"] = ffprobe_duration(out)
    res["duration"] = res["duration_generated"]
    if a.seconds and res["duration_generated"] and res["duration_generated"] > a.seconds + 1.5 and not a.no_trim:
        need_ffmpeg()
        tmp = out.with_name(out.stem + ".trim" + out.suffix)
        fade = min(2.0, a.seconds / 4)
        enc = [] if wav else ["-codec:a", "libmp3lame", "-q:a", "2"]
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(out), "-t", str(a.seconds), "-af",
                        f"afade=t=out:st={a.seconds - fade:.2f}:d={fade:.2f}", *enc, str(tmp)], check=True)
        tmp.replace(out)
        res["duration"] = ffprobe_duration(out)
        res["trimmed_to"] = a.seconds
    pr = PRICES.get(model, {})
    res["est_cost_usd"] = pr.get("song")
    res["usage"] = {k: v for k, v in d.get("usage", {}).items() if k.startswith("total_")}
    note_usage(music_songs=1, est_cost_usd=pr.get("song", 0))
    res["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(res, ensure_ascii=False))


def need_ffmpeg():
    if not shutil.which("ffmpeg"):
        die("ffmpeg is required for --seconds trimming")


def ffprobe_duration(p: Path):
    if not shutil.which("ffprobe"):
        return None
    try:
        o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                           capture_output=True, text=True, timeout=30).stdout.strip()
        return round(float(o), 2)
    except Exception:
        return None


# ---- voices, models, usage ------------------------------------------------------------------------------------------
def all_voices(refresh=False) -> list:
    if VOICES_CACHE.exists() and not refresh and time.time() - VOICES_CACHE.stat().st_mtime < 7 * 86400:
        return json.loads(VOICES_CACHE.read_text())
    voices, tok = [], None
    for _ in range(50):
        d = call("/voices?pageSize=200" + (f"&pageToken={urllib.request.quote(tok)}" if tok else ""), method="GET", timeout=60)
        voices += d.get("voices", [])
        tok = d.get("nextPageToken") or d.get("next_page_token")
        if not tok:
            break
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    VOICES_CACHE.write_text(json.dumps(voices, ensure_ascii=False))
    return voices


def cmd_voices(a):
    try:
        vs = all_voices(a.refresh)
    except GeminiError as e:
        die(str(e))
    lang = (a.language or "").lower()
    sel = []
    for v in vs:
        if lang and not (v.get("language_code") or "").lower().startswith(lang):
            continue
        if a.gender and (v.get("gender") or "").lower() != a.gender.lower():
            continue
        if a.pitch and (v.get("pitch") or "").lower() != a.pitch.lower():
            continue
        hay = " ".join(str(v.get(k, "")) for k in ("display_name", "id", "persona", "description", "accent", "context")).lower()
        if a.search and a.search.lower() not in hay:
            continue
        sel.append(v)
    langs = {}
    for v in vs:
        langs[v.get("language_code") or "custom"] = langs.get(v.get("language_code") or "custom", 0) + 1
    shown = sel if a.limit == 0 else sel[:a.limit]
    slim = [{k: v.get(k) for k in ("display_name", "id", "type", "language_code", "gender", "pitch", "persona", "accent", "description")
             if v.get(k)} for v in shown]
    print(json.dumps({"ok": True, "total": len(vs), "matched": len(sel), "shown": len(slim), "voices": slim,
                      "languages": dict(sorted(langs.items(), key=lambda kv: -kv[1])) if not (lang or a.search or a.gender) else None,
                      "note": "pass display_name or id as --voice; custom voices are voice_… ids"}, ensure_ascii=False))


def cmd_models(a):
    models, tok = [], None
    try:
        for _ in range(10):
            d = call("/models?pageSize=200" + (f"&pageToken={urllib.request.quote(tok)}" if tok else ""), method="GET", timeout=60)
            models += d.get("models", [])
            tok = d.get("nextPageToken")
            if not tok:
                break
    except GeminiError as e:
        die(str(e))
    keep = [m for m in models if re.search(r"tts|lyria|native-audio|live|transcribe", m["name"], re.I)]
    out = [{"name": m["name"].split("/", 1)[1], "methods": m.get("supportedGenerationMethods"),
            "input_token_limit": m.get("inputTokenLimit"), "output_token_limit": m.get("outputTokenLimit"),
            "price_usd": PRICES.get(m["name"].split("/", 1)[1]),
            "role": ("default speech" if m["name"].endswith("/" + TTS_DEFAULT) else "default music" if m["name"].endswith("/" + MUSIC_DEFAULT) else None)}
           for m in keep]
    print(json.dumps({"ok": True, "models": [{k: v for k, v in m.items() if v is not None} for m in out],
                      "price_note": "speech: USD per 1M tokens text-in / audio-out (audio = 25 tokens per second); music: USD per song or 30 s clip; "
                                    "the 3.8 TTS prices double 2027-01-01", "checked": "2026-11-01"}))


def cmd_usage(a):
    u = json.loads(USAGE_FILE.read_text()) if USAGE_FILE.exists() else {}
    print(json.dumps({"ok": True, "today": u.get(time.strftime("%Y-%m-%d"), {}), "days": u,
                      "note": "counted by this script only (not the account's own meter)"}))


def main():
    ap = argparse.ArgumentParser(prog="gemini_audio.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)

    s = sp.add_parser("tts", help="speech: one voice or up to many speakers; long text is chunked and joined")
    s.add_argument("--voice", help="display name or id from `voices` (Arlo, Kore, en-us-arlo, es-es-advisor-2) or a voice_… id")
    s.add_argument("--text", help="the text ('-' reads stdin); tags like <whispers> <gasp> <laugh> <sigh> <short pause>; [square] tags are converted")
    s.add_argument("--text-file", help="read the text from a file")
    s.add_argument("--style", help="delivery direction, e.g. 'Narration, tense and low' (sent as speech metadata, never read aloud)")
    s.add_argument("--speakers", help='JSON: {"Joe":"Arlo","Jane":{"voice":"Kore","style":"tired"}} or @file; text lines "Joe: ..." / "Joe (whispering): ..."')
    s.add_argument("--lang", help="language code, e.g. es, es-ES, de, ar (the model detects it when omitted)")
    s.add_argument("--model", default=TTS_DEFAULT, help=f"default {TTS_DEFAULT}; also gemini-3.8-flash-lite-tts, gemini-3.1-flash-tts-preview")
    s.add_argument("--out", required=True, help="output .wav (24 kHz mono 16-bit)")
    s.add_argument("--mp3", action="store_true", help="also write <out>.mp3 at -16 LUFS, 128 kbps")
    s.add_argument("--lufs", type=float, default=-16.0)
    s.add_argument("--tags", choices=["angle", "keep", "strip"], default="angle", help="[square]→<angle> (default), leave alone, or remove")
    s.add_argument("--chunk-chars", type=int, default=3000, help="max characters per request (default 3000 ≈ 3.5 min of speech)")
    s.add_argument("--pause", type=float, default=0.25, help="seconds of silence between joined chunks (default 0.25)")
    s.add_argument("--parallel", type=int, default=1, help="requests in flight for long texts (default 1)")
    s.add_argument("--temperature", type=float, default=None)
    s.set_defaults(fn=cmd_tts)

    s = sp.add_parser("music", help="music with Lyria: lyria-3.5 (songs, ≥60 s) or the 30 s clip model")
    s.add_argument("--prompt", required=True, help="genre, instruments, mood, tempo; optional [0:00 - 0:10] Intro: … lines or [Verse] tags")
    s.add_argument("--seconds", type=int, help="target length: ≤30 picks the clip model; longer is requested in the prompt; the result is cut to it (with a fade)")
    s.add_argument("--instrumental", action="store_true", help="add 'Instrumental only, no vocals.'")
    s.add_argument("--model", help=f"default {MUSIC_DEFAULT} (or {MUSIC_CLIP} when --seconds ≤ 30); also lyria-3-pro-preview")
    s.add_argument("--wav", action="store_true", help="48 kHz stereo WAV instead of MP3 (also when --out ends .wav)")
    s.add_argument("--no-trim", action="store_true", help="keep the full generated length even with --seconds")
    s.add_argument("--out", required=True)
    s.set_defaults(fn=cmd_music)

    s = sp.add_parser("voices", help="the voice library (2,000+ voices, 40 languages), filtered")
    s.add_argument("--language", help="language prefix: es, es-ES, de, ar-EG, en-GB …")
    s.add_argument("--gender", help="male | female | neutral")
    s.add_argument("--pitch", help="low | medium | high")
    s.add_argument("--search", help="text in name, persona, description, accent")
    s.add_argument("--limit", type=int, default=40, help="max voices shown (0 = all)")
    s.add_argument("--refresh", action="store_true", help="re-download the list (cached 7 days)")
    s.set_defaults(fn=cmd_voices)

    sp.add_parser("models", help="audio models on this key with token limits and prices").set_defaults(fn=cmd_models)
    sp.add_parser("usage", help="requests, audio seconds and estimated cost per day counted by this script").set_defaults(fn=cmd_usage)

    a = ap.parse_args()
    try:
        a.fn(a)
    except GeminiError as e:
        die(str(e), **({"rate_limited": True, "retry_after_s": e.retry_after} if e.rate_limited else {}), status=e.status)
    except RuntimeError as e:
        die(str(e))
    except KeyboardInterrupt:
        die("interrupted")


if __name__ == "__main__":
    main()
