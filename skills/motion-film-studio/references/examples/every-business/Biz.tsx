import React from "react";
import { Icon, IconName } from "../../components/Icons";
import { Mark } from "../../components/Mark";
import { C, FONT, MONO } from "../../theme";

/**
 * The five businesses of film #4 — deliberately far apart (retail, health,
 * property, hospitality, software) so every viewer finds their own. Each keeps
 * the question it asked in the hook, and gets its answer in the demo.
 * Names, people and details are illustrative.
 */
export type BizKey = "store" | "clinic" | "homes" | "hotel" | "saas";
export type Biz = {
  name: string;
  kind: string;
  color: string;
  tint: string;
  icon: IconName;
  time: string;
  who: string;
  q: string;
  a: string[];
  chip: { icon: IconName; text: string };
  lang?: string;
};

export const BIZ: Record<BizKey, Biz> = {
  store: {
    name: "Nova Store",
    kind: "Online store",
    color: "#5E6AD2",
    tint: "#E7E9FB",
    icon: "bag",
    time: "11:42 PM",
    who: "Aisha",
    q: "Hi! Where's my order?",
    a: ["It's out for delivery,", "arriving today by 6 PM."],
    chip: { icon: "truck", text: "Out for delivery" },
  },
  clinic: {
    name: "Brightside Dental",
    kind: "Clinic",
    color: "#1C9A83",
    tint: "#DCF2EC",
    icon: "stethoscope",
    time: "7:15 AM",
    who: "Robert",
    q: "Can I move my appointment to Friday?",
    a: ["Done! Friday at 10:30", "with Dr. Amal."],
    chip: { icon: "calendar", text: "Appointment moved" },
  },
  homes: {
    name: "Harbor Homes",
    kind: "Real estate",
    color: "#D4861C",
    tint: "#FAEBD4",
    icon: "home",
    time: "9:03 PM",
    who: "Maria",
    q: "Is the apartment still available?",
    a: ["Yes! Want a viewing", "on Saturday at 11?"],
    chip: { icon: "userPlus", text: "New lead · Maria L." },
  },
  hotel: {
    name: "Casa Azul Hotel",
    kind: "Hotel",
    color: "#2B86CC",
    tint: "#DCEDFA",
    icon: "bed",
    time: "2:27 AM",
    who: "Diego",
    q: "¿Tienen habitación para el viernes?",
    a: ["¡Sí! Tenemos una doble", "con vista al mar."],
    chip: { icon: "globe", text: "Answered in Spanish" },
    lang: "ES",
  },
  saas: {
    name: "Flowdesk",
    kind: "Software",
    color: "#7B55C7",
    tint: "#ECE4F8",
    icon: "laptop",
    time: "4:50 PM",
    who: "Leo",
    q: "Can I talk to someone?",
    a: ["Of course! Bringing in", "Sam from our team."],
    chip: { icon: "headset", text: "Handed to Sam · Support" },
  },
};

export const BizBadge: React.FC<{ b: Biz; size?: number }> = ({ b, size = 64 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.32, background: b.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Icon name={b.icon} size={size * 0.52} color="#FFFFFF" stroke={2.1} />
  </div>
);

/** The Brainfast agent avatar (coral disc, cream mark). */
export const AgentDot: React.FC<{ size?: number; ring?: number }> = ({ size = 64, ring = 0 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: C.coral,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow: ring > 0 ? `0 0 0 ${ring}px rgba(217,87,89,.22)` : "none",
    }}
  >
    <Mark height={size * 0.54} color={C.cream} stroke={24} />
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.gray, size = 20, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.1em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

export const FONT_UI = FONT;
