---
title: Mobile Voice Tap
status: done
updated: 2026-10-11
tags: [bb, plugin, mobile, voice]
---

# Mobile Voice Tap

Restores reliable touch activation for BB's microphone button on devices with a coarse pointer. It keeps the requested 40 px target, starts voice input once per tap, and ignores cancelled touches, scrolling gestures and disabled buttons. Desktop pointer behavior stays native.

> [!IMPORTANT] Persistent installation
> Install from this repository directory. A thread workspace can be destroyed after that thread is archived, which removes a plugin installed from that workspace.

The original source was recovered from the recorded file changes in @thread:thr_nt4ryxm86d after its workspace was destroyed. This restoration preserves its final 40 px behavior and uses the current BB Plugin SDK.

```bash
npm install --include=dev
npm test
npm run typecheck
bb plugin build .
bb plugin install . --yes
```

Reload BB on the phone after installing. The plugin enhances the existing microphone control and does not add a separate sidebar page.
