"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X, Loader2 } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorageInstance, isStorageConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface CoverPhotoUploaderProps {
  url: string | undefined;
  onChange: (url: string) => void;
  editable?: boolean;
  className?: string;
}

export function CoverPhotoUploader({
  url,
  onChange,
  editable,
  className,
}: CoverPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!isStorageConfigured) return;
    const storage = getStorageInstance();
    if (!storage) return;
    setUploading(true);
    try {
      const storageRef = ref(
        storage,
        `covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`,
      );
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      onChange(downloadUrl);
    } catch (err) {
      console.error("[cover-upload]", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "relative w-full h-40 sm:h-52 lg:h-64 bg-gradient-to-r from-primary/40 to-magenta/30 overflow-hidden",
        className,
      )}
    >
      {url && (
        <Image
          src={url}
          alt="Cover photo"
          fill
          className="object-cover"
          unoptimized
        />
      )}
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {url ? "Change cover" : "Add cover photo"}
          </button>
          {url && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-3 right-3 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="Remove cover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
