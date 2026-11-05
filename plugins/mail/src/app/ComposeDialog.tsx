import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Composer, type ComposeDraft } from "./Composer.js";

export type { ComposeDraft } from "./Composer.js";

interface ComposeDialogProps {
  draft: ComposeDraft | null;
  onClose: () => void;
}

/** New mail and forwards. Closing keeps the draft; the trash icon discards it. */
export function ComposeDialog({ draft, onClose }: ComposeDialogProps) {
  const title = draft?.replyToId ? "Reply" : draft?.quotedLabel === "Forwarded message" ? "Forward" : "New message";
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="px-5 pb-1 pt-4">
          <DialogTitle className="text-sm font-medium text-muted-foreground">{title}</DialogTitle>
          <DialogDescription className="sr-only">Write and send an email.</DialogDescription>
        </DialogHeader>
        {draft ? (
          <Composer
            draft={draft}
            draftKey={draft.replyToId ? `reply:${draft.replyToId}` : draft.quoted ? `forward:${draft.subject}` : "new"}
            variant="dialog"
            onSent={onClose}
            onClose={onClose}
            onDiscard={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
