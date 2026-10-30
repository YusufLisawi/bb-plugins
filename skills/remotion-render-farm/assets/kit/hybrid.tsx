import React from "react";
import { HtmlInCanvas } from "remotion";

/**
 * Hybrid rendering. The browser renderer's default mode draws <canvas> and @remotion/media <Video>; Chrome's
 * capture mode draws real CSS (3D, gradients, glass, blend modes, SVG filters). An Island lets Chrome paint its
 * children natively into a canvas (HtmlInCanvas) inside a default-mode render, so one frame gets both.
 * Islands are on only when the page sets window.__remotionHybrid (they need Chrome's HTML-in-canvas flag); in the
 * CLI and in capture mode the children render as usual.
 * Inside an island, as in capture mode, preserve-3d planes are drawn in DOM order: put them far to near.
 */
export const hybridOn = () => typeof window !== "undefined" && (window as Window & { __remotionHybrid?: boolean }).__remotionHybrid === true;

export const Island: React.FC<{ width: number; height: number; children: React.ReactNode }> = ({ width, height, children }) =>
  hybridOn() ? (
    <HtmlInCanvas width={width} height={height}>
      {children}
    </HtmlInCanvas>
  ) : (
    <>{children}</>
  );
