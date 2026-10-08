#!/usr/bin/env python3
"""Storage janitor for motion-film projects: removes ONLY regenerable leftovers of
generation, never a film's videos, audio, art, source, configs, QA reports or deliveries.

  python3 scripts/tidy.py              dry run for this project + the shared caches
  python3 scripts/tidy.py --apply      do it
  python3 scripts/tidy.py --all        every motion-film project under ~/Developer (the timer)
  python3 scripts/tidy.py --quick      shared caches only (fast; run by every render/stills)
  python3 scripts/tidy.py --ensure 20  after tidying, exit 3 + list the biggest folders if < 20 GB free
  python3 scripts/tidy.py --install-timer   run `--all --apply` every 30 min (systemd --user)

What it removes (and when):
  ~/.cache/mfs-bundles/*            Remotion bundles (~600 MB each), unused for 2 h and not open by a live process
  ~/.cache/mfs-selftest             the selftest's scratch project, after 24 h
  ~/.cache/remotion-tmp/*           browser profiles / bundles not in use; master temp dirs whose owner died
  /tmp remotion*, puppeteer*, _qa_*  Remotion leftovers in RAM-backed /tmp, older than 1 h and not in use
  out/<Comp>-ss                     sub-frames of a master that is no longer running, after 6 h
  out/<Comp>-final                  averaged frames: after packaging (marker .packaged), else 12 h after a
                                    passing QA (out/<Comp>.mp4.qa.json), else 48 h after the last write
  out/review/**/f-*.png             individual review stills after 24 h (the _sheet.png contact sheets stay)
  public/films/*/art/_dl* _oa* _pose* _req*   art-generation temp files after 1 h
Log: ~/.cache/mfs-tidy.log
"""
import json, os, shutil, subprocess, sys, time

HOME = os.path.expanduser("~")
NOW = time.time()
H = 3600
APPLY = "--apply" in sys.argv
LOG = os.path.join(HOME, ".cache", "mfs-tidy.log")
freed = 0
actions = []

def size(p):
    if os.path.isfile(p) or os.path.islink(p):
        try:
            return os.lstat(p).st_size
        except OSError:
            return 0
    t = 0
    for root, _, files in os.walk(p):
        for f in files:
            try:
                t += os.lstat(os.path.join(root, f)).st_size
            except OSError:
                pass
    return t

def newest_mtime(p):
    try:
        m = os.lstat(p).st_mtime
    except OSError:
        return NOW
    if os.path.isdir(p):
        with os.scandir(p) as it:
            for i, e in enumerate(it):
                if i > 200:  # big frame folders: sampling the first entries is enough
                    break
                try:
                    m = max(m, e.stat(follow_symlinks=False).st_mtime)
                except OSError:
                    pass
    return m

_open = None
def in_use_paths():
    """Every path mentioned by a live process (cmdline, cwd, open files, TMPDIR)."""
    global _open
    if _open is not None:
        return _open
    s = []
    me = os.getpid()
    for pid in os.listdir("/proc"):
        if not pid.isdigit() or int(pid) == me:
            continue
        b = f"/proc/{pid}"
        try:
            s.append(open(f"{b}/cmdline", "rb").read().replace(b"\0", b" ").decode(errors="replace"))
            env = open(f"{b}/environ", "rb").read().split(b"\0")
            s += [e.decode(errors="replace") for e in env if e.startswith(b"TMPDIR=")]
            s.append(os.readlink(f"{b}/cwd"))
            for fd in os.listdir(f"{b}/fd"):
                try:
                    s.append(os.readlink(f"{b}/fd/{fd}"))
                except OSError:
                    pass
        except (OSError, PermissionError):
            continue
    _open = "\n".join(s)
    return _open

def in_use(p):
    return os.path.realpath(p) in in_use_paths() or p in in_use_paths()

def remove(p, why, keep=None):
    """Delete a file or folder (or, with keep=[names], every file in it except those)."""
    global freed
    if keep is not None:
        victims = [os.path.join(p, f) for f in list_(p) if f not in keep]
    else:
        victims = [p]
    n = sum(size(v) for v in victims)
    if n == 0 and keep is not None:
        return
    freed += n
    actions.append((n, why, p))
    if APPLY:
        for v in victims:
            if os.path.isdir(v) and not os.path.islink(v):
                shutil.rmtree(v, ignore_errors=True)
            else:
                try:
                    os.unlink(v)
                except OSError:
                    pass

def list_(d):
    try:
        return os.listdir(d)
    except OSError:
        return []

def age(p):
    return NOW - newest_mtime(p)

# ── shared caches ────────────────────────────────────────────────────────────
def tidy_caches():
    b = os.path.join(HOME, ".cache", "mfs-bundles")
    if os.path.isdir(b):
        for d in list_(b):
            p = os.path.join(b, d)
            if age(p) > 2 * H and not in_use(p):
                remove(p, "unused bundle")
    t = os.path.join(HOME, ".cache", "remotion-tmp")
    if os.path.isdir(t):
        for d in list_(t):
            p = os.path.join(t, d)
            if "-master-" in d:
                try:
                    alive = os.path.exists(f"/proc/{int(open(os.path.join(p, 'owner.pid')).read())}")
                except (OSError, ValueError):
                    alive = False
                if not alive and not in_use(p):
                    remove(p, "temp dir of a finished/dead master")
                continue
            if not os.path.isdir(p):
                continue
            if d.startswith("mfs-bundle"):
                if age(p) > 2 * H and not in_use(p):
                    remove(p, "stale bundle")
                continue
            for e in list_(p):  # profiles and bundles inside a project's temp dir
                q = os.path.join(p, e)
                if (e.startswith("puppeteer_dev_chrome_profile") or "bundle" in e or e.startswith("remotion")) and age(q) > 1 * H and not in_use(q):
                    remove(q, "stale Remotion temp")
    st = os.path.join(HOME, ".cache", "mfs-selftest")
    if os.path.isdir(st) and age(st) > 24 * H and not in_use(st):
        remove(st, "selftest project (recreated by selftest.sh)")
    for e in list_("/tmp"):
        p = os.path.join("/tmp", e)
        if e.startswith(("remotion-", "remotion_", "puppeteer_dev_chrome_profile", "react-motion-render", "_qa_")):
            try:
                own = os.lstat(p).st_uid == os.getuid()
            except OSError:
                own = False
            if own and age(p) > 1 * H and not in_use(p):
                remove(p, "Remotion leftover in /tmp (RAM)")

# ── one project ──────────────────────────────────────────────────────────────
def qa_passed(proj, comp):
    try:
        r = json.load(open(os.path.join(proj, "out", f"{comp}.mp4.qa.json")))
        return all(r.get("checks", {}).values()) and bool(r.get("checks"))
    except (OSError, ValueError):
        return False

def master_running(proj, comp):
    t = os.path.join(HOME, ".cache", "remotion-tmp", f"{os.path.basename(proj)}-master-{comp}", "owner.pid")
    try:
        return os.path.exists(f"/proc/{int(open(t).read())}")
    except (OSError, ValueError):
        return False

def tidy_project(proj):
    out = os.path.join(proj, "out")
    if os.path.isdir(out):
        for d in sorted(list_(out)):
            p = os.path.join(out, d)
            if not os.path.isdir(p):
                continue
            if d.endswith("-ss"):
                comp = d[:-3]
                if not master_running(proj, comp) and age(p) > 6 * H and not in_use(p):
                    remove(p, "sub-frames of a master that is not running")
            elif d.endswith("-final"):
                comp = d[:-6]
                if master_running(proj, comp) or in_use(p):
                    continue
                if os.path.exists(os.path.join(p, ".packaged")):
                    remove(p, "averaged frames (film packaged)")
                elif qa_passed(proj, comp) and age(p) > 12 * H:
                    remove(p, "averaged frames (QA passed 12 h ago)")
                elif age(p) > 48 * H:
                    remove(p, "averaged frames (48 h old)")
        rv = os.path.join(out, "review")
        if os.path.isdir(rv):
            for root, _, files in os.walk(rv):
                for f in files:
                    q = os.path.join(root, f)
                    try:
                        old = NOW - os.lstat(q).st_mtime > 24 * H
                    except OSError:
                        continue
                    if f.startswith("f-") and f.endswith(".png") and old:
                        remove(q, "review still (contact sheet kept)")
    films = os.path.join(proj, "public", "films")
    if os.path.isdir(films):
        for slug in list_(films):
            art = os.path.join(films, slug, "art")
            if not os.path.isdir(art):
                continue
            for e in list_(art):
                q = os.path.join(art, e)
                if e.startswith(("_dl", "_oa", "_pose", "_req")) and age(q) > 1 * H and not in_use(q):
                    remove(q, "art generation temp")

def projects():
    root = os.path.join(HOME, "Developer")
    for d in sorted(os.listdir(root)):
        p = os.path.join(root, d)
        if os.path.isfile(os.path.join(p, "scripts", "render_master.sh")) and os.path.isdir(os.path.join(p, "src", "remotion")):
            yield p

def biggest():
    rows = []
    for p in projects():
        out = os.path.join(p, "out")
        if os.path.isdir(out):
            for d in os.listdir(out):
                q = os.path.join(out, d)
                rows.append((size(q), q))
    for c in ("mfs-bundles", "remotion-tmp"):
        q = os.path.join(HOME, ".cache", c)
        if os.path.isdir(q):
            rows.append((size(q), q))
    return sorted(rows, reverse=True)[:10]

def free_gb():
    s = os.statvfs(HOME)
    return s.f_bavail * s.f_frsize / 1e9

def install_timer():
    me = os.path.realpath(__file__)
    d = os.path.join(HOME, ".config", "systemd", "user")
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "mfs-tidy.service"), "w").write(
        f"[Unit]\nDescription=motion-film-studio storage janitor\n\n[Service]\nType=oneshot\nNice=10\nIOSchedulingClass=idle\nExecStart=/usr/bin/python3 {me} --all --apply\n")
    open(os.path.join(d, "mfs-tidy.timer"), "w").write(
        "[Unit]\nDescription=Run the motion-film-studio storage janitor every 30 min\n\n[Timer]\nOnBootSec=5min\nOnUnitActiveSec=30min\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n")
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "--user", "enable", "--now", "mfs-tidy.timer"], check=True)
    print("installed: systemctl --user status mfs-tidy.timer  (log: ~/.cache/mfs-tidy.log)")

def main():
    if "--install-timer" in sys.argv:
        return install_timer()
    import fcntl
    lock = open(os.path.join(HOME, ".cache", "mfs-tidy.lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("tidy: another sweep is running; skipped")
        return
    tidy_caches()
    if "--quick" not in sys.argv:
        if "--all" in sys.argv:
            for p in projects():
                tidy_project(p)
        else:
            here = os.getcwd()
            if os.path.isdir(os.path.join(here, "src", "remotion")):
                tidy_project(here)
    verb = "freed" if APPLY else "would free"
    big = [a for a in actions if a[0] >= 50e6]
    small = {}
    for n, why, p in actions:
        if n < 50e6:
            c, t = small.get(why, (0, 0))
            small[why] = (c + 1, t + n)
    lines = [f"{n / 1e9:7.2f} GB  {why}: {p}" for n, why, p in big] + [f"{t / 1e9:7.2f} GB  {why} ×{c}" for why, (c, t) in small.items()]
    for a in lines:
        print(a)
    print(f"tidy: {verb} {freed / 1e9:.2f} GB · {free_gb():.0f} GB free{'' if APPLY else '  (dry run: add --apply)'}")
    if APPLY and actions:
        with open(LOG, "a") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M ") + f"freed {freed / 1e9:.2f} GB\n" + "".join(f"  {a}\n" for a in lines))
    if "--ensure" in sys.argv:
        need = float(sys.argv[sys.argv.index("--ensure") + 1])
        if free_gb() < need:
            print(f"STOP: only {free_gb():.0f} GB free (< {need:.0f} GB) after tidying. Biggest folders:")
            for n, q in biggest():
                print(f"  {n / 1e9:7.2f} GB  {q}")
            sys.exit(3)

if __name__ == "__main__":
    main()
