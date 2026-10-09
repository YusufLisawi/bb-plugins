---
title: Auto Archive
updated: 2026-10-09
tags: [bb, threads]
---

# Auto Archive

A repository-managed fork of [slogsdon/bb-plugin-auto-archive](https://github.com/slogsdon/bb-plugin-auto-archive), based on version 0.1.4. The upstream MIT license is retained in [LICENSE](LICENSE).

Inactive root threads are archived after 15 days by default. Existing configuration and the original install timestamp use the same plugin ID and storage keys. The hourly sweep retains the upstream safeguards for pinned, hidden, running, and pre-install idle threads.

## Exempt individual threads

In Sidebar Plus, right-click a thread or hold it on mobile, then choose **Disable auto-archive**. Choose **Enable auto-archive** to remove the exemption. Exemptions are stored on the server and work without pinning the thread.

> [!NOTE]
> An exempt child protects its ancestors because archiving a parent cascades to its children. Manual archiving remains available.

The sweeper rechecks exemptions, activity, and pin state immediately before each archive. Exemption writes and archives are serialized. Deleted threads lose their exemptions automatically; unresolved exemption ancestry stops a sweep safely.

## Commands

```sh
bb auto-archive status
bb auto-archive run --dry-run
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
