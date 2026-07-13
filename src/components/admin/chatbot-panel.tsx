"use client";

/**
 * Editor for the AI assistant's owner notes (cms_config "chatbot").
 * Whatever is written here is appended to the chatbot's system prompt as
 * authoritative knowledge — letting the owner correct or extend answers
 * (new policies, promos, corrections) without a code change. Trips and
 * events are already injected live, so this is for everything else.
 */

import { useEffect, useRef, useState } from "react";
import {
  useChatbotContent,
  saveSiteContent,
  CHATBOT_KEY,
} from "@/lib/use-site-content";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Save, Bot } from "lucide-react";
import { useFormDraft } from "@/lib/use-form-draft";
import { DraftBanner, DraftSavedHint } from "@/components/admin/draft-banner";

const MAX_LEN = 8_000;

export function ChatbotPanel() {
  const { extraKnowledge } = useChatbotContent();
  const [form, setForm] = useState<string>(extraKnowledge);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(extraKnowledge);
  }, [extraKnowledge, dirty]);

  // Draft autosave so switching admin tabs (which unmounts this panel)
  // never loses unsaved edits. Gate on `dirty` so a pristine panel writes
  // no draft.
  const draft = useFormDraft<string>("panel:chatbot");
  const latestRef = useRef(form);
  latestRef.current = form;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirty) draft.save(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty]);

  useEffect(
    () => () => {
      if (dirtyRef.current) draft.saveNow(latestRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleRestore() {
    const d = draft.getDraft();
    if (d !== null && d !== undefined) {
      setForm(d);
      setDirty(true);
    }
    draft.dismiss();
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent(CHATBOT_KEY, {
      extraKnowledge: form.trim().slice(0, MAX_LEN),
    });
    setSaving(false);
    if (ok) {
      setDirty(false);
      draft.clear();
      toast.success("Chatbot notes saved — the assistant uses them immediately.");
    } else {
      toast.error("Save failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">
            Chatbot knowledge
          </h2>
          <p className="text-[11px] text-white/40">
            Extra facts & corrections for the AI assistant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <DraftSavedHint savedAt={draft.draftSavedAt} />}
          <Button
            onClick={save}
            disabled={saving || !dirty}
            className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-6">
          {draft.hasDraft && (
            <DraftBanner
              savedAt={draft.draftSavedAt}
              label="chatbot notes edit"
              onRestore={handleRestore}
              onDiscard={draft.clear}
            />
          )}

          <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/50">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[#FF0099]" aria-hidden="true" />
            <p>
              The site chatbot already knows the basics (about AYMS, camp,
              booking, policies) and pulls <span className="text-white/75">trips and events live</span> from
              the site. Anything you write below is treated as{" "}
              <span className="text-white/75">authoritative owner knowledge</span> — use it for new
              policies, promos, corrections, or answers the bot gets wrong.
              Plain text or simple lists work best, e.g.{" "}
              <span className="text-white/70">
                &ldquo;Our next Coffee &amp; Cuties is March 14 in Long Beach.&rdquo;
              </span>
            </p>
          </div>

          <textarea
            value={form}
            rows={16}
            maxLength={MAX_LEN}
            onChange={(e) => {
              setDirty(true);
              setForm(e.target.value);
            }}
            placeholder={
              "Examples:\n- Summer Camp check-in opens at 3pm on Friday.\n- We now offer a payment plan on every trip: 25% deposit, rest in monthly installments.\n- The correct camp dates are August 28–30, 2026."
            }
            className="w-full resize-y rounded-lg border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white placeholder:text-white/25 outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30"
          />
          <p className="text-right text-[10px] text-white/30">
            {form.length.toLocaleString()} / {MAX_LEN.toLocaleString()} characters
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
