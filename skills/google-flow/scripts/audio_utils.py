"""audio_utils.py — small audio helpers shared by aistudio_tts.py and gemini_audio.py.

Standard library + ffmpeg. Everything raises RuntimeError; the scripts' main() turns it into the one-line JSON error.
  wav_info(path)                       sample rate / channels / bits / duration of a WAV
  ebur(path)                           integrated LUFS, loudness range and true peak (ffmpeg ebur128)
  to_mp3(src, dst, lufs, kbps)         gain to `lufs`, limiter just under full scale, 44.1 kHz MP3
  parse_wav(bytes)                     (rate, channels, bits, pcm bytes) from a RIFF WAV (or raw L16 with a rate)
  make_wav(pcm, rate, channels, bits)  RIFF WAV bytes
  join_wavs([bytes], pause_s)          trim each take's silent ends, join with a fixed pause (mono 16-bit)
"""
from __future__ import annotations

import array
import io
import re
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path


def need_ffmpeg():
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is required for this command")


def wav_info(p: Path) -> dict:
    try:
        with wave.open(str(p), "rb") as w:
            r = w.getframerate()
            return {"sample_rate": r, "channels": w.getnchannels(), "sample_width": w.getsampwidth() * 8,
                    "duration": round(w.getnframes() / r, 3)}
    except Exception:
        return {}


def ebur(src: Path) -> dict:
    """Integrated loudness (LUFS), loudness range (LU) and true peak (dBFS) from ffmpeg's ebur128."""
    need_ffmpeg()
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    i, lra, pk = (re.findall(p, err) for p in (r"I:\s+(-?[\d.]+) LUFS", r"LRA:\s+(-?[\d.]+) LU", r"Peak:\s+(-?[\d.]+) dBFS"))
    return {"lufs": float(i[-1]) if i else None, "lra": float(lra[-1]) if lra else None,
            "tp": float(pk[-1]) if pk else None}


def to_mp3(src: Path, dst: Path, lufs: float = -16.0, kbps: int = 128) -> float:
    """Gain to `lufs` integrated, a limiter just under full scale for the peaks, then 44.1 kHz mono MP3.

    loudnorm cannot reach -16 LUFS on speech takes (its true-peak ceiling stops the gain), so the gain is measured and
    corrected here, up to three passes. Returns the integrated loudness reached.
    """
    need_ffmpeg()
    dst.parent.mkdir(parents=True, exist_ok=True)
    gain = lufs - ebur(src)["lufs"]
    tmp = dst.with_suffix(".norm.wav")
    now = None
    for _ in range(3):
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af",
                        f"volume={gain:.2f}dB,alimiter=limit=0.84:attack=3:release=60", "-ac", "1", "-ar", "44100",
                        str(tmp)], check=True)
        now = ebur(tmp)["lufs"]
        if now is not None and abs(now - lufs) < 0.15:
            break
        gain += lufs - (now or lufs)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(tmp), "-codec:a", "libmp3lame",
                    "-b:a", f"{kbps}k", str(dst)], check=True)
    tmp.unlink()
    return now


# ---- WAV bytes ----------------------------------------------------------------------------------------------
def parse_wav(data: bytes, raw_rate: int = 24000):
    """(rate, channels, bits, pcm) from RIFF WAV bytes; headerless 16-bit mono PCM (audio/L16) takes `raw_rate`."""
    if data[:4] != b"RIFF":
        return raw_rate, 1, 16, data
    try:
        with wave.open(io.BytesIO(data), "rb") as w:
            return w.getframerate(), w.getnchannels(), w.getsampwidth() * 8, w.readframes(w.getnframes())
    except wave.Error:  # a streamed header can carry a bogus data length: read the data chunk by hand
        i = data.find(b"data")
        fmt = data.find(b"fmt ")
        ch, rate = struct.unpack("<HI", data[fmt + 10:fmt + 16])
        bits = struct.unpack("<H", data[fmt + 22:fmt + 24])[0]
        return rate, ch, bits, data[i + 8:]


def make_wav(pcm: bytes, rate: int, channels: int = 1, bits: int = 16) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(bits // 8)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _samples(pcm: bytes) -> array.array:
    a = array.array("h")
    a.frombytes(pcm[: len(pcm) // 2 * 2])
    if sys.byteorder == "big":
        a.byteswap()
    return a


def _bytes(a: array.array) -> bytes:
    if sys.byteorder == "big":
        a = array.array("h", a)
        a.byteswap()
    return a.tobytes()


def trim_silence(a: array.array, rate: int, thresh_db: float = -48.0, win_ms: int = 10, keep_ms: int = 15) -> array.array:
    """Cut the silent head and tail of a mono 16-bit take (scans windows inward from each end), keeping `keep_ms` of air."""
    win = max(1, rate * win_ms // 1000)
    limit = (10 ** (thresh_db / 20) * 32768) ** 2

    def loud(i):
        seg = a[i:i + win]
        return bool(seg) and sum(s * s for s in seg) / len(seg) > limit

    n = len(a)
    start = 0
    while start < n and not loud(start):
        start += win
    end = n
    while end > start and not loud(max(0, end - win)):
        end -= win
    keep = rate * keep_ms // 1000
    return a[max(0, start - keep):min(n, end + keep)]


def join_wavs(blobs: list, pause_s: float = 0.25, fade_ms: int = 12, raw_rate: int = 24000) -> bytes:
    """Join takes (mono 16-bit, one sample rate) with exactly `pause_s` of silence between them.

    Each take loses its silent head and tail first (so the pause is the whole gap, not model silence on top of it), and
    gets a short fade at every join so nothing clicks. One take is returned untouched."""
    if len(blobs) == 1:
        return blobs[0] if blobs[0][:4] == b"RIFF" else make_wav(blobs[0], raw_rate)
    takes, rate0 = [], None
    for b in blobs:
        rate, ch, bits, pcm = parse_wav(b, raw_rate)
        if ch != 1 or bits != 16:
            raise RuntimeError(f"chunks must be mono 16-bit to join (got {ch} ch, {bits} bit)")
        if rate0 is None:
            rate0 = rate
        elif rate != rate0:
            raise RuntimeError(f"chunks differ in sample rate ({rate0} vs {rate})")
        takes.append(trim_silence(_samples(pcm), rate))
    fade = rate0 * fade_ms // 1000
    gap = array.array("h", bytes(2 * int(rate0 * pause_s)))
    out = array.array("h")
    for k, t in enumerate(takes):
        t = array.array("h", t)
        f = min(fade, len(t) // 2)
        if k > 0:
            for i in range(f):
                t[i] = int(t[i] * i / f)
        if k < len(takes) - 1:
            for i in range(f):
                t[len(t) - 1 - i] = int(t[len(t) - 1 - i] * i / f)
        out.extend(t)
        if k < len(takes) - 1:
            out.extend(gap)
    return make_wav(_bytes(out), rate0)
