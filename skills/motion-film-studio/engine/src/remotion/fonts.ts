import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { FONT_FACES } from "./theme";

/**
 * Load the brand fonts (brand.json → theme FONT_FACES) before the first frame is
 * captured. Prefer variable files so type can animate its weight.
 *
 * Long renders open many browser tabs, and very occasionally one tab's font
 * fetch never settles (seen twice: the render died on "brand fonts" after
 * 28 s). So every attempt is time-boxed and retried with fresh FontFaces,
 * and delayRender itself may reload the tab as a last resort.
 */
const FACES = FONT_FACES;

const timeBoxed = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`font load exceeded ${ms}ms`)), ms))]);

const attempt = () =>
  Promise.all(
    FACES.map(([family, src, desc]) =>
      timeBoxed(new FontFace(family, `url(${staticFile(src)})`, desc).load(), 8000).then((f) => {
        document.fonts.add(f);
      }),
    ),
  );

let loaded: Promise<void> | null = null;

export const loadFonts = () => {
  if (loaded) return loaded;
  const handle = delayRender("brand fonts", { timeoutInMilliseconds: 45000, retries: 2 });
  loaded = attempt()
    .catch(attempt)
    .catch(attempt)
    .then(() => continueRender(handle))
    .catch((e) => cancelRender(e));
  return loaded;
};
