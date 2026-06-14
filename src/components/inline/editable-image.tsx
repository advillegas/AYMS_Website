"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useOverrideImage, saveOverrideImage } from "@/lib/use-site-content";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { Upload, Loader2 } from "lucide-react";

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

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const u = await uploadCmsMedia(file);
      await saveOverrideImage(id, u);
    } catch {
      /* surfaced via console in uploadCmsMedia */
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
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group/ei absolute inset-0 z-20 flex items-center justify-center bg-[#221019]/45 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
        aria-label="Replace image"
      >
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--magenta)] px-3 py-1.5 text-xs font-semibold">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Replace"}
        </span>
      </button>
    </>
  );
}
