# Sidebar Plus (bb plugin)

An editable bb sidebar that keeps bb's look but reorganizes it around
*what needs you*:

- **Smart sections** — *Needs attention* (questions, approvals, failures),
  *In progress*, *Done* (finished and unread), *Pinned*. Each can be toggled
  and reordered.
- **Colored status** — the same glyphs bb draws, painted with theme tokens:
  orange while working, green when done, blue when waiting on you, red on
  failure. Just the glyph/dot, never the whole row. Can be switched off.
- **Projects as folders** — every project is a folder with a status cluster
  and thread count; open it to see its threads as a tree (children indented).
  The active thread's project opens automatically; folders remember what you
  opened. Hover a folder for “New thread here”.
- **Icon grid for the top nav** — Extensions and plugin pages (Dispatch,
  Automations, Docs, …) become small icon tiles in a configurable grid; New
  thread / Search are styled to match. The rows stay host-rendered, so
  right-click → *Hide from sidebar*, drag-to-reorder and split-drag keep
  working, and a plugin's live count becomes a corner badge.
- **Customize anywhere** — the sliders icon at the top of the list opens the
  editor as a popover; the same editor is on the plugin's settings page.
  Changes save immediately and sync to every open window.
- **Search** filters everything into one flat list; right-click any row for
  Open in split / Rename / Mark read / Pin / Archive / Delete; double-click a
  title to rename inline. Keyboard thread shortcuts work as in bb.

## Install

```sh
bb plugin install /path/to/bb-plugin-sidebar-plus
```

If another sidebar plugin is enabled, pick this one under
**Settings → Appearance → Sidebar**.

## Develop

```sh
npm install
bb plugin dev      # rebuild + reload on save
npm run typecheck
```

Layout state lives in the plugin's kv store (`layout`); per-client collapse
state lives in `localStorage` under `sidebar-plus:ui`.
