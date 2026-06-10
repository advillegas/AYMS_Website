"use client";

/**
 * Bulletin-style post composer.
 *
 * Posts are richer than chat messages: a required title, a longer
 * body, and an optional set of media uploads. They're written to
 * the same `/messages` collection with `isPost: true` so they show
 * up inline in the channel stream AND can be filtered into a
 * dedicated "Posts" tab without needing a separate collection.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
import { ImagePlus, Loader2, X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorageInstance, isStorageConfigured } from "@/lib/firebase";
import { useSupabaseBackend } from "@/lib/supabase";
import { uploadToSupabaseStorage } from "@/lib/supabase-storage";
import { useAuth } from "@/lib/store";
import { toast } from "sonner";
import type { PostMedia } from "@/lib/use-firebase-chat";

interface PostComposerProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /**
   * Caller-supplied submit handler. Returns true on success, false if
   * the post should NOT close the dialog (e.g. server error).
   */
  onSubmit: (input: {
    title: string;
    body: string;
    media: PostMedia[];
  }) => Promise<boolean>;
  channelName?: string;
  /** Hard cap on attached media. Default 6. */
  maxMedia?: number;
  /**
   * Pre-fill the composer for editing an existing post. When present
   * the dialog switches to "Edit post" mode (different heading +
   * submit label) and seeds the fields from these values instead of
   * resetting to blank on open.
   */
  initialValues?: {
    title: string;
    body: string;
    media: PostMedia[];
  };
}

const MAX_TITLE = 120;
const MAX_BODY = 4000;

export function PostComposer({
  open,
  onOpenChange,
  onSubmit,
  channelName,
  maxMedia = 6,
  initialValues,
}: PostComposerProps) {
  const isEdit = !!initialValues;
  const currentUserId = useAuth((s) => s.user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset every time the dialog re-opens so a stale draft from a
  // previous channel doesn't leak in. When editing, seed the fields
  // from the post being edited instead of clearing them.
  useEffect(() => {
    if (open) {
      setTitle(initialValues?.title ?? "");
      setBody(initialValues?.body ?? "");
      setMedia(initialValues?.media ?? []);
      setUploading(false);
      setSubmitting(false);
      requestAnimationFrame(() => titleRef.current?.focus());
    }
    // initialValues is intentionally excluded: we only want to seed on
    // open, not re-seed mid-edit if the parent re-renders a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleFiles(files: FileList) {
    const supa = useSupabaseBackend;
    if (!supa && !isStorageConfigured) {
      toast.error("Media uploads aren't enabled — text posts only for now.");
      return;
    }
    // Storage RLS scopes uploads to posts/{canonicalUserId}/… — without
    // a signed-in user there is no valid owner segment.
    if (supa && !currentUserId) {
      toast.error("Sign in to upload media.");
      return;
    }
    const storage = supa ? null : getStorageInstance();
    if (!supa && !storage) return;
    setUploading(true);
    try {
      const next: PostMedia[] = [...media];
      for (let i = 0; i < files.length && next.length < maxMedia; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) continue;
        let url: string | null = null;
        if (supa) {
          url = await uploadToSupabaseStorage(`posts/${currentUserId}`, file);
        } else if (storage) {
          const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const storageRef = ref(storage, `posts/${Date.now()}-${safeName}`);
          await uploadBytes(storageRef, file);
          url = await getDownloadURL(storageRef);
        }
        if (!url) continue;
        next.push({
          url,
          type: isVideo ? "video" : "image",
          alt: file.name,
        });
      }
      setMedia(next);
    } catch (err) {
      console.error("[post-composer] upload failed", err);
      toast.error("Couldn't upload that file. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(idx: number) {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    const t = title.trim();
    const b = body.trim();
    if (!t) {
      toast.error("Posts need a title.");
      titleRef.current?.focus();
      return;
    }
    if (!b && media.length === 0) {
      toast.error("Add some content or attach a photo before posting.");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onSubmit({ title: t, body: b, media });
      if (ok) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("[post-composer] submit failed", err);
      toast.error("Couldn't publish that post. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg elevate-4">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-heading)] text-[#B51760]">{isEdit ? "Edit post" : "New post"}{channelName && <span className="text-gradient-brand"> in #{channelName}</span>}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your post. Edits are visible to everyone and the post is marked as edited."
              : "Share a longer announcement, recap, or question. Members can comment and react just like a chat message."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid gap-1">
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="What's the headline?"
              maxLength={MAX_TITLE}
            />
            <span className="text-[10px] text-muted-foreground tabular-nums self-end">
              {title.length}/{MAX_TITLE}
            </span>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="post-body">Body</Label>
            <textarea
              id="post-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
              placeholder="Share the details. Markdown isn't supported, but line breaks are honored."
              rows={6}
              className="w-full resize-y rounded-md border border-rosa/30 [background-color:#fff] px-3 py-2 text-sm leading-snug focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/70 min-h-[120px] max-h-[360px]"
              maxLength={MAX_BODY}
            />
            <span className="text-[10px] text-muted-foreground tabular-nums self-end">
              {body.length}/{MAX_BODY}
            </span>
          </div>

          <div className="grid gap-1">
            <Label className="flex items-center justify-between">
              <span>Attachments</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {media.length}/{maxMedia}
              </span>
            </Label>
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {media.map((m, i) => (
                  <div
                    key={`${m.url}-${i}`}
                    className="relative aspect-square rounded-md overflow-hidden border border-rosa/20 bg-muted/40"
                  >
                    {m.type === "image" ? (
                      <Image
                        src={m.url}
                        alt={m.alt ?? "Attachment"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <video
                        src={m.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || media.length >= maxMedia}
              className="w-full justify-center border-primary/30 hover:bg-primary/5"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                  Add photo or video
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploading || !title.trim()}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                {isEdit ? "Saving…" : "Posting…"}
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Publish post"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
