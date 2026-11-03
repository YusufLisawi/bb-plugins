---
name: generated-images
description: Show images to the user in the BB Generated Images viewer. Use whenever you create, render, download or screenshot an image the user should see, or point them to an image file, with any provider; Codex built-in image generation is picked up automatically.
---

# Generated images viewer

Register image files in the current thread's Generated Images tray and panel:

```bash
bb generated-images import path/to/image.png /tmp/shot.jpg
```

Pass `--thread <thread-id>` when running outside the thread. Paths may be
inside the thread workspace, `$BB_THREAD_STORAGE` or `/tmp`; the command
verifies each file on the thread's host and rejects anything else. It
registers paths without copying image bytes, so keep the files in place.
Re-importing a path updates the existing entry rather than adding a duplicate.

Local images embedded in your final reply as `![alt](path)` are imported
automatically when the turn ends, but running the command is the reliable way.
