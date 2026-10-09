---
name: auto-archive
description: Inspect or configure BB Auto Archive, preview archive/deletion sweeps, configure optional archive cleanup, or manage a thread's auto-archive exemption. Applies to BB thread retention requests; use Sidebar Plus for visual pin placement.
---

# Auto Archive

Use the installed `auto-archive` plugin. The default inactivity threshold is 15 days. Confirm the current configuration with `bb auto-archive status` before changing it.

```sh
bb auto-archive status
bb auto-archive run --dry-run
bb auto-archive cleanup --dry-run
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

## Optional archived-thread deletion

Automatic deletion is off by default. `deleteArchivedAfterDays` defaults to `13` and accepts positive whole days; invalid values disable deletion. The archive inactivity threshold is independent.

- Implementing or inspecting deletion controls does not authorize enabling deletion. Leave it off unless activation is explicitly requested.
- Preview with `bb auto-archive cleanup --dry-run`, which also works while automatic deletion is off. Do not use a real cleanup pass for testing.
- If activation is requested, inspect the current configuration and preview candidates before setting `deleteArchivedThreads` to `true`. Set the requested retention with `bb plugin config auto-archive set deleteArchivedAfterDays <days>`.
- Deletion requires both the archive timestamp and last activity/read/edit/creation to be old. Existing old archives can qualify as soon as cleanup is enabled.
- Pins, manual exemptions, recent/live/hidden/running/queued threads protect their connected family through both parent and lifecycle-owner relations. Incomplete or unavailable data is retained.
- The plugin rechecks the family immediately before each deletion and always refuses child cascades. Only eligible leaves are deleted; a parent is retained until its children are gone. No more than 25 are deleted per hourly pass.
- `bb auto-archive status` reports retention, enabled state, safeguards, and the last archive/cleanup results.

## Behavior

Activity means the latest attention timestamp from creation, turn completion, or error. Reading a thread or editing its metadata does not reset the inactivity window. Pins and their ancestors are always protected from automatic archiving, including project pins. Hidden and running roots are skipped by default. An old stored archivePinned=true setting cannot override pin protection. Threads already idle before the original plugin install remain protected.

Exemptions persist through reloads and updates and are removed on thread deletion. The sweeper rechecks exemptions and core state before each archive. If protected ancestry cannot be resolved, it avoids archiving rather than guessing.
