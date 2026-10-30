---
name: remotion-render-farm
description: Render Remotion videos fast in Chrome capture mode (the browser renderer with HTML-in-canvas) across this PC's and mouad's GPUs (3 + 3 Chrome windows), re-rendering only the 3-second chunks whose frames changed, with 540p previews instead of the Remotion Player, through one `farm` command and a local API. Use to render, preview or re-render any Remotion composition quickly, to make a composition render correctly in the browser renderer (capture rules, safe kit, Smear motion blur), to add or update a render machine, or to fix the farm. Not for AWS Lambda renders.
---

# Remotion render farm

`farm` renders a Remotion composition in headless Chrome windows in **Chrome capture mode**: Remotion's browser renderer
(`@remotion/web-renderer`) with Chrome's HTML-in-canvas, which draws real CSS (3D, gradients, blur, blend modes, SVG
filters) plus canvases and Three.js. By default it uses every machine in `~/.config/bb-farm/workers.json`: **this PC and
mouad, 3 windows each**. The whole OPERADOR film (6,257 frames, 1080p) renders in about 50 s on that setup.

Every render is a row of 3-second chunks kept in a cache, keyed by a fingerprint of their frames. Before rendering, the
farm scans every frame without drawing it (about 1,000 frames a second per window). It renders only the chunks whose
fingerprint changed and stream-copies the rest. After an edit, a film updates in seconds, and an unchanged film in under one.

`$SKILL` = this skill's directory. The runtime lives in `$SKILL/scripts/runtime`; `farm setup` installs it to
`~/.local/share/bb-farm` and puts `farm` on the PATH.

## Render

```bash
farm preview <project> <Composition>        # 540p (scale 0.5): the preview, instead of the Remotion Player
farm render  <project> <Composition>        # full size: the master
farm comps   <project>                      # the compositions: id, frames, fps, size
```

- **Options:**
  - `--scale 0.25`: 270p. It is barely faster than 540p and its small text is unreadable, so prefer 540p.
  - `--full`: ignore the cache.
  - `--props '{"k":1}'` or `--props-file p.json`: input props.
  - `--on mouad:3`: hand the whole render to mouad.
  - `--on this:4`: this PC only.
  - `--mode dom`: the default browser mode, without the capture flag.
  - `--out file.mp4`: also copy the result there.
- **Output:**
  - The video goes to `<project>/out/farm/<Composition>@<size>p.mp4`. With props, a hash of them is added to the name.
  - stdout is one JSON status. `state` is `done`, and `toRender` / `chunks` count the chunks rendered and total.
  - `changed` lists the frame ranges that changed since this video's last render, with timecodes.
  - `timings` holds build, probe, scan, render and join. `sound` says where the sound came from. `out` is the video path.
  - stderr shows progress.
- **When it's slow:**
  - A **first render** renders every chunk.
  - **Changed code** rebuilds the page (about 5 s) and rescans. The same build reuses its scan, so a master right after a preview skips both.
- **Sound:**
  - **Pre-mixed file:** if the film's sound is one mixed file (motion-film-studio's `mix.wav`), map it with `farm init <project> --audio <Composition>=public/films/<slug>/mix.wav`. It's muxed in as it is: exact, and costs nothing.
  - **Composition's own sound:** otherwise the farm renders the `<Audio>` tags in the same chunks. Only chunks whose sound changed are re-rendered, and they're joined sample-exact. The scan then also extracts every frame's samples, which makes it about 4× slower (the film: 19 s instead of 3 s).
- **One render at a time per coordinator.** CLI and API share a lock; a second render waits.

After a render, look at the result before handing it over: a still or two (`ffmpeg -ss <t> -i <video> -frames:v 1 x.png`),
the JSON `changed` ranges (do they match the edit?), and the frame count. A render with an error is not a result.

## A new project

1. `farm doctor <project>` checks the tools, every machine, and the project's versions.
2. The project needs `remotion` **4.0.539 or newer** and `@remotion/web-renderer` at the **same version**. Every
   `@remotion/*` package must share one version. Older projects (OPERADOR's main film project is on 4.0.399) need an
   upgrade first. That also changes their CLI renders, so ask before upgrading someone's project.
3. `farm init <project>` finds the Root that `registerRoot()` receives and writes `farm.json`
   (`{ "root": "src/remotion/Root.tsx#RemotionRoot", "public": "public", "audio": {…} }`). It also adds `.farm/` to
   `.gitignore`. `render` runs `init` by itself when `farm.json` is missing.
4. The page is built with the project's own Vite config (plugins, aliases, CSS), or the farm's Vite if it has none.
   Compositions are read from the Root's `<Composition>` elements. Root components with hooks aren't supported.
   `calculateMetadata`, `lazyComponent`, `defaultProps` and `getInputProps()` work.

## Make compositions render right in the browser

Most compositions render in capture mode as they are. These need care; read
[references/capture-rules.md](references/capture-rules.md) before writing or fixing one:

- **`<canvas>`, Three.js and `@remotion/media` `<Video>`:** a canvas is drawn only when its layout box starts at the
  page origin. Place canvases with transforms (`Origin`, `PixelFit`).
- **WebGL:** needs `gl={CAPTURE_GL}`, `<FinishFrame/>` and `<Warmup/>`. Without them, frames come out with meshes
  missing.
- **Videos:** `OffthreadVideo` doesn't exist in the browser. Use `@remotion/media` `<Video>`, or `FrameSequence`.
- **Motion blur:** use `Smear` (one render) rather than the CLI's supersampling. `MotionBlur` is the exact but costly
  alternative.
- **The kit:** copy the components from `$SKILL/assets/kit/` into the project (`capture.tsx`, `blur.tsx`, `safe.tsx`,
  `hybrid.tsx`). `safe.tsx` rebuilds the effects the default browser mode can't draw.

## Machines and services

- **Install or repair this machine:** run `$SKILL/scripts/farm setup`. It installs:
  - the runtime and the token (`~/.config/bb-farm/token`, never printed);
  - the services `bb-farm-worker` (Chrome windows, ports 7801 and 7802) and `bb-farm-api` (port 7800, on 127.0.0.1 and the Tailscale address);
  - the `farm` command.
- **Add a GPU machine:** `farm machine add <name> <user@host> [--windows 3]`. It needs SSH key access and bun, and does the rest:
  - copies the runtime and the token;
  - installs Chrome for Testing 155;
  - detects AppArmor's sandbox block;
  - creates the service and registers the machine.
- **After this skill changes:** run `$SKILL/scripts/farm update`. It reinstalls the runtime here and on every machine. A machine on another runtime version is skipped until then.
- **Status:** `farm health` shows each machine's version, Chrome and busy windows.

Details (files, ports, adding machines, failures and their fixes): [references/operations.md](references/operations.md).

## The API

On `http://127.0.0.1:7800` and this PC's Tailscale address. Every request needs `Authorization: Bearer $(cat ~/.config/bb-farm/token)`.

- `POST /renders {"project": "/abs/path", "comp": "Id", "preview": true, "props": {…}, "full": false, "on": "mouad:3"}` → `{"id"}`
- `GET /renders/<id>` → the status JSON above. `GET /renders/<id>/video` → the mp4 once `state` is `done`.
- `GET /comps?project=/abs/path` lists the compositions. `GET /health` shows the machines.

The project must already have `farm.json`. The API accepts no other paths.

## Expectations and limits

Measured numbers (machines, windows, scales, scans, sound, modes per scene) are in
[references/performance.md](references/performance.md). Key facts:
- **Windows:** 3 per machine is the sweet spot. 4 + 4 was slower than 3 + 3. More speed comes from more GPU machines.
- **GPU required:** CPU-only capture is 4–10× slower.
- **Lower resolution saves less than you'd expect:** each frame's page work stays the same. 540p takes ~0.65× the time of 1080p, 270p ~0.6×.
- **What the farm doesn't do:**
  - **Supersampled motion blur:** that's motion-film-studio's CLI master. In the browser, use `Smear`.
  - **Stills.**
  - **Lambda.**
- **Machine differences:** chunks rendered on different machines differ by GPU rounding (PSNR ~38–51 dB between them). This isn't visible.
- **Stale frames:** canvases and media whose content can't be read back count as changed on every render. They cost time but are never stale. A changed image file is caught through its content hash.
