"use client";

/**
 * Discord-style inline channel editor.
 *
 * Used for both "create" and "edit channel" flows. Drives the
 * channels store directly, so the sidebar and the admin page stay
 * in lockstep.
 *
 * Permissions: visibility / role-restriction is editable inline so
 * the admin doesn't have to bounce out to the dedicated admin page
 * for every tweak. The full multi-page admin surface still exists
 * at /community/admin/channels.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Hash, Mic, Video, Lock, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import {
  useChannels,
  type RichChannel,
  type ChannelType,
  type ChannelGeoLocation,
} from "@/lib/use-channels-store";
import { useRoles } from "@/lib/use-roles-store";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LocationAutocomplete,
  type LocationResult,
} from "@/components/community/location-autocomplete";

const TYPE_OPTIONS: Array<{
  value: ChannelType;
  label: string;
  description: string;
  icon: typeof Hash;
}> = [
  {
    value: "text",
    label: "Text",
    description: "Members chat with text, emoji, GIFs and threads.",
    icon: Hash,
  },
  {
    value: "voice",
    label: "Voice",
    description: "Drop-in voice room. No video.",
    icon: Mic,
  },
  {
    value: "video",
    label: "Video",
    description: "Discord-style video lounge for hangouts and streams.",
    icon: Video,
  },
];

const CATEGORY_OPTIONS: Array<{
  value: RichChannel["category"];
  label: string;
}> = [
  { value: "general", label: "General" },
  { value: "local", label: "Local" },
  { value: "trips", label: "Trips & Travel" },
  { value: "events", label: "Events" },
  { value: "fun", label: "Fun & Lifestyle" },
];

const DEFAULT_GEO_RADIUS = 50;
const MIN_GEO_RADIUS = 5;
const MAX_GEO_RADIUS = 200;

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** When provided, the dialog is in "edit" mode. Otherwise "create". */
  channel?: RichChannel | null;
  /**
   * Default category for the create flow. Lets the sidebar's "+"
   * button pre-fill the category that was clicked.
   */
  defaultCategory?: RichChannel["category"];
  /** Optional callback fired with the new/updated channel id. */
  onSaved?: (id: string) => void;
}

export function ChannelDialog({
  open,
  onOpenChange,
  channel,
  defaultCategory,
  onSaved,
}: ChannelDialogProps) {
  const isEdit = !!channel;
  const createChannel = useChannels((s) => s.createChannel);
  const updateChannel = useChannels((s) => s.updateChannel);
  const allRoles = useRoles((s) => s.roles);
  const currentUser = useAuth((s) => s.user);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [icon, setIcon] = useState<string>("");
  const [type, setType] = useState<ChannelType>("text");
  const [category, setCategory] =
    useState<RichChannel["category"]>("general");
  const [restrictedRoleIds, setRestrictedRoleIds] = useState<string[]>([]);
  const [isGeoChannel, setIsGeoChannel] = useState<boolean>(false);
  const [geoLocations, setGeoLocations] = useState<ChannelGeoLocation[]>([]);
  const [geoRadiusMiles, setGeoRadiusMiles] = useState<number>(
    DEFAULT_GEO_RADIUS,
  );

  // Reset every time the dialog opens for a new target so stale
  // edits from a previous channel don't bleed in.
  useEffect(() => {
    if (!open) return;
    if (channel) {
      setName(channel.name);
      setDescription(channel.description ?? "");
      setIcon(channel.icon ?? "");
      setType(channel.type);
      setCategory(channel.category);
      setRestrictedRoleIds(channel.restrictedRoleIds ?? []);
      const initiallyGeo =
        !!channel.isGeoChannel ||
        (channel.geoLocations && channel.geoLocations.length > 0);
      setIsGeoChannel(!!initiallyGeo);
      setGeoLocations(channel.geoLocations ?? []);
      setGeoRadiusMiles(channel.geoRadiusMiles ?? DEFAULT_GEO_RADIUS);
    } else {
      setName("");
      setDescription("");
      setIcon("");
      setType("text");
      const cat = defaultCategory ?? "general";
      setCategory(cat);
      setRestrictedRoleIds([]);
      // Pre-toggle geo when the user is creating in the Local
      // category — that's the whole point of that category.
      setIsGeoChannel(cat === "local");
      setGeoLocations([]);
      setGeoRadiusMiles(DEFAULT_GEO_RADIUS);
    }
  }, [open, channel, defaultCategory]);

  function handleAddLocation(result: LocationResult) {
    setGeoLocations((prev) => {
      // De-dupe on lat/lng so the same place isn't added twice.
      if (prev.some((l) => l.lat === result.lat && l.lng === result.lng)) {
        toast.info("That location is already on this channel.");
        return prev;
      }
      return [...prev, result];
    });
  }

  function handleRemoveLocation(idx: number) {
    setGeoLocations((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleRole(roleId: string) {
    setRestrictedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
    );
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Channel needs a name.");
      return;
    }
    if (isGeoChannel && geoLocations.length === 0) {
      toast.error("Add at least one location for a geo channel.");
      return;
    }
    // Geo channels live in the "local" category by default — keeps
    // them grouped together in the sidebar without forcing the user
    // to pick the right category manually.
    const finalCategory: RichChannel["category"] = isGeoChannel
      ? "local"
      : category;
    const geoFields = isGeoChannel
      ? {
          isGeoChannel: true,
          geoLocations,
          geoRadiusMiles,
        }
      : {
          isGeoChannel: false,
          geoLocations: [],
          geoRadiusMiles: undefined,
        };

    if (isEdit && channel) {
      updateChannel(channel.id, {
        name: trimmedName,
        description: description.trim(),
        icon: icon.trim() || channel.icon || "#",
        type,
        category: finalCategory,
        restrictedRoleIds,
        ...geoFields,
      });
      toast.success(`Updated #${trimmedName}`);
      onSaved?.(channel.id);
      onOpenChange(false);
      return;
    }
    const created = createChannel({
      name: trimmedName,
      description: description.trim(),
      icon: icon.trim() || "#",
      type,
      category: finalCategory,
      restrictedRoleIds,
      createdBy: currentUser?.id,
      ...geoFields,
    });
    toast.success(`Created #${created.name}`);
    onSaved?.(created.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-heading)] text-[#B51760]">
            {isEdit ? `Edit #${channel?.name}` : "Create channel"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the channel's name, type, category, or who can see it."
              : "Add a text, voice, or video channel to the sidebar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ch-name">Channel name</Label>
            <Input
              id="ch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. coffeehouse-chat"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ch-desc">Description (optional)</Label>
            <Input
              id="ch-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel for?"
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="col-span-1 grid gap-1.5">
              <Label htmlFor="ch-icon">Emoji</Label>
              <Input
                id="ch-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="💬"
                maxLength={4}
                className="text-center"
              />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="ch-cat">Category</Label>
              <select
                id="ch-cat"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as RichChannel["category"])
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Channel type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 text-xs transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-foreground/80 hover:bg-primary/5",
                    )}
                    aria-pressed={selected}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5 rounded-md border border-rosa/20 bg-rosa/5 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={isGeoChannel}
                onCheckedChange={(v) => {
                  const next = v === true;
                  setIsGeoChannel(next);
                  if (next && category !== "local") setCategory("local");
                }}
                aria-label="Geo channel"
                className="mt-0.5"
              />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Geo channel
                </span>
                <span className="block text-[11px] text-muted-foreground leading-snug">
                  Limit messages to members near one or more locations.
                  Add zip codes, cities, or full addresses — they get
                  geocoded automatically so the radius filter is exact.
                </span>
              </span>
            </label>

            {isGeoChannel && (
              <div className="space-y-2 pt-1">
                <div>
                  <Label className="text-xs font-medium">Locations</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Members are matched if they&apos;re within the radius
                    of any location below.
                  </p>
                  <div className="space-y-1 mt-1.5">
                    {geoLocations.length === 0 && (
                      <p className="text-[11px] italic text-muted-foreground">
                        No locations yet — add one below.
                      </p>
                    )}
                    {geoLocations.map((loc, i) => (
                      <div
                        key={`${loc.lat},${loc.lng},${i}`}
                        className="flex items-center gap-2 rounded-md border border-rosa/20 bg-card px-2 py-1 text-xs"
                      >
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="flex-1 truncate">{loc.label}</span>
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(i)}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label={`Remove ${loc.label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5">
                    <LocationAutocomplete
                      onSelect={handleAddLocation}
                      placeholder="Add a city, zip code, or address"
                      compact
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="ch-geo-radius"
                      className="text-xs font-medium"
                    >
                      Radius
                    </Label>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {geoRadiusMiles} mi
                    </span>
                  </div>
                  <input
                    id="ch-geo-radius"
                    type="range"
                    min={MIN_GEO_RADIUS}
                    max={MAX_GEO_RADIUS}
                    step={5}
                    value={geoRadiusMiles}
                    onChange={(e) =>
                      setGeoRadiusMiles(parseInt(e.target.value, 10))
                    }
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                    <span>{MIN_GEO_RADIUS} mi</span>
                    <span>{MAX_GEO_RADIUS} mi</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground" />
              Visibility
            </Label>
            {allRoles.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Add roles in the admin panel to gate this channel.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground">
                  Leave empty for everyone. Tick roles to restrict the
                  channel to those members.
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-input bg-background p-2">
                  {allRoles.map((r) => {
                    const checked = restrictedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleRole(r.id)}
                        />
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: r.color }}
                        />
                        <span>{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
          >
            {isEdit ? "Save changes" : "Create channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
