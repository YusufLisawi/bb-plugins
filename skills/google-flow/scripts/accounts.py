"""accounts.py — the owner's Google accounts (google1 … google4): files, and the PinchTab browser each one lives in.

Shared by flow.py, aistudio_tts.py, google_guard.py. Standard library only.

Files (all under ~/.config/google-flow, override with GOOGLE_FLOW_CONFIG):
  accounts/<name>/config.json   project_url (the account's Flow project), mode ("headless" | "headed"), label
  accounts/<name>/state.json    tabId, signed_in, email, credits, credits_at, checked_at, cookies_saved, last_used
  accounts/<name>/cookies.json  private (0600) copy of the Google cookies, refreshed from the live browser
  accounts/<name>/aistudio_state.json
  guard.json, google.lock       the safety guard (google_guard.py): ONE lock, per-account counters and cool-downs
  "shared" is the old way: the shared PinchTab server's default profile, with the legacy files at the top level.

Browser: a DEDICATED PinchTab server (127.0.0.1:9877, config ~/.local/share/pinchtab/google/config.json, own token) with
one named profile per account (google1 … google4). Each running profile is its own Chrome on its own port, so the
accounts never share cookies, tabs or windows and no other agent sees them. The profile folders are persistent:
  ~/snap/chromium/common/pinchtab-profiles   when Chromium is the snap (a snap browser CANNOT write to ~/.local or any
                                             other hidden folder, nor keep anything in /tmp across reboots),
  ~/.local/share/pinchtab/profiles           otherwise.
NEVER stop or restart a PinchTab server while another one is running: its shutdown kills every PinchTab-launched Chrome
on the machine (that is how the shared server's tabs were lost once). Start-only: ensure_server() never stops anything.
"""
from __future__ import annotations

import json
import os
import secrets
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DIR = Path(os.environ.get("GOOGLE_FLOW_CONFIG") or os.environ.get("FLOW_CONFIG_DIR") or Path.home() / ".config" / "google-flow")
NAMES = ("google1", "google2", "google3", "google4")
SHARED = "shared"
PT_HOME = Path(os.environ.get("GOOGLE_PINCHTAB_HOME", Path.home() / ".local" / "share" / "pinchtab" / "google"))
PT_CONF = PT_HOME / "config.json"
PT_PORT = int(os.environ.get("GOOGLE_PINCHTAB_PORT", "9877"))
XVFB = ":99"
GOOGLE_DOMAINS = ["localhost", "127.0.0.1", "accounts.google.com", "flow.google.com", "*.flow.google.com", "google.com", "*.google.com",
                  "labs.google", "*.labs.google", "aistudio.google.com", "*.gstatic.com", "*.googleusercontent.com", "*.googleapis.com"]


def log(*a):
    print("[accounts]", *a, file=sys.stderr, flush=True)


def load_json(p: Path, default):
    try:
        return json.loads(Path(p).read_text())
    except Exception:
        return default


def write_json(p: Path, data, mode=None):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(p.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=2))
    if mode:
        os.chmod(tmp, mode)
    tmp.replace(p)


# ---- per-account files ----------------------------------------------------------------------------------------------
def check(name: str) -> str:
    if name != SHARED and name not in NAMES:
        raise ValueError(f"unknown account {name!r}: use one of {', '.join(NAMES)}, auto, or shared")
    return name


def adir(name: str) -> Path:
    check(name)
    if name == SHARED:
        return DIR
    d = DIR / "accounts" / name
    if not d.exists():
        d.mkdir(parents=True, exist_ok=True)
        if name == "google1":   # the account that was the only one before: it inherits the legacy cookie copy and project
            _migrate_legacy(d)
    return d


def _migrate_legacy(d: Path):
    old = DIR / "cookies.json"
    if old.exists() and not (d / "cookies.json").exists():
        shutil.copy(old, d / "cookies.json")
        os.chmod(d / "cookies.json", 0o600)
    legacy = load_json(DIR / "config.json", {})
    if legacy.get("project_url") and not (d / "config.json").exists():
        write_json(d / "config.json", {"project_url": legacy["project_url"], "mode": "headless", "label": "migrated from the single-account setup"})
    st = load_json(DIR / "state.json", {})
    if st and not (d / "state.json").exists():
        write_json(d / "state.json", {k: v for k, v in st.items() if k in ("cookies_saved", "last")})


def cookie_path(name: str) -> Path:
    return adir(name) / "cookies.json"


def state_path(name: str) -> Path:
    return adir(name) / "state.json"


def aistudio_state_path(name: str) -> Path:
    return adir(name) / "aistudio_state.json"


def cfg(name: str) -> dict:
    return load_json(adir(name) / "config.json", {})


def set_cfg(name: str, **kw):
    c = cfg(name)
    c.update({k: v for k, v in kw.items() if v is not None})
    write_json(adir(name) / "config.json", c)
    return c


def state(name: str) -> dict:
    return load_json(state_path(name), {})


def set_state(name: str, **kw):
    s = state(name)
    s.update(kw)
    write_json(state_path(name), s)
    return s


def last_account() -> str | None:
    return load_json(DIR / "last_account.json", {}).get("name")


def remember(name: str):
    if name != SHARED:
        write_json(DIR / "last_account.json", {"name": name, "at": time.time()})
        set_state(name, last_used=time.time())


# ---- the dedicated PinchTab server -------------------------------------------------------------------------------------
def profiles_dir() -> Path:
    env = os.environ.get("GOOGLE_PINCHTAB_PROFILES")
    if env:
        return Path(env)
    exe = shutil.which("chromium") or shutil.which("chromium-browser") or ""
    if "/snap/" in os.path.realpath(exe) or "/snap/" in exe or Path("/snap/chromium").exists():
        return Path.home() / "snap" / "chromium" / "common" / "pinchtab-profiles"
    return Path.home() / ".local" / "share" / "pinchtab" / "profiles"


def init_config():
    """Create the dedicated server's config once (a copy of the stock one with its own port, token, domains and profile folder)."""
    if PT_CONF.exists():
        return
    PT_HOME.mkdir(parents=True, exist_ok=True)
    base = {}
    for src in (Path.home() / ".pinchtab" / "config.json",):
        base = load_json(src, {})
    if not base:
        subprocess.run(["pinchtab", "config", "init"], env={**os.environ, "PINCHTAB_CONFIG": str(PT_CONF)}, capture_output=True)
        base = load_json(PT_CONF, {})
    c = json.loads(json.dumps(base))
    c.setdefault("server", {}).update({"port": str(PT_PORT), "bind": "127.0.0.1", "token": secrets.token_hex(24), "stateDir": str(PT_HOME / "state")})
    c.setdefault("browser", {})["extensionPaths"] = []
    pd = profiles_dir()
    pd.mkdir(parents=True, exist_ok=True)
    c.setdefault("profiles", {}).update({"baseDir": str(pd), "defaultProfile": "google1"})
    c.setdefault("multiInstance", {}).update({"strategy": "explicit", "instancePortStart": PT_PORT + 1, "instancePortEnd": PT_PORT + 22})
    c.setdefault("instanceDefaults", {}).update({"mode": "headless", "maxTabs": 6, "stealthLevel": "light"})
    sec = c.setdefault("security", {})
    sec.update({"allowedDomains": GOOGLE_DOMAINS, "allowEvaluate": True, "allowCookies": True})
    write_json(PT_CONF, c, 0o600)


def token() -> str:
    return load_json(PT_CONF, {}).get("server", {}).get("token", "")


def req(method: str, path: str, body=None, port: int | None = None, timeout=30):
    r = urllib.request.Request(f"http://127.0.0.1:{port or PT_PORT}{path}", method=method,
                               data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        b = resp.read()
        return json.loads(b) if b else {}


def server_alive() -> bool:
    try:
        return req("GET", "/health", timeout=4).get("status") == "ok"
    except Exception:
        return False


def _xvfb_alive() -> bool:
    try:
        pid = int(Path(f"/tmp/.X{XVFB[1:]}-lock").read_text().strip())
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def ensure_xvfb():
    """A virtual screen for headed Chrome (headed is harder for Google to tell from a person than headless)."""
    if os.environ.get("DISPLAY") or _xvfb_alive() or not shutil.which("Xvfb"):
        return
    subprocess.Popen(["Xvfb", XVFB, "-screen", "0", "1536x864x24", "-nolisten", "tcp"], stdin=subprocess.DEVNULL,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    time.sleep(1.5)


def ensure_server():
    """Start the dedicated server if it is not running. Never stops or restarts anything."""
    if server_alive():
        return
    init_config()
    ensure_xvfb()
    env = {**os.environ, "PINCHTAB_CONFIG": str(PT_CONF)}
    if not env.get("DISPLAY") and _xvfb_alive():
        env["DISPLAY"] = XVFB
    log("starting the Google PinchTab server on", PT_PORT)
    out = open(PT_HOME / "server.log", "ab")
    subprocess.Popen(["pinchtab", "server"], env=env, stdin=subprocess.DEVNULL, stdout=out, stderr=out, start_new_session=True)
    for _ in range(60):
        if server_alive():
            return
        time.sleep(0.5)
    raise RuntimeError(f"the Google PinchTab server did not start (see {PT_HOME / 'server.log'})")


def profile_id(name: str) -> str:
    for p in req("GET", "/profiles"):
        if p.get("name") == name:
            return p["id"]
    r = req("POST", "/profiles", {"name": name})
    return r["id"]


def instance(name: str) -> dict | None:
    return next((i for i in req("GET", "/instances") if i.get("profileName") == name and i.get("status") in ("running", "starting")), None)


def _healthy(port) -> bool:
    try:
        return req("GET", "/health", port=int(port), timeout=4).get("status") == "ok"
    except Exception:
        return False


def ensure_instance(name: str, mode: str | None = None) -> int:
    """The port of the account's running Chrome (starting its profile when needed). The profile folder keeps the login."""
    check(name)
    ensure_server()
    pid = profile_id(name)
    mode = mode or cfg(name).get("mode") or "headless"
    inst = instance(name)
    if inst and not _healthy(inst["port"]):   # the browser behind it died (someone restarted a PinchTab server): start it again
        for _ in range(10):
            time.sleep(1)
            if _healthy(inst["port"]):
                break
        else:
            try:
                req("POST", f"/profiles/{pid}/stop")
            except Exception:
                pass
            inst = None
    if not inst:
        log(f"starting {name} ({mode})")
        inst = req("POST", f"/profiles/{pid}/start", {"headless": mode != "headed"}, timeout=60)
    port = int(inst["port"])
    for _ in range(80):
        if _healthy(port):
            return port
        time.sleep(0.5)
    raise RuntimeError(f"{name}: the browser did not come up on port {port}")


def running(name: str) -> bool:
    try:
        return server_alive() and bool(instance(name))
    except Exception:
        return False


def stop_instance(name: str):
    """Stop ONE account's browser (the profile and its login stay on disk). Never stops the server."""
    try:
        if server_alive() and instance(name):
            req("POST", f"/profiles/{profile_id(name)}/stop")
    except Exception:
        pass
