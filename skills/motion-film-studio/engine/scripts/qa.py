#!/usr/bin/env python3
"""The QA gate for a finished master — run it before showing anyone the film.

  . scripts/el-env.sh && .venv/bin/python scripts/qa.py out/<id>.mp4 out/<id>-final films/<id>/script.txt [--no-stt]

Checks (and prints PASS/FAIL per line, writes <mp4>.qa.json):
  format     1080×1920 / 1920×1080 / …, 30 fps, H.264 High, BT.709, AAC 320k
  loudness   −14 LUFS ± 0.5, true peak ≤ −1.5 dBTP
  glitches   one-frame spikes in the finished frames (scripts/glitch_scan.py);
             a flag on a deliberate impact (stamp slam, drop flash) is fine —
             LOOK at the frames around it before accepting it
  speech     speech-to-text of the master's audio vs the script (tags removed):
             ≥ 98 % of script words heard = the mix never masks the voice
"""
import json, os, re, subprocess, sys
sys.path.insert(0, "scripts")
from audio import load, lufs

FF = ["npx", "--yes", "remotion"]

def probe(mp4):
    """Structured ffprobe (Remotion's build prints profile 100 = High)."""
    out = subprocess.run(FF + ["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,profile,width,height,r_frame_rate,bit_rate,color_primaries",
                               "-show_entries", "format=duration", "-of", "json", mp4], capture_output=True, text=True).stdout
    j = json.loads(out[out.index("{"):])
    v = next((s for s in j["streams"] if s.get("codec_name") == "h264"), {})
    a = next((s for s in j["streams"] if s.get("codec_name") == "aac"), {})
    num, den = (v.get("r_frame_rate") or "0/1").split("/")
    return {"seconds": round(float(j["format"]["duration"]), 2), "profile": "High" if v.get("profile") in ("100", "High") else v.get("profile"),
            "size": f"{v.get('width')}x{v.get('height')}", "fps": round(int(num) / max(1, int(den)), 3), "bt709": v.get("color_primaries") == "bt709",
            "audio_kbps": round(int(a.get("bit_rate", 0)) / 1000)}

def glitches(final_dir):
    out = subprocess.run([sys.executable, "scripts/glitch_scan.py", final_dir], capture_output=True, text=True).stdout
    line = next((l for l in out.splitlines() if l.startswith("one-frame spikes")), "")
    return line.split(":", 1)[1].strip() if line else "scan failed"

def stt(mp4, script_path):
    if not any(os.environ.get(k) for k in ("DEEPGRAM_API_KEY", "ELEVENLABS_API_KEY", "FISH_API_KEY")):
        return None, "no key"
    tmp = f"/tmp/_qa_{os.getpid()}.mp3"
    subprocess.run(FF + ["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", mp4, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", tmp], check=True)
    from stt import transcribe
    heard = transcribe(tmp)[0]
    os.remove(tmp)
    norm = lambda s: re.findall(r"[a-z0-9áéíóúñü']+", s.lower().replace("brainfast.ai", "brainfast ai").replace("dot a i", "ai"))
    script = re.sub(r"\[[^\]]+\]", " ", open(script_path).read())
    want, got = norm(script), norm(heard)
    pool = list(got)
    hit = 0
    for w in want:
        if w in pool:
            pool.remove(w)
            hit += 1
    return (hit / max(1, len(want))), heard

def main():
    mp4, final_dir = sys.argv[1], sys.argv[2]
    script = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else None
    rep = {"probe": probe(mp4)}
    tmp = f"/tmp/_qa_{os.getpid()}.wav"
    subprocess.run(FF + ["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", mp4, "-vn", "-c:a", "pcm_s16le", tmp], check=True)
    rep["lufs"], rep["dbtp"] = lufs(load(tmp))
    os.remove(tmp)
    rep["glitches"] = glitches(final_dir)
    if script and "--no-stt" not in sys.argv:
        rep["speech_match"], rep["heard"] = stt(mp4, script)
    p = rep["probe"]
    checks = [
        ("format", p["profile"] == "High" and p["bt709"] and p["fps"] == 30 and (p["audio_kbps"] or 0) >= 300, f"{p['size']} {p['fps']}fps {p['profile']} bt709={p['bt709']} aac {p['audio_kbps']}k {p['seconds']}s"),
        ("loudness", abs(rep["lufs"] + 14) <= 0.5 and rep["dbtp"] <= -1.5, f"{rep['lufs']:.2f} LUFS / {rep['dbtp']:.2f} dBTP"),
        ("glitches", rep["glitches"] == "none", rep["glitches"]),
    ]
    if "speech_match" in rep and rep["speech_match"] is not None:
        checks.append(("speech", rep["speech_match"] >= 0.98, f"{rep['speech_match'] * 100:.1f}% of script words heard"))
    for name, ok, info in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name:9} {info}")
    if rep.get("heard"):
        print("heard:", rep["heard"])
    json.dump(rep, open(mp4 + ".qa.json", "w"), indent=1)

if __name__ == "__main__":
    main()
