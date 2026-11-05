"""google_guard.py — one gentle, human-paced user of the owner's Google accounts across every script and agent.

Used by flow.py and aistudio_tts.py (any new Google script must use it too):

    from google_guard import guard, note_failure, use, pick_account
    use("google2")                     # the account this process works on (flow.py / aistudio_tts.py do it for you)
    with guard("image"):               # kinds: image · video · tts · ui (list / download / upload / status: lock only)
        ...                              # the browser work

What it enforces (state in ~/.config/google-flow/guard.json, settings in config.json "guard"):
  LOCK      ONE Google job at a time across all processes, agents AND accounts (flock on google.lock); a second caller
            waits (up to `wait_min`), then gives up with an error instead of doubling up.
  PACING    a random human pause between generations (`pause_s` = [min, max] seconds since the last one ended), also
            across accounts: switching account does not make the next job come sooner.
  DAILY CAP per ACCOUNT, kind and local day (`cap`: image / video / tts); over the cap the job is refused, never queued.
  BACK-OFF  an "unusual activity" / rate-limit / refusal message sets a cool-down (`cooldown_min`) for THAT account only;
            until it ends every guarded call for it fails at once with the minutes left. The other accounts keep working.
            No automatic retries anywhere.
  POOL      `--account auto` for image / video jobs (pick_account): stay on one account for a BATCH (16 image jobs, 8 video
            jobs; `batch`), then move to the next signed-in account (google1 → google2 → google4 → …, circular). A
            `last_resort` account (default google3 = yusufisawi@gmail.com, the owner's main account) is never the starting
            account and is used only when every other account is unavailable. Images and
            videos keep separate positions. The day's STARTING account rotates daily (`pool_anchor` day = google1, the next
            day google2, …, over the signed-in accounts). An account in a cool-down, signed out, without a Flow project / credits
            or over its daily cap is skipped (the batch moves on). Other kinds (speech fallback): the signed-in account with
            the most room today, ties least recently used.
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import accounts  # noqa: E402

DIR = accounts.DIR
LOCK = DIR / "google.lock"
STATE = DIR / "guard.json"
CONF = DIR / "config.json"
DEFAULTS = {"pause_s": [20, 60], "cap": {"image": 60, "video": 12, "tts": 80}, "cooldown_min": 120, "wait_min": 30,
            "batch": {"image": 16, "video": 8}, "pool_anchor": "2026-11-01",
            # never START on these (the owner's main account, yusufisawi@gmail.com): used only when every other account is
            # unavailable, and never as the day's starting account. Override in config.json "guard.last_resort".
            "last_resort": ["google3"]}
POOLED = ("image", "video")
WARN = re.compile(r"unusual activity|suspicious|automated|captcha|verify (it'?s|that) you|too many requests|rate.?limit|"
                  r"quota|resource.?exhausted|\b429\b|try again (later|in)|temporarily (blocked|unavailable)|exceeded", re.I)
CURRENT: str | None = None   # the account this process works on


def use(account: str | None):
    global CURRENT
    CURRENT = account


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


def _save(st):
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, indent=2))
    tmp.replace(STATE)


def _state():
    """guard.json v2: {last_end, accounts: {name: {counts, cooldown_until, cooldown_reason}}}. The single-account v1 file
    (top-level counts / cooldown) belonged to the one account there was, google1: it moves there, rest of a cool-down included."""
    st = _load(STATE, {})
    if "counts" in st or "cooldown_until" in st or "cooldown_reason" in st:
        a = st.setdefault("accounts", {}).setdefault("google1", {})
        for k in ("counts", "cooldown_until", "cooldown_reason"):
            if k in st:
                a.setdefault(k, st.pop(k))
        _save(st)
    return st


def _acct(st, name):
    return st.setdefault("accounts", {}).setdefault(name, {})


def _today():
    return time.strftime("%Y-%m-%d")


def _one(st, s, name):
    a = st.get("accounts", {}).get(name, {})
    left = max(0, a.get("cooldown_until", 0) - time.time())
    used = a.get("counts", {}).get(_today(), {})
    return {"cooldown_min_left": round(left / 60, 1), "cooldown_reason": a.get("cooldown_reason") if left else None,
            "today": {k: f"{used.get(k, 0)}/{v}" for k, v in s["cap"].items()}}


def status(account: str | None = None):
    """what the guard would say right now: one account's block, or every account's (flow.py status / accounts)"""
    s, st = settings(), _state()
    if account:
        return _one(st, s, account)
    return {n: _one(st, s, n) for n in accounts.NAMES}


def note_failure(text: str, account: str | None = None) -> bool:
    """call with any error / alert text from Google; starts the cool-down of THAT account when it is a warning sign
    (no account known: every account rests)"""
    if not text or not WARN.search(text):
        return False
    s, st = settings(), _state()
    names = [account or CURRENT] if (account or CURRENT) else list(accounts.NAMES)
    for n in names:
        a = _acct(st, n)
        a["cooldown_until"] = time.time() + s["cooldown_min"] * 60
        a["cooldown_reason"] = text[:200]
    _save(st)
    _log(f"Google warning seen → {', '.join(names)} paused for {s['cooldown_min']} min: {text[:120]!r}")
    return True


def _ineligible(n, kind, st, s, need_project):
    """why account `n` cannot take a `kind` job right now (None = it can)"""
    cs, a = accounts.state(n), st.get("accounts", {}).get(n, {})
    if cs.get("signed_in") is not True:
        return "not signed in (flow.py login --account %s)" % n
    if need_project and not accounts.cfg(n).get("project_url"):
        return "no Flow project (flow.py new-project --save --account %s)" % n
    left = a.get("cooldown_until", 0) - time.time()
    if left > 0:
        return f"cool-down, {left / 60:.0f} min left"
    if kind in ("image", "video") and cs.get("credits") is not None and cs["credits"] <= 0:
        return "no Flow credits left"
    cap = s["cap"].get(kind)
    used = a.get("counts", {}).get(_today(), {}).get(kind, 0)
    if cap is not None and used >= cap:
        return f"daily cap {used}/{cap}"
    return None


def _start_account(signed, s):
    """the day's starting account: the signed-in accounts in order, one step further each day from `pool_anchor`;
    a `last_resort` account is never the starting one (unless it is the only one signed in)"""
    import datetime
    days = (datetime.date.fromisoformat(_today()) - datetime.date.fromisoformat(s["pool_anchor"])).days
    first = [n for n in signed if n not in s.get("last_resort", [])] or signed
    return first[days % len(first)]


def _order(names, s):
    """account order with every `last_resort` account moved to the end"""
    lr = s.get("last_resort", [])
    return [n for n in names if n not in lr] + [n for n in names if n in lr]


def _pool_plan(kind, st, s, need_project):
    """Where the next `kind` job goes under the batch rotation: (account | None, new pool position, skipped reasons).
    Pure: nothing is saved here."""
    names = list(accounts.NAMES)
    lr = s.get("last_resort", [])
    signed = [n for n in names if accounts.state(n).get("signed_in") is True]
    batch = max(1, int(s["batch"].get(kind, 1)))
    pool = dict(st.get("pool", {}).get(kind) or {})
    if pool.get("day") != _today() or pool.get("account") not in names:   # a new day: back to the day's starting account
        pool = {"day": _today(), "account": _start_account(signed, s) if signed else _order(names, s)[0], "used": 0}
    primary = [n for n in names if n not in lr]
    if pool["account"] in lr and primary:   # back on a regular account as soon as one can take the job
        pool = {"day": _today(), "account": primary[0], "used": 0}
    if pool["account"] in primary:
        i = primary.index(pool["account"])
        ring = primary[i:] + primary[:i] + [n for n in names if n in lr]   # last-resort accounts only after every other one
    else:
        ring = _order(names, s)
    skipped, full = {}, None
    for n in ring:
        why = _ineligible(n, kind, st, s, need_project)
        if why:
            skipped[n] = why
        elif n == pool["account"] and pool["used"] < batch:
            return n, pool, skipped                                    # still inside its batch
        elif n == pool["account"]:
            full = n                                                    # batch done: move on to the next eligible one
        else:
            return n, {"day": _today(), "account": n, "used": 0}, skipped   # next batch starts here
    if full:   # nobody else can take over: a new batch on the same account
        return full, {"day": _today(), "account": full, "used": 0}, skipped
    return None, pool, skipped


def pool_status(kind, need_project=True):
    """what `--account auto` would do next for `kind` (flow.py accounts shows it); changes nothing"""
    s, st = settings(), _state()
    n, pool, skipped = _pool_plan(kind, st, s, need_project)
    batch = max(1, int(s["batch"].get(kind, 1)))
    return {"next": n, "on": pool["account"], "used_in_batch": pool["used"], "batch": batch,
            "left_in_batch": max(0, batch - pool["used"]) if n == pool["account"] else batch, "skipped": skipped or None}


def pick_account(kind: str, need_project: bool = False) -> str:
    """`--account auto`. image / video: the batch rotation (see POOL above). Other kinds: the signed-in account with the
    most room left today and no cool-down; ties → least recently used."""
    s, st = settings(), _state()
    if kind in POOLED:
        n, pool, skipped = _pool_plan(kind, st, s, need_project)
        if not n:
            _fail(f"no Google account is available for {kind}: " + "; ".join(f"{k}: {why}" for k, why in skipped.items()), skipped=skipped)
        st.setdefault("pool", {})[kind] = pool
        _save(st)
        _log(f"auto → {n} ({pool['used']}/{s['batch'].get(kind)} {kind} jobs in its batch)" + (f"; skipped {skipped}" if skipped else ""))
        return n
    rows, skipped = [], {}
    for n in accounts.NAMES:
        why = _ineligible(n, kind, st, s, need_project)
        if why:
            skipped[n] = why
            continue
        cap = s["cap"].get(kind)
        used = st.get("accounts", {}).get(n, {}).get("counts", {}).get(_today(), {}).get(kind, 0)
        rows.append(((cap - used) if cap is not None else 10 ** 6, accounts.state(n).get("last_used", 0), n))
    if not rows:
        _fail(f"no Google account is available for {kind}: " + "; ".join(f"{n}: {why}" for n, why in skipped.items()), skipped=skipped)
    lr = s.get("last_resort", [])
    rows.sort(key=lambda r: (r[2] in lr, -r[0], r[1]))   # a last-resort account only when no other one can
    _log(f"auto → {rows[0][2]} ({rows[0][0]} {kind} left today)" + (f"; skipped {skipped}" if skipped else ""))
    return rows[0][2]


@contextlib.contextmanager
def guard(kind: str = "ui", account: str | None = None):
    if os.environ.get("GOOGLE_GUARD_OFF") == "1":
        yield
        return
    account = account or CURRENT
    s = settings()
    DIR.mkdir(parents=True, exist_ok=True)
    fh = open(LOCK, "w")
    t0 = time.time()
    while True:   # the lock: one Google job at a time, whatever the account
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
        a = st.get("accounts", {}).get(account, {}) if account else {}
        left = a.get("cooldown_until", 0) - time.time()
        if left > 0:   # the back-off, for this account only
            _fail(f"{account} is paused for {left / 60:.0f} more min after a warning: {a.get('cooldown_reason', '')[:120]}",
                  cooldown_min_left=round(left / 60, 1), account=account)
        if kind in s["cap"]:   # the daily cap, per account
            used = a.get("counts", {}).get(_today(), {}).get(kind, 0)
            if used >= s["cap"][kind]:
                _fail(f"daily cap reached for {kind} on {account or 'this account'}: {used}/{s['cap'][kind]} today (config.json guard.cap)",
                      cap=s["cap"][kind], account=account)
            last = st.get("last_end", 0)   # the human pause (global: also between accounts)
            want = random.uniform(*s["pause_s"])
            wait = last + want - time.time()
            if wait > 0:
                _log(f"pausing {wait:.0f} s like a person between jobs")
                time.sleep(wait)
        yield
    finally:
        if kind in s["cap"]:
            st = _state()
            if account:
                day = _acct(st, account).setdefault("counts", {}).setdefault(_today(), {})
                day[kind] = day.get(kind, 0) + 1
                keep = time.strftime("%Y-%m-%d", time.localtime(time.time() - 7 * 86400))
                _acct(st, account)["counts"] = {k: v for k, v in _acct(st, account)["counts"].items() if k >= keep}
            pool = st.get("pool", {}).get(kind)
            if kind in POOLED and account and pool and pool.get("account") == account and pool.get("day") == _today():
                pool["used"] = pool.get("used", 0) + 1   # one more job in this account's batch
            st["last_end"] = time.time()
            _save(st)
        fcntl.flock(fh, fcntl.LOCK_UN)
        fh.close()
