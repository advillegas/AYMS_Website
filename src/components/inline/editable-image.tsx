"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useOverrideImage, saveOverrideImage } from "@/lib/use-site-content";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { toast } from "sonner";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { MediaLibraryDialog } from "@/components/admin/media-library-dialog";
import { Upload, Loader2, Images } from "lucide-react";

interface Props {
  /** Stable, unique id for this image slot. */
  id: string;
  /** Coded default image src. */
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * An image an admin can replace in place when edit mode is on. The upload
 * overlay is positioned absolutely, so the wrapping element (or, for `fill`,
 * the relative parent) must be position:relative — which it already is for
 * every image container on the site.
 */
export function EditableImage({ id, src, alt, fill, width, height, sizes, priority, className }: Props) {
  const url = useOverrideImage(id, src);
  const editing = useInlineEdit((s) => s.enabled);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const u = await uploadCmsMedia(file);
      const ok = await saveOverrideImage(id, u);
      if (!ok) toast.error("Photo uploaded but couldn't be saved — try again.");
    } catch {
      toast.error("Couldn't upload that photo. Use an image under ~5MB and try again.");
    } finally {
      setUploading(false);
    }
  }

  const img = (
    <Image
      src={url}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      unoptimized
      className={className}
    />
  );

  if (!editing) return img;

  return (
    <>
      {img}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      {/* On touch there's no hover, so keep the controls visible (subtle by
          default, fully revealed on hover/focus) whenever edit mode is on. */}
      <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-[#221019]/25 opacity-100 transition-opacity hover:bg-[#221019]/45 focus-within:bg-[#221019]/45">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full bg-[var(--magenta)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Upload a new image"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Replace"}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#221019] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--magenta)]"
          aria-label="Choose from media library"
        >
          <Images className="h-4 w-4" /> Library
        </button>
      </div>
      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        current={url}
        onSelect={(u) => void saveOverrideImage(id, u)}
      />
    </>
  );
}
