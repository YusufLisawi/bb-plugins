# Generated Images for BB

This plugin keeps Codex image-generation results visible in the thread
conversation after a turn completes. It indexes completed
`provider/unhandled` image-generation events, stores only their host file paths
in the plugin database, serves those files through authenticated local routes,
and injects a compact tray directly after the latest assistant message.

The gallery is intentionally separate from BB's existing Image Preview plugin:
Image Preview can enlarge `<img>` elements that already exist, while this
plugin creates the missing conversation-level `<img>` elements.

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
