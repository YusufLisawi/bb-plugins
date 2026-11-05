import { useSyncExternalStore } from "react";
import type { SplitIconName } from "../shared/types.js";
import { unreadStore } from "./alerts.js";

const svg = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MailGlyph({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className} aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

/**
 * The Mail sidebar icon with a live unread count. The host renders it outside
 * the plugin's stylesheet, so the badge uses inline styles only.
 */
export function MailBadgeIcon({ className }: { className?: string }) {
  const unread = useSyncExternalStore(unreadStore.subscribe, unreadStore.get);
  return (
    <span className={className} style={{ position: "relative", display: "inline-flex", flexShrink: 0, overflow: "visible" }}>
      <MailGlyph className={className} />
      {unread > 0 ? (
        <span
          aria-label={`${unread} unread`}
          style={{
            position: "absolute",
            top: -6,
            right: -8,
            minWidth: 15,
            height: 15,
            padding: "0 4px",
            boxSizing: "border-box",
            borderRadius: 999,
            background: "#e5484d",
            color: "#fff",
            fontSize: 9.5,
            fontWeight: 700,
            lineHeight: "15px",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            boxShadow: "0 0 0 2px var(--background, #fff)",
            pointerEvents: "none",
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </span>
  );
}

export function BellIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className} aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className} aria-hidden="true">
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className} aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

export function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className} aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </svg>
  );
}

type Glyph = { className?: string };

function make(paths: React.ReactNode) {
  return function Icon({ className }: Glyph) {
    return <svg {...svg} className={className} aria-hidden="true">{paths}</svg>;
  };
}

export const SplitIcons = {
  needs_you: make(<><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6.5 8.5 6 8.5-6" /></>),
  waiting: make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  other: make(<><path d="M4 13h4l1.5 3h5L16 13h4" /><path d="M4 13 6.2 5.6A2 2 0 0 1 8.1 4.2h7.8a2 2 0 0 1 1.9 1.4L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" /></>),
  updates: make(<><path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4V5L7 9H4.5a1 1 0 0 0-1 1Z" /><path d="M18 9a4 4 0 0 1 0 6" /></>),
  later: make(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>),
  archive: make(<><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" /><path d="M10 13h4" /></>),
  junk: make(<><path d="M12 3 3.5 7v5c0 4.5 3.6 8 8.5 9 4.9-1 8.5-4.5 8.5-9V7Z" /><path d="m9.5 9.5 5 5M14.5 9.5l-5 5" /></>),
  sent: make(<><path d="M21.5 2.5 10.5 13.5" /><path d="m21.5 2.5-7 19-4-8-8-4 19-7Z" /></>),
  custom: make(<><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" /><path d="M15 9h3a2 2 0 0 1 2 2v10" /><path d="M8 7h3M8 11h3M8 15h3" /><path d="M2.5 21h19" /></>),
  plus: make(<><path d="M12 5v14M5 12h14" /></>),
  check: make(<><path d="m5 12.5 4.5 4.5L19 7.5" /></>),
  clock: make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  inbox: make(<><path d="M4 13h4l1.5 3h5L16 13h4" /><path d="M4 13 6.2 5.6A2 2 0 0 1 8.1 4.2h7.8a2 2 0 0 1 1.9 1.4L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" /></>),
  sparkle: make(<><path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9Z" /></>),
  settings: make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
  more: make(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
  broom: make(<><path d="m19 3-8.5 8.5" /><path d="M10.5 10.5 7 14l3 3 3.5-3.5" /><path d="M7 14c-2 .5-3.5 2-4 6 4-.5 5.5-2 6-4" /><path d="M13.5 13.5 17 17" /></>),
  checkbox: make(<><rect x="4" y="4" width="16" height="16" rx="3.5" /></>),
  checked: make(<><rect x="4" y="4" width="16" height="16" rx="3.5" fill="currentColor" stroke="none" /><path d="m8.5 12.2 2.4 2.4 4.6-5" stroke="var(--background, #fff)" strokeWidth="2" /></>),
  brain: make(<><path d="M9.5 3.5a3 3 0 0 0-3 3v.2A3.5 3.5 0 0 0 4 10.2a3.5 3.5 0 0 0 .8 2.3A3.5 3.5 0 0 0 6 18.3a3 3 0 0 0 3.5 2.2 2.5 2.5 0 0 0 2.5-2.5V6a2.5 2.5 0 0 0-2.5-2.5Z" /><path d="M14.5 3.5a3 3 0 0 1 3 3v.2a3.5 3.5 0 0 1 2.5 3.5 3.5 3.5 0 0 1-.8 2.3 3.5 3.5 0 0 1-1.2 5.8 3 3 0 0 1-3.5 2.2 2.5 2.5 0 0 1-2.5-2.5" /><path d="M9 9.5h-.5M15 9.5h.5M9 14.5H8M15 14.5h1" /></>),
  pencil: make(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></>),
  bolt: make(<><path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12Z" /></>),
  pen: make(<><path d="M12.5 5.5 18.5 11.5" /><path d="M3.5 20.5 5 15 15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19Z" /></>),
  folder: make(<><path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" /></>),
  paperclip: make(<><path d="m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></>),
  note: make(<><path d="M15.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V16Z" /><path d="M15.5 20.5V16H20" /><path d="M8 8.5h8M8 12.5h5" /></>),
  search: make(<><circle cx="11" cy="11" r="6.5" /><path d="m20.5 20.5-4.9-4.9" /></>),
  chevron: make(<><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></>),
};

export function splitIcon(split: string) {
  if (split.startsWith("c:")) return SplitIcons.custom;
  return SplitIcons[split as keyof typeof SplitIcons] ?? SplitIcons.custom;
}

/** The icons a custom split can use; the AI picks one by name. */
export const SPLIT_ICONS: Record<SplitIconName, (props: Glyph) => React.JSX.Element> = {
  briefcase: make(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>),
  building: make(<><rect x="4.5" y="3" width="15" height="18" rx="1.5" /><path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15" /><path d="M10.5 21v-3h3v3" /></>),
  users: make(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18.5 20a6.5 6.5 0 0 0-3-5.5" /></>),
  user: make(<><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>),
  handshake: make(<><path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" /><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5 5 0 0 1 6.1-.8l.5.3a3 3 0 0 0 2.1.4L21 6.5" /><path d="m21 5.5 1 9h-2" /><path d="M3 5.5 2 14.5l6.5 6.5a1.4 1.4 0 0 0 2-2" /><path d="M3 6.5h7" /></>),
  heart: make(<><path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10Z" /></>),
  health: make(<><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></>),
  shield: make(<><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6Z" /><path d="m9 12 2 2 4-4" /></>),
  receipt: make(<><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>),
  file: make(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>),
  clipboard: make(<><rect x="5" y="4.5" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5" /><path d="M9 11h6M9 15h4" /></>),
  coins: make(<><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 13.4c.6 1.3 2.8 2.1 5.5 2.1 3 0 5.5-1.1 5.5-2.5V9c0-1.4-2.5-2.5-5.5-2.5" /><path d="M20.5 13v4c0 1.4-2.5 2.5-5.5 2.5s-5.5-1.1-5.5-2.5v-3.6" /></>),
  bank: make(<><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" /><path d="M3 20h18" /></>),
  chart: make(<><path d="M4 4v16h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>),
  cart: make(<><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /><path d="M3 4h2.5l2.2 11h10.6l2-8H6.5" /></>),
  package: make(<><path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9Z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /></>),
  truck: make(<><path d="M3 6h11v10H3Z" /><path d="M14 9h4l3 3.5V16h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>),
  car: make(<><path d="M5 16.5V12l2-5h10l2 5v4.5" /><path d="M3.5 12h17" /><circle cx="7.5" cy="16.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /></>),
  plane: make(<><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" /></>),
  home: make(<><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></>),
  calendar: make(<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  megaphone: make(<><path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4V5L7 9H4.5a1 1 0 0 0-1 1Z" /><path d="M18 9a4 4 0 0 1 0 6" /><path d="m8 15 1 5h2.5l-1-4.5" /></>),
  news: make(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></>),
  code: make(<><path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m13.5 4-3 16" /></>),
  wrench: make(<><path d="M14.5 6.5a4 4 0 0 0-5.3 5.3l-5.7 5.7a1.8 1.8 0 0 0 2.5 2.5l5.7-5.7a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5Z" /></>),
  rocket: make(<><path d="M12 15 9 12c1.5-4.5 4.5-8 10.5-8.5C19 9.5 15.5 12.5 12 15Z" /><path d="M9 12H5l2.5-3.5H11" /><path d="M12 15v4l3.5-2.5V13" /><path d="M6.5 16.5c-1.5 1-2 3-2 3s2-.5 3-2" /></>),
  target: make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  flag: make(<><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>),
  star: make(<><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" /></>),
  bell: make(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  tag: make(<><path d="M3.5 12.5v-8a1 1 0 0 1 1-1h8l8 8a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0Z" /><circle cx="8" cy="8" r="1.3" /></>),
  globe: make(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></>),
  lock: make(<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>),
  phone: make(<><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>),
  graduation: make(<><path d="m2.5 9 9.5-5 9.5 5-9.5 5Z" /><path d="M6.5 11v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5" /><path d="M21.5 9v6" /></>),
  scale: make(<><path d="M12 4v16M7 20h10M5 7h14" /><path d="M2.5 13a2.5 2.5 0 0 0 5 0L5 7Z" /><path d="M16.5 13a2.5 2.5 0 0 0 5 0L19 7Z" /></>),
  leaf: make(<><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="m5 19 8-8" /></>),
  coffee: make(<><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 3.5v2M12 3.5v2" /></>),
  mail: make(<><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6.5 8.5 6 8.5-6" /></>),
  sparkle: make(<><path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9Z" /></>),
};

/** A custom split's icon: a line icon by name, an older emoji, or the default. */
export function SplitGlyph({ icon, className }: { icon: string; className?: string }) {
  const Named = SPLIT_ICONS[icon as SplitIconName];
  if (Named) return <Named className={className} />;
  if (icon) return <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: 1 }} aria-hidden="true">{icon}</span>;
  return <SplitIcons.custom className={className} />;
}
