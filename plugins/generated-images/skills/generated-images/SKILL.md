---
name: generated-images
description: Import saved workspace images into the current BB thread's generated-images viewer when an image tool did not emit a Codex image-generation event.
---

# Generated images viewer

Use this when the user asks to show image files already saved in the current
thread's workspace in the Generated Images tray or panel.

Run the plugin command with the thread ID and one or more image paths:

```bash
bb generated-images import --thread <thread-id> path/to/image.png path/to/other.jpg
```

Use paths inside the thread workspace. The command verifies each file on that
thread's host and rejects paths outside the workspace. It registers paths
without copying image bytes, so keep the source files in place. Re-importing a
path updates the existing gallery entry rather than adding a duplicate.
