"""google_guard.py — one gentle, human-paced user of the owner's Google account across every script and agent.

Used by flow.py and aistudio_tts.py (any new Google script must use it too):

    from google_guard import guard, note_failure
    with guard("image"):        # kinds: image · video · tts · ui (list / download / upload / status: lock only)
        ...                       # the browser work

What it enforces (state in ~/.config/google-flow/guard.json, settings in config.json "guard"):
  LOCK      one Google job at a time across all processes and agents (flock on ~/.config/google-flow/google.lock);
            a second caller waits (up to `wait_min`), then gives up with an error instead of doubling up.
  PACING    a random human pause between generations (`pause_s` = [min, max] seconds since the last one ended).
  DAILY CAP per kind and local day (`cap`: image / video / tts); over the cap the job is refused, never queued.
  BACK-OFF  any "unusual activity" / rate-limit / refusal message sets a cool-down (`cooldown_min`) for ALL Google
            work; until it ends every guarded call fails at once with the minutes left. No automatic retries.
Override in an emergency only with GOOGLE_GUARD_OFF=1 (the owner's call).
"""
from __future__ import annotations

import contextlib
import fcntl
import json
import os
import random
import re
import sys
import time
from pathlib import Path

DIR = Path(os.environ.get("GOOGLE_FLOW_CONFIG", Path.home() / ".config" / "google-flow"))
LOCK = DIR / "google.lock"
STATE = DIR / "guard.json"
CONF = DIR / "config.json"
DEFAULTS = {"pause_s": [20, 60], "cap": {"image": 60, "video": 12, "tts": 80}, "cooldown_min": 120, "wait_min": 30}
WARN = re.compile(r"unusual activity|suspicious|automated|captcha|verify (it'?s|that) you|too many requests|rate.?limit|"
                  r"quota|resource.?exhausted|\b429\b|try again (later|in)|temporarily (blocked|unavailable)|exceeded", re.I)


def _log(*a):
    print("[guard]", *a, file=sys.stderr, flush=True)


def _fail(msg, **extra):
    print(json.dumps({"ok": False, "error": msg, "guard": True, **extra}))
    sys.exit(1)


def _load(p: Path, default):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default


def settings():
    s = json.loads(json.dumps(DEFAULTS))
    user = _load(CONF, {}).get("guard", {})
    for k, v in user.items():
        if isinstance(v, dict) and isinstance(s.get(k), dict):
            s[k].update(v)
        else:
            s[k] = v
    return s


def _state():
    return _load(STATE, {})


def _save(st):
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, indent=2))
    tmp.replace(STATE)


def _today():
    return time.strftime("%Y-%m-%d")


def status():
    """what the guard would say right now (for flow.py status)"""
    s, st = settings(), _state()
    left = max(0, st.get("cooldown_until", 0) - time.time())
    used = st.get("counts", {}).get(_today(), {})
    return {"cooldown_min_left": round(left / 60, 1), "cooldown_reason": st.get("cooldown_reason") if left else None,
            "today": {k: f"{used.get(k, 0)}/{v}" for k, v in s["cap"].items()}}


def note_failure(text: str) -> bool:
    """call with any error / alert text from Google; starts the shared cool-down when it is a warning sign"""
    if not text or not WARN.search(text):
        return False
    s, st = settings(), _state()
    st["cooldown_until"] = time.time() + s["cooldown_min"] * 60
    st["cooldown_reason"] = text[:200]
    _save(st)
    _log(f"Google warning seen → all Google work paused for {s['cooldown_min']} min: {text[:120]!r}")
    return True


@contextlib.contextmanager
def guard(kind: str = "ui"):
    if os.environ.get("GOOGLE_GUARD_OFF") == "1":
        yield
        return
    s = settings()
    DIR.mkdir(parents=True, exist_ok=True)
    fh = open(LOCK, "w")
    t0 = time.time()
    while True:   # the lock: one Google job at a time
        try:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except BlockingIOError:
            if time.time() - t0 > s["wait_min"] * 60:
                _fail(f"another Google job held the lock for over {s['wait_min']} min; not starting a parallel one")
            if int(time.time() - t0) % 60 < 3:
                _log("waiting for the other Google job to finish…")
            time.sleep(3)
    try:
        st = _state()
        left = st.get("cooldown_until", 0) - time.time()
        if left > 0:   # the back-off
            _fail(f"Google work is paused for {left / 60:.0f} more min after a warning: {st.get('cooldown_reason', '')[:120]}",
                  cooldown_min_left=round(left / 60, 1))
        if kind in s["cap"]:   # the daily cap
            used = st.get("counts", {}).get(_today(), {}).get(kind, 0)
            if used >= s["cap"][kind]:
                _fail(f"daily cap reached for {kind}: {used}/{s['cap'][kind]} today (config.json guard.cap)", cap=s["cap"][kind])
            last = st.get("last_end", 0)   # the human pause
            want = random.uniform(*s["pause_s"])
            wait = last + want - time.time()
            if wait > 0:
                _log(f"pausing {wait:.0f} s like a person between jobs")
                time.sleep(wait)
        yield
    finally:
        if kind in s["cap"]:
            st = _state()
            day = st.setdefault("counts", {}).setdefault(_today(), {})
            day[kind] = day.get(kind, 0) + 1
            st["counts"] = {k: v for k, v in st["counts"].items() if k >= time.strftime("%Y-%m-%d", time.localtime(time.time() - 7 * 86400))}
            st["last_end"] = time.time()
            _save(st)
        fcntl.flock(fh, fcntl.LOCK_UN)
        fh.close()
