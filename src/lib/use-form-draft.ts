"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Draft autosave for any form/editor.
 *
 * Persists in-progress work to localStorage so an accidental dialog close,
 * navigation, refresh, or crash never loses what the owner was typing. Drafts
 * are scoped by a stable key (e.g. "trip:new", "trip:<id>", "panel:home",
 * "builder:home") and expire after 14 days.
 *
 * Flow: call `save(data)` on every change (debounced); call `saveNow(data)`
 * to flush immediately on close/unmount; show a restore prompt when `hasDraft`
 * is true on open; call `clear()` after a successful submit (or on an explicit
 * "discard").
 */

const PREFIX = "ayms.draft.";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

interface StoredDraft<T> {
  v: 1;
  savedAt: number;
  data: T;
}

export interface FormDraft<T> {
  /** A recoverable draft exists for this key (offer to restore on open). */
  hasDraft: boolean;
  /** When the current draft was last written (ms epoch), or null. */
  draftSavedAt: number | null;
  /** Read the stored draft data (caller applies it to the form). */
  getDraft: () => T | null;
  /** Debounced autosave — call on every change. */
  save: (data: T) => void;
  /** Immediate write — call to flush on close/unmount. */
  saveNow: (data: T) => void;
  /** Remove the stored draft — call after a successful submit or on discard. */
  clear: () => void;
  /** Hide the restore prompt without touching the stored draft. */
  dismiss: () => void;
}

function readDraft<T>(fullKey: string): StoredDraft<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(fullKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useFormDraft<T>(
  key: string | null,
  opts?: { debounceMs?: number },
): FormDraft<T> {
  const fullKey = key ? PREFIX + key : null;
  const debounceMs = opts?.debounceMs ?? 600;
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On (re)open or key change, detect a pre-existing recoverable draft.
  useEffect(() => {
    if (!fullKey) {
      setHasDraft(false);
      setDraftSavedAt(null);
      return;
    }
    const existing = readDraft<T>(fullKey);
    setHasDraft(!!existing);
    setDraftSavedAt(existing?.savedAt ?? null);
  }, [fullKey]);

  const getDraft = useCallback((): T | null => {
    if (!fullKey) return null;
    return readDraft<T>(fullKey)?.data ?? null;
  }, [fullKey]);

  const writeNow = useCallback(
    (data: T) => {
      if (!fullKey || typeof window === "undefined") return;
      try {
        const savedAt = Date.now();
        const payload: StoredDraft<T> = { v: 1, savedAt, data };
        localStorage.setItem(fullKey, JSON.stringify(payload));
        setDraftSavedAt(savedAt);
      } catch {
        /* localStorage full / unavailable — drafting is best-effort */
      }
    },
    [fullKey],
  );

  const save = useCallback(
    (data: T) => {
      if (!fullKey) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => writeNow(data), debounceMs);
    },
    [fullKey, debounceMs, writeNow],
  );

  const saveNow = useCallback(
    (data: T) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      writeNow(data);
    },
    [writeNow],
  );

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (fullKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(fullKey);
      } catch {
        /* ignore */
      }
    }
    setHasDraft(false);
    setDraftSavedAt(null);
  }, [fullKey]);

  const dismiss = useCallback(() => setHasDraft(false), []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { hasDraft, draftSavedAt, getDraft, save, saveNow, clear, dismiss };
}

/** Human "saved 2m ago" style label for a draft timestamp. */
export function formatDraftAge(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 5000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}
