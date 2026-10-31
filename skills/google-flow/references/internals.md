# How flow.py talks to Flow (for fixing it when the UI changes)

`flow.py` (Python) owns the job; `flow_page.js` is injected into the Flow tab through PinchTab `POST /evaluate` and exposes
`window.__flow.*`. Each Python step is one `evaluate` call, so no accessibility snapshots are needed.

## Stable hooks the helper relies on

| Thing | Selector / text |
|---|---|
| Prompt box | `[aria-label="What do you want to create?"]` (contenteditable; filled with `execCommand('insertText')`) |
| Settings panel | `[aria-label="Settings trigger"]` opens it; its options are `[role=radio]` toggles whose visible text is `Image`, `Video`, `Frames`, `Ingredients`, `16:9`, `9:16`, `360p`, `720p`, `4s`…`10s`, `x1`…`x4` (checked = `aria-checked="true"`) |
| Model | `[aria-label="Select model family"]` → `[role=menuitem]` names |
| Price | the leaf element whose text is `N credits` inside the panel |
| Agent mode | `button[aria-pressed]` with text `Agent`; must be off for direct generation |
| Frames | buttons with text `Start` / `End` open "Select a frame image"; assets are `[role=option]`, search `[aria-label="Search assets"]` |
| Ingredients | `[aria-label="Add ingredients to the prompt box"]` → same picker → `Add to prompt` |
| Generate | `[aria-label="Start generation"]`: needs a **trusted CDP click** (`POST /action {kind: click, selector}`); a JS `.click()` is sometimes ignored |
| Grid | `flow-tile-container` (newest first) with `flow-video-tile` or `flow-image-tile`; title = `flow-tile-hover-footer button[aria-label]`; rendering tiles show `NN%` |
| Tile menu | `button[aria-label="More options"]` in the tile → `Download` → `720p Original size` / `1080p Upscaled` / … |
| Account | `[aria-label="Account details"]` opens a menu with `N Google Flow credits` and `Resets …` |

Material icon ligatures (`videocam`, `crop_16_9`…) are stripped from visible text by `txt()`.

## Upload

Flow's upload button opens a native picker that ignores automated file inputs. `upload` streams the file in 400 kB
base64 chunks into the page and dispatches `dragenter/dragover/drop` with a `DataTransfer` on the grid (the "drop media"
path). The new tile appears first in the grid.

## Download

Flow fetches the file (or the upscale) and clicks an `<a download href=blob:…>`. Upscales finish long after the user
gesture, so a headless Chrome silently drops that download. `dlArm` patches `URL.createObjectURL` and
`HTMLAnchorElement.prototype.click`, keeps the blob, swallows the browser download, and `flow.py` pulls it out through
`dlChunk` (3 MB per call) into the output folder.

## Generation bookkeeping

Before generating, `flow.py` counts the tiles; after the trusted click it waits until the count grows or the prompt box
clears (submission confirmed; retried once only if neither happened). It then waits until the first N new tiles have no
progress percentage and a thumbnail (or a failure text), downloads each, and reads the credit balance again.

## Sign-in

`login` serves a page that polls `GET /screenshot` of the tab and relays clicks (`kind: click, x, y` in CSS pixels),
wheel, `keyboard-type` and `press` actions. It never logs request bodies. Done = the tab is on flow.google.com (not
`/about`) with a `[aria-label^="Google Account"]` element.
