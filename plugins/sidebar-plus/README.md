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
  opened. Five recent threads appear initially; **Show 5 more** reveals the
  next five. Children count toward that limit. Hover a folder for “New thread
  here”, or hold it on mobile for **Start new thread in this project**.
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

## Order project folders

Hold a project folder on mobile or right-click it on desktop to choose **Move folder up**, **Move folder down**, **Move folder to top**, or **Move folder to bottom**. You can also open **Customize sidebar → Project folders** and use the labelled arrow buttons.

Your custom order is saved on the server and shared across devices. New projects appear after the saved folders; deleted projects are ignored. **Use recent activity order** returns to automatic sorting, with Personal last. Personal can be placed anywhere in a custom order.

## Thread menus

Right-click a thread, use its actions button, or hold it on mobile:

| Action | Result |
| --- | --- |
| Pin globally | Keep the thread in the sidebar's global Pinned section. |
| Pin in project | Keep it at the top of its project folder, above the five recent threads, with a leading pin icon. |
| Move to project pinned section | Move an existing global pin into its folder. Offered only for pinned threads. |
| Move to global pinned section | Move a project pin back to the global Pinned section. |
| Unpin | Remove the pin from either location. |
| Disable auto-archive | Exempt the thread from the inactivity policy without pinning it. |
| Enable auto-archive | Remove the exemption and apply the usual inactivity policy again when the thread is unpinned. |

> [!NOTE]
> Pinned threads are always protected from automatic archiving and deletion, in either location. Archive exemptions require this repository's Auto Archive plugin. The menu shows **Auto-archive unavailable** if that plugin cannot be reached. Pin placement and exemptions are saved on the server and update across open windows. Existing follow-up marks remain independent.

## Develop

```sh
npm install
bb plugin dev      # rebuild + reload on save
npm run typecheck
npm test
```

Layout state lives in the plugin's kv store (`layout`); per-client collapse
state lives in `localStorage` under `sidebar-plus:ui`.
