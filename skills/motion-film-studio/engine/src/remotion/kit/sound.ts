/**
 * Sound design lives next to the animation it belongs to. A film exports
 *   export const SOUND: Cue[] = [ cue(DROP, "impact"), cue(card.at + 2, "snap"), … ]
 * built from the same frame constants its scenes use; `bun scripts/film_sound.ts
 * <film module>` prints them and `scripts/mix_film.py` levels and mixes them.
 * Sound can never drift from picture because both read the same numbers.
 *
 * The library (public/sfx/library.json) knows each effect's kind (how loud it
 * should sit against the bed) and, for swells, where its loudest moment is —
 * cue() aligns that PEAK to the frame you give (a whoosh peaks mid-move, an
 * impact's boom lands exactly on the hit).
 */
export type SfxKind = "ui" | "confirm" | "phone" | "sweep" | "prop" | "ambience" | "hit";
export type Sfx =
  // interface
  | "tick" | "pop" | "snap" | "check" | "click" | "tap" | "blip" | "ping" | "notif" | "send" | "receive" | "toast" | "type" | "keys" | "miss" | "learn" | "seal" | "focus" | "data" | "glitch"
  // motion
  | "whoosh" | "draw" | "shimmer" | "spark" | "suck" | "riser" | "zoom" | "dive" | "swell" | "glassify" | "flurry" | "sink"
  // hits & props & ambience
  | "impact" | "poweron" | "ring" | "answer" | "buzz" | "flip" | "clock" | "hum" | "night" | "birds"
  // films 26-30
  | "scratch" | "star" | "pin" | "paper" | "chime" | "tear";

export type Cue = { at: number; sfx: Sfx; trim?: number; kind?: SfxKind; note?: string; align?: "attack" | "peak" };

/** One sound at a frame. trim = dB nudge (negative = quieter); note = why (shown in the mix table). */
export const cue = (at: number, sfx: Sfx, trim = 0, note = "", opts: Partial<Cue> = {}): Cue => ({ at: Math.round(at * 100) / 100, sfx, trim, note, ...opts });

/** The standard "moments" (use them so every film sounds like the family). */
export const moments = {
  /** the drop / final hit: suck-in before, boom on the frame, spark + pen draw, light along the stroke */
  hit: (f: number, note = "hit"): Cue[] => [cue(f - 1, "suck", 0, `${note}: collapse`), cue(f, "impact", 0, note), cue(f, "spark", -3, `${note}: ignition`), cue(f, "draw", -6, `${note}: pen draws the mark`), cue(f + 30, "shimmer", -9, `${note}: light along the stroke`)],
  /** a card / result lands */
  land: (f: number, note = "card"): Cue[] => [cue(f + 2, "snap", -4, `${note} lands`), cue(f + 8, "check", -6, `${note} checks`)],
  /** a scene-to-scene move */
  move: (f: number, note = "move", trim = -6): Cue[] => [cue(f, "whoosh", trim, note)],
  /** a chat exchange */
  ask: (f: number, note = "question"): Cue[] => [cue(f, "send", -3, note)],
  answer: (f: number, note = "answer"): Cue[] => [cue(f, "receive", -2, note)],
  /** the call to action */
  cta: (ctaAt: number, urlAt: number): Cue[] => [cue(ctaAt, "pop", -3, "CTA"), cue(ctaAt + 10, "spark", -9, "sparkles"), cue(urlAt, "blip", -7, "url"), cue(urlAt + 26, "tap", -2, "tap the button")],
};
