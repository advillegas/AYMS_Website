"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, X, Loader2, Maximize2 } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { getStorageInstance, isStorageConfigured } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  onChange?: (next: string[]) => void;
  editable?: boolean;
  max?: number;
}

export function PhotoGallery({
  photos,
  onChange,
  editable,
  max = 6,
}: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    if (!onChange) return;
    if (!isStorageConfigured) {
      toast.error("Photo uploads need Firebase Storage to be enabled.");
      return;
    }
    const storage = getStorageInstance();
    if (!storage) {
      toast.error("Storage isn't available right now.");
      return;
    }
    setUploading(true);
    try {
      const urls = [...photos];
      let skipped = false;
      for (let i = 0; i < files.length && urls.length < max; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
          skipped = true;
          continue;
        }
        const storageRef = ref(
          storage,
          `gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`,
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      onChange(urls);
      if (skipped) {
        toast.error("Some files were skipped (must be images under 8 MB).");
      }
    } catch (err) {
      console.error("[gallery-upload]", err);
      toast.error("Couldn't upload your photos. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(index: number) {
    if (!onChange) return;
    const ok = await confirm({
      title: "Remove this photo?",
      description: "It will be removed from your gallery.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    onChange(photos.filter((_, i) => i !== index));
  }

  if (!editable && photos.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          photos.length <= 2
            ? "grid-cols-2"
            : photos.length <= 4
              ? "grid-cols-2 sm:grid-cols-3"
              : "grid-cols-3",
        )}
      >
        {photos.map((url, i) => (
          <div
            key={i}
            className="relative group aspect-square rounded-lg overflow-hidden border border-rosa/20 bg-muted/30 cursor-pointer"
            onClick={() => !editable && setLightboxUrl(url)}
          >
            <Image
              src={url}
              alt={`Gallery photo ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
            {!editable && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
              </div>
            )}
            {editable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void removePhoto(i);
                }}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove gallery photo ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {editable && photos.length < max && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 text-primary/60 hover:bg-primary/5 hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">
                    {photos.length}/{max}
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      <Dialog
        open={!!lightboxUrl}
        onOpenChange={(o) => !o && setLightboxUrl(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black">
          {lightboxUrl && (
            <Image
              src={lightboxUrl}
              alt="Gallery photo"
              width={1200}
              height={900}
              className="w-full h-auto max-h-[85vh] object-contain"
              unoptimized
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
