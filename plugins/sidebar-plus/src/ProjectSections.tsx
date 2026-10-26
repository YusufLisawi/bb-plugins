import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useRealtime,
  useRpc,
  useSdk,
  type PluginSidebarSection,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CompactViewportOverrideProvider } from "@/components/ui/hooks/use-compact-viewport";
import type { rpcContract } from "../server";
import { sectionsForProject, type SectionOwners } from "./sectionFolders";

const SECTION_OWNERS_CHANNEL = "section-owners-changed";

interface ProjectSectionsValue {
  ready: boolean;
  owners: SectionOwners;
  /** Every visible thread's children, for cleanups that must see whole families. */
  childrenOf: ReadonlyMap<string, readonly PluginSidebarThread[]>;
  /** The project folder a thread is drawn in (honours "Move to project folder"). */
  folderIdOf: (thread: PluginSidebarThread) => string;
  /** Folders inside a project, given that project's threads. */
  foldersIn: (projectId: string) => PluginSidebarSection[];
  moveThread: (thread: PluginSidebarThread, section: PluginSidebarSection | null) => Promise<void>;
  openCreate: (projectId: string, moveThread?: PluginSidebarThread) => void;
  openRename: (section: PluginSidebarSection) => void;
  remove: (section: PluginSidebarSection) => Promise<void>;
}

const Context = createContext<ProjectSectionsValue | null>(null);

export function useProjectSections() {
  return useContext(Context);
}

type DialogState =
  | { kind: "create"; projectId: string; moveThread?: PluginSidebarThread }
  | { kind: "rename"; section: PluginSidebarSection }
  | null;

/**
 * Folders inside a project, backed by bb's own thread sections (so bb's
 * sidebar and `bb thread section` see the same folders), plus the per-window
 * dialogs that create and rename them.
 */
export function ProjectSectionsProvider({
  children,
  childrenOf,
  threadsByProject,
  folderIdOf,
  isCompactViewport,
}: {
  children: ReactNode;
  childrenOf: ReadonlyMap<string, readonly PluginSidebarThread[]>;
  threadsByProject: ReadonlyMap<string, readonly PluginSidebarThread[]>;
  folderIdOf: (thread: PluginSidebarThread) => string;
  isCompactViewport: boolean;
}) {
  const sdk = useSdk();
  const rpc = useRpc<typeof rpcContract>();
  // Older hosts send no sections; treat that as "no folders yet".
  const sections = useSidebarThreads().sections ?? [];
  const [owners, setOwners] = useState<SectionOwners>({});
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const refetch = useCallback(async () => {
    try {
      const result = await rpc.call("getSectionOwners");
      setOwners(result?.owners ?? {});
    } catch {
      // Folders still work without the stored owners; empty ones just don't show.
    } finally {
      setReady(true);
    }
  }, [rpc]);
  useEffect(() => {
    void refetch();
  }, [refetch]);
  useRealtime(SECTION_OWNERS_CHANNEL, () => {
    void refetch();
  });

  const moveThread = useCallback(
    async (thread: PluginSidebarThread, section: PluginSidebarSection | null) => {
      try {
        await sdk.threads.update({ threadId: thread.id, sectionId: section ? section.id : null });
        toast.success(section ? `Moved to ${section.name}` : "Removed from folder");
      } catch {
        toast.error("Could not move the thread. Try again.");
      }
    },
    [sdk],
  );

  const remove = useCallback(
    async (section: PluginSidebarSection) => {
      try {
        await sdk.threadSections.delete({ id: section.id });
        await rpc.call("setSectionOwner", { sectionId: section.id, projectId: null });
        toast.success(`Folder "${section.name}" deleted; its threads stay in the project`);
      } catch {
        toast.error("Could not delete the folder. Try again.");
      }
    },
    [sdk, rpc],
  );

  const value = useMemo<ProjectSectionsValue>(
    () => ({
      ready,
      owners,
      childrenOf,
      folderIdOf,
      foldersIn: (projectId) =>
        sectionsForProject(projectId, threadsByProject.get(projectId) ?? [], sections, owners),
      moveThread,
      openCreate: (projectId, thread) => setDialog({ kind: "create", projectId, moveThread: thread }),
      openRename: (section) => setDialog({ kind: "rename", section }),
      remove,
    }),
    [ready, owners, childrenOf, folderIdOf, threadsByProject, sections, moveThread, remove],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <CompactViewportOverrideProvider isCompactViewport={isCompactViewport}>
        {dialog ? (
          <FolderNameDialog
            key={dialog.kind === "create" ? `create:${dialog.projectId}` : `rename:${dialog.section.id}`}
            title={dialog.kind === "create" ? "New folder" : "Rename folder"}
            description={
              dialog.kind === "create"
                ? dialog.moveThread
                  ? "Creates a folder in this project and moves the thread into it."
                  : "Groups threads inside this project. Move threads in from their menu."
                : "Renames the folder everywhere it appears."
            }
            initialName={dialog.kind === "rename" ? dialog.section.name : ""}
            submitLabel={dialog.kind === "create" ? "Create folder" : "Rename"}
            onClose={() => setDialog(null)}
            onSubmit={async (name) => {
              if (dialog.kind === "rename") {
                await sdk.threadSections.update({ id: dialog.section.id, name });
                toast.success(`Renamed to ${name}`);
                return;
              }
              const created = await sdk.threadSections.create({ name });
              await rpc.call("setSectionOwner", { sectionId: created.id, projectId: dialog.projectId });
              if (dialog.moveThread) {
                await sdk.threads.update({ threadId: dialog.moveThread.id, sectionId: created.id });
              }
              toast.success(`Folder "${name}" created`);
            }}
          />
        ) : null}
      </CompactViewportOverrideProvider>
    </Context.Provider>
  );
}

function FolderNameDialog({
  title,
  description,
  initialName,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  initialName: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const trimmed = name.trim();
  const submit = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    setError(false);
    try {
      await onSubmit(trimmed.slice(0, 80));
      onClose();
    } catch {
      setSaving(false);
      setError(true);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Input
            aria-label="Folder name"
            placeholder="Folder name"
            value={name}
            maxLength={80}
            autoFocus
            onChange={(event) => setName(event.currentTarget.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive-text">
              Could not save the folder. Try again.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!trimmed || saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
