#!/usr/bin/env python3
"""Kill headless Chrome left behind by Remotion renders.

Headless Chrome detaches into its own session, so it survives process-group kills and
a crashed or kill -9'd render leaves it running (seen 2026-10-08: dozens of browsers
leaking from a retry loop). Every master renders with its own TMPDIR
(~/.cache/remotion-tmp/<project>-master-<Comp>/, holding owner.pid), and Chrome
carries --user-data-dir=<that dir>/… on its command line.

  reap_browsers.py --dir <MTMP>   kill every browser of that master (after each chunk, on exit)
  reap_browsers.py --stale        kill browsers of ANY master whose owner.pid is no longer alive
                                  (run at the start of every master and every stills batch)

Reads /proc/<pid>/cmdline directly: pkill -f misses these (procps truncates the
~2,500-character Chrome command line before the --user-data-dir flag).
"""
import os, re, signal, sys

ROOT = os.path.expanduser("~/.cache/remotion-tmp/")
FLAG = re.compile(rb"--user-data-dir=([^\x00]+)")

def ancestors():
    out, pid = set(), os.getpid()
    while pid > 1:
        out.add(pid)
        try:
            pid = int(open(f"/proc/{pid}/stat").read().rsplit(")", 1)[1].split()[1])
        except OSError:
            break
    return out

def browsers():
    """(pid, owner dir) for every render process of a master: headless Chrome (by its
    --user-data-dir) and the node/npx/timeout processes (by their TMPDIR)."""
    keep = ancestors()
    for pid in os.listdir("/proc"):
        if not pid.isdigit() or int(pid) in keep:
            continue
        try:
            cmd = open(f"/proc/{pid}/cmdline", "rb").read()
        except OSError:
            continue
        m = FLAG.search(cmd)
        if m:
            yield int(pid), os.path.dirname(m.group(1).decode(errors="replace").rstrip("/")) + "/x"
            continue
        if b"remotion" not in cmd and b"timeout" not in cmd:
            continue
        try:
            env = open(f"/proc/{pid}/environ", "rb").read()
        except OSError:
            continue
        e = re.search(rb"(?:^|\x00)TMPDIR=([^\x00]+)", env)
        if e and b"-master-" in e.group(1):
            yield int(pid), e.group(1).decode(errors="replace").rstrip("/") + "/x"

def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True

def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--dir":
        target = os.path.abspath(sys.argv[2]).rstrip("/") + "/"
        victims = [p for p, d in browsers() if d.startswith(target)]
    elif sys.argv[1:] == ["--stale"]:
        victims, dead = [], {}
        for p, d in browsers():
            if not d.startswith(ROOT):
                continue
            owner_dir = os.path.dirname(d.rstrip("/"))
            if "-master-" not in os.path.basename(owner_dir):
                continue
            if owner_dir not in dead:
                try:
                    dead[owner_dir] = not alive(int(open(os.path.join(owner_dir, "owner.pid")).read().strip()))
                except (OSError, ValueError):
                    dead[owner_dir] = True
            if dead[owner_dir]:
                victims.append(p)
    else:
        sys.exit(__doc__)
    for p in victims:
        try:
            os.kill(p, signal.SIGKILL)
        except ProcessLookupError:
            pass
    if victims:
        print(f"reaped {len(victims)} headless browser process(es)")

if __name__ == "__main__":
    main()
