import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  SECTION_META,
  moveSection,
  type SidebarLayout,
} from "./layout";
import { useLayout } from "./useLayout";

/**
 * The one editor for the sidebar, used both in the in-sidebar popover and on
 * the plugin's settings page. Every change saves immediately.
 */
export function LayoutEditor({ compact = false }: { compact?: boolean }) {
  const { layout, update, reset } = useLayout();

  return (
    <div className={cn("flex flex-col gap-4 text-sm", compact && "gap-3")}>
      <Group title="Sections" hint="Toggle and reorder what the sidebar lists.">
        <ul className="flex flex-col gap-px">
          {layout.sections.map((section, index) => (
            <li
              key={section.id}
              className="flex h-8 items-center gap-2 rounded-md px-1.5 hover:bg-accent/60"
            >
              <Toggle
                checked={section.enabled}
                label={SECTION_META[section.id].label}
                onChange={(enabled) =>
                  update((current) => ({
                    ...current,
                    sections: current.sections.map((s) =>
                      s.id === section.id ? { ...s, enabled } : s,
                    ),
                  }))
                }
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  !section.enabled && "text-muted-foreground",
                )}
                title={SECTION_META[section.id].description}
              >
                {SECTION_META[section.id].label}
              </span>
              <span className="flex shrink-0 items-center">
                <IconButton
                  label="Move up"
                  icon="ChevronUp"
                  disabled={index === 0}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      sections: moveSection(current.sections, section.id, -1),
                    }))
                  }
                />
                <IconButton
                  label="Move down"
                  icon="ChevronDown"
                  disabled={index === layout.sections.length - 1}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      sections: moveSection(current.sections, section.id, 1),
                    }))
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Top navigation">
        <Row label="Icon grid" hint="Pages as icon tiles instead of rows.">
          <Toggle
            checked={layout.navGrid}
            label="Icon grid"
            onChange={(navGrid) => update({ navGrid })}
          />
        </Row>
        <Row label="New thread & Search" hint="Where the two buttons live.">
          <select
            value={layout.primaryStyle}
            onChange={(event) =>
              update({
                primaryStyle: event.currentTarget
                  .value as SidebarLayout["primaryStyle"],
              })
            }
            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New thread and Search placement"
          >
            <option value="chrome">Icons in the top bar</option>
            <option value="tiles">Tiles below the top bar</option>
            <option value="default">bb default row</option>
          </select>
        </Row>
        <Row label="Columns" disabled={!layout.navGrid}>
          <Stepper
            value={layout.navGridColumns}
            min={3}
            max={8}
            disabled={!layout.navGrid}
            onChange={(navGridColumns) => update({ navGridColumns })}
          />
        </Row>
      </Group>

      <Group title="Threads">
        <Row label="Status colors" hint="Orange running · green done · blue waiting.">
          <Toggle
            checked={layout.statusColors}
            label="Status colors"
            onChange={(statusColors) => update({ statusColors })}
          />
        </Row>
        <Row label="Project name in sections">
          <Toggle
            checked={layout.showProjectHint}
            label="Show project name in smart sections"
            onChange={(showProjectHint) => update({ showProjectHint })}
          />
        </Row>
        <Row label="Hide listed threads from folders" hint="A thread shown above is not repeated in its folder.">
          <Toggle
            checked={layout.dedupeFolders}
            label="Hide threads already listed above from folders"
            onChange={(dedupeFolders) => update({ dedupeFolders })}
          />
        </Row>
        <Row label="Done window" hint="How far back “Done” looks.">
          <select
            value={String(layout.smartWindowDays)}
            onChange={(event) =>
              update({ smartWindowDays: Number(event.currentTarget.value) })
            }
            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Done window"
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="0">All time</option>
          </select>
        </Row>
      </Group>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Reset to defaults
        </button>
        <span className="text-2xs text-muted-foreground/60">Saved automatically</span>
      </div>
    </div>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="px-1.5">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        {hint ? (
          <div className="text-2xs text-muted-foreground/70">{hint}</div>
        ) : null}
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

function Row({
  label,
  hint,
  disabled,
  children,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center gap-3 rounded-md px-1.5 py-1",
        disabled && "opacity-50",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {hint ? (
          <span className="block truncate text-2xs text-muted-foreground/70">
            {hint}
          </span>
        ) : null}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "",
        disabled && "cursor-not-allowed",
      )}
      style={
        checked
          ? undefined
          : { background: "color-mix(in oklab, var(--muted-foreground) 35%, transparent)" }
      }
    >
      <span
        className="pointer-events-none block size-3 rounded-full bg-background shadow transition-transform"
        style={{ transform: checked ? "translateX(0.875rem)" : "translateX(0.125rem)" }}
      />
    </button>
  );
}

function IconButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "ChevronUp" | "ChevronDown";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <Icon name={icon} className="size-3.5" />
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <span className="inline-flex items-center rounded-md border border-border">
      <button
        type="button"
        aria-label="Fewer columns"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        –
      </button>
      <span className="w-5 text-center text-xs tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="More columns"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        +
      </button>
    </span>
  );
}

export type { SidebarLayout };
