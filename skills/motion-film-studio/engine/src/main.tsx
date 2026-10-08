import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { staticFile } from "remotion";
import { FORMATS, FormatId } from "./remotion/kit/format";
import { FILMS } from "./remotion/films/registry";
import { C, FONT, FONT_FACES } from "./remotion/theme";

/**
 * Live preview: http://localhost:<port>/?film=<slug>&format=v|h|sq|p
 * Preloads fonts, images and the mix so playback never stalls; browsers block
 * sound until a click, so the film starts on "Play with sound".
 */
const q = new URLSearchParams(location.search);
const film = FILMS.find((f) => f.slug === q.get("film")) ?? FILMS[FILMS.length - 1];
const fmt = ((q.get("format") as FormatId) && film.formats.includes(q.get("format") as FormatId) ? q.get("format") : film.formats[0]) as FormatId;
const { w, h } = FORMATS[fmt];
document.title = `${film.title} · ${FORMATS[fmt].label}`;

const preload = async (onProgress: (p: number) => void) => {
  const jobs: Promise<unknown>[] = [];
  let done = 0;
  const total = 2 + (film.audio ? 1 : 0);
  const tick = () => onProgress(Math.round((++done / total) * 100));
  const fonts = FONT_FACES.map(([family, src, desc]) => new FontFace(family, `url(${staticFile(src)})`, desc));
  jobs.push(Promise.all(fonts.map((f) => f.load().then((ff) => document.fonts.add(ff)))).then(tick, tick));
  jobs.push(
    new Promise<void>((r) => {
      const img = new Image();
      img.onload = img.onerror = () => (tick(), r());
      img.src = staticFile("img/grain.png");
    }),
  );
  if (film.audio)
    jobs.push(
      new Promise<void>((r) => {
        const a = new Audio();
        let settled = false;
        const fin = () => (settled ? null : ((settled = true), tick(), r()));
        a.oncanplaythrough = fin;
        a.onerror = fin;
        a.src = staticFile(film.audio!);
        a.load();
        setTimeout(fin, 8000);
      }),
    );
  await Promise.all(jobs);
};

const App = () => {
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [pct, setPct] = useState(0);
  const player = useRef<PlayerRef>(null);
  useEffect(() => {
    preload(setPct).then(() => setReady(true));
  }, []);
  if (!ready) return <div style={{ fontFamily: FONT, color: C.cream, fontSize: 14 }}>Loading {film.title}… {pct}%</div>;
  return (
    <div style={{ position: "relative", width: `min(100vw, calc(100vh * ${w} / ${h}))`, aspectRatio: `${w} / ${h}` }}>
      <Player
        ref={player}
        component={film.component}
        inputProps={{ audio: !!film.audio }}
        durationInFrames={film.durationInFrames}
        fps={film.fps}
        compositionWidth={w}
        compositionHeight={h}
        style={{ width: "100%", height: "100%" }}
        controls
        loop
        clickToPlay={false}
        acknowledgeRemotionLicense
      />
      {started ? null : (
        <button
          onClick={() => {
            setStarted(true);
            player.current?.seekTo(0);
            player.current?.play();
          }}
          style={{ position: "absolute", inset: 0, margin: "auto", width: 240, height: 60, border: 0, borderRadius: 999, background: C.coral, color: "#fff", fontFamily: FONT, fontSize: 17, fontWeight: 600, cursor: "pointer" }}
        >
          ▶ Play with sound
        </button>
      )}
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
