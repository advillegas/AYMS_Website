"use client";

import { useState, useCallback } from "react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type StorageError,
} from "firebase/storage";
import { getStorageInstance, isStorageConfigured } from "./firebase";
import { useSupabaseBackend, isSupabaseConfigured } from "./supabase";
import { uploadToSupabaseStorage } from "./supabase-storage";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface UseAvatarUploadResult {
  uploading: boolean;
  progress: number;
  error: string | null;
  upload: (file: File, userId: string) => Promise<string | null>;
  isStorageConfigured: boolean;
  reset: () => void;
}

/**
 * Avatar upload hook. Validates file type + size, uploads to
 * /avatars/{userId}/{timestamp}-{filename} in Firebase Storage, and
 * returns the public download URL on success.
 *
 * Why per-userId folder?
 *   Lets you write a Storage rule like:
 *     match /avatars/{uid}/{file=**} {
 *       allow read;
 *       allow write: if request.auth.uid == uid;
 *     }
 *   once Firebase Auth is wired up. Until then, test-mode rules apply.
 */
export function useAvatarUpload(): UseAvatarUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, userId: string): Promise<string | null> => {
      setError(null);

      if (!ALLOWED.includes(file.type)) {
        setError("Use a JPG, PNG, WebP, or GIF image.");
        return null;
      }
      if (file.size > MAX_BYTES) {
        setError("That image is over 5 MB. Try a smaller one.");
        return null;
      }

      // Supabase Storage path (dual-run).
      if (useSupabaseBackend) {
        setUploading(true);
        setProgress(20);
        const url = await uploadToSupabaseStorage(`avatars/${userId}`, file);
        setProgress(100);
        setUploading(false);
        if (!url) setError("Upload failed. Try again.");
        return url;
      }

      if (!isStorageConfigured) {
        setError(
          "Firebase Storage is not enabled for this project. Enable it in the Firebase console to upload photos.",
        );
        return null;
      }

      const storage = getStorageInstance();
      if (!storage) {
        setError("Storage initialization failed.");
        return null;
      }

      setUploading(true);
      setProgress(0);
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `avatars/${userId}/${Date.now()}-${safeName}`;
        const ref = storageRef(storage, path);

        // We use uploadBytes (not uploadBytesResumable) here because
        // avatars are small (max 5MB) - the simpler API is enough.
        // Progress is faked between 0 and 90% so the UI reflects
        // activity without needing the resumable variant.
        setProgress(20);
        await uploadBytes(ref, file, { contentType: file.type });
        setProgress(90);
        const url = await getDownloadURL(ref);
        setProgress(100);
        return url;
      } catch (e) {
        const err = e as StorageError;
        let msg = err.message || "Upload failed";
        if (err.code === "storage/unauthorized") {
          msg =
            "Upload rejected by Storage security rules. In the Firebase console, open Storage -> Rules and switch to test mode (or wire up real auth).";
        } else if (err.code === "storage/object-not-found") {
          msg =
            "Storage bucket not found. Make sure you enabled Storage and that NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET matches the bucket name.";
        } else if (err.code === "storage/unknown") {
          msg = `Upload failed (${err.code}). Check the browser console for CORS / network details.`;
        }
        setError(msg);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
  }, []);

  // Best-effort cleanup helper kept for future use (e.g. swap avatars
  // in profile settings without leaking old objects).
  void deleteObject;

  return {
    uploading,
    progress,
    error,
    upload,
    isStorageConfigured:
      useSupabaseBackend ? isSupabaseConfigured : isStorageConfigured,
    reset,
  };
}
