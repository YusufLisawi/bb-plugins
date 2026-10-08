# Source me: exports ELEVENLABS_API_KEY, FISH_API_KEY (Fish Audio voices) and
# DEEPGRAM_API_KEY (Nova-3 word timestamps)
# for the pipeline scripts WITHOUT ever printing them. Order: an already-set env var, then $ELEVENLABS_ENV_FILE, then
# ~/.config/motion-film-studio/elevenlabs.env, then the known location on yusuf-pc.
# Never echo, log, commit or paste the key anywhere.
if [ -z "$ELEVENLABS_API_KEY" ]; then
  for f in "$ELEVENLABS_ENV_FILE" "$HOME/.config/motion-film-studio/elevenlabs.env" "$HOME/Developer/eva-bb-bundle-2026-09-16/agents/creative/.env.local"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
      ELEVENLABS_API_KEY="$(grep -E '^ELEVENLABS_API_KEY=' "$f" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
      [ -n "$ELEVENLABS_API_KEY" ] && break
    fi
  done
  export ELEVENLABS_API_KEY
fi
[ -n "$ELEVENLABS_API_KEY" ] || echo "ELEVENLABS_API_KEY not found — set it or ELEVENLABS_ENV_FILE" >&2

# Fish Audio (optional voice engine: vo_take.py --provider fish, or MFS_TTS=fish)
if [ -z "$FISH_API_KEY" ]; then
  for f in "$FISH_ENV_FILE" "$HOME/.config/motion-film-studio/fish.env"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
      FISH_API_KEY="$(grep -E '^FISH_API_KEY=' "$f" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
      [ -n "$FISH_API_KEY" ] && break
    fi
  done
  export FISH_API_KEY
fi

# Deepgram (Nova-3 speech-to-text with true per-word timestamps; scripts/stt.py prefers it)
if [ -z "$DEEPGRAM_API_KEY" ]; then
  for f in "$DEEPGRAM_ENV_FILE" "$HOME/.config/motion-film-studio/deepgram.env"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
      DEEPGRAM_API_KEY="$(grep -E '^DEEPGRAM_API_KEY=' "$f" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
      [ -n "$DEEPGRAM_API_KEY" ] && break
    fi
  done
  export DEEPGRAM_API_KEY
fi
