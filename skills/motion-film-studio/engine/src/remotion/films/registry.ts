import React from "react";
import { FormatId } from "../kit/format";
import { STARTER } from "./starter/Starter";

/**
 * Every film registers ONE entry; Root.tsx creates, for each listed format,
 *   <Id>-<format>        the film (preview, stills)       e.g. Starter-v, Starter-h
 *   <Id>-<format>-SS     its 8-sub-frame motion-blur master (scripts/render_master.sh)
 * `audio` is the pre-mixed track (public/films/<id>/mix.wav) played by the preview.
 */
export type FilmProps = { audio?: boolean; grain?: boolean };
export type FilmDef = {
  id: string; // PascalCase, used in composition ids
  slug: string; // folder name under public/films/ and films/
  title: string;
  component: React.FC<FilmProps>;
  durationInFrames: number;
  fps: number;
  formats: FormatId[];
  audio?: string;
};

export const FILMS: FilmDef[] = [STARTER];
