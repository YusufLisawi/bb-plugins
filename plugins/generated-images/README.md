# Generated Images for BB

This plugin keeps images visible in the thread
conversation after a turn completes. It indexes completed
`provider/unhandled` image-generation events, stores only their host file paths
in the plugin database, also picks up images that other agents register or
embed (see below), serves those files through authenticated local routes,
and injects a compact tray directly after the latest assistant message.

The gallery is intentionally separate from BB's existing Image Preview plugin:
Image Preview can enlarge `<img>` elements that already exist, while this
plugin creates the missing conversation-level `<img>` elements.

## Images from other tools

Every thread's agent instructions tell it to register any image the user should
see, whatever the provider:

```bash
bb generated-images import --thread <thread-id> path/to/image.png /tmp/shot.jpg
```

The command verifies the files on the thread's host and accepts paths inside
the thread workspace, the thread's storage directory (`$BB_THREAD_STORAGE`) or
`/tmp`. It stores file paths, not duplicate image bytes; moving or deleting an
imported file makes it unavailable to the viewer. Importing the same path again
updates the existing entry.

When a turn ends, local images embedded in the assistant's final reply as
`![alt](path)` or `<img src="path">` are imported automatically. URLs, plain
links and images inside code are ignored, as are paths outside those roots or
files that cannot be read.

## Tray controls

- Select **Generated images** to collapse or expand the thumbnail strip.
- Select **×** to dismiss it for the current thread in this browser.
- A small **Images · N** chip remains after dismissal; select it to restore the
  tray.
- Select a thumbnail to open the **Generated images** side-panel tab on that
  image. The panel uses the available space for a large, ratio-safe viewer.
- Select any thumbnail in the bottom carousel to make it active; the panel tab
  stays open and follows new clicks from the conversation tray.
- Use the compact **‹ / count / ›** controls, or the **Left / Right** arrow
  keys, to move between images. **Home** and **End** jump to the first or last.
- Use the mouse wheel or double-click to zoom, then drag to pan while zoomed.
  The small **− / percentage / +** control is available when you want precise
  steps. Press **0** to reset the view.
- Open **More image actions** to copy the image, download it, or reveal it in
  Finder on macOS.

## Development

```bash
npm install
npm test
npx tsc --noEmit
bb plugin build
bb plugin install . --yes
```

After source changes, rebuild and reload the plugin:

```bash
bb plugin build
bb plugin reload generated-images
```
