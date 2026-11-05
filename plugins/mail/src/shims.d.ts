// unpdf's types mention its optional canvas renderer, which Mail does not use.
declare module "@napi-rs/canvas" {
  export type Canvas = unknown;
  export type SKRSContext2D = unknown;
  export type Image = unknown;
  const canvas: unknown;
  export default canvas;
}
