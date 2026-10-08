import React from "react";
import { Freeze, useCurrentFrame } from "remotion";

/**
 * Motion-blur master. Remotion's CameraMotionBlur stacks 8-bit samples and
 * shifts brand colours (cream #FAF9F5 came out #F8F8F8), so instead the
 * "<Film>-SS" composition renders SS sub-frames per output frame, spread over
 * a 180° shutter centred on the frame; scripts/finish.py averages them in float
 * and adds grain. Static frames stay pixel-identical, moves smear like film.
 *
 * Register it with durationInFrames = D * SS and fps = FPS * SS.
 * (Freeze clamps to the composition length — never feed it frames past D.)
 */
export const SS = 8;
export const makeSS = <P extends object>(Film: React.FC<P & { audio?: boolean; grain?: boolean }>, props?: P) => {
  const Comp: React.FC = () => {
    const i = useCurrentFrame();
    const n = Math.floor(i / SS);
    const j = i % SS;
    const t = Math.max(0, n + (j - (SS - 1) / 2) * (0.5 / SS));
    return (
      <Freeze frame={t}>
        <Film {...(props as P)} audio={false} grain={false} />
      </Freeze>
    );
  };
  return Comp;
};
