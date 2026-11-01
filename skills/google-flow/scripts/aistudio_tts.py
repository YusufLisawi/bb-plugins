#!/usr/bin/env python3
"""Google AI Studio speech generation (Gemini TTS) over the PinchTab browser that flow.py uses.

FALLBACK route: the default for speech is the Gemini API (gemini_audio.py: no browser, no account, no pacing). Use this one
only when the API key is unavailable or out of quota and a Pro account's Playground quota is wanted.

Drives the Playground at aistudio.google.com/generate-speech on the same signed-in Google account: pick a voice,
optionally a style instruction, type the text (inline expression tags such as <whispers> or <laugh>), press Run, wait,
and save the WAV the page plays. One generation per call. Each command prints **one JSON object on stdout**; progress
goes to stderr. Python 3.9+, reuses flow.py's PinchTab client (same directory), ffmpeg only for `mp3`.
Never reads, prints or creates an API key or a cookie: the Run button is used as it is, the key buttons are never clicked.

  aistudio_tts.py status
  aistudio_tts.py voices [--language "English (US)"] [--gender all|masculine|feminine|neutral] [--search TEXT]
  aistudio_tts.py speak --voice Arlo --text "..." [--style "..."] [--model "3.8 Flash TTS"] --out DIR/arlo.wav
  aistudio_tts.py mp3 IN.wav OUT.mp3 [--lufs -16]
  aistudio_tts.py analyze FILE.wav
  aistudio_tts.py shot [--out F]
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import accounts as acc  # noqa: E402  (google1..4)
import flow  # noqa: E402  (flow.py's PinchTab client, use_account and helpers)
from flow import PinchTab, load_json  # noqa: E402
from google_guard import guard, note_failure, pick_account  # noqa: E402  (one Google job at a time, human pauses, per-account caps, back-off)
from audio_utils import need_ffmpeg, to_mp3, wav_info  # noqa: E402  (shared with gemini_audio.py)

AS_URL = "https://aistudio.google.com/generate-speech"

def state_file() -> Path:
    return acc.aistudio_state_path(flow.ACCOUNT)


DEFAULT_MODEL = "Gemini 3.8 Flash TTS"
DEFAULT_LANGUAGE = "English (US)"
GENDERS = {"masculine": "Masculine", "feminine": "Feminine", "neutral": "Neutral"}
# Words that mean the account or the model is throttling us; the caller waits and retries instead of spamming Run.
RATE_LIMIT = re.compile(r"quota|rate.?limit|resource.?exhausted|too many requests|\b429\b|try again (later|in)|exceeded", re.I)
CHUNK = 200_000  # characters of data URL per evaluate call


def log(*a):
    print("[aistudio]", *a, file=sys.stderr, flush=True)


def die(msg, **extra):
    """Print the error and stop. Local on purpose: flow.py's die() also feeds every error to the Google cool-down."""
    print(json.dumps({"ok": False, "error": msg, **extra}, ensure_ascii=False))
    sys.exit(1)


def js(pt: PinchTab, body: str, timeout: int = 60):
    """Run a function body in the page and return its JSON-decoded value."""
    r = pt.eval("JSON.stringify((()=>{" + body + "})())", timeout=timeout)
    return json.loads(r) if isinstance(r, str) and r else r


def wait_for(pt: PinchTab, body: str, secs: float = 15, step: float = 0.5) -> bool:
    t0 = time.time()
    while time.time() - t0 < secs:
        if js(pt, body):
            return True
        time.sleep(step)
    return False


# ---- page handling ----------------------------------------------------------------------------
JS_STATE = """
const q=s=>document.querySelector(s);
return {signedIn: !!q('[aria-label^="Google Account"]'),
        editor: !!q('textarea[aria-label="Speech block text"]'),
        examples: [...document.querySelectorAll('.action-card')].some(e=>/Create new dialog/.test(e.innerText||'')),
        chip: (q('.voice-playground-chip')||{}).innerText||'',
        panel: !!q('input[aria-label="Search voices"]'),
        audio: document.querySelectorAll('audio').length};
"""

# Find the first visible element matching `text` (mode: exact | contains | regex) inside `scope` and return its centre
# in viewport CSS pixels. Clicks go by coordinates: a selector click re-scrolls the element and missed the neighbour.
FIND_BODY = """
const want=%(want)s, mode=%(mode)s, scope=%(scope)s;
const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
const hit=[...document.querySelectorAll(scope)].filter(e=>e.getClientRects().length).find(e=>{
  const t=norm(e.innerText||e.textContent);
  return mode==='exact'?t===want:mode==='regex'?new RegExp(want).test(t):t.includes(want);});
if(!hit)return 'missing';
const inView=r=>r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;
if(!inView(hit.getBoundingClientRect())) hit.scrollIntoView({block:'center',behavior:'instant'});
const r=hit.getBoundingClientRect();
return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};
"""


def click_at(pt: PinchTab, x: int, y: int):
    pt.req("POST", "/action", {"kind": "click", "x": x, "y": y, "tabId": pt.tab}, timeout=30)


FIND_CSS_BODY = """
const el=document.querySelector(%(css)s);
if(!el||!el.getClientRects().length) return 'missing';
const inView=r=>r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;
if(!inView(el.getBoundingClientRect())) el.scrollIntoView({block:'center',behavior:'instant'});
const r=el.getBoundingClientRect();
return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};
"""


def click_css(pt: PinchTab, css: str, timeout: float = 15) -> bool:
    """Trusted click at the centre of the first element matching `css` (use for icon-only buttons)."""
    body = FIND_CSS_BODY % {"css": json.dumps(css)}
    t0 = time.time()
    while True:
        at = js(pt, body)
        if isinstance(at, dict):
            click_at(pt, at["x"], at["y"])
            return True
        if time.time() - t0 > timeout:
            return False
        time.sleep(0.4)


def click_text(pt: PinchTab, text: str, scope: str = "button", mode: str = "exact", timeout: float = 15) -> bool:
    """Trusted click on the visible element whose text matches. Returns False when it never shows up."""
    body = FIND_BODY % {"want": json.dumps(text), "mode": json.dumps(mode), "scope": json.dumps(scope)}
    t0 = time.time()
    while True:
        at = js(pt, body)
        if isinstance(at, dict):
            break
        if time.time() - t0 > timeout:
            return False
        time.sleep(0.4)
    click_at(pt, at["x"], at["y"])
    return True


def set_search(pt: PinchTab, text: str):
    """Set the voice search box. `fill` cannot clear it, so an empty value goes through the native setter."""
    if text:
        pt.fill('input[aria-label="Search voices"]', text)
    else:
        js(pt, "const el=document.querySelector('input[aria-label=\"Search voices\"]');if(!el)return false;"
               "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'');"
               "el.dispatchEvent(new Event('input',{bubbles:true}));return true;")
    time.sleep(1.5)


def ensure_page(pt: PinchTab) -> dict:
    """Reuse the AI Studio tab (or open one), make sure the speech editor is showing, and return the page state."""
    pt.ensure_server()
    st = load_json(state_file(), {})
    tabs = pt.tabs()
    ids = {t["id"]: t for t in tabs}
    tab = st.get("tabId") if st.get("tabId") in ids else None
    if not tab:
        tab = next((t["id"] for t in tabs if "aistudio.google.com" in t.get("url", "")), None)
    if not tab:
        log("opening AI Studio")
        r = pt.req("POST", "/navigate", {"url": AS_URL, "newTab": True}, timeout=90)
        tab = r.get("tabId") or r.get("id")
        time.sleep(3)
    pt.tab = tab
    acc.write_json(state_file(), {**st, "tabId": tab})
    if "/generate-speech" not in ids.get(tab, {}).get("url", ""):
        pt.req("POST", "/navigate", {"url": AS_URL, "tabId": tab}, timeout=90)
        time.sleep(3)
    s = ensure_editor(pt)
    if not s.get("signedIn"):
        die(f"AI Studio is not signed in to Google in {flow.ACCOUNT}'s browser: sign in with `flow.py login --account {flow.ACCOUNT}` or "
            f"`flow.py setup --account {flow.ACCOUNT} --cookies export.json`", account=flow.ACCOUNT)
    if s.get("panel"):  # the voice panel covers the Run button
        close_voice_panel(pt)
    return s


def ensure_editor(pt: PinchTab, secs: float = 40) -> dict:
    """Wait for the page to settle, open a new speech dialog from the examples page if that is showing, and return the state."""
    t0 = time.time()
    s = {}
    while time.time() - t0 < secs:
        s = js(pt, JS_STATE)
        if s.get("editor"):
            return s
        if s.get("examples"):
            log("opening a new speech dialog")
            click_text(pt, "Create new dialog", scope=".action-card", mode="contains")
        if time.time() - t0 > 12 and not s.get("signedIn"):   # a signed-out browser never gets an editor: say so now, not after 40 s
            die(f"AI Studio is not signed in to Google in {flow.ACCOUNT}'s browser: sign in with `flow.py login --account {flow.ACCOUNT}` or "
                f"`flow.py setup --account {flow.ACCOUNT} --cookies export.json`", account=flow.ACCOUNT)
        time.sleep(1.5)
    die("the speech editor did not appear; run `aistudio_tts.py shot` and check the page", signed_in=s.get("signedIn"))


def open_voice_panel(pt: PinchTab):
    if js(pt, JS_STATE)["panel"]:
        return
    if js(pt, "return !!document.querySelector('.active-voice-card-trigger');"):
        pt.click(".active-voice-card-trigger")
    else:
        pt.click(".voice-playground-chip")
    if not wait_for(pt, "return !!document.querySelector('input[aria-label=\"Search voices\"]');", secs=10):
        die("the voice panel did not open")


def close_voice_panel(pt: PinchTab):
    try:
        pt.click('button[aria-label="Close panel"]')
    except RuntimeError:
        pt.req("POST", "/action", {"kind": "press", "key": "Escape", "tabId": pt.tab}, timeout=30)
    time.sleep(0.8)


def parse_cards(text: str) -> list[dict]:
    """Voice cards from the panel's visible text: name, [Current], description (with ' · pitch'), 'favorite', 'play_arrow'."""
    lines = [l.strip() for l in text.splitlines()]
    cards = []
    for i, line in enumerate(lines):
        if line != "favorite":
            continue
        j = i - 1
        while j >= 0 and not lines[j]:
            j -= 1
        desc = lines[j] if j >= 0 else ""
        k = j - 1
        while k >= 0 and (not lines[k] or lines[k] == "Current"):
            k -= 1
        if k < 0 or "·" not in desc:
            continue
        cards.append({"name": lines[k], "description": desc, "pitch": desc.split("·", 1)[1].strip()})
    return cards


def list_visible_voices(pt: PinchTab) -> list[dict]:
    time.sleep(1.2)
    return parse_cards(js(pt, "return document.body.innerText;") or "")


def set_filter(pt: PinchTab, current_pattern: str, option: str):
    """Open the filter whose visible label matches `current_pattern` and choose `option`."""
    if not click_text(pt, current_pattern, scope="button", mode="regex"):
        die(f"filter {current_pattern!r} not found in the voice panel")
    time.sleep(0.6)
    if not click_text(pt, "^" + re.escape(option) + r"(?=\s|$)", scope="[role=menuitem]", mode="regex"):
        pt.req("POST", "/action", {"kind": "press", "key": "Escape", "tabId": pt.tab}, timeout=30)
        die(f"filter option {option!r} not offered", offered=js(pt, "return [...document.querySelectorAll('[role=menuitem]')].map(e=>e.innerText.trim());"))
    time.sleep(1.2)


LANGUAGE_TRIGGER = r"^(Language|All languages|English \(US\)|French|German|Italian|Korean|Spanish|Japanese|Hindi|Portuguese|Chinese)(?=\s|$)"
GENDER_TRIGGER = r"^(Gender|All genders|Masculine|Feminine|Neutral)(?=\s|$)"


def cmd_voices(a):
    pt = PinchTab()
    voices: dict[str, dict] = {}
    with guard("ui"):
        ensure_page(pt)
        open_voice_panel(pt)
        set_filter(pt, LANGUAGE_TRIGGER, a.language)
        set_search(pt, a.search or "")  # always: an old search would hide the list
        picks = list(GENDERS) if a.gender == "all" else [a.gender]
        for g in picks:
            set_filter(pt, GENDER_TRIGGER, GENDERS[g])
            for card in list_visible_voices(pt):
                v = voices.setdefault(card["name"], {"name": card["name"], "description": card["description"],
                                                     "pitch": card["pitch"], "gender": None})
                v["gender"] = GENDERS[g]
        set_filter(pt, GENDER_TRIGGER, "All genders")  # leave the panel unfiltered for the next speak
        close_voice_panel(pt)
    out = {"ok": True, "language": a.language, "count": len(voices), "voices": list(voices.values())}
    if a.json_out:
        Path(a.json_out).write_text(json.dumps(out["voices"], indent=2, ensure_ascii=False))
        out["json_out"] = a.json_out
    print(json.dumps(out, ensure_ascii=False))


def chip_has(pt: PinchTab, name: str) -> bool:
    chip = js(pt, "const c=document.querySelector('.voice-playground-chip');return c?c.innerText:'';") or ""
    return re.search(r"-\s*" + re.escape(name) + r"\b", chip) is not None


# A voice card is one button whose text reads "Name Description · Pitch"; the card click is what selects the voice.
FIND_ROW_BODY = """
const want=%(want)s;
const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
const card=[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).find(e=>{
  const t=norm(e.innerText); return t===want || (t.startsWith(want+' ') && t.includes('·'));});
if(!card)return 'missing';
const inView=r=>r.top>=0&&r.bottom<=innerHeight;
if(!inView(card.getBoundingClientRect())) card.scrollIntoView({block:'center',behavior:'instant'});
const r=card.getBoundingClientRect();
return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};
"""


def select_voice(pt: PinchTab, name: str):
    if chip_has(pt, name):
        return
    for attempt in range(2):
        open_voice_panel(pt)
        set_search(pt, name)
        at = js(pt, FIND_ROW_BODY % {"want": json.dumps(name)})
        if isinstance(at, dict):
            click_at(pt, at["x"], at["y"])
            time.sleep(1.0)
            close_voice_panel(pt)
            if chip_has(pt, name):
                return
        else:
            close_voice_panel(pt)
            if attempt == 0:  # the language / gender filters may hide the voice: clear them and search again
                open_voice_panel(pt)
                set_filter(pt, LANGUAGE_TRIGGER, "All languages")
                set_filter(pt, GENDER_TRIGGER, "All genders")
                close_voice_panel(pt)
                continue
            die(f"voice {name!r} is not in the voice list")
    die(f"voice {name!r} did not become the speaker (the row click did not select it)")


def set_style(pt: PinchTab, style: str):
    if not click_text(pt, "Style", scope="button[aria-label='Style']", mode="contains"):
        die("the Style control is not on the page")
    time.sleep(0.8)
    pt.fill('[aria-label="Describe the voice style"]', style)
    time.sleep(0.3)
    pt.req("POST", "/action", {"kind": "press", "key": "Enter", "tabId": pt.tab}, timeout=30)
    time.sleep(0.5)
    pt.req("POST", "/action", {"kind": "press", "key": "Escape", "tabId": pt.tab}, timeout=30)
    time.sleep(0.5)


def select_model(pt: PinchTab, model: str):
    current = js(pt, "return [...document.querySelectorAll('button')].map(b=>b.innerText||'').find(t=>/TTS/.test(t))||'';") or ""
    if model.lower() in current.lower():
        return
    if not click_text(pt, "TTS", scope="button", mode="contains"):
        die("the model card is not on the page (open the Run settings panel)")
    time.sleep(1)
    if not click_text(pt, model, scope="[role=option],[role=menuitem],mat-option,button", mode="contains"):
        die(f"model {model!r} is not offered", offered=js(pt, "return [...document.querySelectorAll('[role=option],[role=menuitem],mat-option')].map(e=>e.innerText.trim());"))
    time.sleep(1)


def set_text(pt: PinchTab, text: str):
    pt.fill('textarea[aria-label="Speech block text"]', text)
    time.sleep(0.5)
    if js(pt, "return document.querySelector('textarea[aria-label=\"Speech block text\"]').value;") != text:
        die("the text did not reach the speech block")


def new_chat_if_used(pt: PinchTab):
    """Clear earlier outputs so each download is the only audio on the page (and the page stays light)."""
    if not js(pt, JS_STATE)["audio"]:
        return
    if not click_css(pt, 'button[aria-label="New chat"]'):
        die("the New chat button is not on the page")
    time.sleep(2)
    s = ensure_editor(pt)
    if s.get("audio"):
        die("New chat did not clear the earlier output")


WAIT_BODY = """
const a=[...document.querySelectorAll('audio')], last=a[a.length-1];
const alerts=[...document.querySelectorAll('[role=alert],.mat-mdc-snack-bar-container')].map(e=>e.innerText||'').join(' | ');
const tail=((document.querySelector('main')||document.body).innerText||'').slice(-700);
return {n:a.length, src: last?(last.currentSrc||last.src||''):'', len: last?(last.src||'').length:0,
        dur: last&&isFinite(last.duration)?last.duration:0, rs: last?last.readyState:0, alerts, tail};
"""


def run_and_wait(pt: PinchTab, timeout: int) -> dict:
    """Press Run (trusted click) and wait until the page's audio is the finished take.

    The player first gets a short partial data URL and then the whole take, so a take counts only when its source
    has changed, it has a real duration, and both stay the same across two polls.
    """
    before = js(pt, WAIT_BODY)
    pt.click('xpath://button[starts-with(normalize-space(.), "Run")]')
    t0 = time.time()
    prev, stable, s = None, 0, {}
    while time.time() - t0 < timeout:
        s = js(pt, WAIT_BODY)
        changed = s["src"] != before["src"] or s["n"] != before["n"]
        if changed and s["src"].startswith("data:") and s["rs"] >= 1 and s["dur"] >= 0.5:
            key = (s["len"], round(s["dur"], 2))
            stable = stable + 1 if key == prev else 0
            prev = key
            if stable >= 2:
                return {"ok": True, "seconds": round(time.time() - t0, 1), "duration": s["dur"]}
        else:
            prev, stable = None, 0
        blob = f"{s['alerts']} {s['tail']}"
        if RATE_LIMIT.search(blob) and time.time() - t0 > 4:
            return {"ok": False, "rate_limited": True, "message": (s["alerts"] or s["tail"])[-300:]}
        time.sleep(1.5)
    return {"ok": False, "error": f"no finished audio after {timeout} s", "message": (s.get("alerts") or s.get("tail") or "")[-300:]}


def save_audio(pt: PinchTab, out: Path) -> dict:
    """Copy the page's audio data URL into a file, in chunks, and free it in the page afterwards."""
    n = js(pt, "const a=[...document.querySelectorAll('audio')];window.__aitts=a[a.length-1].src;return window.__aitts.length;")
    parts = []
    for off in range(0, n, CHUNK):
        parts.append(pt.eval(f"window.__aitts.slice({off},{off + CHUNK})", timeout=120))
    js(pt, "window.__aitts=null;return true;")
    data = "".join(parts)
    m = re.match(r"^data:([^;,]+);base64,(.*)$", data, re.S)
    if not m:
        die("the audio on the page is not a base64 data URL", head=data[:40])
    raw = base64.b64decode(m.group(2))
    mime = m.group(1)
    if raw[:4] != b"RIFF":  # the page sent something other than WAV: keep the bytes under the right extension
        out = out.with_suffix({"audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/ogg": ".ogg"}.get(mime, ".bin"))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(raw)
    return {"out": str(out), "mime": mime, "bytes": len(raw), **wav_info(out)}


def cmd_speak(a):
    """One take. No retries: a rate-limit, quota or unusual-activity message starts the shared cool-down and stops."""
    pt = PinchTab()
    t0 = time.time()
    out_path = Path(a.out).expanduser().resolve()
    with guard("tts"):
        ensure_page(pt)
        new_chat_if_used(pt)
        if a.model:
            select_model(pt, a.model)
        select_voice(pt, a.voice)
        if a.style is not None:
            set_style(pt, a.style)
        set_text(pt, a.text)
        log(f"running: voice={a.voice}" + (f" style={a.style!r}" if a.style else ""))
        r = run_and_wait(pt, a.timeout)
        if not r.get("ok"):
            if r.get("rate_limited"):  # only a real rate-limit / warning text starts the shared cool-down
                note_failure(r.get("message") or "")
            die(r.get("error") or "generation did not finish", message=r.get("message"), voice=a.voice,
                **({"rate_limited": True} if r.get("rate_limited") else {}))
        saved = save_audio(pt, out_path)
    if a.mp3:
        need_ffmpeg()
        mp3 = out_path.with_suffix(".mp3")
        to_mp3(out_path, mp3, -16)
        saved["mp3"] = str(mp3)
    print(json.dumps({"ok": True, "account": flow.ACCOUNT, "voice": a.voice, "model": a.model or DEFAULT_MODEL, "style": a.style,
                      "text": a.text, "seconds": round(time.time() - t0, 1),
                      "generate_seconds": r.get("seconds"), **saved}, ensure_ascii=False))


# ---- audio helpers (need_ffmpeg, ebur, to_mp3, wav_info live in audio_utils.py) ---------------------
def cmd_mp3(a):
    src, dst = Path(a.src).expanduser(), Path(a.dst).expanduser()
    reached = to_mp3(src, dst, a.lufs)
    print(json.dumps({"ok": True, "out": str(dst), "bytes": dst.stat().st_size, "lufs_target": a.lufs,
                      "lufs_reached": reached}))


def cmd_analyze(a):
    """Loudness, loudness range, peak and pauses (ffmpeg only). Pitch needs the numpy audit tool."""
    need_ffmpeg()
    p = Path(a.file).expanduser()
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af",
                          "ebur128=peak=true,silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    ints = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    lra = re.findall(r"LRA:\s+(-?[\d.]+) LU", err)
    peak = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", err)
    sil = re.findall(r"silence_(start|end): ([\d.]+)", err)
    starts = [float(x) for k, x in sil if k == "start"]
    ends = [float(x) for k, x in sil if k == "end"]
    pauses = [round(e - s, 2) for s, e in zip(starts, ends)]
    info = wav_info(p) if p.suffix.lower() == ".wav" else {}
    print(json.dumps({"ok": True, "file": str(p), "integrated_lufs": float(ints[-1]) if ints else None,
                      "loudness_range_lu": float(lra[-1]) if lra else None,
                      "true_peak_dbfs": float(peak[-1]) if peak else None,
                      "pauses_over_180ms": len(pauses), "longest_pause_s": max(pauses) if pauses else 0.0,
                      "pause_total_s": round(sum(pauses), 2), **info}))


FIND_PLAY_BODY = """
const want=%(want)s;
const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
const card=[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).find(e=>{
  const t=norm(e.innerText); return t.startsWith(want+' ') && t.includes('·');});
if(!card) return 'missing';
let play=null;
for(let r=card.parentElement,i=0;r&&i<4&&!play;r=r.parentElement,i++){ play=r.querySelector('button[aria-label="Play voice sample"]'); }
if(!play) return 'no-play';
const inView=r=>r.top>=0&&r.bottom<=innerHeight;
if(!inView(play.getBoundingClientRect())) play.scrollIntoView({block:'center',behavior:'instant'});
const b=play.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)};
"""


def cmd_preview(a):
    """Grab a voice's own sample from the voice panel (Google's preview, not a generation): no Run, no tts quota."""
    pt = PinchTab()
    out_path = Path(a.out).expanduser().resolve()
    with guard("ui"):
        ensure_page(pt)
        open_voice_panel(pt)
        set_search(pt, a.voice)
        at = js(pt, FIND_PLAY_BODY % {"want": json.dumps(a.voice)})
        if not isinstance(at, dict):
            die(f"no preview for {a.voice!r} in the voice list ({at})")
        before = js(pt, WAIT_BODY)["src"]
        click_at(pt, at["x"], at["y"])
        t0, prev, stable, s = time.time(), None, 0, {}
        while time.time() - t0 < a.timeout:
            s = js(pt, WAIT_BODY)
            if s["src"] and s["src"] != before and s["src"].startswith("data:") and s["dur"] >= 0.5:
                key = (s["len"], round(s["dur"], 2))
                stable = stable + 1 if key == prev else 0
                prev = key
                if stable >= 1:
                    break
            time.sleep(1)
        else:
            die(f"no preview audio for {a.voice!r} after {a.timeout} s", message=(s.get("alerts") or s.get("tail") or "")[-200:])
        saved = save_audio(pt, out_path)
        close_voice_panel(pt)
    print(json.dumps({"ok": True, "voice": a.voice, "source": "voice panel sample", **saved}, ensure_ascii=False))


def cmd_status(a):
    pt = PinchTab()
    with guard("ui"):
        s = ensure_page(pt)
    print(json.dumps({"ok": True, "account": flow.ACCOUNT, "signed_in": s.get("signedIn"), "model": DEFAULT_MODEL, "speaker": s.get("chip", "").split("\n")[0]}))


def cmd_shot(a):
    pt = PinchTab()
    with guard("ui"):
        ensure_page(pt)
        p = a.out or "/tmp/aistudio_shot.jpg"
        pt.screenshot(p)
    print(json.dumps({"ok": True, "path": p}))


def main():
    ap = argparse.ArgumentParser(prog="aistudio_tts.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--account", help="google1 | google2 | google3 | google4 | auto | shared (default: auto for speak = the signed-in "
                                          "account with the most room today; other commands use the account used last)")
    sp = ap.add_subparsers(dest="cmd", required=True)
    _add = sp.add_parser
    sp.add_parser = lambda *x, **k: _add(*x, parents=[common], **k)

    sp.add_parser("status", help="signed in? default model").set_defaults(fn=cmd_status)

    s = sp.add_parser("voices", help="list the voices for a language and gender (default English (US), all genders)")
    s.add_argument("--language", default=DEFAULT_LANGUAGE)
    s.add_argument("--gender", default="all", choices=["all", "masculine", "feminine", "neutral"])
    s.add_argument("--search", default=None, help="filter by name in the voice search box")
    s.add_argument("--json-out", help="also write the list to this file")
    s.set_defaults(fn=cmd_voices)

    s = sp.add_parser("speak", help="generate one take and save it (WAV from the page; --mp3 also writes -16 LUFS mp3)")
    s.add_argument("--voice", required=True, help="voice name as shown in the voice list, e.g. Arlo or Kore")
    s.add_argument("--text", required=True, help="the text; inline tags like <whispers>, <gasp>, <laugh>, <sigh>")
    s.add_argument("--style", default=None, help="style instruction, e.g. 'Narration, dramatic pauses'")
    s.add_argument("--model", default=None, help=f"model name fragment (default {DEFAULT_MODEL!r})")
    s.add_argument("--out", required=True, help="output .wav path")
    s.add_argument("--mp3", action="store_true", help="also write <out>.mp3 at -16 LUFS, 128 kbps")
    s.add_argument("--timeout", type=int, default=150, help="seconds to wait for the audio")
    s.set_defaults(fn=cmd_speak)

    s = sp.add_parser("preview", help="save a voice's own sample from the voice panel (no generation)")
    s.add_argument("--voice", required=True)
    s.add_argument("--out", required=True, help="output .wav path")
    s.add_argument("--timeout", type=int, default=30, help="seconds to wait for the sample")
    s.set_defaults(fn=cmd_preview)

    s = sp.add_parser("mp3", help="normalise a WAV/any audio to LUFS and encode MP3")
    s.add_argument("src")
    s.add_argument("dst")
    s.add_argument("--lufs", type=float, default=-16.0)
    s.set_defaults(fn=cmd_mp3)

    s = sp.add_parser("analyze", help="loudness, loudness range, peak and pauses of a file (ffmpeg)")
    s.add_argument("file")
    s.set_defaults(fn=cmd_analyze)

    s = sp.add_parser("shot", help="screenshot the AI Studio tab (debugging)")
    s.add_argument("--out")
    s.set_defaults(fn=cmd_shot)

    a = ap.parse_args()
    try:
        if a.cmd in ("mp3", "analyze"):   # local audio work: no browser, no account
            a.fn(a)
            return
        name = a.account or ("auto" if a.cmd == "speak" else (acc.last_account() or "google1"))
        if name == "auto":
            name = pick_account("tts") if a.cmd == "speak" else (acc.last_account() or "google1")
        try:
            flow.use_account(name)
        except ValueError as e:
            die(str(e))
        if a.cmd == "speak":
            acc.remember(name)
        a.fn(a)
    except RuntimeError as e:
        die(str(e))


if __name__ == "__main__":
    main()
