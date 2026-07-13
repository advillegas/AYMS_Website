"use client";

/**
 * Admin-editable footer link columns, stored under cms_config key
 * "footer.columns". Renders the public nav columns and, in edit mode, an
 * "Edit links" chip opening a CRUD dialog (add/remove/reorder columns and
 * links, edit headings/labels/URLs) — same pattern as CampCtaButtons.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useInlineEdit } from "@/lib/use-inline-edit";
import {
  useFooterContent,
  saveSiteContent,
  FOOTER_KEY,
  type FooterColumn,
} from "@/lib/use-site-content";
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

export function FooterColumns() {
  const { columns } = useFooterContent();
  const editing = useInlineEdit((s) => s.enabled);
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <>
      {columns.map((col, ci) => (
        <nav key={`${col.heading}-${ci}`} aria-label={col.heading} className="md:col-span-2">
          <p className="eyebrow text-white/40">{col.heading}</p>
          <ul className="mt-4 space-y-3">
            {col.links.map((l, li) => (
              <li key={`${l.href}-${li}`}>
                <Link
                  href={l.href || "/"}
                  className="text-sm text-white/65 transition-colors hover:text-[#FACDE8] focus-visible:outline-none focus-visible:text-[#FACDE8]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {editing && ci === 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditorOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--magenta)]/60 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#FACDE8] shadow-sm transition-colors hover:bg-white/15"
              title="Edit footer link columns (headings, labels, URLs, add, remove, reorder)"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit links
            </button>
          )}
        </nav>
      ))}

      {editing && columns.length === 0 && (
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--magenta)]/60 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#FACDE8] shadow-sm transition-colors hover:bg-white/15"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit footer links
          </button>
        </div>
      )}

      {editing && (
        <FooterEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          columns={columns}
        />
      )}
    </>
  );
}

/* --------------------------- editor dialog -------------------------- */

function FooterEditorDialog({
  open,
  onOpenChange,
  columns,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columns: FooterColumn[];
}) {
  const [draft, setDraft] = useState<FooterColumn[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-seed the draft each time the dialog opens (not on live updates
  // mid-edit, which would clobber typing).
  useEffect(() => {
    if (open) {
      setDraft(columns.map((c) => ({ ...c, links: c.links.map((l) => ({ ...l })) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function patchCol(ci: number, p: Partial<FooterColumn>) {
    setDraft((d) => d.map((c, i) => (i === ci ? { ...c, ...p } : c)));
  }
  function moveCol(ci: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = ci + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[ci], next[j]] = [next[j], next[ci]];
      return next;
    });
  }
  function removeCol(ci: number) {
    setDraft((d) => d.filter((_, i) => i !== ci));
  }
  function patchLink(ci: number, li: number, p: Partial<FooterColumn["links"][number]>) {
    setDraft((d) =>
      d.map((c, i) =>
        i === ci
          ? { ...c, links: c.links.map((l, j) => (j === li ? { ...l, ...p } : l)) }
          : c,
      ),
    );
  }
  function moveLink(ci: number, li: number, dir: -1 | 1) {
    setDraft((d) =>
      d.map((c, i) => {
        if (i !== ci) return c;
        const j = li + dir;
        if (j < 0 || j >= c.links.length) return c;
        const links = [...c.links];
        [links[li], links[j]] = [links[j], links[li]];
        return { ...c, links };
      }),
    );
  }
  function removeLink(ci: number, li: number) {
    setDraft((d) =>
      d.map((c, i) => (i === ci ? { ...c, links: c.links.filter((_, j) => j !== li) } : c)),
    );
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent(FOOTER_KEY, {
      columns: draft.map((c) => ({
        heading: c.heading.trim(),
        links: c.links.map((l) => ({ label: l.label.trim(), href: l.href.trim() })),
      })),
    });
    setSaving(false);
    if (ok) {
      toast.success("Footer links saved — live for everyone.");
      onOpenChange(false);
    } else {
      toast.error("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Footer link columns</DialogTitle>
          <DialogDescription>
            The link lists in the site footer. Links can point to pages
            (<code className="text-xs">/trips</code>), anchors
            (<code className="text-xs">/#contact</code>), or external URLs.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto py-1 pr-1">
          {draft.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No columns — the footer will show none. Add one below.
            </p>
          )}
          {draft.map((c, ci) => (
            <div key={ci} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={c.heading}
                  onChange={(e) => patchCol(ci, { heading: e.target.value })}
                  placeholder="Column heading (e.g. Explore)"
                  className="h-8 font-semibold"
                />
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => moveCol(ci, -1)}
                    disabled={ci === 0}
                    aria-label="Move column up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => moveCol(ci, 1)}
                    disabled={ci === draft.length - 1}
                    aria-label="Move column down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeCol(ci)}
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                {c.links.map((l, li) => (
                  <div key={li} className="flex items-center gap-1.5">
                    <Input
                      value={l.label}
                      onChange={(e) => patchLink(ci, li, { label: e.target.value })}
                      placeholder="Label"
                      className="h-8 flex-1"
                    />
                    <Input
                      value={l.href}
                      onChange={(e) => patchLink(ci, li, { href: e.target.value })}
                      placeholder="/page or https://…"
                      className="h-8 flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 p-0"
                      onClick={() => moveLink(ci, li, -1)}
                      disabled={li === 0}
                      aria-label="Move link up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 p-0"
                      onClick={() => moveLink(ci, li, 1)}
                      disabled={li === c.links.length - 1}
                      aria-label="Move link down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeLink(ci, li)}
                      aria-label="Remove link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    patchCol(ci, { links: [...c.links, { label: "New link", href: "/" }] })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add link
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              setDraft((d) => [...d, { heading: "New column", links: [] }])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add column
          </Button>
        </div>

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
            Save footer links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
