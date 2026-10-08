import React from "react";
import { AbsoluteFill, Audio, Freeze, staticFile, useCurrentFrame } from "remotion";
import { Grain } from "../components/Fx";
import { loadFonts } from "../fonts";
import { FONT } from "../theme";
import { Bug, Headline, Stage } from "./components/Kit";
import { Chaos, Fix } from "./scenes/Chaos";
import { Dashboard } from "./scenes/Dashboard";
import { End } from "./scenes/End";
import { LearnSparks, Results, Sources, World } from "./scenes/World";
import { DROP, HIT, ws } from "./timing";

loadFonts();

const HY = 250;
const HS = 88;

/** The voice, set as type: one headline per thought, words land as they're spoken. */
const Headlines: React.FC = () => (
  <>
    <Headline
      from={288}
      to={ws("l05", 5) - 10}
      y={HY}
      size={HS}
      words={[
        { t: "Your", at: ws("l05", 0) },
        { t: "AI", at: ws("l05", 1) },
        { t: "agent", at: ws("l05", 2), br: true },
        { t: "answers", at: ws("l05", 3), hi: true },
        { t: "instantly.", at: ws("l05", 4), hi: true },
      ]}
    />
    <Headline
      from={ws("l05", 5) - 4}
      to={ws("l05", 12) + 16}
      y={HY}
      size={HS}
      words={[
        { t: "Trained", at: ws("l05", 5) },
        { t: "on", at: ws("l05", 6) },
        { t: "your", at: ws("l05", 7) },
      ]}
    />
    <Headline
      from={ws("l06", 0) - 4}
      to={ws("l07", 0) - 10}
      y={HY}
      size={HS}
      words={[
        { t: "It", at: ws("l06", 0) },
        { t: "books.", at: ws("l06", 1), hi: true },
        { t: "It", at: ws("l06", 2) },
        { t: "sells.", at: ws("l06", 3), hi: true, br: true },
        { t: "It", at: ws("l06", 4) },
        { t: "captures", at: ws("l06", 5), br: true },
        { t: "every", at: ws("l06", 6), hi: true },
        { t: "lead.", at: ws("l06", 7), hi: true },
      ]}
    />
    <Headline
      from={ws("l07", 0) - 4}
      to={ws("l08", 0) - 10}
      y={HY}
      size={HS}
      words={[
        { t: "And", at: ws("l07", 0) },
        { t: "when", at: ws("l07", 1) },
        { t: "it", at: ws("l07", 2), br: true },
        { t: "doesn't", at: ws("l07", 3), hi: true },
        { t: "know", at: ws("l07", 4), hi: true, br: true },
        { t: "the", at: ws("l07", 5) },
        { t: "answer?", at: ws("l07", 6) },
      ]}
    />
    <Headline
      from={ws("l08", 0) - 3}
      to={ws("l09", 0) - 10}
      y={HY}
      size={HS}
      words={[
        { t: "It", at: ws("l08", 0) },
        { t: "asks", at: ws("l08", 1), hi: true },
        { t: "your", at: ws("l08", 2), hi: true },
        { t: "team", at: ws("l08", 3), hi: true, br: true },
        { t: "on", at: ws("l08", 4) },
        { t: "WhatsApp", at: ws("l08", 5), br: true },
        { t: "or", at: ws("l08", 6) },
        { t: "email.", at: ws("l08", 7) },
      ]}
    />
    <Headline
      from={ws("l09", 0) - 4}
      to={ws("l09", 4) - 10}
      y={HY}
      size={HS}
      words={[
        { t: "Reply", at: ws("l09", 0) },
        { t: "in", at: ws("l09", 1), br: true },
        { t: "seconds.", at: ws("l09", 2), hi: true },
      ]}
    />
    <Headline
      from={ws("l09", 4) - 4}
      to={ws("l10", 0) - 10}
      y={HY}
      size={HS}
      words={[
        { t: "It", at: ws("l09", 4) },
        { t: "goes", at: ws("l09", 5), br: true },
        { t: "straight", at: ws("l09", 6), hi: true },
        { t: "back", at: ws("l09", 7), hi: true },
        { t: "to", at: ws("l09", 8), br: true },
        { t: "the", at: ws("l09", 9) },
        { t: "customer.", at: ws("l09", 10) },
      ]}
    />
    <Headline
      from={ws("l10", 0) - 3}
      to={798}
      y={HY}
      size={HS}
      words={[
        { t: "And", at: ws("l10", 0) },
        { t: "your", at: ws("l10", 1) },
        { t: "agent", at: ws("l10", 2), br: true },
        { t: "learns", at: ws("l10", 3), hi: true },
        { t: "it", at: ws("l10", 4), hi: true, br: true },
        { t: "for", at: ws("l10", 5) },
        { t: "next", at: ws("l10", 6) },
        { t: "time.", at: ws("l10", 7) },
      ]}
    />
    <Headline
      from={ws("l11", 0) - 2}
      to={ws("l12", 0) - 18}
      y={HY}
      size={HS}
      words={[
        { t: "Want", at: ws("l11", 0) },
        { t: "to", at: ws("l11", 0) + 4 },
        { t: "jump", at: ws("l11", 1) },
        { t: "in?", at: ws("l11", 2), br: true },
        { t: "Take", at: ws("l11", 3), hi: true },
        { t: "over", at: ws("l11", 4), hi: true, br: true },
        { t: "any", at: ws("l11", 5) },
        { t: "chat,", at: ws("l11", 6) },
        { t: "live.", at: ws("l11", 7), hi: true },
      ]}
    />
    <Headline
      from={ws("l12", 0) - 4}
      to={HIT - 16}
      y={HY}
      size={HS}
      words={[
        { t: "Every", at: ws("l12", 0) },
        { t: "chat,", at: ws("l12", 1), hi: true },
        { t: "lead", at: ws("l12", 2), hi: true, br: true },
        { t: "&", at: ws("l12", 3) },
        { t: "escalation,", at: ws("l12", 4), hi: true, br: true },
        { t: "in", at: ws("l12", 5) },
        { t: "one", at: ws("l12", 6) },
        { t: "dashboard.", at: ws("l12", 7) },
      ]}
    />
  </>
);

export const Loop: React.FC<{ audio?: boolean; grain?: boolean }> = ({ audio = true, grain = true }) => (
  <AbsoluteFill style={{ fontFamily: FONT, background: "#121113", overflow: "hidden" }}>
    <Stage />
    <Chaos />
    <World />
    <Results />
    <Sources />
    <LearnSparks />
    <Dashboard />
    <End />
    <Fix />
    <Headlines />
    <Bug from={DROP + 52} to={HIT - 14} />
    {grain ? <Grain opacity={0.045} /> : null}
    {audio ? <Audio src={staticFile("loop/mix.wav")} /> : null}
  </AbsoluteFill>
);

/** Motion-blur master (same method as the other films: 8 sub-frames, 180° shutter). */
export const LSS = 8;
export const LoopSS: React.FC = () => {
  const i = useCurrentFrame();
  const n = Math.floor(i / LSS);
  const j = i % LSS;
  const t = Math.max(0, n + (j - (LSS - 1) / 2) * (0.5 / LSS));
  return (
    <Freeze frame={t}>
      <Loop audio={false} grain={false} />
    </Freeze>
  );
};
