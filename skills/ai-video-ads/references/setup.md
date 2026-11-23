# Setup: keys, Remotion and tools

## API keys (see `.env.example`)

| Variable | Needed | Used for |
|---|---|---|
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | for the API route | Omni 1.2 takes (≈ $0.07/s at 720p), Nano Banana stills |
| `ELEVENLABS_API_KEY` | always | word timings for cutting, captions and QA; voice-overs |
| `HF_API_KEY_ID` + `HF_API_KEY_SECRET` | optional | Higgsfield / Seedance |
| none (Google account) | for the Flow route | Flow credits via `google-flow` + PinchTab, signed in inside the PinchTab profile |

Minimum: `GEMINI_API_KEY` **or** a signed-in Flow account, plus `ELEVENLABS_API_KEY`.
Scripts read the environment, then `--env-file FILE` or `AI_VIDEO_ENV`. Never commit `.env` or paste keys in chat.

## Remotion

- No Remotion API key or account is needed to render.
- **License:** free for individuals and companies with up to 3 employees; larger companies need a Remotion Company
  License (remotion.pro). Check before rendering client work.
- Pin one Remotion version across the project and every render machine (mismatched versions fail to render).
- Fast renders: the `remotion-render-farm` skill. `farm setup` creates its own token (`~/.config/bb-farm/token`);
  extra GPU machines need bun, SSH key access and a private network (e.g. Tailscale); setup installs Chrome.

## Local tools

ffmpeg + ffprobe (cutting, mixing, QA) · python3 + curl (scripts are standard library only) · Node or bun (the
Remotion project) · Playwright Chromium (capturing real product screens).
