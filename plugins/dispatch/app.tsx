import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { OpenCount } from "./src/app/components/OpenCount.js";
import { DispatchPage } from "./src/app/pages/DispatchPage.js";
import { ConnectionSection } from "./src/app/settings/ConnectionSection.js";

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "tasks",
    title: "Dispatch",
    icon: "ListChecks",
    path: "tasks",
    component: DispatchPage,
    experimental_sidebarAccessory: OpenCount,
  });

  app.slots.settingsSection({
    id: "connection",
    title: "Connection",
    description: "Connect this BB host to Dispatch.",
    component: ConnectionSection,
  });

  app.contentScripts.register({
    id: "open-dispatch-shortcut",
    mount({ pluginId, signal }) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!event.metaKey || !event.shiftKey || event.key.toLowerCase() !== "d") return;
        event.preventDefault();
        const target = new URL(window.location.href);
        target.pathname = `/plugins/${pluginId}/tasks`;
        target.search = "";
        target.hash = "";
        window.history.pushState({}, "", target);
        window.dispatchEvent(new PopStateEvent("popstate"));
      };
      document.addEventListener("keydown", onKeyDown, { signal });
      return () => document.removeEventListener("keydown", onKeyDown);
    },
  });
});
