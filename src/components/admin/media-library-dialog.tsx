"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useMediaAssets,
  recordMediaAsset,
  deleteMediaAsset,
  kindFromMime,
} from "@/lib/use-media-library";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { useImageCropper } from "@/components/admin/image-cropper";
import { Upload, Loader2, Trash2, ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen image URL. */
  onSelect: (url: string) => void;
  /** Currently-selected URL, highlighted in the grid. */
  current?: string;
}

/**
 * Reusable media picker. Lists previously-uploaded files (newest first) and
 * lets the owner upload a new one — either way the choice is returned via
 * onSelect. Used by the in-place image editor and the block-editor image
 * element so a photo only ever has to be uploaded once.
 */
export function MediaLibraryDialog({ open, onOpenChange, onSelect, current }: Props) {
  const { assets, loaded } = useMediaAssets();
  const requestCrop = useImageCropper();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // Crop/adjust before uploading — cancel aborts the upload.
    const cropped = await requestCrop(file, { title: "Crop & adjust photo" });
    if (!cropped) return;
    setUploading(true);
    try {
      const url = await uploadCmsMedia(cropped);
      // uploadCmsMedia already records storage uploads; this also catches
      // the small-image data-URL fallback (no-op) without duplicating.
      void recordMediaAsset(url, cropped.name, kindFromMime(cropped.type));
      onSelect(url);
      onOpenChange(false);
      toast.success("Image added.");
    } catch {
      toast.error("Upload failed. For video, paste a YouTube or Vimeo link.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Pick a photo you&apos;ve used before, or upload a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loaded ? `${assets.length} item${assets.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-8 gap-1.5"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload new
          </Button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {loaded && assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-30" />
              <p className="text-sm">No uploads yet. Upload your first image above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map((a) => {
                const isCurrent = current && a.url === current;
                return (
                  <div
                    key={a.id}
                    className={`group relative aspect-square overflow-hidden rounded-lg border ${
                      isCurrent ? "border-[var(--magenta)] ring-2 ring-[var(--magenta)]/40" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(a.url);
                        onOpenChange(false);
                      }}
                      className="absolute inset-0 h-full w-full"
                      title={a.name ?? "Select"}
                    >
                      {a.kind === "video" ? (
                        <video src={a.url} className="h-full w-full object-cover" muted />
                      ) : (
                        <Image
                          src={a.url}
                          alt={a.name ?? "Media"}
                          fill
                          unoptimized
                          sizes="160px"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      )}
                    </button>
                    {isCurrent && (
                      <span className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--magenta)] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteMediaAsset(a.id);
                      }}
                      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                      aria-label="Remove from library"
                      title="Remove from library"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
