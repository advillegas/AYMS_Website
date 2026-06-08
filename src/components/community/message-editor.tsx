"use client";

/**
 * Hover-action toolbar + inline editor for a chat message.
 *
 * Used by:
 *   - The community channel chat (src/app/community/page.tsx)
 *   - Direct messages and group DMs (conversation-view.tsx)
 *
 * The toolbar exposes:
 *   - Edit  (only if `canEdit`)
 *   - Delete (only if `canDelete`)
 *   - Optional extra slot for context-specific actions (reactions,
 *     thread reply) which the parent renders alongside us.
 *
 * The editor is intentionally minimal - just a textarea with
 * Enter-to-save / Esc-to-cancel - because every other chrome
 * (formatting, mentions, attachments) lives in the main composer.
 * Power users can always delete and re-send for the rich path.
 */

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export interface MessageEditorProps {
  initialContent: string;
  onSave: (next: string) => Promise<boolean>;
  onCancel: () => void;
}

export function MessageEditor({
  initialContent,
  onSave,
  onCancel,
}: MessageEditorProps) {
  const [draft, setDraft] = useState<string>(initialContent);
  const [saving, setSaving] = useState<boolean>(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Focus + select on open so the user can immediately overwrite or
  // edit, mirroring Slack/Discord's edit affordance.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    // Auto-grow to fit current content.
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  function autosize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }

  async function handleSave() {
    const next = draft.trim();
    if (!next) {
      toast.error("Message can't be empty. Use delete instead.");
      return;
    }
    if (next === initialContent.trim()) {
      onCancel();
      return;
    }
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    if (ok) {
      onCancel();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  }

  return (
    <div className="mt-1 rounded-md border border-primary/40 bg-card p-1.5">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          autosize();
        }}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={saving}
        className="w-full resize-none bg-transparent text-sm leading-snug outline-none placeholder:text-muted-foreground/60 px-1.5 py-1 max-h-[240px]"
        placeholder="Edit your message…"
      />
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground/80">
        <span>esc to cancel · enter to save · shift+enter for newline</span>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
            className="h-6 px-2 text-[11px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !draft.trim()}
            className="h-6 px-2 text-[11px]"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact pencil + trash buttons for the floating hover toolbar.
 * Each is a no-op when disabled, so the parent can simply render them
 * unconditionally when permission is granted.
 */
export function MessageActionButtons({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  destructiveDeleteLabel = "Delete message",
  confirmDeletePrompt = "Delete this message? This can't be undone.",
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => Promise<boolean> | boolean;
  destructiveDeleteLabel?: string;
  confirmDeletePrompt?: string;
}) {
  const confirm = useConfirm();
  if (!canEdit && !canDelete) return null;

  async function handleDelete() {
    const confirmed = await confirm({
      title: destructiveDeleteLabel,
      description: confirmDeletePrompt,
      confirmText: destructiveDeleteLabel,
      destructive: true,
    });
    if (!confirmed) return;
    const ok = await onDelete();
    if (ok) {
      toast.success("Message deleted.");
    } else {
      toast.error("Couldn't delete the message.");
    }
  }

  return (
    <>
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          aria-label="Edit message"
          title="Edit message"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label={destructiveDeleteLabel}
          title={destructiveDeleteLabel}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );
}
