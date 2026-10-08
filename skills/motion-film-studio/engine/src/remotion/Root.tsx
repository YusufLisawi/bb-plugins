import React from "react";
import { Composition } from "remotion";
import { FORMATS } from "./kit/format";
import { SS, makeSS } from "./kit/ss";
import { FILMS } from "./films/registry";
import { BrandEnd, BrandSheet } from "./brand/BrandPreview";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BrandSheet" component={BrandSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="BrandEnd" component={BrandEnd} durationInFrames={120} fps={30} width={1080} height={1920} />
    {FILMS.flatMap((film) =>
      film.formats.map((fmt) => {
        const { w, h } = FORMATS[fmt];
        const Master = makeSS(film.component);
        return (
          <React.Fragment key={`${film.id}-${fmt}`}>
            <Composition id={`${film.id}-${fmt}`} component={film.component} durationInFrames={film.durationInFrames} fps={film.fps} width={w} height={h} defaultProps={{ audio: false }} />
            <Composition id={`${film.id}-${fmt}-SS`} component={Master} durationInFrames={film.durationInFrames * SS} fps={film.fps * SS} width={w} height={h} />
          </React.Fragment>
        );
      }),
    )}
  </>
);
