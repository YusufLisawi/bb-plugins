#!/bin/bash
# The skill ships code and docs only. Its media (fonts, the film-grain tile, the
# 42-effect SFX library, the Starter film's voice + music, the lookbook sheets)
# lives in an ASSET PACK outside the skill, so the skill stays small (< 10 MB)
# and syncs cleanly. assets.json (next to SKILL.md) lists every file + sha256.
#
#   Location: $MFS_ASSETS, default ~/.local/share/motion-film-studio
#
#   bash $SKILL/scripts/assets.sh path                  print the pack location
#   bash $SKILL/scripts/assets.sh check                 is every required file there?
#   bash $SKILL/scripts/assets.sh install <project>     copy the media into <project>/public
#   bash $SKILL/scripts/assets.sh pack <file.tar.gz>    bundle the pack (to copy to another machine)
#   bash $SKILL/scripts/assets.sh unpack <file.tar.gz>  install a bundle on this machine
#   bash $SKILL/scripts/assets.sh fonts                 re-download the fonts (Google Fonts, OFL)
#   bash $SKILL/scripts/assets.sh grain                 regenerate the film-grain tile
#   bash $SKILL/scripts/assets.sh adopt-sfx <project>   save a project's new/regenerated SFX into the pack
#
# New or missing SFX (ElevenLabs), from inside a project:
#   . scripts/el-env.sh && SFX_DIR=sfx .venv/bin/python scripts/sfx.py <name…>
#   .venv/bin/python scripts/sfx_library.py && bash $SKILL/scripts/assets.sh adopt-sfx .
# Never put media files in the skill itself: add them to the pack + assets.json.
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
A=${MFS_ASSETS:-${XDG_DATA_HOME:-$HOME/.local/share}/motion-film-studio}
CMD=${1:-check}
export A SKILL

py() { python3 - "$@"; }

case "$CMD" in
  path)
    echo "$A"
    ;;
  check)
    py <<'PY'
import hashlib, json, os, sys
A, S = os.environ["A"], os.environ["SKILL"]
man = json.load(open(f"{S}/assets.json"))
missing, optional, changed = [], [], []
for e in man["files"]:
    p = os.path.join(A, e["path"])
    if not os.path.exists(p):
        (optional if e.get("optional") else missing).append(e["path"])
    elif hashlib.sha256(open(p, "rb").read()).hexdigest() != e["sha256"]:
        changed.append(e["path"])
print(f"asset pack: {A}")
print(f"  {len(man['files']) - len(missing) - len(optional)}/{len(man['files'])} files present"
      + (f", {len(changed)} differ from the manifest (regenerated or edited: fine)" if changed else ""))
if optional:
    print(f"  optional missing: {len(optional)} (Starter voice/music and lookbook: the selftest skips the audio stages)")
if missing:
    print("  MISSING (required):")
    for m in missing: print("   ", m)
    print("  fix: copy a pack here (assets.sh unpack <file>), or rebuild: assets.sh fonts · assets.sh grain · sfx.py (see the header of assets.sh)")
    sys.exit(1)
PY
    ;;
  install)
    P=${2:?usage: assets.sh install <project_dir>}
    export P
    "$0" check >/dev/null || { "$0" check; exit 1; }
    py <<'PY'
import json, os, shutil
A, S, P = os.environ["A"], os.environ["SKILL"], os.environ["P"]
n = 0
for e in json.load(open(f"{S}/assets.json"))["files"]:
    src = os.path.join(A, e["path"])
    if not e.get("to") or not os.path.exists(src):
        continue
    dst = os.path.join(P, e["to"])
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst); n += 1
print(f"installed {n} media files from {A} into {P}/public")
PY
    ;;
  pack)
    OUT=${2:?usage: assets.sh pack <file.tar.gz>}
    tar -C "$A" -czf "$OUT" .
    echo "packed $A → $OUT ($(du -h "$OUT" | cut -f1)). On the other machine: bash \$SKILL/scripts/assets.sh unpack $(basename "$OUT")"
    ;;
  unpack)
    IN=${2:?usage: assets.sh unpack <file.tar.gz>}
    mkdir -p "$A" && tar -C "$A" -xzf "$IN" && "$0" check
    ;;
  fonts)
    mkdir -p "$A/fonts"
    py <<'PY'
import json, os, urllib.request
A, S = os.environ["A"], os.environ["SKILL"]
for e in json.load(open(f"{S}/assets.json"))["files"]:
    if "url" in e:
        dst = os.path.join(A, e["path"])
        urllib.request.urlretrieve(e["url"], dst)
        print("downloaded", e["path"], os.path.getsize(dst), "bytes")
PY
    ;;
  grain)
    mkdir -p "$A/img"
    py <<'PY'
# 512×512 grayscale noise tile, deterministic, PNG written with the stdlib only
import os, random, struct, zlib
A = os.environ["A"]; W = H = 512; rng = random.Random(7)
rows = b"".join(b"\x00" + bytes(max(0, min(255, int(rng.gauss(128, 40)))) for _ in range(W)) for _ in range(H))
chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 0, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")
open(os.path.join(A, "img", "grain.png"), "wb").write(png)
print("wrote", os.path.join(A, "img", "grain.png"))
PY
    ;;
  adopt-sfx)
    P=${2:?usage: assets.sh adopt-sfx <project_dir>}
    export P
    py <<'PY'
import glob, hashlib, json, os, shutil
A, S, P = os.environ["A"], os.environ["SKILL"], os.environ["P"]
mp = f"{S}/assets.json"; man = json.load(open(mp))
by = {e["path"]: e for e in man["files"]}
os.makedirs(f"{A}/sfx", exist_ok=True)
n = 0
for src in sorted(glob.glob(f"{P}/public/sfx/*.mp3")) + [f"{P}/public/sfx/library.json"]:
    if not os.path.exists(src):
        continue
    rel = "sfx/" + os.path.basename(src); dst = f"{A}/{rel}"
    sha = hashlib.sha256(open(src, "rb").read()).hexdigest()
    if rel in by and by[rel]["sha256"] == sha and os.path.exists(dst):
        continue
    shutil.copyfile(src, dst); n += 1
    e = by.get(rel) or {"path": rel, "to": "public/" + rel}
    e.update(bytes=os.path.getsize(dst), sha256=sha)
    if rel.endswith(".mp3"):
        e["rebuild"] = "sfx"
    if rel not in by:
        man["files"].append(e); by[rel] = e
man["files"].sort(key=lambda e: e["path"])
json.dump(man, open(mp, "w"), indent=1)
print(f"adopted {n} SFX file(s) into {A}/sfx and updated assets.json")
PY
    ;;
  *)
    sed -n '2,27p' "$0"; exit 1
    ;;
esac
