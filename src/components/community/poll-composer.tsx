"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { BarChart3, Gift, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreatePollInput } from "@/lib/use-firebase-chat";

interface PollComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreatePollInput) => Promise<string | null>;
  defaultKind?: "poll" | "giveaway";
}

const PRESET_DURATIONS: { label: string; minutes: number | null }[] = [
  { label: "No close time", minutes: null },
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 60 * 24 },
  { label: "1 week", minutes: 60 * 24 * 7 },
];

export function PollComposer({
  open,
  onOpenChange,
  onCreate,
  defaultKind = "poll",
}: PollComposerProps) {
  const [kind, setKind] = useState<"poll" | "giveaway">(defaultKind);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setKind(defaultKind);
    setQuestion("");
    setOptions(["", ""]);
    setMultiple(false);
    setDurationMinutes(null);
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      const closesAt = durationMinutes
        ? new Date(Date.now() + durationMinutes * 60_000).toISOString()
        : undefined;
      const id = await onCreate({
        kind,
        question,
        options,
        multiple: kind === "poll" && multiple,
        closesAt,
      });
      if (id !== null) {
        reset();
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const validOptions = options.filter((o) => o.trim().length > 0);
  const ready =
    question.trim().length > 0 &&
    (kind === "poll" ? validOptions.length >= 2 : validOptions.length >= 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "poll" ? (
              <BarChart3 className="h-4 w-4 text-primary" />
            ) : (
              <Gift className="h-4 w-4 text-primary" />
            )}
            {kind === "poll" ? "Create poll" : "Run giveaway"}
          </DialogTitle>
          <DialogDescription>
            {kind === "poll"
              ? "Ask the community a question with multiple options."
              : "Members enter by clicking the giveaway, then a winner is randomly drawn."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("poll")}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all",
                kind === "poll"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <BarChart3 className="h-4 w-4 mb-1 text-primary" />
              <p className="text-sm font-semibold">Poll</p>
              <p className="text-[11px] text-muted-foreground">
                Vote between options
              </p>
            </button>
            <button
              type="button"
              onClick={() => setKind("giveaway")}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all",
                kind === "giveaway"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <Gift className="h-4 w-4 mb-1 text-primary" />
              <p className="text-sm font-semibold">Giveaway</p>
              <p className="text-[11px] text-muted-foreground">
                Random winner draw
              </p>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="poll-question">
              {kind === "poll" ? "Question" : "Prize / details"}
            </Label>
            <Input
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                kind === "poll"
                  ? "What should we plan next?"
                  : "Free AYMS swag bag — enter to win!"
              }
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              {kind === "poll" ? "Options" : "Entry choices"} ({validOptions.length})
            </Label>
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={
                      kind === "poll"
                        ? `Option ${i + 1}`
                        : i === 0
                          ? "Enter to win!"
                          : `Entry ${i + 1}`
                    }
                    maxLength={120}
                  />
                  {options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOptions(options.filter((_, idx) => idx !== i))
                      }
                      className="shrink-0"
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOptions([...options, ""])}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" /> Add{" "}
                {kind === "poll" ? "option" : "entry"}
              </Button>
            )}
          </div>

          {kind === "poll" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={multiple}
                onCheckedChange={(v) => setMultiple(!!v)}
              />
              Allow multiple votes per person
            </label>
          )}

          <div className="space-y-1.5">
            <Label>{kind === "poll" ? "Closes" : "Drawing"}</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DURATIONS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDurationMinutes(p.minutes)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs border transition-colors",
                    durationMinutes === p.minutes
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!ready || submitting}
            className="bg-primary hover:bg-magenta"
          >
            {submitting ? "Posting…" : kind === "poll" ? "Post poll" : "Start giveaway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
