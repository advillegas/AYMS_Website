"use client";

/**
 * Right-click context menus for the community surface.
 *
 * Discord/Slack-style: every meaningful affordance you'd expect from
 * a desktop app (copy text, copy link, edit, delete, reply in thread,
 * pin, etc.) is one right-click away on a message, member, or
 * channel.
 *
 * Why a custom one instead of @base-ui/react?
 *   Base UI does not expose a context-menu primitive yet. The hook
 *   below renders into a portal pinned at the cursor coordinates,
 *   auto-flips near the viewport edges, and closes on outside click /
 *   escape / scroll - the standard expectations.
 *
 * Usage:
 *   const ctx = useContextMenu(() => ([
 *     { id: "edit", label: "Edit message", icon: <Pencil/>, onSelect: ... },
 *     { kind: "separator" },
 *     { id: "delete", label: "Delete", danger: true, onSelect: ... },
 *   ]));
 *   return (
 *     <div onContextMenu={ctx.openAt}>...</div>
 *     {ctx.menu}
 *   );
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ContextMenuItem =
  | {
      kind?: "item";
      id: string;
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | {
      kind: "separator";
      id?: string;
    }
  | {
      kind: "label";
      id?: string;
      label: string;
    }
  | {
      /**
       * A horizontal strip of compact buttons (e.g. quick-react
       * emojis at the top of a message menu). Each entry is rendered
       * as a square pill; clicking one fires onSelect and closes the
       * menu like a normal item would.
       */
      kind: "row";
      id?: string;
      entries: Array<{
        id: string;
        label: string;
        title?: string;
        onSelect: () => void;
      }>;
    };

interface MenuState {
  open: boolean;
  x: number;
  y: number;
}

export interface UseContextMenuResult {
  /** Bind to onContextMenu of any element you want right-clickable. */
  openAt: (e: React.MouseEvent) => void;
  /** Imperatively close the menu (useful after an async action). */
  close: () => void;
  /** Whether the menu is currently shown. */
  open: boolean;
  /** The portaled menu element - render alongside your content. */
  menu: ReactNode;
}

/**
 * `buildItems` is called every time the menu opens, so the items
 * always reflect the latest closure (no stale "delete" pointing at
 * the previous message). Returning an empty array suppresses the
 * menu and lets the browser's native context menu through.
 */
export function useContextMenu(
  buildItems: () => ContextMenuItem[],
): UseContextMenuResult {
  const [state, setState] = useState<MenuState>({
    open: false,
    x: 0,
    y: 0,
  });
  // Snapshot the items at open time so we don't recompute on every
  // hover, and so toggling onSelect doesn't cause a re-render storm.
  const [items, setItems] = useState<ContextMenuItem[]>([]);

  const openAt = useCallback(
    (e: React.MouseEvent) => {
      const next = buildItems();
      if (!next || next.length === 0) {
        // Don't suppress the native menu if we have nothing to offer.
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setItems(next);
      setState({ open: true, x: e.clientX, y: e.clientY });
    },
    [buildItems],
  );

  const close = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
  }, []);

  const menu = useMemo(
    () => (
      <ContextMenuPortal
        open={state.open}
        x={state.x}
        y={state.y}
        items={items}
        onClose={close}
      />
    ),
    [state.open, state.x, state.y, items, close],
  );

  return { openAt, close, open: state.open, menu };
}

interface ContextMenuPortalProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

function ContextMenuPortal({
  open,
  x,
  y,
  items,
  onClose,
}: ContextMenuPortalProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(
    null,
  );
  // Index of the keyboard-focused item, -1 means "nothing focused".
  const [focusIdx, setFocusIdx] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset keyboard focus when reopening.
  useEffect(() => {
    if (open) setFocusIdx(-1);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const pop = popRef.current;
    if (!pop) {
      setCoords({ left: x, top: y });
      return;
    }
    const margin = 6;
    const w = pop.offsetWidth || 220;
    const h = pop.offsetHeight || 320;
    let left = x;
    let top = y;
    if (left + w > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - w - margin);
    }
    if (top + h > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - h - margin);
    }
    setCoords({ left, top });
  }, [open, x, y, items]);

  // Outside click / escape / scroll all dismiss.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popRef.current && !popRef.current.contains(target)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const selectable = items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => {
          if (it.kind && it.kind !== "item") return false;
          if ("disabled" in it && it.disabled) return false;
          return true;
        });
      if (selectable.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((idx) => {
          const cur = selectable.findIndex(({ i }) => i === idx);
          const next = (cur + 1) % selectable.length;
          return selectable[next].i;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((idx) => {
          const cur = selectable.findIndex(({ i }) => i === idx);
          const next =
            cur <= 0 ? selectable.length - 1 : (cur - 1 + selectable.length) % selectable.length;
          return selectable[next].i;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = items[focusIdx];
        if (target && (target.kind === undefined || target.kind === "item")) {
          target.onSelect();
          onClose();
        }
      }
    }
    function onScroll() {
      onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose, items, focusIdx]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={popRef}
      role="menu"
      style={{
        position: "fixed",
        left: coords?.left ?? x,
        top: coords?.top ?? y,
        // Hide until first measurement to avoid a 1-frame flash off-edge.
        visibility: coords ? "visible" : "hidden",
        zIndex: 1100,
        minWidth: 200,
      }}
      className="rounded-lg border border-rosa/30 bg-popover text-popover-foreground shadow-2xl py-1 text-sm animate-in fade-in-0 zoom-in-95 duration-100"
      onContextMenu={(e) => {
        // Right-click inside the menu shouldn't reopen the browser menu.
        e.preventDefault();
      }}
    >
      {items.map((item, i) => {
        if (item.kind === "separator") {
          return (
            <div
              key={item.id ?? `sep-${i}`}
              role="separator"
              className="my-1 h-px bg-foreground/10"
            />
          );
        }
        if (item.kind === "label") {
          return (
            <div
              key={item.id ?? `lab-${i}`}
              className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none"
            >
              {item.label}
            </div>
          );
        }
        if (item.kind === "row") {
          return (
            <div
              key={item.id ?? `row-${i}`}
              className="flex items-center gap-1 px-2 py-1.5"
              role="group"
            >
              {item.entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  title={entry.title ?? entry.label}
                  aria-label={entry.title ?? entry.label}
                  onClick={() => {
                    entry.onSelect();
                    onClose();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-transform hover:scale-110 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {entry.label}
                </button>
              ))}
            </div>
          );
        }
        const isFocus = focusIdx === i;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onMouseEnter={() => setFocusIdx(i)}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isFocus && !item.disabled && "bg-primary/10",
              item.danger
                ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                : "hover:bg-primary/10",
            )}
          >
            {item.icon && (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
