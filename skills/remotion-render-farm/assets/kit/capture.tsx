import React, { useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Chrome capture mode (HTML-in-canvas, measured 2026-10-30, Chromium 155, Remotion 4.0.539) draws a <canvas> (2D,
 * WebGL/Three.js, or the one inside @remotion/media <Video>) only when the canvas's layout box starts at the page
 * origin, and at its pixel size: CSS left/top (on it or on a parent) leaves it blank, CSS width/height stretching
 * is ignored. Transforms are fine. These two place and size canvases with transforms; every renderer draws them.
 */

/** Cancels the parent's offset on the page (x, y) and moves the children back with a transform, so their layout box
 *  starts at the page origin. Children sit at left 0, top 0; (dx, dy) moves them inside the parent. */
export const Origin: React.FC<{ x: number; y: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ x, y, dx = 0, dy = 0, children }) => (
  <div style={{ position: "absolute", left: -x, top: -y, width: 1, height: 1, transformOrigin: "0 0", transform: `translate(${x + dx}px, ${y + dy}px)` }}>{children}</div>
);

/** Shows a canvas of a fixed pixel size (a video's, a low-resolution render's) at w × h with a scale transform,
 *  not CSS stretching. "cover" fills and crops, "contain" fits inside, "fill" stretches. */
export const PixelFit: React.FC<{ px: [number, number]; w: number; h: number; fit?: "cover" | "contain" | "fill"; children: React.ReactNode }> = ({ px, w, h, fit = "fill", children }) => {
  const sx = w / px[0];
  const sy = h / px[1];
  const s = fit === "cover" ? Math.max(sx, sy) : fit === "contain" ? Math.min(sx, sy) : 0;
  const t = fit === "fill" ? `scale(${sx}, ${sy})` : `translate(${(w - px[0] * s) / 2}px, ${(h - px[1] * s) / 2}px) scale(${s})`;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: px[0], height: px[1], transformOrigin: "0 0", transform: t }}>{children}</div>
    </div>
  );
};

/**
 * For Three.js in capture mode: pass `gl={CAPTURE_GL}` to <ThreeCanvas> and put <FinishFrame /> inside it. Capture
 * reads the WebGL canvas right after Remotion renders it; without a kept drawing buffer and a finished GPU frame,
 * some frames came out with whole meshes missing (Minecraft: 53 of 240 frames).
 */
export const CAPTURE_GL = { preserveDrawingBuffer: true };

/** Renders the R3F scene itself and waits for the GPU to finish it (gl.finish), so the frame is complete when
 *  captured. Not for scenes that render through a post-processing composer (they already take over rendering). */
export const FinishFrame: React.FC = () => {
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera);
    gl.getContext().finish();
  }, 1);
  return null;
};

/** Compiles every material and uploads every texture once before the first frame, so an object coming into view
 *  later isn't drawn unfinished on that one frame (seen in capture mode: a building flat for one frame). Put it last
 *  inside <ThreeCanvas>, after the scene's objects. */
export const Warmup: React.FC = () => {
  const { gl, scene, camera } = useThree();
  useLayoutEffect(() => {
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) for (const v of Object.values(mat)) if (v instanceof THREE.Texture) gl.initTexture(v);
    });
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  return null;
};
