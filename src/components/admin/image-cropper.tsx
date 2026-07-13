"use client";

/**
 * Smart cropping tool for every admin image upload.
 *
 * Promise-based, app-wide (mirrors ConfirmProvider): wrap the tree once in
 * <ImageCropperProvider>, then
 *
 *   const requestCrop = useImageCropper();
 *   const cropped = await requestCrop(file, { defaultAspect: "16:9" });
 *   if (cropped) upload(cropped);        // null = admin cancelled
 *
 * The dialog shows the photo under a fixed crop window: drag to reposition,
 * zoom with the slider or mouse wheel, and pick an aspect-ratio preset
 * driven by the destination (free/original, square, 4:3, 16:9, banner…).
 * The default crop is auto-centered at full cover. Output is rendered
 * through an offscreen canvas at the source's native resolution (long side
 * capped) and handed back as a File for the existing upload helpers —
 * plain canvas + pointer events, zero dependencies.
 *
 * GIFs and SVGs skip the cropper (canvas would flatten the animation /
 * vector) and resolve with the original file.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut, Crop } from "lucide-react";

/* ------------------------------ presets ----------------------------- */

export type AspectKey =
  | "original"
  | "1:1"
  | "4:3"
  | "3:4"
  | "16:9"
  | "banner";

const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: "original", label: "Original", ratio: null },
  { key: "1:1", label: "Square", ratio: 1 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "3:4", label: "Portrait", ratio: 3 / 4 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "banner", label: "Banner", ratio: 3 },
];

export interface CropOptions {
  /** Dialog title, e.g. "Crop sponsor logo". */
  title?: string;
  /** Preset selected when the dialog opens (destination-driven). */
  defaultAspect?: AspectKey;
}

type RequestCropFn = (file: File, opts?: CropOptions) => Promise<File | null>;

const CropperContext = React.createContext<RequestCropFn | null>(null);

export function useImageCropper(): RequestCropFn {
  const ctx = React.useContext(CropperContext);
  if (!ctx) {
    throw new Error("useImageCropper must be used within ImageCropperProvider");
  }
  return ctx;
}

/* ----------------------------- provider ----------------------------- */

interface PendingRequest {
  file: File;
  opts: CropOptions;
  resolve: (value: File | null) => void;
}

/** Formats a cropper can't improve — pass straight through. */
function skipsCropper(file: File): boolean {
  return (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  );
}

export function ImageCropperProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = React.useState<PendingRequest | null>(null);

  const requestCrop = React.useCallback<RequestCropFn>((file, opts = {}) => {
    if (skipsCropper(file)) return Promise.resolve(file);
    return new Promise<File | null>((resolve) => {
      setPending({ file, opts, resolve });
    });
  }, []);

  const settle = React.useCallback(
    (value: File | null) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending],
  );

  return (
    <CropperContext.Provider value={requestCrop}>
      {children}
      {pending && (
        <CropDialog
          file={pending.file}
          opts={pending.opts}
          onDone={settle}
        />
      )}
    </CropperContext.Provider>
  );
}

/* ------------------------------ dialog ------------------------------ */

const MAX_ZOOM = 4;
/** Cap the exported long side so uploads stay light. */
const MAX_OUTPUT_PX = 2560;

interface Dims {
  w: number;
  h: number;
}

function CropDialog({
  file,
  opts,
  onDone,
}: {
  file: File;
  opts: CropOptions;
  onDone: (value: File | null) => void;
}) {
  const [aspect, setAspect] = React.useState<AspectKey>(
    opts.defaultAspect ?? "original",
  );
  const [natural, setNatural] = React.useState<Dims | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [exporting, setExporting] = React.useState(false);
  const [areaW, setAreaW] = React.useState(560);

  const url = React.useMemo(() => URL.createObjectURL(file), [file]);
  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const imgRef = React.useRef<HTMLImageElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x: number; y: number } | null>(null);

  // Track the available width so the crop window fits the dialog.
  React.useLayoutEffect(() => {
    const measure = () => {
      if (areaRef.current) setAreaW(areaRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Crop window geometry for the current aspect preset.
  const ratio =
    ASPECTS.find((a) => a.key === aspect)?.ratio ??
    (natural ? natural.w / natural.h : 1);
  const effRatio = ratio ?? (natural ? natural.w / natural.h : 1);
  const maxH = 340;
  const boxW = Math.min(areaW, maxH * effRatio);
  const boxH = boxW / effRatio;

  // Image display scale: `cover` at zoom 1.
  const coverScale = natural
    ? Math.max(boxW / natural.w, boxH / natural.h)
    : 1;
  const scale = coverScale * zoom;
  const dispW = (natural?.w ?? 1) * scale;
  const dispH = (natural?.h ?? 1) * scale;

  const clampOffset = React.useCallback(
    (o: { x: number; y: number }, z = zoom) => {
      if (!natural) return o;
      const s = coverScale * z;
      const mx = Math.max(0, (natural.w * s - boxW) / 2);
      const my = Math.max(0, (natural.h * s - boxH) / 2);
      return {
        x: Math.min(mx, Math.max(-mx, o.x)),
        y: Math.min(my, Math.max(-my, o.y)),
      };
    },
    [natural, coverScale, boxW, boxH, zoom],
  );

  // Auto-center whenever the aspect changes (sensible default crop).
  React.useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [aspect]);

  function applyZoom(z: number) {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setOffset((o) => clampOffset({ x: (o.x * next) / zoom, y: (o.y * next) / zoom }, next));
    setZoom(next);
  }

  // Wheel zoom needs a non-passive listener (React's is passive).
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural, aspect, boxW, boxH]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setOffset(
      clampOffset({
        x: e.clientX - dragRef.current.x,
        y: e.clientY - dragRef.current.y,
      }),
    );
  }
  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  async function handleApply() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setExporting(true);
    try {
      // Map the crop window back into natural-resolution coordinates.
      const sw = boxW / scale;
      const sh = boxH / scale;
      const sx = natural.w / 2 - offset.x / scale - sw / 2;
      const sy = natural.h / 2 - offset.y / scale - sh / 2;

      let outW = Math.max(1, Math.round(sw));
      let outH = Math.max(1, Math.round(sh));
      const long = Math.max(outW, outH);
      if (long > MAX_OUTPUT_PX) {
        const k = MAX_OUTPUT_PX / long;
        outW = Math.max(1, Math.round(outW * k));
        outH = Math.max(1, Math.round(outH * k));
      }

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas 2d unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const keepType =
        file.type === "image/png" || file.type === "image/webp"
          ? file.type
          : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, keepType, 0.92),
      );
      if (!blob) throw new Error("canvas export failed");

      const ext = keepType === "image/png" ? "png" : keepType === "image/webp" ? "webp" : "jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      onDone(new File([blob], `${base}-crop.${ext}`, { type: keepType }));
    } catch (err) {
      console.error("[image-cropper] export failed", err);
      // Exporting failed (rare) — fall back to the original upload rather
      // than dead-ending the admin's flow.
      onDone(file);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onDone(null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-[var(--magenta,#FF0099)]" aria-hidden="true" />
            {opts.title ?? "Crop & adjust photo"}
          </DialogTitle>
          <DialogDescription>
            Drag the photo to reposition it, zoom to crop tighter, and pick the
            shape that fits where it&apos;s going.
          </DialogDescription>
        </DialogHeader>

        {/* Aspect presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ASPECTS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setAspect(a.key)}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (aspect === a.key
                  ? "border-transparent bg-[var(--magenta,#FF0099)] text-white"
                  : "border-input text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Crop window */}
        <div ref={areaRef} className="flex w-full items-center justify-center">
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="application"
            aria-label="Drag to position the photo inside the crop area"
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl border border-input bg-[#221019]/90 active:cursor-grabbing"
            style={{ width: boxW, height: boxH }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={url}
              alt="Crop preview"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNatural({ w: el.naturalWidth || 1, h: el.naturalHeight || 1 });
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: dispW,
                height: dispH,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
            {/* rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
              <div className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
              <div className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
            </div>
            {!natural && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              </div>
            )}
          </div>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--magenta,#FF0099)]/20 accent-[var(--magenta,#FF0099)]"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onDone(file)}
            disabled={exporting}
            className="sm:mr-auto"
          >
            Use original
          </Button>
          <Button variant="outline" onClick={() => onDone(null)} disabled={exporting}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={exporting || !natural}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110"
          >
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
