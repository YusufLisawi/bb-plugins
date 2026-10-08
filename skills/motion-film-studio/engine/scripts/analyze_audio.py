#!/usr/bin/env python3
"""Measure a music bed so the edit can be cut to it (I can't listen, so I measure).

For each file it prints: duration, estimated tempo, the phase of the 120 BPM
grid that best fits the onsets, the loudness per section (build / drop / tail),
the frames where the biggest energy jumps happen (drop, final hit), and writes:

  <out>/<name>.png          spectrogram + RMS + onset curve, beat grid overlaid
  <out>/<name>.env.json     per-video-frame envelopes (rms, low, mid, high, 24
                            spectrum bands) that drive the audio-reactive visuals

Usage: .venv/bin/python scripts/analyze_audio.py <out_dir> file.mp3 [file.mp3 ...]
"""
import json, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw

FPS = int(os.environ.get("ANALYZE_FPS", 60))
SR = 24000
HOP = SR // FPS          # one video frame of samples
NFFT = 2048
BPM = float(os.environ.get("ANALYZE_BPM", 120))
BEAT = FPS * 60 / BPM
MARKS = [float(m) for m in os.environ.get("ANALYZE_MARKS", "4,12").split(",")]

def decode(path):
    """Remotion's bundled ffmpeg has no raw f32le muxer, so decode to a 16-bit WAV."""
    tmp = f"/tmp/_an_{os.getpid()}.wav"
    subprocess.run(["npx", "--yes", "remotion", "ffmpeg", "-v", "error", "-y", "-i", path,
                    "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", "-f", "wav", tmp],
                   capture_output=True, check=True)
    with wave.open(tmp) as w:
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    os.remove(tmp)
    return data.astype(np.float32) / 32768.0

def stft_mag(x):
    pad = np.concatenate([np.zeros(NFFT // 2, np.float32), x, np.zeros(NFFT, np.float32)])
    n = (len(x)) // HOP
    win = np.hanning(NFFT).astype(np.float32)
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    frames = pad[idx] * win
    return np.abs(np.fft.rfft(frames, axis=1))       # (n_frames, NFFT/2+1)

def band(mag, lo, hi):
    f = np.fft.rfftfreq(NFFT, 1 / SR)
    m = (f >= lo) & (f < hi)
    return mag[:, m].mean(axis=1)

def norm(v):
    v = np.asarray(v, dtype=np.float64)
    p = np.percentile(v, 99.5) or 1.0
    return np.clip(v / p, 0, 1)

def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    for path in sys.argv[2:]:
        name = os.path.splitext(os.path.basename(path))[0]
        x = decode(path)
        dur = len(x) / SR
        mag = stft_mag(x)
        n = mag.shape[0]
        rms = np.sqrt(np.convolve(x ** 2, np.ones(HOP) / HOP, mode="same")[::HOP][:n])
        logm = np.log1p(mag * 10)
        flux = np.maximum(0, np.diff(logm, axis=0, prepend=logm[:1])).sum(axis=1)
        flux = flux - np.convolve(flux, np.ones(9) / 9, mode="same")
        flux = np.maximum(flux, 0)

        # tempo from onset autocorrelation (60..180 BPM)
        ac = np.correlate(flux - flux.mean(), flux - flux.mean(), mode="full")[n - 1:]
        lags = np.arange(len(ac))
        lo_lag, hi_lag = int(FPS * 60 / 180), int(FPS * 60 / 60)
        best = lo_lag + int(np.argmax(ac[lo_lag:hi_lag]))
        tempo = 60 * FPS / best

        # phase of the fixed 120 BPM grid that best matches the onsets
        scores = []
        for ph in range(int(BEAT)):
            pos = np.arange(ph, n, BEAT).astype(int)
            scores.append(flux[pos].sum())
        phase = int(np.argmax(scores))
        grid_fit = max(scores) / (np.mean(scores) or 1)

        low = band(mag, 20, 150)
        mid = band(mag, 150, 2000)
        high = band(mag, 2000, 10000)
        db = lambda a: 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-9)
        sec = lambda a, b: x[int(a * SR):int(b * SR)]
        print(f"\n== {name}  {dur:.2f}s  tempo≈{tempo:.1f} BPM  (lag {best}f)  "
              f"120-grid phase={phase}f fit={grid_fit:.2f}")
        edges = [0.0] + MARKS + [dur]
        print("   loudness dBFS by section: " + " | ".join(f"{a:.1f}-{b:.1f}s {db(sec(a, b)):6.1f}" for a, b in zip(edges, edges[1:]))
              + f" | peak {20*np.log10(np.abs(x).max()+1e-9):5.1f}")
        # biggest low-band jumps (drop / final hit candidates)
        lowd = np.diff(np.convolve(low, np.ones(4) / 4, mode="same"), prepend=0)
        cand = np.argsort(lowd)[::-1]
        picked = []
        for c in cand:
            if all(abs(c - p) > 20 for p in picked):
                picked.append(int(c))
            if len(picked) == 6:
                break
        print("   biggest bass jumps at frames:", ", ".join(f"{p} ({p/FPS:.2f}s)" for p in sorted(picked)))
        # kick-ish onsets in low band
        lb = norm(low)
        kicks = [i for i in range(2, n - 2) if lb[i] > 0.45 and lb[i] >= lb[i - 2:i + 3].max()
                 and lb[i] - lb[max(0, i - 4)] > 0.15]
        print("   low-band onsets (first 40):", " ".join(str(k) for k in kicks[:40]))
        # silence at start/end
        thr = 10 ** (-45 / 20)
        nz = np.where(np.abs(x) > thr)[0]
        print(f"   first sound {nz[0]/SR:.3f}s  last sound {nz[-1]/SR:.3f}s")

        # 24 log-spaced spectrum bands for visuals
        f = np.fft.rfftfreq(NFFT, 1 / SR)
        edges = np.geomspace(40, 9000, 25)
        bands = np.stack([mag[:, (f >= edges[i]) & (f < edges[i + 1])].mean(axis=1) for i in range(24)], axis=1)
        bands = np.log1p(bands * 4)
        bands = bands / (np.percentile(bands, 99.5, axis=0) + 1e-9)
        env = {"fps": FPS, "frames": n, "tempo": round(tempo, 2), "phase": phase,
               "rms": np.round(norm(rms), 3).tolist(), "low": np.round(norm(low), 3).tolist(),
               "mid": np.round(norm(mid), 3).tolist(), "high": np.round(norm(high), 3).tolist(),
               "onset": np.round(norm(flux), 3).tolist(),
               "bands": np.round(np.clip(bands, 0, 1), 3).tolist()}
        json.dump(env, open(f"{out_dir}/{name}.env.json", "w"))

        # picture: spectrogram (top), rms/low/onset curves (bottom), beat grid
        W, H1, H2 = 1600, 360, 240
        spec = np.log1p(mag[:, : NFFT // 4] * 20).T[::-1]
        spec = (255 * spec / (spec.max() or 1)).astype(np.uint8)
        img = Image.fromarray(spec).resize((W, H1))
        canvas = Image.new("RGB", (W, H1 + H2), "white")
        canvas.paste(img.convert("RGB"), (0, 0))
        d = ImageDraw.Draw(canvas)
        xs = lambda i: int(i / n * W)
        for i in range(phase, n, int(BEAT)):
            k = round((i - phase) / BEAT)
            col = (217, 87, 89) if k % 4 == 0 else (190, 190, 190)
            d.line([(xs(i), H1), (xs(i), H1 + H2)], fill=col, width=2 if k % 4 == 0 else 1)
        for s in MARKS:
            d.line([(xs(s * FPS), 0), (xs(s * FPS), H1 + H2)], fill=(0, 120, 255), width=2)
        for arr, col in ((norm(rms), (20, 20, 20)), (lb, (217, 87, 89)), (norm(flux), (120, 120, 120))):
            pts = [(xs(i), H1 + H2 - 8 - int(arr[i] * (H2 - 16))) for i in range(n)]
            d.line(pts, fill=col, width=1)
        for s in range(0, int(dur) + 1):
            d.text((xs(s * FPS) + 2, H1 + 2), f"{s}s", fill=(0, 0, 0))
        canvas.save(f"{out_dir}/{name}.png")
        print(f"   wrote {out_dir}/{name}.png and {name}.env.json")

if __name__ == "__main__":
    main()
