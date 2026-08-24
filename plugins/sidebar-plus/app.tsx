// bb-plugin-sidebar-plus — frontend entry.
//
// Replaces the sidebar's scrolling thread list with an editable, sectioned
// list (Needs attention / In progress / Done / Pinned / Projects-as-folders)
// with colored status glyphs, and restyles the host's top nav rows into an
// icon grid. The layout is editable from a popover in the sidebar and from
// this plugin's settings page; it is stored server-side and synced live.
import "./app.css";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { SidebarList } from "./src/SidebarList";
import { LayoutEditor } from "./src/LayoutEditor";

function SettingsSection() {
  return (
    <div className="max-w-md rounded-lg border border-border bg-card p-4">
      <LayoutEditor />
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "sidebar-plus",
    title: "Sidebar Plus",
    description:
      "Needs-attention / In-progress / Done sections, colored status, project folders, icon grid for the top nav.",
    component: SidebarList,
  });

  app.slots.settingsSection({
    id: "layout",
    title: "Sidebar layout",
    description:
      "Choose which sections the sidebar shows and in what order. The same editor is one click away in the sidebar itself (the sliders icon).",
    component: SettingsSection,
  });
});
