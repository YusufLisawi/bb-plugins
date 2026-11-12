#!/usr/bin/env python3
"""Google Flow (flow.google.com) automation over PinchTab.

One command per job; stdout is a single JSON object, progress goes to stderr.
Python 3.9+, standard library only. Run `flow.py -h` or `flow.py <cmd> -h`.
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import accounts as acc  # noqa: E402  (google1..4: files and one PinchTab browser each)
import google_guard as gg  # noqa: E402  (one lock, per-account counters and cool-downs)
from google_guard import guard, status as guard_status  # noqa: E402

PAGE_JS = (HERE / "flow_page.js").read_text()
CONF_DIR = acc.DIR
CONF_FILE = CONF_DIR / "config.json"
ACCOUNT = None  # the account this process works on: google1..google4, or "shared" (the old shared-PinchTab default profile)
STATE_FILE = CONF_DIR / "state.json"      # per account: set by use_account()
COOKIE_FILE = CONF_DIR / "cookies.json"   # private (0600) copy, kept fresh from the live browser; per account
PT_CONF = Path(os.environ.get("PINCHTAB_CONFIG", Path.home() / ".pinchtab" / "config.json"))  # the SHARED server (account "shared")
FLOW_HOME = "https://flow.google.com/"
NEED_DOMAINS = ["flow.google.com", "*.flow.google.com", "google.com", "*.google.com", "labs.google", "*.labs.google",
                "*.gstatic.com", "*.googleusercontent.com", "*.googleapis.com"]

DEFAULTS = {
    "project_url": None,
    "out_dir": str(Path.cwd()),
    "video": {"model": "Omni 1.1 Flash", "aspect": "16:9", "res": "720p", "secs": "4s", "count": "x1"},
    "image": {"model": "Nano Banana 2.1", "aspect": "16:9", "count": "x1"},
    "timeout_min": 20,
}

MODEL_ALIASES = {
    "omni": "Omni 1.1 Flash", "omni-flash": "Omni 1.1 Flash", "omni1.1": "Omni 1.1 Flash",
    "veo-lite": "Veo 3.1 - Lite", "lite": "Veo 3.1 - Lite",
    "veo-fast": "Veo 3.1 - Fast", "fast": "Veo 3.1 - Fast",
    "veo-quality": "Veo 3.1 - Quality", "quality": "Veo 3.1 - Quality", "veo": "Veo 3.1 - Quality",
    "nano": "Nano Banana 2.1", "nano-banana": "Nano Banana 2.1",
}
QUALITY_ALIASES = {"gif": "270p", "270p": "270p", "720p": "720p", "1080p": "1080p", "hd": "1080p", "1k": "1K", "2k": "2K",
                   "4k": "4K", "2160p": "4K"}


def log(*a):
    print("[flow]", *a, file=sys.stderr, flush=True)


def die(msg, **extra):
    try:   # a Google warning anywhere in the error starts the shared cool-down (google_guard.py)
        from google_guard import note_failure
        texts = [msg] + [str(v) for k, v in extra.items() if k in ("message", "messages", "alerts", "text") and v]
        note_failure(" ".join(texts))   # only human-readable texts: key names like "rate_limited" must not trip it
    except Exception:
        pass
    print(json.dumps({"ok": False, "error": msg, **extra}))
    sys.exit(1)


# ---- config -------------------------------------------------------------------------------
def load_json(p: Path, default):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default


def use_account(name: str):
    """Work on one account from here on: its state, cookie copy, project, browser and guard counters."""
    global ACCOUNT, STATE_FILE, COOKIE_FILE
    ACCOUNT = acc.check(name)
    STATE_FILE, COOKIE_FILE = acc.state_path(name), acc.cookie_path(name)
    gg.use(name)


def config():
    c = json.loads(json.dumps(DEFAULTS))
    user = load_json(CONF_FILE, {})
    for k, v in user.items():
        if isinstance(v, dict) and isinstance(c.get(k), dict):
            c[k].update(v)
        else:
            c[k] = v
    if ACCOUNT and ACCOUNT != acc.SHARED:   # every account has its own Flow project (a project belongs to one account)
        c["project_url"] = acc.cfg(ACCOUNT).get("project_url")
    return c


def save_config(update: dict):
    update = dict(update)
    if ACCOUNT and ACCOUNT != acc.SHARED and "project_url" in update:
        acc.set_cfg(ACCOUNT, project_url=update.pop("project_url"))
    if not update:
        return
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    cur = load_json(CONF_FILE, {})
    for k, v in update.items():
        if isinstance(v, dict) and isinstance(cur.get(k), dict):
            cur[k].update(v)
        else:
            cur[k] = v
    CONF_FILE.write_text(json.dumps(cur, indent=2))


def save_state(**kw):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    s = load_json(STATE_FILE, {})
    s.update(kw)
    acc.write_json(STATE_FILE, s)


# ---- PinchTab client ----------------------------------------------------------------------
class PinchTab:
    """One account's browser. google1..4: the dedicated server's instance for that profile (its own port, so tabs and
    cookies never mix with another account or another agent). "shared": the shared server's default profile (old way)."""

    def __init__(self):
        self.account = ACCOUNT
        self.tab = None
        if self.account and self.account != acc.SHARED:
            self.base, self.token = None, None   # known once the instance is up (ensure_server)
            return
        pc = load_json(PT_CONF, {})
        srv = pc.get("server", {})
        self.base = os.environ.get("PINCHTAB_URL") or f"http://{srv.get('bind', '127.0.0.1')}:{srv.get('port', 9867)}"
        self.token = os.environ.get("PINCHTAB_TOKEN") or srv.get("token")

    def req(self, method, path, body=None, timeout=90, raw=False):
        if self.base is None:
            self.ensure_server()
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(self.base + path, data=data, method=method)
        r.add_header("Content-Type", "application/json")
        r.add_header("X-Agent-Id", "google-flow")
        if self.token:
            r.add_header("Authorization", f"Bearer {self.token}")
        try:
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                b = resp.read()
                return b if raw else (json.loads(b) if b else {})
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            raise RuntimeError(f"PinchTab {method} {path}: HTTP {e.code}: {msg}")

    def alive(self):
        try:
            self.req("GET", "/health", timeout=5)
            return True
        except Exception:
            return False

    def ensure_server(self):
        if self.account and self.account != acc.SHARED:
            if self.base is None or not self.alive():
                try:
                    port = acc.ensure_instance(self.account)
                except RuntimeError as e:
                    die(str(e), account=self.account)
                self.base, self.token = f"http://127.0.0.1:{port}", acc.token()
            return
        if self.alive():
            return
        log("starting PinchTab server")
        subprocess.run(["pinchtab", "server", "restart"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(40):
            if self.alive():
                return
            time.sleep(0.5)
        die("PinchTab server is not reachable; run `pinchtab server` and retry")

    def tabs(self):
        return self.req("GET", "/tabs").get("tabs", [])

    def ensure_tab(self, url=None):
        """Reuse the saved tab (or any Flow tab); open one when none exists."""
        self.ensure_server()
        st = load_json(STATE_FILE, {})
        tabs = self.tabs()
        ids = {t["id"]: t for t in tabs}
        tab = st.get("tabId") if st.get("tabId") in ids else None
        if not tab:
            tab = next((t["id"] for t in tabs if "flow.google.com" in t.get("url", "")), None)
        if not tab:
            r = self.req("POST", "/navigate", {"url": url or FLOW_HOME, "newTab": True}, timeout=90)
            tab = r.get("tabId") or r.get("id")
            time.sleep(3)
        self.tab = tab
        save_state(tabId=tab)
        cur = ids.get(tab, {}).get("url", "").split("?")[0].rstrip("/")
        if url and cur != url.split("?")[0].rstrip("/"):
            self.nav(url)
        return tab

    def nav(self, url):
        self.req("POST", "/navigate", {"url": url, "tabId": self.tab}, timeout=90)
        time.sleep(2.5)

    def eval(self, expr, await_promise=True, timeout=120):
        r = self.req("POST", "/evaluate", {"expression": expr, "tabId": self.tab, "awaitPromise": await_promise}, timeout=timeout)
        if "error" in r and "result" not in r:
            raise RuntimeError(f"evaluate failed: {r.get('error')}")
        return r.get("result")

    def click(self, selector):
        """A trusted CDP click (Flow ignores synthetic clicks on some controls, e.g. generate). A click that navigates
        (PinchTab answers 409 navigation_changed) counts as done."""
        try:
            return self.req("POST", "/action", {"kind": "click", "selector": selector, "tabId": self.tab}, timeout=30)
        except RuntimeError as e:
            if "navigation_changed" in str(e):
                time.sleep(1.5)
                return {"navigated": True}
            raise

    def click_text(self, text, tag="button"):
        """Trusted click on the visible <tag> whose text contains `text` (icons and labels around it are fine)."""
        return self.click(f"xpath://{tag}[contains(normalize-space(.), {json.dumps(text)})]")

    def fill(self, selector, text):
        return self.req("POST", "/action", {"kind": "fill", "selector": selector, "text": text, "tabId": self.tab}, timeout=30)

    def screenshot(self, path):
        b = self.req("GET", f"/screenshot?tabId={self.tab}&raw=true", raw=True, timeout=60)
        Path(path).write_bytes(b)
        return path


class Flow:
    def __init__(self, project=None):
        self.c = config()
        self.pt = PinchTab()
        self.project = project or self.c.get("project_url")

    def signed_in(self):
        return bool(self.pt.eval("!!document.querySelector('[aria-label^=\"Google Account\"]')"))

    def wait_signed_in(self, secs=15):
        t0 = time.time()
        while time.time() - t0 < secs:
            try:
                if self.signed_in():
                    return True
            except Exception:
                pass
            time.sleep(1)
        return False

    def save_live_cookies(self, force=False):
        """Write the browser's current (rotated) Google cookies back to the private copy, at most every 10 min,
        so a later re-login never replays stale values. `force` also creates the copy (after a sign-in)."""
        st = load_json(STATE_FILE, {})
        if not force and (not COOKIE_FILE.exists() or time.time() - st.get("cookies_saved", 0) < 600):
            return
        seen = {}
        for u in ("https://flow.google.com/", "https://accounts.google.com/", "https://www.google.com/"):
            try:
                r = self.pt.req("GET", f"/cookies?tabId={self.pt.tab}&url={urllib.request.quote(u, safe='')}")
            except Exception:
                return
            for c in r.get("cookies", []):
                seen[(c.get("name"), c.get("domain"), c.get("path"))] = c
        if not any(k[0] in ("SID", "__Secure-1PSID") for k in seen):
            return
        out = []
        for c in seen.values():
            x = {k: c.get(k) for k in ("name", "value", "domain", "path", "secure", "httpOnly")}
            if c.get("expires") and c["expires"] > 0:
                x["expirationDate"] = c["expires"]
            if c.get("sameSite"):
                x["sameSite"] = {"None": "no_restriction", "Lax": "lax", "Strict": "strict"}.get(c["sameSite"], c["sameSite"])
            out.append(x)
        tmp = COOKIE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(out))
        os.chmod(tmp, 0o600)
        tmp.replace(COOKIE_FILE)
        save_state(cookies_saved=time.time())

    def open(self, need_project=True, _retry=True):
        if need_project and not self.project:
            die(f"no Flow project set for {ACCOUNT}: pass --project URL, or run `flow.py new-project --save --account {ACCOUNT}` "
                f"(or `flow.py setup --account {ACCOUNT} --project URL`)", account=ACCOUNT)
        self.pt.ensure_tab(self.project if need_project else None)
        self.inject()
        url = self.pt.eval("location.href")
        if "accounts.google.com" in (url or "") or not self.signed_in():
            time.sleep(2)
            if not self.signed_in():
                if _retry and COOKIE_FILE.exists():
                    log("signed out: re-applying the saved cookies")
                    inject_cookies(self, COOKIE_FILE)
                    self.pt.nav(self.project or FLOW_HOME)
                    self.inject()
                    if self.wait_signed_in():
                        return self.open(need_project, _retry=False)
                if ACCOUNT != acc.SHARED:
                    save_state(signed_in=False, checked_at=time.time())
                die(f"{ACCOUNT} is not signed in to Google and the saved cookies were rejected: run `flow.py login --account {ACCOUNT}` "
                    f"(the owner signs in on the live view) or `flow.py setup --account {ACCOUNT} --cookies export.json`", url=url, account=ACCOUNT)
        if ACCOUNT != acc.SHARED and not load_json(STATE_FILE, {}).get("signed_in"):
            save_state(signed_in=True, ever_signed_in=True, checked_at=time.time())
        self.save_live_cookies()
        if need_project:
            # the grid renders a moment after the prompt bar; wait for both to settle
            ready, last, same, t0 = False, -1, 0, time.time()
            while time.time() - t0 < 30:
                st = self.pt.eval("""JSON.stringify({box:!!document.querySelector('[aria-label="What do you want to create?"]'),
                  n:document.querySelectorAll('flow-tile-container').length,
                  empty:/Start creating or drop media/.test(document.body.innerText)})""")
                st = json.loads(st) if isinstance(st, str) else (st or {})
                if st.get("box") and (st.get("n") or st.get("empty")):
                    same = same + 1 if st["n"] == last else 0
                    last = st["n"]
                    if same >= 2:
                        ready = True
                        break
                time.sleep(0.4)
            if not ready:
                die("Flow project did not finish loading", url=url)
        return self

    def inject(self):
        for _ in range(3):
            try:
                if self.pt.eval(PAGE_JS) == "loaded":
                    return
            except RuntimeError as e:
                if "evaluate_disabled" in str(e) or "403" in str(e):
                    die("PinchTab evaluate is disabled: run `flow.py setup` (it enables evaluate and cookies)")
                raise
            time.sleep(1)

    def call(self, fn, *args, timeout=120):
        """Call window.__flow.<fn>(*args) and return its JSON result."""
        expr = f"(async()=>{{if(!window.__flow)return {{__missing:true}};return JSON.stringify(await window.__flow.{fn}(...{json.dumps(list(args))}))}})()"
        r = self.pt.eval(expr, timeout=timeout)
        if isinstance(r, dict) and r.get("__missing"):
            self.inject()
            r = self.pt.eval(expr, timeout=timeout)
        return json.loads(r) if isinstance(r, str) else r

    # ---- building blocks ----
    def account(self):
        a = self.call("account")
        if ACCOUNT and ACCOUNT != acc.SHARED and isinstance(a, dict):   # keep the account's sign-in facts for `accounts` / auto
            now = time.time()
            if a.get("signedIn"):
                save_state(signed_in=True, ever_signed_in=True, email=a.get("email"), credits=a.get("credits"), resets=a.get("resets"), credits_at=now, checked_at=now)
            else:
                save_state(signed_in=False, checked_at=now)
        return a

    def tiles(self):
        self.call("scrollTop")
        return self.call("tiles")

    @staticmethod
    def tkey(t):
        """a tile's identity (Flow renders only the newest ~24 tiles, so counting tiles stops working once a project is full)"""
        return (t.get("title"), t.get("thumb"), t.get("kind"))

    def keys(self):
        return {self.tkey(t) for t in self.tiles()}

    def fresh(self, ts, before):
        """tiles not present before (newest first)"""
        return [t for t in ts if self.tkey(t) not in before]

    def upload(self, path: Path, name=None):
        path = Path(path).expanduser().resolve()
        if not path.is_file():
            die(f"file not found: {path}")
        name = name or path.name
        before = self.keys()
        mime = mimetypes.guess_type(name)[0] or "image/png"
        b64 = base64.b64encode(path.read_bytes()).decode()
        self.call("bufReset")
        n = 400_000
        for i in range(0, len(b64), n):
            self.pt.eval(f"window.__flow.bufAdd({json.dumps(b64[i:i + n])})")
        self.call("dropFile", name, mime)
        t0 = time.time()
        while time.time() - t0 < 90:
            ts = self.tiles()
            stem = Path(name).stem
            hit = [t for t in ts if stem in (t.get("title") or "")] or self.fresh(ts, before)
            if hit and hit[0].get("progress") is None:
                return {"ok": True, "name": hit[0].get("title") or name, "tile": hit[0]}
            time.sleep(1.5)
        return {"ok": False, "error": "upload did not appear in the project within 90 s", "name": name}

    def ensure_asset(self, ref: str | None, slot_label: str):
        """`ref` is a local file (uploaded first, with a unique name) or an existing asset name in the project."""
        if not ref:
            return None
        p = Path(ref).expanduser()
        if p.is_file():
            stem = re.sub(r"[^A-Za-z0-9_-]+", "_", p.stem)[:40]
            name = f"{stem}_{time.strftime('%H%M%S')}{p.suffix.lower()}"
            log(f"uploading {p.name} as {name} for {slot_label}")
            r = self.upload(p, name)
            if not r.get("ok"):
                die(r.get("error"), step=f"upload {slot_label}")
            return r.get("name") or name
        return ref

    def submit(self, before_n):
        """Press generate with a trusted click; confirm a new tile appears or the prompt clears. Retries once only
        when nothing was submitted, so it never double-spends."""
        for attempt in range(2):
            chk = self.call("panelState")
            btn = self.pt.eval("(()=>{const b=document.querySelector('[aria-label=\"Start generation\"]');return b?(b.disabled?'disabled':'ok'):'missing'})()")
            if btn != "ok":
                die(f"generate button is {btn}", state=chk)
            time.sleep(2.5 if attempt == 0 else 6)   # let Flow finish attaching frames / references (an early click is silently ignored)
            self.pt.click('[aria-label="Start generation"]')
            t0 = time.time()
            while time.time() - t0 < 25:
                new = self.fresh(self.call("tiles"), before_n)
                cleared = self.pt.eval("(()=>{const b=document.querySelector('[aria-label=\"What do you want to create?\"]');return !b||!(b.innerText||'').trim()})()")
                if new or cleared:
                    return True
                time.sleep(1.5)
            log(f"generate click not accepted (attempt {attempt + 1})")
        return False

    def add_ingredients(self, items):
        """Attach several assets / characters in one pass of Flow's multi-select picker."""
        r = self.call("selectIngredients", items)
        if not r.get("ok"):
            self.call("closeMenus")
            die(r.get("error", "could not pick ingredients"), available=r.get("available"), picked=r.get("picked"))
        before = r.get("before", 0)
        if r.get("pickerOpen"):
            self.pt.click_text("Add to prompt")
        t0 = time.time()
        while time.time() - t0 < 8:
            if self.call("ingredientCount") >= before + len(items):
                return r["picked"]
            time.sleep(0.5)
        n = self.call("ingredientCount")
        if n > before:
            log(f"attached {n - before} of {len(items)} ingredients (Flow may cap how many a model takes)")
            return r["picked"]
        die("the ingredients were selected but did not attach", picked=r.get("picked"))

    def credits(self):
        try:
            return self.account().get("credits")
        except Exception:
            return None

    def wait_tiles(self, before_n, n, timeout_min):
        """Wait until `n` new tiles exist at the top of the grid and none of them is still rendering."""
        t0, last = time.time(), None
        while time.time() - t0 < timeout_min * 60:
            ts = self.tiles()
            new = self.fresh(ts, before_n)[:n]
            if len(new) >= n:
                prog = [t.get("progress") for t in new]
                if all(p is None for p in prog) and all(t.get("thumb") or t.get("failed") for t in new):
                    return new
                msg = " ".join(f"{p}%" if p is not None else "done" for p in prog)
                if msg != last:
                    log(f"rendering: {msg}")
                    last = msg
            else:
                errs = self.call("errors")
                if errs and time.time() - t0 > 8 and not new:
                    bad = [e for e in errs if re.search(r"fail|error|couldn|not enough|insufficient|violat|policy|limit", e, re.I)]
                    if bad:
                        die("Flow refused the generation", messages=bad)
            time.sleep(4)
        die(f"timed out after {timeout_min} min waiting for the render", tiles=self.tiles()[:n])

    def pick_quality(self, index, quality):
        """Map a quality keyword onto the tile's real download option label."""
        opts = self.call("downloadOptions", index)
        enabled = [o["text"] for o in opts if not o["disabled"]]
        if not enabled:
            return None, opts
        q = str(quality or "original").lower()
        if q in ("best", "max", "highest"):
            return enabled[-1], opts
        if q in ("original", "source", "orig"):
            return next((o for o in enabled if "original" in o.lower()), enabled[0]), opts
        q = QUALITY_ALIASES.get(q, q).lower()
        hit = next((o for o in enabled if o.lower().startswith(q)), None) or next((o for o in enabled if q in o.lower()), None)
        return hit, opts

    def download(self, index, quality, out_dir: Path, name=None, timeout_min=15):
        label, opts = self.pick_quality(index, quality)
        if not label:
            return {"ok": False, "quality": quality, "error": f"quality {quality!r} is not offered for this tile",
                    "options": [o["text"] + (" (disabled)" if o["disabled"] else "") for o in opts]}
        self.call("dlArm")
        r = self.call("tileMenu", index, ["Download", label])
        if not r.get("ok"):
            return {"ok": False, "quality": label, **r}
        log(f"downloading tile {index} as {label!r}" + (" (server-side upscale, can take minutes)" if "upscal" in label.lower() else ""))
        t0, st = time.time(), {}
        while time.time() - t0 < timeout_min * 60:
            st = self.call("dlStatus")
            if st.get("ready") or st.get("error"):
                break
            time.sleep(2)
        if not st.get("ready"):
            return {"ok": False, "quality": label, "error": st.get("error") or f"Flow did not deliver the file within {timeout_min} min",
                    "toasts": st.get("toasts")}
        size, chunk = st["size"], 3_000_000
        out_dir.mkdir(parents=True, exist_ok=True)
        src = Path(st["name"])
        dest = out_dir / ((name + src.suffix) if name else src.name)
        if dest.exists():
            dest = dest.with_name(f"{dest.stem}_{time.strftime('%H%M%S')}{dest.suffix}")
        with open(dest, "wb") as fh:
            for off in range(0, size, chunk):
                fh.write(base64.b64decode(self.call("dlChunk", off, chunk)))
        self.call("dlDone")
        return {"ok": True, "quality": label, "path": str(dest), "bytes": dest.stat().st_size,
                "seconds": round(time.time() - t0, 1), **probe(dest)}


def probe(p: Path):
    if not shutil.which("ffprobe") or p.suffix.lower() not in (".mp4", ".webm", ".mov", ".gif", ".jpg", ".jpeg", ".png", ".webp"):
        return {}
    try:
        o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height",
                            "-of", "json", str(p)], capture_output=True, text=True, timeout=30).stdout
        j = json.loads(o)
        v = next((s for s in j.get("streams", []) if s.get("width")), {})
        out = {"width": v.get("width"), "height": v.get("height")}
        dur = float(j.get("format", {}).get("duration") or 0)
        if dur > 0.05 and p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            out["duration"] = round(dur, 3)
        return out
    except Exception:
        return {}


def image_size(p: Path):
    """(width, height) of a PNG / JPEG / WebP without Pillow; None when unknown."""
    try:
        b = Path(p).read_bytes()[:400_000]
        if b[:8] == b"\x89PNG\r\n\x1a\n":
            return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
        if b[:4] == b"RIFF" and b[8:12] == b"WEBP" and b[12:16] == b"VP8X":
            return int.from_bytes(b[24:27], "little") + 1, int.from_bytes(b[27:30], "little") + 1
        if b[:2] == b"\xff\xd8":
            i = 2
            while i < len(b) - 9:
                if b[i] != 0xFF:
                    i += 1
                    continue
                m = b[i + 1]
                if m in (0xC0, 0xC1, 0xC2):
                    return int.from_bytes(b[i + 7:i + 9], "big"), int.from_bytes(b[i + 5:i + 7], "big")
                i += 2 + int.from_bytes(b[i + 2:i + 4], "big")
    except Exception:
        pass
    return None


def auto_aspect(path, kind):
    """The aspect that fits a local picture best (video: 16:9 or 9:16)."""
    p = Path(path).expanduser() if path else None
    if not p or not p.is_file():
        return None
    wh = image_size(p)
    if not wh:
        return None
    r = wh[0] / wh[1]
    if kind == "video":
        return "9:16" if r < 1 else "16:9"
    return min({"16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:4": 3 / 4, "9:16": 9 / 16}.items(), key=lambda kv: abs(kv[1] - r))[0]


def norm_model(m):
    return MODEL_ALIASES.get(str(m).lower(), m) if m else m


def norm_secs(s):
    if s is None:
        return None
    s = str(s).lower().rstrip("s")
    return f"{int(float(s))}s"


def norm_count(n):
    if n is None:
        return None
    n = str(n).lower().lstrip("x")
    return f"x{int(n)}"


# ---- commands ---------------------------------------------------------------------------------
def cmd_setup(a):
    """Prepare the account's browser, inject cookies, remember a project / mode.

    google1..4: the dedicated server is created and started on demand (its config already allows evaluate, cookies and the
    Google domains); nothing shared is touched. "shared" (the old way): patch the shared server's config; it is NOT restarted
    here (a PinchTab shutdown kills every PinchTab-launched Chrome, other agents' tabs included): restart it yourself when idle."""
    if ACCOUNT == acc.SHARED:
        pc = load_json(PT_CONF, None)
        if pc is None:
            die(f"PinchTab config not found at {PT_CONF}; install PinchTab first")
        sec = pc.setdefault("security", {})
        changed = False
        for k in ("allowEvaluate", "allowCookies"):
            if not sec.get(k):
                sec[k] = True
                changed = True
        doms = sec.setdefault("allowedDomains", [])
        for d in NEED_DOMAINS:
            if d not in doms:
                doms.append(d)
                changed = True
        if changed:
            bak = PT_CONF.with_suffix(".json.bak-google-flow")
            if not bak.exists():
                shutil.copy(PT_CONF, bak)
            PT_CONF.write_text(json.dumps(pc, indent=2))
            log("updated the shared PinchTab config (evaluate, cookies, Google domains); restart that server when no other agent is using it")
    else:
        try:
            acc.ensure_server()
        except RuntimeError as e:
            die(str(e))
        if a.mode:
            acc.set_cfg(ACCOUNT, mode=a.mode)
            acc.stop_instance(ACCOUNT)   # the instance (not the server) restarts in the new mode below
    upd = {}
    if a.project:
        upd["project_url"] = a.project
    if a.out_dir:
        upd["out_dir"] = a.out_dir
    if upd:
        save_config(upd)
    f = Flow(a.project)
    f.pt.ensure_tab(None)
    if a.cookies:
        CONF_DIR.mkdir(parents=True, exist_ok=True)
        COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
        if Path(a.cookies).expanduser().resolve() != COOKIE_FILE.resolve():
            shutil.copy(Path(a.cookies).expanduser(), COOKIE_FILE)
        os.chmod(COOKIE_FILE, 0o600)
        f.pt.nav(f.project or FLOW_HOME)
        time.sleep(2)
        if f.signed_in() and not a.force:
            log("already signed in: not replaying cookies over a live session (use --force to override)")
        else:
            inject_cookies(f, Path(a.cookies).expanduser())
    f.pt.nav(f.project or FLOW_HOME)
    f.inject()
    f.wait_signed_in()
    acct = f.account()
    if acct.get("signedIn"):
        f.save_live_cookies(force=True)
    print(json.dumps({"ok": bool(acct.get("signedIn")), "account_name": ACCOUNT, "account": acct, "project_url": f.project,
                      "mode": acc.cfg(ACCOUNT).get("mode", "headless") if ACCOUNT != acc.SHARED else None, "config": str(CONF_FILE),
                      **({} if acct.get("signedIn") else {"hint": f"{ACCOUNT} is signed out: `flow.py login --account {ACCOUNT}`, or export fresh cookies"})}))


def inject_cookies(f, path: Path):
    if True:
        raw = json.loads(path.read_text())
        raw = raw.get("cookies", raw) if isinstance(raw, dict) else raw
        ck = []
        for x in raw:
            c = {k: x[k] for k in ("name", "value", "domain", "path", "secure", "httpOnly") if k in x}
            exp = x.get("expirationDate") or x.get("expires")
            if exp and exp > 0:
                c["expires"] = exp
            ss = {"no_restriction": "None", "none": "None", "lax": "Lax", "strict": "Strict"}.get(str(x.get("sameSite", "")).lower())
            if ss:
                c["sameSite"] = ss
            ck.append(c)
        r = f.pt.req("POST", "/cookies", {"url": FLOW_HOME, "cookies": ck, "tabId": f.pt.tab})
        log(f"cookies set: {r.get('set')}/{r.get('total')}")


def cmd_status(a):
    f = Flow(a.project).open(need_project=bool(a.project or config().get("project_url")))
    acct = f.account()
    out = {"ok": True, "account_name": ACCOUNT, "account": acct, "project_url": f.project, "url": f.pt.eval("location.href"),
           "guard": guard_status(ACCOUNT if ACCOUNT != acc.SHARED else None)}
    if a.tiles:
        out["tiles"] = f.tiles()[: a.tiles]
    print(json.dumps(out))


def gen_cfg(a, kind):
    d = config()[kind]
    cfg = {"mode": "Video" if kind == "video" else "Image"}
    model = norm_model(a.model or d.get("model"))
    cfg["model"] = model
    pic = getattr(a, "start", None) or ((getattr(a, "ingredient", None) or getattr(a, "ref", None) or [None])[0])
    cfg["aspect"] = a.aspect or auto_aspect(pic, kind) or d.get("aspect")
    cfg["count"] = norm_count(a.count or d.get("count"))
    if kind == "video":
        cfg["input"] = "Ingredients" if (getattr(a, "ingredient", None) or getattr(a, "character", None)) else "Frames"
        is_veo = "veo" in str(model).lower()
        cfg["res"] = a.res or (None if is_veo else d.get("res"))
        fixed_len = is_veo or "1.2" in str(model)  # Veo and Omni 1.2 Flash have a fixed length
        cfg["secs"] = norm_secs(a.secs) if a.secs else (None if fixed_len else d.get("secs"))
    return cfg


def configure(f: Flow, cfg):
    r = f.call("configure", cfg)
    if not r.get("ok"):
        die(r.get("error", "could not apply settings"), available=r.get("available"), state=r.get("state"))
    if r.get("missing"):
        st = r.get("state", {})
        opts = [o["text"] for o in st.get("options", [])]
        die(f"{st.get('model')} does not offer: {', '.join(r['missing'])}", offered=opts, model=st.get("model"))
    return r["state"]


def cmd_price(a):
    kind = a.kind
    f = Flow(a.project).open()
    st = configure(f, gen_cfg(a, kind))
    print(json.dumps({"ok": True, "price": st.get("price"), "model": st.get("model"), "summary": st.get("summary"),
                      "checked": [o["text"] for o in st.get("options", []) if o["checked"]]}))


def cmd_models(a):
    """Probe every model: which options it offers and the price of each duration / resolution."""
    f = Flow(a.project).open()
    out = {}
    for kind in (["video", "image"] if a.kind == "all" else [a.kind]):
        configure(f, {"mode": "Video" if kind == "video" else "Image", **({"input": "Frames"} if kind == "video" else {})})
        for m in f.call("models"):
            st = configure(f, {"mode": "Video" if kind == "video" else "Image", "model": m, "count": "x1"})
            opts = [o["text"] for o in st["options"]]
            secs = [o for o in opts if re.fullmatch(r"\d+s", o)]
            res = [o for o in opts if re.fullmatch(r"\d+p.*", o)]
            prices = {}
            if kind == "video" and (secs or res):
                for r_ in (res or [None]):
                    for s_ in (secs or [None]):
                        st2 = configure(f, {"mode": "Video", "model": m, "res": r_ and r_.split()[0], "secs": s_, "count": "x1"})
                        prices[f"{(r_ or 'fixed').split()[0]} {s_ or 'fixed'}"] = st2.get("price")
            else:
                prices["x1"] = st.get("price")
            out[f"{kind}: {m}"] = {"summary": st.get("summary"), "options": opts, "price_x1": prices}
    print(json.dumps({"ok": True, "models": out}))


def cmd_upload(a):
    f = Flow(a.project).open()
    print(json.dumps(f.upload(Path(a.file), a.name)))


def run_generation(a, kind):
    c = config()
    f = Flow(a.project).open()
    out_dir = Path(a.out or c["out_dir"]).expanduser()
    cfg = gen_cfg(a, kind)
    log("settings:", json.dumps({k: v for k, v in cfg.items() if v}))
    # assets first: uploads change the grid
    if kind == "video" and (getattr(a, "start", None) or getattr(a, "end", None)) and \
            (getattr(a, "ingredient", None) or getattr(a, "character", None)):
        die("Flow uses either frames (--start/--end) or ingredients (--ingredient/--character) for one video, not both. "
            "For a consistent character in a set scene, use --character NAME --ingredient scene.png")
    start = f.ensure_asset(getattr(a, "start", None), "start frame")
    end = f.ensure_asset(getattr(a, "end", None), "end frame")
    refs = [f.ensure_asset(r, "ingredient") for r in (getattr(a, "ingredient", None) or getattr(a, "ref", None) or [])]
    chars = list(getattr(a, "character", None) or [])
    f.call("clearPromptBar")
    st = configure(f, cfg)
    quoted, model = st.get("price"), st.get("model")
    log(f"{st.get('model')} · {st.get('summary')} · quoted {quoted} credits")
    if kind == "video" and (start or end):
        for slot, name in (("Start", start), ("End", end)):
            if name:
                r = f.call("setFrame", slot, name)
                if not r.get("ok"):
                    die(f"could not set the {slot.lower()} frame to {name}", **r)
    items = [{"name": c, "tab": "Characters"} for c in chars] + [{"name": r_, "tab": "All"} for r_ in refs]
    if items:
        f.add_ingredients(items)
    p = f.call("setPrompt", a.prompt)
    if not p.get("ok"):
        die("could not type the prompt", **p)
    st = f.call("panelState")
    if st.get("price") is not None:
        quoted = st["price"]
    st["model"] = st.get("model") or model
    if a.max_credits is not None and quoted is not None and quoted > a.max_credits:
        die(f"quoted {quoted} credits is over --max-credits {a.max_credits}", quoted=quoted)
    if a.dry_run:
        print(json.dumps({"ok": True, "dry_run": True, "quoted_credits": quoted, "model": st.get("model"), "summary": st.get("summary"),
                          "start": start, "end": end, "ingredients": refs, "characters": chars}))
        return
    credits_before = f.credits()
    n = int(str(cfg.get("count") or "x1").lstrip("x"))
    before_n = f.keys()   # identities, not a count (the grid holds only ~24 tiles)
    if not f.submit(before_n):
        die("Flow did not accept the generate click (nothing was submitted, no credits spent)", state=f.call("panelState"))
    t0 = time.time()
    log(f"generating {n} {kind}(s)…")
    new = f.wait_tiles(before_n, n, a.timeout or c["timeout_min"])
    gen_secs = round(time.time() - t0, 1)
    results = []
    for t in new:
        item = {"index": t["i"], "title": t["title"], "kind": t["kind"], "failed": t["failed"]}
        if t["failed"]:
            item["message"] = t["text"]
            from google_guard import note_failure
            note_failure(t["text"] or "")
            item["refunded"] = bool(re.search(r"refund", t["text"], re.I))
        elif a.download != "none":
            base = a.name or re.sub(r"[^A-Za-z0-9_-]+", "_", t["title"] or kind)[:60]
            if n > 1:
                base = f"{base}_{t['i'] + 1}"
            d = f.download(t["i"], a.download, out_dir, base)
            item["download"] = d
        results.append(item)
    credits_after = f.credits()
    spent = (credits_before - credits_after) if (credits_before is not None and credits_after is not None) else None
    save_state(last={"kind": kind, "titles": [r["title"] for r in results], "at": time.time()})
    print(json.dumps({"ok": all(not r["failed"] for r in results), "account": ACCOUNT, "kind": kind, "model": st.get("model"), "summary": st.get("summary"),
                      "quoted_credits": quoted, "credits_before": credits_before, "credits_after": credits_after,
                      "credits_spent": spent, "generation_seconds": gen_secs, "results": results}))





def cmd_video(a):
    run_generation(a, "video")


def cmd_image(a):
    run_generation(a, "image")


def cmd_list(a):
    f = Flow(a.project).open()
    ts = f.tiles()
    if a.kind != "all":
        ts = [t for t in ts if t["kind"] == a.kind]
    print(json.dumps({"ok": True, "tiles": [{k: t[k] for k in ("i", "kind", "title", "progress", "failed")} for t in ts[: a.limit]]}))


def resolve_tile(f: Flow, sel: str):
    ts = f.tiles()
    if sel in ("latest", "last"):
        t = next((t for t in ts if t["kind"] == "video"), None) or (ts[0] if ts else None)
    elif re.fullmatch(r"\d+", sel):
        t = ts[int(sel)] if int(sel) < len(ts) else None
    else:
        t = next((t for t in ts if t["title"] == sel), None) or next((t for t in ts if sel.lower() in (t["title"] or "").lower()), None)
    if not t:
        die(f"no tile matches {sel!r}", tiles=[{"i": t["i"], "title": t["title"], "kind": t["kind"]} for t in ts[:20]])
    return t


def cmd_download(a):
    f = Flow(a.project).open()
    t = resolve_tile(f, a.tile)
    out_dir = Path(a.out or config()["out_dir"]).expanduser()
    if a.options:
        print(json.dumps({"ok": True, "tile": t["title"], "options": f.call("downloadOptions", t["i"])}))
        return
    r = f.download(t["i"], a.quality, out_dir, a.name)
    print(json.dumps({"tile": t["title"], **r}))


def probe_account(name, replay=True, stop_after=True):
    """Sign-in facts of ONE account from its own browser: is it signed in, which email Google shows, how many credits. It opens
    the Flow home only (never a generation), re-applies the saved cookie copy when the browser is signed out, refreshes the
    copy when it is signed in, and stops the browser again when this call was the one that started it."""
    started_here = not acc.running(name)
    use_account(name)
    info = {"account": name, "mode": acc.cfg(name).get("mode", "headless"), "project_url": acc.cfg(name).get("project_url")}
    try:
        acc.ensure_instance(name)
        f = Flow(None)
        f.pt.ensure_tab(None)
        f.pt.nav(FLOW_HOME)
        f.inject()
        ok = f.wait_signed_in(12)
        if not ok and replay and COOKIE_FILE.exists():
            log(f"{name}: signed out, re-applying the saved cookies")
            inject_cookies(f, COOKIE_FILE)
            f.pt.nav(FLOW_HOME)
            f.inject()
            ok = f.wait_signed_in(12)
        if ok:
            a = f.account()
            f.save_live_cookies(force=True)
            info.update(signed_in=True, email=a.get("email"), credits=a.get("credits"), resets=a.get("resets"))
        else:
            save_state(signed_in=False, checked_at=time.time())
            info.update(signed_in=False)
    except (RuntimeError, OSError) as e:
        info.update(signed_in=None, error=str(e)[:200])
    finally:
        if stop_after and started_here:
            acc.stop_instance(name)
    return info


def was_signed_in(name):
    """True when the account has ever been signed in (or came with a cookie copy): only those can 'sign out'."""
    return bool(acc.state(name).get("ever_signed_in") or acc.cookie_path(name).exists())


def account_row(name):
    st, g = acc.state(name), gg.status(name)
    ck = acc.cookie_path(name)
    row = {"account": name, "signed_in": st.get("signed_in"), "email": st.get("email"), "credits": st.get("credits"),
           "resets": st.get("resets"), "project_url": acc.cfg(name).get("project_url"), "mode": acc.cfg(name).get("mode", "headless"),
           "browser_running": acc.running(name) if acc.server_alive() else False,
           "checked_min_ago": round((time.time() - st["checked_at"]) / 60) if st.get("checked_at") else None,
           "cookie_copy_min_ago": round((time.time() - st["cookies_saved"]) / 60) if st.get("cookies_saved") and ck.exists() else None,
           "today": g["today"], "cooldown_min_left": g["cooldown_min_left"]}
    if g["cooldown_min_left"]:
        row["cooldown_reason"] = g["cooldown_reason"]
    return row


def cmd_accounts(a):
    """Every account at a glance: sign-in state, email Google shows, credits, today's usage, cool-down. No generation.
    Live by default (one visit to each account's Flow home, one at a time); --cached reads the saved facts only."""
    names = [n.strip() for n in a.only.split(",")] if a.only else list(acc.NAMES)
    rows = []
    for n in names:
        acc.check(n)
        row_pre = account_row(n)
        if not a.cached and row_pre["cooldown_min_left"] and not a.force:
            row_pre["note"] = "in cool-down: not visited (use --force)"
        elif not a.cached and (was_signed_in(n) or a.force):
            probe_account(n, stop_after=not a.keep_open)
        elif not a.cached:
            row_pre["note"] = "never signed in: flow.py login --account " + n
        rows.append({**account_row(n), **({"note": row_pre["note"]} if row_pre.get("note") else {})})
    print(json.dumps({"ok": True, "accounts": rows, "signed_in": [r["account"] for r in rows if r["signed_in"]],
                      "needs_login": [r["account"] for r in rows if not r["signed_in"]],
                      "pool": {k: gg.pool_status(k) for k in gg.POOLED}}))


def cmd_keepalive(a):
    """Once a day: open each signed-in account's Flow home, confirm it is still signed in, refresh the saved cookie copy.
    Cron / automation friendly: no generation, one JSON line, exit code 2 when an account that was signed in is now signed out.
    Accounts in a cool-down are not visited; accounts never signed in are reported, not probed."""
    out = {"checked": [], "signed_out": [], "skipped": {}}
    for n in acc.NAMES:
        g = gg.status(n)
        if g["cooldown_min_left"]:
            out["skipped"][n] = f"cool-down, {g['cooldown_min_left']:.0f} min left"
        elif not was_signed_in(n):
            out["skipped"][n] = "never signed in"
        else:
            r = probe_account(n)
            out["checked"].append({k: r.get(k) for k in ("account", "signed_in", "email", "credits", "error") if r.get(k) is not None})
            if r.get("signed_in") is False:
                out["signed_out"].append(n)
    out["ok"] = not out["signed_out"]
    if not (a.quiet and out["ok"]):
        print(json.dumps(out))
    if out["signed_out"]:
        sys.exit(2)


LOGIN_HTML = """<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1">
<title>Sign in to Google Flow (__ACCT__)</title><style>
body{margin:0;background:#111;color:#eee;font:14px system-ui;display:flex;flex-direction:column;align-items:center}
#bar{padding:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center}
#s{max-width:100vw;max-height:calc(100vh - 60px);cursor:crosshair;outline:1px solid #333}
button,input{background:#222;color:#eee;border:1px solid #444;border-radius:6px;padding:6px 10px;font:inherit}
#st{color:#8c8}</style></head><body>
<div id=bar><span><b>__ACCT__</b>: click the page, then just type (keys go to the browser).</span>
<input id=t placeholder="or paste text here" size=18><button onclick="sendT()">Send text</button>
<button onclick="key('Enter')">Enter</button><button onclick="key('Tab')">Tab</button>
<button onclick="key('Backspace')">⌫</button><span id=st></span></div>
<img id=s>
<script>
const B=location.pathname.replace(/\\/$/,'');const img=document.getElementById('s');let vw=1,vh=1;
const post=(p,b)=>fetch(B+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
let fails=0;const st=document.getElementById('st');
function finished(){st.textContent='__ACCT__ is signed in to Flow. You can close this page.';st.style.fontSize='18px';img.style.opacity=.35}
async function tick(){try{const r=await fetch(B+'/state');const j=await r.json();fails=0;vw=j.vw;vh=j.vh;
 if(j.done){finished();return}st.textContent=(j.url||'').split('?')[0];}catch(e){if(++fails>=3){st.textContent='This sign-in page has closed. If you finished signing in, you are done.';return}}
 const n=new Image();n.onload=()=>{img.src=n.src;setTimeout(tick,600)};n.onerror=()=>setTimeout(tick,1500);n.src=B+'/shot?'+Date.now()}
tick();
img.addEventListener('click',e=>{const r=img.getBoundingClientRect();post('/click',{x:(e.clientX-r.left)/r.width*vw,y:(e.clientY-r.top)/r.height*vh})});
img.addEventListener('wheel',e=>{e.preventDefault();const r=img.getBoundingClientRect();post('/wheel',{x:(e.clientX-r.left)/r.width*vw,y:(e.clientY-r.top)/r.height*vh,dy:e.deltaY})},{passive:false});
function key(k){post('/key',{key:k})}
function sendT(){const t=document.getElementById('t');if(t.value){post('/type',{text:t.value});t.value=''}}
document.addEventListener('keydown',e=>{if(e.target.id==='t')return;
 if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){post('/type',{text:e.key});e.preventDefault()}
 else if(['Enter','Tab','Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key)){post('/key',{key:e.key});e.preventDefault()}});
document.addEventListener('paste',e=>{if(e.target.id==='t')return;const t=e.clipboardData.getData('text');if(t){post('/type',{text:t});e.preventDefault()}});
</script></body></html>"""


def cmd_login(a):
    """Serve a live remote view of the automation browser so the user signs in to Google themselves.
    The page relays clicks and keys to PinchTab; nothing typed is logged or printed."""
    import secrets
    import threading
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    f = Flow(a.project)
    f.pt.ensure_tab(None)
    f.pt.nav("https://accounts.google.com/ServiceLogin?continue=" + urllib.request.quote(f.project or FLOW_HOME, safe=""))
    port = a.port or (8790 + (acc.NAMES.index(ACCOUNT) + 1 if ACCOUNT in acc.NAMES else 0))
    tok = secrets.token_urlsafe(12)
    state = {"done": False}
    lock = threading.Lock()

    def act(body):
        with lock:
            return f.pt.req("POST", "/action", {**body, "tabId": f.pt.tab}, timeout=30)

    def check_done():
        try:
            u = f.pt.eval("location.href") or ""
            if "flow.google.com" in u and "/about" not in u:
                if f.pt.eval("!!document.querySelector('[aria-label^=\"Google Account\"]')"):
                    return True, u
            return False, u
        except Exception:
            return False, ""

    class H(BaseHTTPRequestHandler):
        def log_message(self, *x):
            pass

        def _ok(self, body=b"", ctype="application/json"):
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            p = self.path.split("?")[0]
            if not p.startswith(f"/{tok}"):
                self.send_response(404)
                self.end_headers()
                return
            p = p[len(tok) + 1:]
            if p in ("", "/"):
                return self._ok(LOGIN_HTML.replace("__ACCT__", ACCOUNT).encode(), "text/html; charset=utf-8")
            if p == "/shot":
                with lock:
                    b = f.pt.req("GET", f"/screenshot?tabId={f.pt.tab}&raw=true&quality=70", raw=True, timeout=30)
                return self._ok(b, "image/jpeg")
            if p == "/state":
                done, u = check_done()
                state["done"] = state["done"] or done
                vw, vh = (f.pt.eval("[innerWidth,innerHeight]") or [1280, 800])
                return self._ok(json.dumps({"done": state["done"], "url": u, "vw": vw, "vh": vh}).encode())
            self.send_response(404)
            self.end_headers()

        def do_POST(self):
            p = self.path.split("?")[0]
            if not p.startswith(f"/{tok}/"):
                self.send_response(404)
                self.end_headers()
                return
            p = p[len(tok) + 1:]
            n = int(self.headers.get("Content-Length") or 0)
            b = json.loads(self.rfile.read(n) or b"{}")
            try:
                if p == "/click":
                    act({"kind": "click", "x": b["x"], "y": b["y"]})
                elif p == "/wheel":
                    act({"kind": "mouse-wheel", "x": b["x"], "y": b["y"], "deltaY": b["dy"]})
                elif p == "/type":
                    act({"kind": "keyboard-type", "text": b["text"]})
                elif p == "/key":
                    act({"kind": "press", "key": b["key"]})
            except Exception:
                pass
            self._ok(b"{}")

    srv = ThreadingHTTPServer(("127.0.0.1", port), H)
    url = f"http://127.0.0.1:{port}/{tok}/"
    print(json.dumps({"ok": True, "account": ACCOUNT, "login_url": url, "port": port, "path": f"/{tok}/",
                      "note": "open it (remotely: `bb connect expose PORT` and append the path); it exits once signed in"}), flush=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    t0 = time.time()
    while time.time() - t0 < a.timeout * 60:
        time.sleep(3)
        if state["done"] or check_done()[0]:
            state["done"] = True
            time.sleep(20)  # keep serving so the page can show "Signed in"
            break
    srv.shutdown()
    info = {}
    if state["done"]:   # remember who signed in (email Google shows, credits) and keep a private copy of the cookies
        try:
            f.inject()
            info = f.account()
            f.save_live_cookies(force=True)
        except Exception as e:
            log(f"signed in, but reading the account failed: {e}")
        if f.project:
            f.pt.nav(f.project)
    log("signed in" if state["done"] else "login timed out")
    print(json.dumps({"ok": state["done"], "signed_in": state["done"], "account": ACCOUNT, "email": info.get("email"), "credits": info.get("credits")}))


def wait_for(f, js_cond, secs=30, step=0.5):
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            if f.pt.eval(js_cond):
                return True
        except RuntimeError:
            pass
        time.sleep(step)
    return False


def pick_from_project(f, asset, soft=False):
    """In a character slot: 'Add from project' -> the asset -> 'Add media' when the dialog asks for it.
    soft=True returns False instead of failing when the asset is missing (the picker caches the project list)."""
    f.pt.click_text("Add from project")
    if not wait_for(f, "document.querySelectorAll('[role=option]').length>0", 10):
        die("the project picker did not open")
    f.call("pickerSearch", asset)
    if not f.call("clickOption", asset):
        f.call("closeMenus")
        if soft:
            return False
        die(f"asset not in the picker: {asset}")
    time.sleep(0.8)
    if f.pt.eval("[...document.querySelectorAll('button')].some(b=>b.offsetParent&&/Add media/.test(b.textContent))"):
        f.pt.click_text("Add media")
    return True


def attach_body(f, body, char_url, _retry=True):
    has_add = "[...document.querySelectorAll('button')].some(b=>b.offsetParent&&/Add from project/.test(b.textContent))"
    for _ in range(3):
        if f.pt.eval(has_add):
            break
        try:
            f.pt.click_text("Create body")
        except RuntimeError:
            pass
        wait_for(f, has_add, 6)
    else:
        die("could not open the body slot", character_url=char_url)
    if not pick_from_project(f, body, soft=_retry):
        log("body image not in the picker yet: reloading the character page")
        time.sleep(3)
        f.pt.click("xpath://button[normalize-space(.)='Done']")  # keep name / portrait / info
        time.sleep(2)
        f.pt.nav(char_url)
        f.inject()
        wait_for(f, "!!document.querySelector('input[aria-label=\"Character name\"]')", 20)
        time.sleep(1)
        return attach_body(f, body, char_url, _retry=False)
    if not wait_for(f, "[...document.querySelectorAll('button')].some(b=>b.offsetParent&&/^(accessibility_new\\s*)?Body$/.test(b.textContent.trim()))", 40):
        die("the body image did not attach", character_url=char_url)


def open_character(f, name):
    f.pt.click_text("Characters")
    wait_for(f, "/Create my avatar|New character/.test(document.body.innerText)", 10)
    time.sleep(1)
    xy = f.pt.eval(f"""(()=>{{const c=[...document.querySelectorAll('flow-tile-container')].find(c=>window.__flow.txt(c)===
        {json.dumps(name)});if(!c)return null;const b=c.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]}})()""")
    if not xy:
        die(f"no character named {name!r}")
    try:
        f.pt.req("POST", "/action", {"kind": "click", "x": xy[0], "y": xy[1], "tabId": f.pt.tab})
    except RuntimeError as e:
        if "navigation_changed" not in str(e):
            raise
    if not wait_for(f, "!!document.querySelector('input[aria-label=\"Character name\"]')", 20):
        die("the character editor did not open")
    time.sleep(1)
    f.inject()
    return f.pt.eval("location.href").split("?")[0]


def cmd_character(a):
    f = Flow(a.project).open()
    base = f.project.split("?")[0].rstrip("/")
    if a.action == "list":
        f.pt.click_text("Characters")
        wait_for(f, "/Create my avatar|New character/.test(document.body.innerText)", 10)
        time.sleep(1)
        names = f.pt.eval("""JSON.stringify([...document.querySelectorAll('flow-tile-container')].map(c=>window.__flow.txt(c))
            .filter(t=>t&&!/^(New character|Create my avatar)$/.test(t)))""")
        f.pt.nav(f.project)
        print(json.dumps({"ok": True, "characters": json.loads(names)}))
        return
    if a.action == "delete":
        if not a.name:
            die("character delete needs --name")
        f.pt.nav(f.project)
        f.inject()
        char_url = open_character(f, a.name)
        f.pt.click('[aria-label="Move to bin"]')
        time.sleep(1.2)
        if f.pt.eval("[...document.querySelectorAll('.cdk-overlay-pane button')].some(b=>/Move to bin|Delete/.test(b.textContent))"):
            f.pt.click("xpath://div[contains(@class,'cdk-overlay-pane')]//button[contains(.,'Move to bin') or contains(.,'Delete')]")
        time.sleep(2)
        f.pt.nav(f.project)
        print(json.dumps({"ok": True, "deleted": a.name, "character_url": char_url}))
        return
    if a.action == "update":
        if not a.name:
            die("character update needs --name")
        body = f.ensure_asset(a.body, "character body") if a.body else None
        f.pt.nav(f.project)
        f.inject()
        char_url = open_character(f, a.name)
        if a.info:
            f.pt.fill('textarea[aria-label="Character personality"]', a.info)
        if body:
            attach_body(f, body, char_url)
        time.sleep(1.5)
        f.pt.click("xpath://button[normalize-space(.)='Done']")
        time.sleep(2)
        f.pt.nav(f.project)
        print(json.dumps({"ok": True, "name": a.name, "body": body, "character_url": char_url}))
        return
    if not a.name or not a.portrait:
        die("character create needs --name and --portrait (an image file or a project asset)")
    portrait = f.ensure_asset(a.portrait, "character portrait")
    body = f.ensure_asset(a.body, "character body") if a.body else None
    f.pt.nav(base + "/character")
    f.inject()
    wait_for(f, "[...document.querySelectorAll('button')].some(b=>/Add from project/.test(b.textContent))", 20)
    pick_from_project(f, portrait)
    if not wait_for(f, "!!document.querySelector('input[aria-label=\"Character name\"]')", 40):
        die("the character editor did not open")
    char_url = f.pt.eval("location.href").split("?")[0]
    f.pt.fill('input[aria-label="Character name"]', a.name)
    if a.info:
        f.pt.fill('textarea[aria-label="Character personality"]', a.info)
    if body:
        attach_body(f, body, char_url)
    time.sleep(1.5)
    f.pt.click("xpath://button[normalize-space(.)='Done']")
    time.sleep(2)
    f.pt.nav(f.project)
    print(json.dumps({"ok": True, "name": a.name, "portrait": portrait, "body": body, "character_url": char_url}))


def cmd_shot(a):
    f = Flow(a.project).open(need_project=False)
    p = a.out or "/tmp/flow_shot.jpg"
    f.pt.screenshot(p)
    print(json.dumps({"ok": True, "path": p, "state": f.call("panelState")}))


def cmd_new_project(a):
    f = Flow(None)
    f.pt.ensure_tab(None)
    f.pt.nav(FLOW_HOME)
    f.inject()
    r = f.pt.eval("""(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));
      const b=[...document.querySelectorAll('button,a')].find(e=>/new project/i.test(e.textContent||'')||/new project/i.test(e.getAttribute('aria-label')||''));
      if(!b)return JSON.stringify({ok:false,error:'no New project button'});b.click();
      for(let i=0;i<40&&!/\\/project\\//.test(location.href);i++)await s(250);
      return JSON.stringify({ok:/\\/project\\//.test(location.href),url:location.href.split('?')[0]})})()""")
    r = json.loads(r)
    if r.get("ok") and a.save:
        save_config({"project_url": r["url"]})
    print(json.dumps(r))


def main():
    ap = argparse.ArgumentParser(prog="flow.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--project", help="Flow project URL (default: the account's project_url)")
    common.add_argument("--account", help="google1 | google2 | google3 | google4 | auto | shared (default: auto for video / image, "
                                          "else the account used last). auto = the signed-in account with the most room today")
    sp = ap.add_subparsers(dest="cmd", required=True)
    _add = sp.add_parser
    sp.add_parser = lambda *x, **k: _add(*x, parents=[common], **k)

    s = sp.add_parser("setup", help="enable PinchTab permissions, inject cookies, save the project")
    s.add_argument("--cookies", help="cookie export JSON (EditThisCookie / Cookie-Editor format)")
    s.add_argument("--out-dir", help="default folder for finished files")
    s.add_argument("--force", action="store_true", help="inject cookies even when the browser is already signed in")
    s.add_argument("--mode", choices=["headless", "headed"], help="the account's browser: headless, or headed on a virtual screen (Xvfb)")
    s.set_defaults(fn=cmd_setup)

    s = sp.add_parser("status", help="signed-in account, credits, project")
    s.add_argument("--tiles", type=int, default=0, help="also list the first N media tiles")
    s.set_defaults(fn=cmd_status)

    def gen_args(s, kind):
        s.add_argument("--model", help="video: omni | veo-lite | veo-fast | veo-quality; image: nano | full name")
        s.add_argument("--aspect", help="video 16:9 | 9:16; image 16:9 | 4:3 | 1:1 | 3:4 | 9:16")
        s.add_argument("--count", help="outputs per prompt: 1-4")
        if kind == "video":
            s.add_argument("--res", help="360p | 720p (Omni only; 360p is the cheap preview)")
            s.add_argument("--secs", help="4 | 6 | 8 | 10 (Omni only; Veo is fixed 8 s)")

    s = sp.add_parser("price", help="quote the credits for a setting without generating")
    s.add_argument("kind", choices=["video", "image"])
    gen_args(s, "video")
    s.set_defaults(fn=cmd_price)

    s = sp.add_parser("models", help="probe every model's options and prices")
    s.add_argument("kind", nargs="?", default="video", choices=["video", "image", "all"])
    s.set_defaults(fn=cmd_models)

    s = sp.add_parser("upload", help="upload an image into the project")
    s.add_argument("file")
    s.add_argument("--name", help="asset name in Flow (default: file name)")
    s.set_defaults(fn=cmd_upload)

    for kind in ("video", "image"):
        s = sp.add_parser(kind, help=f"generate {kind}(s), wait, download, report the credits spent")
        s.add_argument("--prompt", "-p", required=True)
        gen_args(s, kind)
        if kind == "video":
            s.add_argument("--start", help="start frame: a local image (uploaded) or an asset name in the project")
            s.add_argument("--end", help="end frame: a local image or an asset name")
            s.add_argument("--ingredient", action="append", help="Ingredients mode reference: a file or asset name (repeatable); not with --start")
            s.add_argument("--character", action="append", help="a Flow character by name (repeatable; see `character list`); Ingredients mode")
            s.add_argument("--download", default="original", help="original | best | gif | 720p | 1080p | 4k | none (default original)")
        else:
            s.add_argument("--ref", action="append", help="reference image (local file or asset name), repeatable")
            s.add_argument("--character", action="append", help="a Flow character by name as a reference (repeatable)")
            s.add_argument("--download", default="original", help="original | best | an option label from `download --options` | none")
        s.add_argument("--out", help="output folder (default: config out_dir)")
        s.add_argument("--name", help="output file base name")
        s.add_argument("--max-credits", type=int, help="refuse to generate when the quote is higher")
        s.add_argument("--timeout", type=int, help="minutes to wait for the render (default 20)")
        s.add_argument("--dry-run", action="store_true", help="set everything up, quote the price, do not generate")
        s.set_defaults(fn=cmd_video if kind == "video" else cmd_image)

    s = sp.add_parser("list", help="list media tiles (newest first)")
    s.add_argument("kind", nargs="?", default="all", choices=["all", "video", "image"])
    s.add_argument("--limit", type=int, default=20)
    s.set_defaults(fn=cmd_list)

    s = sp.add_parser("download", help="download an existing tile (e.g. upscale a 360p preview to 1080p)")
    s.add_argument("tile", help="latest | tile index | title (substring ok)")
    s.add_argument("--quality", default="original", help="original | best | gif | 720p | 1080p | 4k (labels from --options)")
    s.add_argument("--options", action="store_true", help="only list the download options of the tile")
    s.add_argument("--out")
    s.add_argument("--name")
    s.set_defaults(fn=cmd_download)

    s = sp.add_parser("new-project", help="create a new Flow project")
    s.add_argument("--save", action="store_true", help="make it the default project")
    s.set_defaults(fn=cmd_new_project)

    s = sp.add_parser("character", help="Flow characters for consistency: create from your own portrait (+ body) art, or list")
    s.add_argument("action", choices=["create", "update", "delete", "list"])
    s.add_argument("--name")
    s.add_argument("--portrait", help="head-and-shoulders image: a file (uploaded) or a project asset name")
    s.add_argument("--body", help="full-body image: a file or a project asset name (recommended for stylised characters)")
    s.add_argument("--info", help="who the character is and how they look/act (used by Flow)")
    s.set_defaults(fn=cmd_character)

    s = sp.add_parser("login", help="serve a live view of the automation browser so the user signs in to Google")
    s.add_argument("--port", type=int, default=None, help="live view port (default 8790 + the account number: google2 → 8792)")
    s.add_argument("--timeout", type=int, default=30, help="minutes to wait for the sign-in")
    s.set_defaults(fn=cmd_login)

    s = sp.add_parser("accounts", help="every account: signed in?, email, credits, today's usage, cool-down (no generation)")
    s.add_argument("--only", help="comma list, e.g. google2,google3")
    s.add_argument("--cached", action="store_true", help="do not open any browser; print the saved facts")
    s.add_argument("--force", action="store_true", help="also visit accounts that are in a cool-down")
    s.add_argument("--keep-open", action="store_true", help="leave the browsers this call started running")
    s.set_defaults(fn=cmd_accounts)

    s = sp.add_parser("keepalive", help="daily: confirm every account is still signed in and refresh its cookie copy (no generation)")
    s.add_argument("--quiet", action="store_true", help="print nothing when every account is fine")
    s.set_defaults(fn=cmd_keepalive)

    s = sp.add_parser("shot", help="screenshot the Flow tab (debugging)")
    s.add_argument("--out")
    s.set_defaults(fn=cmd_shot)

    a = ap.parse_args()
    kind = {"video": "video", "image": "image"}.get(a.cmd, "ui")
    if kind != "ui" and getattr(a, "dry_run", False):
        kind = "ui"
    try:
        if a.cmd not in ("accounts", "keepalive"):
            name = a.account
            if a.cmd in ("setup", "login") and not name:
                die(f"{a.cmd} needs --account google1 | google2 | google3 | google4 (which account?)")
            if name is None:
                name = "auto" if (kind in ("video", "image") and not a.project) else (acc.last_account() or "google1")
            if name == "auto":
                name = gg.pick_account(kind, need_project=True) if kind in ("video", "image") else (acc.last_account() or "google1")
            try:
                use_account(name)
            except ValueError as e:
                die(str(e))
            if kind in ("video", "image"):
                acc.remember(name)
        if a.cmd in ("setup", "login"):   # long, interactive: never hold the Google lock
            a.fn(a)
        else:
            with guard(kind, ACCOUNT):
                a.fn(a)
    except RuntimeError as e:
        die(str(e))
    except KeyboardInterrupt:
        die("interrupted")


if __name__ == "__main__":
    main()
