"use client";

/**
 * Report dialog — a reason picker for flagging a message or member to
 * the moderation team. Persists a `reports/{id}` doc via the
 * moderation store's `submitReport()`.
 *
 * Inputs are validated with zod at the boundary (reason must be a
 * known preset or a non-empty custom note within length limits).
 */

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import {
  useModeration,
  type ReportTargetType,
} from "@/lib/use-moderation-store";

const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Hate speech",
  "Inappropriate content",
  "Self-harm or dangerous behavior",
  "Off-topic / disruptive",
  "Other",
] as const;

/** Boundary validation. `reason` is the final string we persist. */
const ReportSchema = z.object({
  reason: z.string().trim().min(2, "Please choose or describe a reason.").max(500),
  targetType: z.enum(["message", "member"]),
  targetId: z.string().min(1),
  reportedUserId: z.string().min(1),
  reporterId: z.string().min(1),
});

export interface ReportTarget {
  targetType: ReportTargetType;
  /** message id or member uid. */
  targetId: string;
  reportedUserId: string;
  channelId?: string | null;
  snapshot: { content?: string | null; userName?: string | null };
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget | null;
}

export function ReportDialog({ open, onOpenChange, target }: ReportDialogProps) {
  const user = useAuth((s) => s.user);
  const submitReport = useModeration((s) => s.submitReport);
  const [selected, setSelected] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSelected("");
    setNote("");
  }

  async function handleSubmit() {
    if (!target || !user) {
      toast.error("You need to be signed in to report.");
      return;
    }
    // Compose the final reason: a custom note (for "Other") or the
    // preset, optionally annotated with the note.
    const composed =
      selected === "Other"
        ? note.trim()
        : note.trim()
          ? `${selected} — ${note.trim()}`
          : selected;

    const parsed = ReportSchema.safeParse({
      reason: composed,
      targetType: target.targetType,
      targetId: target.targetId,
      reportedUserId: target.reportedUserId,
      reporterId: user.id,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please pick a reason.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await submitReport({
        targetType: target.targetType,
        targetId: target.targetId,
        channelId: target.channelId ?? null,
        reportedUserId: target.reportedUserId,
        reporterId: user.id,
        reporterName: user.name,
        reason: parsed.data.reason,
        snapshot: {
          content: target.snapshot.content ?? null,
          userName: target.snapshot.userName ?? null,
        },
      });
      if (id) {
        toast.success("Report sent to the moderation team. Thank you.");
        reset();
        onOpenChange(false);
      } else {
        toast.error("Couldn't send the report right now. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const ready =
    selected.length > 0 && (selected !== "Other" || note.trim().length >= 2);
  const targetLabel =
    target?.targetType === "member"
      ? `${target.snapshot.userName ?? "this member"}`
      : `${target?.snapshot.userName ?? "this message"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[#FF0099]" />
            Report{" "}
            {target?.targetType === "member" ? "member" : "message"}
          </DialogTitle>
          <DialogDescription>
            Flag{" "}
            <span className="font-medium text-foreground">{targetLabel}</span>{" "}
            for the moderation team. Reports are private — only moderators see
            them.
          </DialogDescription>
        </DialogHeader>

        {target?.targetType === "message" && target.snapshot.content ? (
          <div className="rounded-md border border-rosa/25 bg-muted/30 px-3 py-2 text-xs text-muted-foreground line-clamp-3">
            “{target.snapshot.content}”
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reason
          </p>
          <div className="grid gap-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelected(r)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  selected === r
                    ? "border-[#FF0099] bg-[#FF0099]/5 font-medium"
                    : "border-border hover:bg-[#FF0099]/5",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 shrink-0 rounded-full border",
                    selected === r
                      ? "border-[#FF0099] bg-[#FF0099]"
                      : "border-muted-foreground/40",
                  )}
                />
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="report-note"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {selected === "Other" ? "Tell us what happened" : "Add a note (optional)"}
          </label>
          <textarea
            id="report-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            placeholder={
              selected === "Other"
                ? "Describe the issue…"
                : "Anything the moderators should know…"
            }
            className="w-full resize-none rounded-md border border-rosa/30 bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/70"
          />
          <p className="text-right text-[10px] text-muted-foreground/70">
            {note.length}/500
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!ready || submitting}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 hover:brightness-110"
          >
            {submitting ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
