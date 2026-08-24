import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * A titled, collapsible section: hairline label row in bb's section style,
 * a count, and the list beneath. Collapses to just the label.
 */
export function Section({
  label,
  count,
  collapsed,
  onToggle,
  accent,
  trailing,
  children,
}: {
  label: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
  /** Tailwind text color for the small leading dot. */
  accent?: string | null;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="mb-1">
      <div className="group/section flex h-6 items-center gap-1.5 px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Icon
            name="ChevronRight"
            className={cn(
              "size-3 shrink-0 text-subtle-foreground/70 transition-transform duration-150",
              !collapsed && "rotate-90",
            )}
          />
          {accent ? (
            <span className={cn("size-[6px] shrink-0 rounded-full", accent)} />
          ) : null}
          <span className="truncate text-2xs font-medium uppercase tracking-wide text-subtle-foreground/80">
            {label}
          </span>
          {typeof count === "number" ? (
            <span className="text-2xs tabular-nums text-subtle-foreground/60">
              {count}
            </span>
          ) : null}
        </button>
        {trailing}
      </div>
      {collapsed ? null : <div className="space-y-px">{children}</div>}
    </section>
  );
}
