"use client";

import { Check } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  usePresenceStore,
  useMyStatus,
  type PresenceOverride,
  type PresenceStatus,
} from "@/lib/use-presence";
import { StatusIndicator, statusLabel } from "./status-indicator";
import { cn } from "@/lib/utils";

const ORDER: { value: PresenceOverride; label: string; description: string; status: PresenceStatus }[] = [
  {
    value: "online",
    label: "Online",
    description: "Show as online to other members.",
    status: "online",
  },
  {
    value: "away",
    label: "Away",
    description: "Show as away even when active.",
    status: "away",
  },
  {
    value: "offline",
    label: "Invisible",
    description: "Appear offline. You'll still receive messages.",
    status: "offline",
  },
  {
    value: null,
    label: "Auto",
    description: "Auto-detect from activity (away after 15 min idle).",
    status: "online",
  },
];

/**
 * Dropdown items intended to be embedded inside an existing
 * DropdownMenu (e.g. the user-avatar dropdown in the community
 * shell). Renders the four presence options with a check on the
 * currently selected one.
 */
export function StatusMenuItems() {
  const override = usePresenceStore((s) => s.override);
  const setOverride = usePresenceStore((s) => s.setOverride);
  const effective = useMyStatus();

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <StatusIndicator status={effective} size="sm" borderClass="border-popover" />
        Set status — currently {statusLabel(effective)}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {ORDER.map((opt) => {
        const selected = override === opt.value;
        return (
          <DropdownMenuItem
            key={opt.label}
            onClick={() => setOverride(opt.value)}
            className="flex items-start gap-2 py-2"
          >
            <span className="w-4 mt-0.5 shrink-0 inline-flex items-center justify-center">
              {selected ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <StatusIndicator
                  status={opt.status}
                  size="xs"
                  borderClass="border-popover"
                />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className={cn(
                  "block text-sm",
                  selected ? "font-semibold" : "font-medium",
                )}
              >
                {opt.label}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug">
                {opt.description}
              </span>
            </span>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}
