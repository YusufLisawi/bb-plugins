#!/usr/bin/env python3
"""Audio helpers shared by every pipeline script: decode anything to float
stereo 48 kHz (Remotion's bundled ffmpeg), find an effect's lead-in silence,
a look-ahead peak limiter, loudness (ffmpeg loudnorm, the only loudness filter
Remotion's ffmpeg ships) and a 16-bit WAV writer."""
import json, os, subprocess, sys, wave
import numpy as np

SR = 48000
FF = ["npx", "--yes", "remotion", "ffmpeg", "-hide_banner", "-v", "error", "-y"]

def load(path):
    tmp = f"/tmp/_mix_{os.getpid()}.wav"
    subprocess.run(FF + ["-i", path, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", tmp], check=True, capture_output=True)
    with wave.open(tmp) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
    os.remove(tmp)
    return x

def lead_in(x, thr_db=-42):
    """Samples of silence before the effect actually starts (0 if it starts loud)."""
    thr = 10 ** (thr_db / 20)
    loud = np.where(np.abs(x).max(axis=1) > thr)[0]
    if len(loud) == 0:
        return 0
    return max(0, int(loud[0]) - int(0.004 * SR))  # keep 4 ms of pre-roll

def limiter(x, ceiling_db=-2.0, look_ms=5, release_ms=80):
    ceil = 10 ** (ceiling_db / 20)
    blk = int(SR * look_ms / 1000)
    n = int(np.ceil(len(x) / blk))
    pad = np.zeros((n * blk, 2), np.float32)
    pad[: len(x)] = x
    peak = np.abs(pad).max(axis=1).reshape(n, blk).max(axis=1)
    g = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
    # look ahead one block, then release smoothly
    g = np.minimum(g, np.concatenate([g[1:], [1.0]]))
    step = blk / (SR * release_ms / 1000)
    for i in range(1, n):
        g[i] = min(g[i], g[i - 1] + step * (1 - g[i - 1]) + 1e-4)
    gs = np.interp(np.arange(n * blk), np.arange(n) * blk + blk / 2, g)
    return (pad * gs[:, None])[: len(x)], float(g.min())

def lufs(x):
    tmp = f"/tmp/_mixm_{os.getpid()}.wav"
    write_wav(tmp, x)
    out = subprocess.run(["npx", "--yes", "remotion", "ffmpeg", "-hide_banner", "-i", tmp,
                          "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    os.remove(tmp)
    j = json.loads(out[out.index("{"): out.rindex("}") + 1])
    return float(j["input_i"]), float(j["input_tp"])

def write_wav(path, x):
    y = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
