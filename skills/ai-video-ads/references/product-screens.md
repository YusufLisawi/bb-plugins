# Product screens inside a UGC ad (apps, portals, web)

When the script talks about an app or a web product, the viewer must see the real thing. Owners reject recreated or
"inspired by" screens at once, so treat screens as footage that has to be captured, not drawn.

## 1. Capture real screens

Order of preference:

1. **Real screenshots of the real product**, captured headless at device size: Playwright with
   `viewport = device CSS size` and `deviceScaleFactor = 3` (e.g. 390×844 @3 → 1170×2532 for a modern iPhone).
2. **The real web build with a mocked backend**: when there is no demo account, run the web/Expo-web build and
   answer its API calls with `page.route()` / `context.route()` mocks (fake session, demo data, fixed dates).
   For a portal that talks to another service, run it locally against a tiny mock server, and fake the clock
   (`NODE_OPTIONS=--require fakedate.js`) so times on screen fit the story.
3. **A 1:1 HTML replica** only for a screen that does not exist yet, built from the real component styles.

- SPA routes that ignore a direct URL: navigate inside the page (`history.pushState(...)` + a `popstate` event).
- Camera flows (QR scan, document scan): Chromium `--use-fake-device-for-media-stream
  --use-file-for-fake-video-capture=cam.y4m` feeds a real video into the real scanner. If the real scan looks
  messy on screen, animate a clean QR into the measured viewfinder instead.
- Keep demo data believable and neutral (plausible names, no real customer data, prices from the brief).

## 2. Highlights must be measured

Never place circles, arrows or "tap" marks by eye. Read the element's box in the browser
(`el.getBoundingClientRect()` × device scale → JSON) at capture time, and drive every highlight, tap ripple and
zoom from those boxes. Re-measure whenever a screenshot is re-captured.

## 3. Showing the phone in a UGC edit

What owners accepted after several rejected rounds:

| Tried | Verdict |
|---|---|
| Phone over the creator with a small face bubble | rejected (busy, face too small) |
| Split screen creator / phone | rejected (both halves too small, seams) |
| **Phone full screen, no face, on a branded background; the creator's voice continues** | accepted |
| **Cards (price, big stat, chips) overlaid on the creator footage** | accepted |

So: when a screen is shown it owns the frame; when graphics are simple cards they sit over the creator.

- **True proportions.** Draw the device at the screenshot's exact ratio (e.g. 1170:2532). Never stretch or crop a
  screen to fit a frame, and never scroll a long screenshot inside the phone (it reads as a glitch).
- **Nothing covers the app header.** Badges and titles sit above the device with a clear gap (≈ 100+ px at
  1080×1920); the app's own top bar stays visible.
- **No still screen longer than ~4.5 s.** Cap each phone beat, split long ones into 2–3 screens of the flow
  (home → detail → result), and keep a slow float / push-in going. Check with
  `ffmpeg -i final.mp4 -vf freezedetect=n=0.003:d=3 -f null -` (any freeze > 3 s is a fail).
- Crossfade between screens (6–8 frames); a tap ripple on the measured button just before the cut sells the flow.
- Captions move above or below the device and never cover it; hide them during full-screen cards.
