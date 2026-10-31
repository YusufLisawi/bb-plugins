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
PAGE_JS = (HERE / "flow_page.js").read_text()
CONF_DIR = Path(os.environ.get("FLOW_CONFIG_DIR", Path.home() / ".config" / "google-flow"))
CONF_FILE = CONF_DIR / "config.json"
STATE_FILE = CONF_DIR / "state.json"
COOKIE_FILE = CONF_DIR / "cookies.json"  # private (0600) copy, kept fresh from the live browser
PT_CONF = Path(os.environ.get("PINCHTAB_CONFIG", Path.home() / ".pinchtab" / "config.json"))
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
    print(json.dumps({"ok": False, "error": msg, **extra}))
    sys.exit(1)


# ---- config -------------------------------------------------------------------------------
def load_json(p: Path, default):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default


def config():
    c = json.loads(json.dumps(DEFAULTS))
    user = load_json(CONF_FILE, {})
    for k, v in user.items():
        if isinstance(v, dict) and isinstance(c.get(k), dict):
            c[k].update(v)
        else:
            c[k] = v
    return c


def save_config(update: dict):
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    cur = load_json(CONF_FILE, {})
    for k, v in update.items():
        if isinstance(v, dict) and isinstance(cur.get(k), dict):
            cur[k].update(v)
        else:
            cur[k] = v
    CONF_FILE.write_text(json.dumps(cur, indent=2))


def save_state(**kw):
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    s = load_json(STATE_FILE, {})
    s.update(kw)
    STATE_FILE.write_text(json.dumps(s, indent=2))


# ---- PinchTab client ----------------------------------------------------------------------
class PinchTab:
    def __init__(self):
        pc = load_json(PT_CONF, {})
        srv = pc.get("server", {})
        self.base = os.environ.get("PINCHTAB_URL") or f"http://{srv.get('bind', '127.0.0.1')}:{srv.get('port', 9867)}"
        self.token = os.environ.get("PINCHTAB_TOKEN") or srv.get("token")
        self.tab = None

    def req(self, method, path, body=None, timeout=90, raw=False):
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
        if url and not ids.get(tab, {}).get("url", "").startswith(url.split("?")[0]):
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
        """A trusted CDP click (Flow ignores synthetic clicks on some controls, e.g. generate)."""
        return self.req("POST", "/action", {"kind": "click", "selector": selector, "tabId": self.tab}, timeout=30)

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
        so a later re-login never replays stale values."""
        st = load_json(STATE_FILE, {})
        if not COOKIE_FILE.exists() or (not force and time.time() - st.get("cookies_saved", 0) < 600):
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
            die("no Flow project set: pass --project URL or run `flow.py setup --project URL` (or `flow.py new-project`)")
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
                die("not signed in to Google and the saved cookies were rejected: export fresh cookies and run "
                    "`flow.py setup --cookies export.json` (or `flow.py login`)", url=url)
        self.save_live_cookies()
        if need_project:
            # the grid renders a moment after the prompt bar; wait for both to settle
            ready = self.pt.eval("""(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));let last=-1,same=0;
              for(let i=0;i<120;i++){const box=document.querySelector('[aria-label="What do you want to create?"]');
                const n=document.querySelectorAll('flow-tile-container').length;
                const empty=/Start creating or drop media/.test(document.body.innerText);
                if(box&&(n>0||empty)){same=(n===last)?same+1:0;last=n;if(same>=3)return true}await s(250)}return false})()""", timeout=60)
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
        return self.call("account")

    def tiles(self):
        self.call("scrollTop")
        return self.call("tiles")

    def upload(self, path: Path, name=None):
        path = Path(path).expanduser().resolve()
        if not path.is_file():
            die(f"file not found: {path}")
        name = name or path.name
        before = len(self.tiles())
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
            if len(ts) > before and ts[0].get("progress") is None:
                return {"ok": True, "name": name, "tile": ts[0]}
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
            return name
        return ref

    def submit(self, before_n):
        """Press generate with a trusted click; confirm a new tile appears or the prompt clears. Retries once only
        when nothing was submitted, so it never double-spends."""
        for attempt in range(2):
            chk = self.call("panelState")
            btn = self.pt.eval("(()=>{const b=document.querySelector('[aria-label=\"Start generation\"]');return b?(b.disabled?'disabled':'ok'):'missing'})()")
            if btn != "ok":
                die(f"generate button is {btn}", state=chk)
            self.pt.click('[aria-label="Start generation"]')
            t0 = time.time()
            while time.time() - t0 < 25:
                n = len(self.call("tiles"))
                cleared = self.pt.eval("(()=>{const b=document.querySelector('[aria-label=\"What do you want to create?\"]');return !b||!(b.innerText||'').trim()})()")
                if n > before_n or cleared:
                    return True
                time.sleep(1.5)
            log(f"generate click not accepted (attempt {attempt + 1})")
        return False

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
            new = ts[: max(0, len(ts) - before_n)][:n] if len(ts) > before_n else []
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
                if errs and time.time() - t0 > 8 and len(ts) <= before_n:
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
    """Prepare PinchTab (allowlist + permissions), inject cookies, remember a project."""
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
        log("updated PinchTab config (evaluate, cookies, Google domains); restarting server")
        subprocess.run(["pinchtab", "server", "restart"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3)
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
    print(json.dumps({"ok": bool(acct.get("signedIn")), "account": acct, "project_url": f.project, "config": str(CONF_FILE),
                      **({} if acct.get("signedIn") else {"hint": "Google rejected these cookies (the session behind them ended): export fresh ones"})}))


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
    out = {"ok": True, "account": acct, "project_url": f.project, "url": f.pt.eval("location.href")}
    if a.tiles:
        out["tiles"] = f.tiles()[: a.tiles]
    print(json.dumps(out))


def gen_cfg(a, kind):
    d = config()[kind]
    cfg = {"mode": "Video" if kind == "video" else "Image"}
    model = norm_model(a.model or d.get("model"))
    cfg["model"] = model
    cfg["aspect"] = a.aspect or d.get("aspect")
    cfg["count"] = norm_count(a.count or d.get("count"))
    if kind == "video":
        cfg["input"] = "Ingredients" if getattr(a, "ingredient", None) else "Frames"
        is_veo = "veo" in str(model).lower()
        cfg["res"] = a.res or (None if is_veo else d.get("res"))
        cfg["secs"] = norm_secs(a.secs) if a.secs else (None if is_veo else d.get("secs"))
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
    start = f.ensure_asset(getattr(a, "start", None), "start frame")
    end = f.ensure_asset(getattr(a, "end", None), "end frame")
    refs = [f.ensure_asset(r, "ingredient") for r in (getattr(a, "ingredient", None) or getattr(a, "ref", None) or [])]
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
    for r_ in refs:
        r = f.call("addIngredient", r_)
        if not r.get("ok"):
            die(f"could not add ingredient {r_}", **r)
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
                          "start": start, "end": end, "ingredients": refs}))
        return
    credits_before = f.credits()
    n = int(str(cfg.get("count") or "x1").lstrip("x"))
    before_n = len(f.tiles())
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
    print(json.dumps({"ok": all(not r["failed"] for r in results), "kind": kind, "model": st.get("model"), "summary": st.get("summary"),
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


LOGIN_HTML = """<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1">
<title>Sign in to Google Flow</title><style>
body{margin:0;background:#111;color:#eee;font:14px system-ui;display:flex;flex-direction:column;align-items:center}
#bar{padding:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center}
#s{max-width:100vw;max-height:calc(100vh - 60px);cursor:crosshair;outline:1px solid #333}
button,input{background:#222;color:#eee;border:1px solid #444;border-radius:6px;padding:6px 10px;font:inherit}
#st{color:#8c8}</style></head><body>
<div id=bar><span>Click the page, then just type (keys go to the browser).</span>
<input id=t placeholder="or paste text here" size=18><button onclick="sendT()">Send text</button>
<button onclick="key('Enter')">Enter</button><button onclick="key('Tab')">Tab</button>
<button onclick="key('Backspace')">⌫</button><span id=st></span></div>
<img id=s>
<script>
const B=location.pathname.replace(/\\/$/,'');const img=document.getElementById('s');let vw=1,vh=1;
const post=(p,b)=>fetch(B+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
let fails=0;const st=document.getElementById('st');
function finished(){st.textContent='Signed in to Flow. You can close this page.';st.style.fontSize='18px';img.style.opacity=.35}
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
                return self._ok(LOGIN_HTML.encode(), "text/html; charset=utf-8")
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

    srv = ThreadingHTTPServer(("127.0.0.1", a.port), H)
    url = f"http://127.0.0.1:{a.port}/{tok}/"
    print(json.dumps({"ok": True, "login_url": url, "port": a.port, "path": f"/{tok}/",
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
    if state["done"] and f.project:
        f.pt.nav(f.project)
    log("signed in" if state["done"] else "login timed out")
    print(json.dumps({"ok": state["done"], "signed_in": state["done"]}))


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
    common.add_argument("--project", help="Flow project URL (default: config project_url)")
    sp = ap.add_subparsers(dest="cmd", required=True)
    _add = sp.add_parser
    sp.add_parser = lambda *x, **k: _add(*x, parents=[common], **k)

    s = sp.add_parser("setup", help="enable PinchTab permissions, inject cookies, save the project")
    s.add_argument("--cookies", help="cookie export JSON (EditThisCookie / Cookie-Editor format)")
    s.add_argument("--out-dir", help="default folder for finished files")
    s.add_argument("--force", action="store_true", help="inject cookies even when the browser is already signed in")
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
            s.add_argument("--ingredient", action="append", help="Ingredients mode reference (repeatable) instead of frames")
            s.add_argument("--download", default="original", help="original | best | gif | 720p | 1080p | 4k | none (default original)")
        else:
            s.add_argument("--ref", action="append", help="reference image (local file or asset name), repeatable")
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

    s = sp.add_parser("login", help="serve a live view of the automation browser so the user signs in to Google")
    s.add_argument("--port", type=int, default=8790)
    s.add_argument("--timeout", type=int, default=30, help="minutes to wait for the sign-in")
    s.set_defaults(fn=cmd_login)

    s = sp.add_parser("shot", help="screenshot the Flow tab (debugging)")
    s.add_argument("--out")
    s.set_defaults(fn=cmd_shot)

    a = ap.parse_args()
    try:
        a.fn(a)
    except RuntimeError as e:
        die(str(e))
    except KeyboardInterrupt:
        die("interrupted")


if __name__ == "__main__":
    main()
