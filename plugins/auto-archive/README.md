---
title: Auto Archive
updated: 2026-10-09
tags: [bb, threads]
---

# Auto Archive

A repository-managed fork of [slogsdon/bb-plugin-auto-archive](https://github.com/slogsdon/bb-plugin-auto-archive), based on version 0.1.4. The upstream MIT license is retained in [LICENSE](LICENSE).

Inactive root threads are archived after 15 days by default. Existing configuration and the original install timestamp use the same plugin ID and storage keys. Pins are always protected in either Sidebar Plus location, including pinned children. The hourly sweep retains the upstream safeguards for hidden, running, and pre-install idle threads. The old option to archive pins is no longer supported; stored legacy values are ignored.

## Exempt individual threads

In Sidebar Plus, right-click a thread or hold it on mobile, then choose **Disable auto-archive**. Choose **Enable auto-archive** to remove the exemption. Exemptions are stored on the server and work without pinning the thread.

> [!NOTE]
> An exempt child protects its ancestors because archiving a parent cascades to its children. Manual archiving remains available.

The sweeper rechecks exemptions, activity, and pin state immediately before each archive. Exemption writes and archives are serialized. Deleted threads lose their exemptions automatically; unresolved exemption ancestry stops a sweep safely.

## Optional deletion of archived threads

In **Settings → Auto Archive**, enable **Automatically delete archived threads** and choose **Delete after days in archive**. Cleanup is **off by default**, with a suggested retention of **13 days**. Archive inactivity and deletion retention are separate settings; lowering the archive threshold to 5 days does not change deletion retention.

> [!IMPORTANT]
> Deletion is permanent. The timer counts from archiving and last use, so a newly archived thread is retained for the full period. Opening or editing an archive delays cleanup. Existing old archives can qualify immediately after cleanup is enabled; preview first with `bb auto-archive cleanup --dry-run`.

Cleanup protects every family containing a pinned, manually exempt, unarchived, recent, hidden, running, or queued thread. It checks both visible parents and lifecycle ownership, refreshes the family before each deletion, and skips incomplete or unavailable data.

There is **no cascading deletion**: only eligible threads without children are removed, using BB's explicit refusal of child cascades. Old children can be deleted individually; their parent becomes eligible on a later sweep after the children are gone. Each hourly pass deletes at most 25 threads. Invalid retention values disable deletion, and disabling cleanup or switching to dry-run stops further deletion.

Previewing works while automatic deletion is off and never changes threads. Automatic deletion remains off until the user enables it; manual deletion continues to use BB's own confirmation flow.

## Commands

```sh
bb auto-archive status
bb auto-archive run --dry-run
bb auto-archive cleanup --dry-run
bb plugin config auto-archive set inactivityDays 15
```

The typed RPCs are `getExemptions` (null input) and `setExemption` (`{ threadId, exempt }`). See [the agent guide](skills/auto-archive/SKILL.md) for usage.

## Development

```sh
npm install
npm run typecheck
npm test
bb plugin types --check
bb plugin build
```

When replacing an existing community installation, BB requires removing the old source before installing this path. Back up and restore its settings, and preserve the 15-day threshold during the change. BB keeps the plugin's KV data across source replacement, including its original install timestamp.
