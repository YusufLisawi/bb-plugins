# Native right-panel tabs for a BB plugin nav page

Use this pattern when a list in a plugin nav page opens detail work in BB's
right panel. It preserves BB's native tab strip, split behavior, persistence,
and keyboard handling while keeping a route that can be refreshed or shared.

Run `bb plugin types --check` first and use the installed declarations if an
SDK type or experimental API has changed.

## 1. Define a stable, validated tab target

Keep a target small. It is selection state, not a copy of the record.

```ts
import type {
  ExperimentalPluginFixedTabReference,
  JsonValue,
} from "@get-bb/plugin-sdk/app";

export type RecordDetailTarget = {
  recordId: string;
} & Record<string, JsonValue>;

function isRecordDetailTarget(value: JsonValue): value is RecordDetailTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.recordId === "string" &&
    value.recordId.trim().length > 0
  );
}

export const RECORD_DETAIL_TAB = {
  panelId: "records",
  id: "record-detail",
  experimental_target: { validate: isRecordDetailTarget },
} as const satisfies ExperimentalPluginFixedTabReference<RecordDetailTarget>;
```

`panelId` must match the nav panel's `id`. The target is deliberately
JSON-safe because BB may retain it for the active app session.

## 2. Register the tab on the nav panel

```tsx
app.slots.navPanel({
  id: "records",
  title: "Records",
  icon: "ListChecks",
  path: "records",
  component: RecordsPage,
  fixedTabs: [
    {
      ...RECORD_DETAIL_TAB,
      title: "Record",
      icon: "ListChecks",
      component: RecordDetailPanel,
      layout: "flush",
    },
  ],
});
```

Use `flush` when the detail tab owns a full-height workspace and its own
scrolling. The host continues to own the panel header, tab strip, resizing,
and Browser/Terminal integration.

## 3. Open the tab and retain a route

```tsx
import {
  experimental_useAppPanel,
  useBbNavigate,
} from "@get-bb/plugin-sdk/app";

function RecordsPage() {
  const panel = experimental_useAppPanel();
  const navigate = useBbNavigate();

  function openRecord(recordId: string) {
    const accepted = panel.openFixedTab({
      surface: { kind: "current" },
      tab: RECORD_DETAIL_TAB,
      target: { recordId },
    });
    if (!accepted) return;

    navigate.toPluginPanel("records", {
      subPath: `record/${encodeURIComponent(recordId)}`,
    });
  }

  return <RecordRow onOpen={() => openRecord(record.id)} />;
}
```

Use the same operation in a `useEffect` to restore a direct route after a
refresh. Guard it with a `useRef` of the last opened id so normal renders do
not repeatedly request the same tab.

## 4. Require the route and target to agree

```tsx
import {
  experimental_useFixedTabTarget,
  useBbNavigate,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";

export function RecordDetailPanel({ subPath }: PluginNavPanelProps) {
  const navigate = useBbNavigate();
  const target = experimental_useFixedTabTarget<RecordDetailTarget>(
    RECORD_DETAIL_TAB,
  );
  const recordId = parseRecordId(subPath);

  if (!recordId) return <NoRecordSelected />;
  if (!target || target.target.recordId !== recordId) return <DetailLoading />;

  return (
    <RecordDetail
      key={`${target.sequence}-${recordId}`}
      recordId={recordId}
      onDeleted={() => {
        target.clear();
        navigate.toPluginPanel("records", { subPath: "", replace: true });
      }}
    />
  );
}
```

Fetch record data by `recordId` inside `RecordDetail`; never trust a whole
record object from the persistent panel parameters. On deleting the record,
clear the target and replace the route so the panel cannot show stale content.

## Do not substitute a custom split

A manual CSS right rail or a plugin-controlled nested panel has valid uses for
temporary local inspection, but it is not a replacement for a BB panel tab.
For a detail that should behave like a BB surface, use the host API above.
