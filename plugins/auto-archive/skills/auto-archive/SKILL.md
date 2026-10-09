---
name: auto-archive
description: Inspect or configure BB Auto Archive, preview inactivity sweeps, or manage a thread's auto-archive exemption. Applies to BB thread retention requests; use Sidebar Plus for visual pin placement.
---

# Auto Archive

Use the installed `auto-archive` plugin. The default inactivity threshold is 15 days. Confirm the current configuration with `bb auto-archive status` before changing it.

```sh
bb auto-archive status
bb auto-archive run --dry-run
bb plugin config auto-archive set inactivityDays 15
```

Do not run a real sweep merely to verify a configuration change. `bb auto-archive run` performs the user's configured archives immediately; use it when that action is requested.

## Per-thread exemptions

Sidebar Plus offers **Disable auto-archive** and **Enable auto-archive** in thread context menus, including mobile long-press menus. Exemptions do not pin threads. An exempt child protects its ancestors from cascade archives. Manual archive actions remain available.

Read exemptions:

```sh
bb plugin rpc call auto-archive getExemptions --json
```

To change one, write the exact JSON `{ "threadId": "<resolved-id>", "exempt": true }` to a temporary file and pass it to `bb plugin rpc call auto-archive setExemption --input-file <file> --json`. Use `false` to re-enable auto-archive. Resolve the thread ID from `bb thread list` or `bb thread show` first, then verify the returned IDs. These reversible changes are permitted when the user has requested them.

## Behavior

Activity means the latest attention timestamp from creation, turn completion, or error. Reading a thread or editing its metadata does not reset the inactivity window. Pinned, hidden, and running roots are skipped by default. Threads already idle before the original plugin install remain protected.

Exemptions persist through reloads and updates and are removed on thread deletion. The sweeper rechecks exemptions and core state before each archive. If protected ancestry cannot be resolved, it avoids archiving rather than guessing.
