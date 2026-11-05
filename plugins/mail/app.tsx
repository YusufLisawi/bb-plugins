// bb-plugin-mail — frontend entry. The Mail page lists conversations by split; a
// conversation opens in a pane beside the list only while one is selected. An
// invisible app-wide listener plays a sound, raises notifications and keeps the
// unread badges current.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { MailAlerts } from "./src/app/MailAlerts.js";
import { MailPage } from "./src/app/MailPage.js";
import { MailBadgeIcon } from "./src/app/icons.js";
import { AiSettingsSection, AlertsSettingsSection, MailboxesSettingsSection } from "./src/app/MailSettings.js";
import { PANEL_ID } from "./src/app/lib.js";

/** Registered icon name for the sidebar entry; it draws the unread count. */
const BADGE_ICON = "bb-mail-unread";

export default definePluginApp((app) => {
  app.experimental_icons.register({ name: BADGE_ICON, component: MailBadgeIcon });

  app.slots.navPanel({
    id: PANEL_ID,
    title: "Mail",
    icon: BADGE_ICON,
    path: "inbox",
    component: MailPage,
  });

  // BB's Settings → Plugins → Mail page: the same friendly controls as inside Mail.
  app.slots.settingsSection({ id: "ai", title: "AI", description: "Sorting, writing, learning and reading attachments.", component: AiSettingsSection });
  app.slots.settingsSection({ id: "alerts", title: "Notifications", description: "Sound, desktop and phone alerts for new mail.", component: AlertsSettingsSection });
  app.slots.settingsSection({ id: "mailboxes", title: "Mailboxes", description: "Connected accounts and sync.", component: MailboxesSettingsSection });

  app.slots.experimental_appOverlay({ id: "new-mail-alerts", component: MailAlerts });
});
