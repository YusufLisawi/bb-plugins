import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { StatusCluster } from "./StatusGlyph";
import { ThreadRow } from "./ThreadRow";
import { countStatuses } from "./status";
import { descendants, shouldAutoExpand, type TreeNode } from "./familyTree";

/** Remembered open/closed families; an explicit choice beats `autoOpen`. */
export interface TreeExpansion {
  isOpen: (key: string, autoOpen: boolean) => boolean;
  setOpen: (key: string, open: boolean) => void;
}

/**
 * Rows for nested thread families. Each parent is an accordion over its
 * children; collapsed, it shows how many rows it hides and their status.
 */
export function ThreadTree({
  nodes,
  scope,
  defaultOpen,
  expansion,
  depth = 0,
  bgInset = 0,
  activeThreadId,
  followUpThreadIds,
  onSetFollowUp,
  colored,
  onNavigate,
  hint,
}: {
  nodes: readonly TreeNode[];
  /** Namespaces the remembered state: "tree" for folders and pins, else a section id. */
  scope: string;
  /** "always" in status sections; "auto" opens only live families. */
  defaultOpen: "always" | "auto";
  expansion: TreeExpansion;
  depth?: number;
  bgInset?: number;
  activeThreadId: string | null;
  followUpThreadIds: ReadonlySet<string>;
  onSetFollowUp: (threadId: string, marked: boolean) => void;
  colored: boolean;
  onNavigate: () => void;
  hint?: (node: TreeNode, parent: TreeNode | null) => string | null;
}) {
  const rows: ReactNode[] = [];
  // A leaf keeps the chevron's slot when a sibling has one, so titles align.
  const walk = (
    node: TreeNode,
    level: number,
    parent: TreeNode | null,
    alignWithChevrons: boolean,
  ) => {
    const { thread } = node;
    const hasChildren = node.children.length > 0;
    const key = `${scope}:${thread.id}`;
    const open =
      hasChildren &&
      expansion.isOpen(
        key,
        defaultOpen === "always" || shouldAutoExpand(node, activeThreadId),
      );
    const hidden = hasChildren && !open ? descendants(node) : [];
    rows.push(
      <ThreadRow
        key={thread.id}
        thread={thread}
        depth={level}
        bgInset={bgInset}
        context={node.context}
        isActive={thread.id === activeThreadId}
        isFollowUp={followUpThreadIds.has(thread.id)}
        onToggleFollowUp={(marked) => onSetFollowUp(thread.id, marked)}
        colored={colored}
        hint={hint?.(node, parent) ?? null}
        onNavigate={onNavigate}
        leading={
          hasChildren ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Collapse children" : "Expand children"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                expansion.setOpen(key, !open);
              }}
              className="-ml-1 flex size-4 items-center justify-center rounded text-subtle-foreground hover:text-foreground"
            >
              <Icon
                name="ChevronRight"
                className={cn(
                  "size-3 transition-transform",
                  open && "rotate-90",
                )}
              />
            </button>
          ) : alignWithChevrons ? (
            <span aria-hidden="true" className="-ml-1 size-4" />
          ) : undefined
        }
        badge={
          hidden.length > 0 ? (
            <>
              <StatusCluster counts={countStatuses(hidden)} colored={colored} />
              <span
                title={`${hidden.length} sub-thread${hidden.length === 1 ? "" : "s"}`}
                className="text-2xs tabular-nums text-subtle-foreground/70"
              >
                {hidden.length}
              </span>
            </>
          ) : undefined
        }
      />,
    );
    if (open) {
      const align = node.children.some((child) => child.children.length > 0);
      for (const child of node.children) walk(child, level + 1, node, align);
    }
  };
  const align = nodes.some((node) => node.children.length > 0);
  for (const node of nodes) walk(node, depth, null, align);
  return <>{rows}</>;
}
