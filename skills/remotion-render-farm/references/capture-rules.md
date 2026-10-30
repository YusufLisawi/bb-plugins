# Compositions that render right in the browser

Measured in October 2026 with Chromium 155 and Remotion 4.0.539, on the OPERADOR lab compositions:
- a grid of 12 hard CSS features;
- 3D cards;
- a Minecraft-style world and a GTA San Andreas-style street (Three.js);
- four Three.js looks;
- a physics stickman;
- video.

The components named here are in `$SKILL/assets/kit/`. Copy the ones you need into the project.

## The two browser modes

| | Chrome capture (`--mode hic`, the default) | Default mode (`--mode dom`) |
| --- | --- | --- |
| How a frame is made | Chrome paints the page itself into a canvas (HTML-in-canvas, flag `CanvasDrawElement`) | The renderer redraws the DOM with Canvas 2D |
| CSS | All of it: perspective and preserve-3d, conic/radial/repeating gradients, backdrop-filter, blend modes, z-index, writing-mode, `filter: url()` | 2D transforms, opacity, linear gradients, borders and radii, plain shadows, plain filters, polygon clips, images, self-contained SVGs |
| `<canvas>`, Three.js, `@remotion/media` `<Video>` | Yes, at the page origin (rules 1–2) | Yes |
| Speed in the scene tests | Fastest | 1–3× slower |

The farm's workers start Chrome with the capture flags. Without them, the farm page fails rather than quietly
falling back to default mode.

## Chrome capture rules

1. **Canvases start at the page origin.** A canvas (2D, WebGL, the one inside `@remotion/media` `<Video>`) is drawn only
   when its layout box starts at (0, 0) of the page. CSS `left`/`top` on it or on a parent leaves it blank. Transforms
   are fine. Wrap it in `Origin` (cancels the parent's offset, moves it back with a transform), or place every cell of
   a grid with `transform: translate(…)` instead of `left`/`top`.
2. **Canvases are drawn at their pixel size.** CSS width/height stretching is ignored. Give the canvas the pixel size
   you want (ThreeCanvas `width`/`height`, `dpr` 1), then scale it with `PixelFit` (a scale transform; fill, contain or
   cover). A 960×540 ThreeCanvas stretched by CSS came out quarter-size.
3. **WebGL frames must be finished.** Pass `gl={CAPTURE_GL}` (keeps the drawing buffer) to `<ThreeCanvas>`. Inside it,
   put `<FinishFrame/>` (renders and waits for the GPU) and, last, `<Warmup/>` (compiles materials and uploads textures
   up front). Without them, 53 of 240 Minecraft frames lost whole meshes. Scenes that render through a post-processing
   `EffectComposer` already drive rendering: skip `FinishFrame` there.
4. **preserve-3d planes are drawn in DOM order.** Put them far to near, or sort them by depth each frame.
5. **`mask-image: url(…)` drops that whole frame to the default composer.** Use `clip-path`, or a mask inside the same
   inline SVG.
6. **Build geometry and instances in `useMemo`, not in effects.** Otherwise the first frames come out empty (both modes).
7. **A three.js material created without a `map` never shows one assigned later.** Key the material on its texture
   (`key={texture.uuid}`).
8. **No `OffthreadVideo` in the browser.** Use `@remotion/media` `<Video>` (a canvas: rules 1–2), or `FrameSequence`
   (numbered JPEGs: `ffmpeg -i clip.mp4 dir/%04d.jpg`).
9. **Determinism.** Chunks render in different windows and machines, from any start frame. Everything must be a
   function of the frame:
   - seeded randomness (`random(seed)`, mulberry32);
   - physics simulated up front with fixed substeps (the stickman: Verlet at 8 substeps a frame, recorded once);
   - no `Math.random()` or `Date.now()` in render.
10. **The page provides the Remotion environment:** `getInputProps()` (from the farm's props) and an empty
    `process.env`. `calculateMetadata` runs before the render.

## Motion blur

- **`Smear`** (blur.tsx, `vx`, `vy` in px per frame, a unique `id`): one render, a directional SVG Gaussian, smooth
  however fast. This is the house look: the user picked it over everything else. `SpeedSmear` is the horizontal-only
  version. Text works too: smear the text layer.
- **`MotionBlur`**: exact (averages `samples` sub-frames with plus-lighter), but costs `samples` renders of its
  children. Default mode draws it faded.
- All three switch off above 60 fps (a supersampled CLI master renders real sub-frames) and on slow layers.

## Default-mode replacements (safe.tsx)

Only for `--mode dom` (no capture flag) or for compositions that must also render in other places.

| CSS that default mode can't draw | Use |
| --- | --- |
| `z-index` | `ZStack` with `Z` children |
| box-shadow with spread or inset (rings) | `Ring` |
| `conic-gradient` | `ConicGradient` (SVG wedges) |
| `radial-gradient` | `RadialFill` |
| `repeating-linear-gradient` | `Stripes` |
| `backdrop-filter: blur()` | `Glass` (a blurred copy of the backdrop) |
| `writing-mode: vertical-rl` | `VerticalText` |
| `perspective`, `rotateX/Y` | `Warp` with `rotX`/`rotY`/`perspective` (affine triangles) |
| a canvas drawn anywhere | `CanvasImage` (a detached canvas shown as an image) |
| video | `FrameSequence` |
| a zero-size wrapper carrying `opacity` | Give it a 1×1 size (zero-size elements are skipped with their opacity) |
| blend modes | Supported from Remotion 4.0.540 |

With all of these, the 12-feature test grid rendered 12 of 12 in both modes.

**Hybrid** (hybrid.tsx, `Island`): Chrome paints its children natively inside a default-mode frame (HtmlInCanvas). It
needs the capture flag, so with the farm's capture default it's rarely useful.
