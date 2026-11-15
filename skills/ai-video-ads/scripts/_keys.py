"""Read an API key from the environment, or from a dotenv file given with --env-file / AI_VIDEO_ENV. Never printed."""
import os, sys

def key(*names):
    for n in names:
        if os.environ.get(n): return os.environ[n]
    f = os.environ.get("AI_VIDEO_ENV")
    if "--env-file" in sys.argv:
        i = sys.argv.index("--env-file"); f = sys.argv[i + 1]; del sys.argv[i:i + 2]
    if f and os.path.exists(os.path.expanduser(f)):
        for l in open(os.path.expanduser(f)):
            k, _, v = l.strip().partition("=")
            if k in names and v: return v.strip().strip("\"'")
    sys.exit(f"missing API key: set {' or '.join(names)} (env) or pass --env-file FILE")
