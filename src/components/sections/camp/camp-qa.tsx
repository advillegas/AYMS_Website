"use client";

/**
 * Q&A accordion for the camp page.
 *
 * Questions and answers are admin-managed (cms_config key "camp.qa") from
 * the in-place editor ("Edit page" on /camp or the section builder): add,
 * remove, reorder, and reword. The eyebrow + heading are click-to-edit like
 * the rest of the page. Visitors see nothing until at least one question
 * with an answer exists — same behaviour as the sponsor banner.
 */

import { Fragment, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useInlineEdit } from "@/lib/use-inline-edit";
import {
  useCampQa,
  saveSiteContent,
  CAMP_QA_KEY,
  type CampQaItem,
} from "@/lib/use-site-content";
import { EditableText } from "@/components/inline/editable-text";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EASE } from "./shared";

/** A question only goes public once it has both a question and an answer. */
function isComplete(item: CampQaItem): boolean {
  return item.q.trim() !== "" && item.a.trim() !== "";
}

const LINK_RE = /(https?:\/\/[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
const TRAILING_PUNCT_RE = /[.,;:!?)\]]+$/;

/**
 * Renders an answer's plain text with URLs and email addresses turned into
 * links. Everything is emitted as React text/elements — never raw HTML.
 */
function AnswerText({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((part, i) => {
        // split() with one capture group puts the matches at odd indexes.
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const trailing = part.match(TRAILING_PUNCT_RE)?.[0] ?? "";
        const target = trailing ? part.slice(0, -trailing.length) : part;
        const isUrl = /^https?:\/\//i.test(target);
        return (
          <Fragment key={i}>
            <a
              href={isUrl ? target : `mailto:${target}`}
              target={isUrl ? "_blank" : undefined}
              rel={isUrl ? "noopener noreferrer" : undefined}
              className="break-words font-medium text-[#B51760] underline underline-offset-2 hover:text-[#FF0099]"
            >
              {target}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}

export function CampQa() {
  const { items } = useCampQa();
  const editing = useInlineEdit((s) => s.enabled);
  const reduceMotion = useReducedMotion();
  const [manageOpen, setManageOpen] = useState(false);

  const visible = items.filter(isComplete);

  // Nothing to show and not editing → the section disappears entirely.
  if (visible.length === 0 && !editing) return null;

  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section
      id="camp-qa"
      className="canvas-editorial relative scroll-mt-24 border-t border-[#FF7F50]/15 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="text-center">
          <EditableText id="camp.qa.eyebrow" as="p" className="eyebrow mb-3 text-[#FF7F50]">
            Good to know
          </EditableText>
          <h2 className="text-title font-display text-ink">
            <EditableText id="camp.qa.title" as="span">Questions?</EditableText>{" "}
            <EditableText
              id="camp.qa.titleAccent"
              as="span"
              className="font-display-italic marker-swipe text-[#B51760]"
            >
              We&apos;ve got answers
            </EditableText>
          </h2>
        </motion.div>

        {visible.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--magenta)]/30 bg-white/60 px-6 py-10 text-center">
            <HelpCircle className="h-8 w-8 text-[var(--magenta)]/50" aria-hidden="true" />
            <p className="text-sm text-ink-soft">
              No questions yet — add your first Q&amp;A and it&apos;ll appear
              here. Visitors don&apos;t see this section until you add one.
            </p>
          </div>
        ) : (
          <motion.div {...reveal} className="mt-10">
            <Accordion className="divide-y divide-[#221019]/10 border-y border-[#221019]/10">
              {visible.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="px-1 transition-colors data-open:bg-[#FF0099]/[0.03]"
                >
                  <AccordionTrigger className="gap-4 py-6 text-left font-display text-base text-ink hover:text-[#B51760] hover:no-underline sm:text-lg [&>svg]:mt-1 [&>svg]:text-[#B51760]/60">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line pb-6 pr-6 text-[15px] leading-relaxed text-ink-soft">
                    <AnswerText text={item.a.trim()} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        )}

        {editing && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setManageOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--magenta)]/60 bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--magenta)] shadow-sm transition-colors hover:bg-[var(--magenta)]/5"
              title="Add, reword, reorder, or remove questions"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit Q&amp;A
            </button>
          </div>
        )}
      </div>

      {editing && (
        <QaEditorDialog open={manageOpen} onOpenChange={setManageOpen} items={items} />
      )}
    </section>
  );
}

/* ---------------------------- Q&A editor ---------------------------- */

function newQa(): CampQaItem {
  return {
    id: `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    q: "",
    a: "",
  };
}

function QaEditorDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: CampQaItem[];
}) {
  const [draft, setDraft] = useState<CampQaItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-seed the draft each time the dialog opens (not on live updates
  // mid-edit, which would clobber typing). Start with one blank row when
  // the list is empty so there's something to type into straight away.
  useEffect(() => {
    if (open) setDraft(items.length ? items.map((it) => ({ ...it })) : [newQa()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function patch(i: number, p: Partial<CampQaItem>) {
    setDraft((d) => d.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }
  function move(i: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }

  // Rows the admin started but didn't finish (one side filled in). They're
  // kept on save so no typing is lost, but stay hidden from visitors.
  const incompleteCount = draft.filter(
    (it) => (it.q.trim() !== "") !== (it.a.trim() !== ""),
  ).length;

  async function handleSave() {
    const cleaned = draft
      .map((it) => ({ ...it, q: it.q.trim(), a: it.a.trim() }))
      .filter((it) => it.q || it.a); // drop fully blank rows
    setSaving(true);
    const ok = await saveSiteContent(CAMP_QA_KEY, { items: cleaned });
    setSaving(false);
    if (ok) {
      toast.success("Q&A saved — live for everyone.");
      onOpenChange(false);
    } else {
      toast.error("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Camp Q&amp;A</DialogTitle>
          <DialogDescription>
            The questions visitors can tap open on the camp page. Add, reword,
            reorder, or remove them. Line breaks in an answer are kept, and
            links or email addresses you paste become clickable.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] space-y-3 overflow-y-auto py-1 pr-1">
          {draft.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No questions — the section is hidden from visitors. Add one below.
            </p>
          )}
          {draft.map((it, i) => (
            <div key={it.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <MessageCircleQuestion className="h-3 w-3" aria-hidden="true" />
                  Question {i + 1}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => remove(i)}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${it.id}-q`} className="text-xs">
                  Question
                </Label>
                <Input
                  id={`${it.id}-q`}
                  value={it.q}
                  onChange={(e) => patch(i, { q: e.target.value })}
                  placeholder="e.g. Can I come by myself?"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${it.id}-a`} className="text-xs">
                  Answer
                </Label>
                <textarea
                  id={`${it.id}-a`}
                  value={it.a}
                  rows={3}
                  onChange={(e) => patch(i, { a: e.target.value })}
                  placeholder="Type the answer…"
                  className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setDraft((d) => [...d, newQa()])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add question
          </Button>
        </div>

        {incompleteCount > 0 && (
          <p className="text-xs text-amber-700">
            {incompleteCount === 1
              ? "1 question is missing its question or answer and won't show to visitors until both are filled in."
              : `${incompleteCount} questions are missing their question or answer and won't show to visitors until both are filled in.`}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save Q&amp;A
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
