"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Hash,
  Plus,
  Trash2,
  Mic,
  Video,
  Lock,
  Archive,
  RotateCcw,
  Save,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import {
  useChannels,
  type RichChannel,
  type ChannelType,
} from "@/lib/use-channels-store";
import { useRoles, useHasPermission } from "@/lib/use-roles-store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<RichChannel["category"], string> = {
  general: "General",
  local: "Local",
  trips: "Trips & Travel",
  events: "Events",
  fun: "Fun & Lifestyle",
};

const TYPE_ICON: Record<ChannelType, typeof Hash> = {
  text: Hash,
  voice: Mic,
  video: Video,
};

const CATEGORY_ORDER: RichChannel["category"][] = [
  "general",
  "trips",
  "events",
  "fun",
];

export default function ChannelsAdminPage() {
  const channels = useChannels((s) => s.channels);
  const createChannel = useChannels((s) => s.createChannel);
  const updateChannel = useChannels((s) => s.updateChannel);
  const deleteChannel = useChannels((s) => s.deleteChannel);
  const moveChannel = useChannels((s) => s.moveChannel);
  const moveChannelToEdge = useChannels((s) => s.moveChannelToEdge);
  const roles = useRoles((s) => s.roles);
  const canReorder = useHasPermission("reorderChannels");
  const canManage = useHasPermission("manageChannels");
  const confirm = useConfirm();

  // Sort by category (in our preferred order) then position. Archived
  // channels sink to the bottom regardless.
  const sortedChannels = useMemo(
    () =>
      [...channels].sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        if (a.category !== b.category) {
          return (
            CATEGORY_ORDER.indexOf(a.category) -
            CATEGORY_ORDER.indexOf(b.category)
          );
        }
        return (a.position ?? 0) - (b.position ?? 0);
      }),
    [channels],
  );

  // For the up/down enable state we need to know each channel's
  // position within its category.
  const positionInfo = useMemo(() => {
    const info = new Map<
      string,
      { isFirst: boolean; isLast: boolean }
    >();
    const groups = new Map<string, RichChannel[]>();
    for (const c of channels) {
      if (c.archived) continue;
      const arr = groups.get(c.category) ?? [];
      arr.push(c);
      groups.set(c.category, arr);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      arr.forEach((c, i) => {
        info.set(c.id, { isFirst: i === 0, isLast: i === arr.length - 1 });
      });
    }
    return info;
  }, [channels]);

  const [selectedId, setSelectedId] = useState<string | null>(
    sortedChannels[0]?.id ?? null,
  );
  const channel = channels.find((c) => c.id === selectedId);

  function handleCreate() {
    if (!canManage) {
      toast.error("You don't have permission to create channels.");
      return;
    }
    const next = createChannel({
      name: "new-channel",
      description: "",
      icon: "#",
      category: "general",
      type: "text",
      restrictedRoleIds: [],
    });
    setSelectedId(next.id);
    toast.success("Channel created");
  }

  async function handleArchive() {
    if (!channel || !canManage) return;
    const ok = await confirm({
      title: `Archive #${channel.name}?`,
      description:
        "The channel is hidden from members but its messages are kept. You can restore it here at any time.",
      confirmText: "Archive",
    });
    if (!ok) return;
    deleteChannel(channel.id, false);
    toast.success(`Archived #${channel.name}. You can restore it from here.`);
  }

  async function handleHardDelete() {
    if (!channel || !canManage) return;
    const ok = await confirm({
      title: `Permanently delete #${channel.name}?`,
      description:
        "This cannot be undone. Existing messages in this channel will be orphaned. Consider archiving instead.",
      confirmText: "Delete channel",
      destructive: true,
    });
    if (!ok) return;
    deleteChannel(channel.id, true);
    setSelectedId(sortedChannels.find((c) => c.id !== channel.id)?.id ?? null);
    toast.success("Channel deleted");
  }

  function handleRestore() {
    if (!channel || !canManage) return;
    updateChannel(channel.id, { archived: false });
    toast.success(`Restored #${channel.name}`);
  }

  function handleMove(id: string, direction: "up" | "down") {
    if (!canReorder) return;
    moveChannel(id, direction);
  }

  function handleMoveToEdge(id: string, edge: "top" | "bottom") {
    if (!canReorder) return;
    moveChannelToEdge(id, edge);
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <Hash className="h-6 w-6 text-primary" />
              Channels
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create, restrict, archive, or delete community channels.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-magenta"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New channel
            </Button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                All channels
              </h3>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-0.5">
                {sortedChannels.map((c) => {
                  const Icon = TYPE_ICON[c.type] ?? Hash;
                  const pos = positionInfo.get(c.id);
                  const showArrows = canReorder && !c.archived && pos;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-center rounded-md transition-colors",
                        selectedId === c.id
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-primary/5 text-foreground/85",
                        c.archived && "opacity-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "flex flex-1 min-w-0 items-center gap-2 px-2 py-1.5 text-left text-sm",
                          selectedId === c.id && "font-semibold",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate flex-1">{c.name}</span>
                        {c.restrictedRoleIds.length > 0 && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        {c.archived && (
                          <Archive className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      {showArrows && (
                        <div
                          className={cn(
                            "flex shrink-0 items-center pr-1",
                            "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity",
                            selectedId === c.id && "opacity-100",
                          )}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(c.id, "up");
                            }}
                            disabled={pos.isFirst}
                            aria-label={`Move ${c.name} up`}
                            title="Move up"
                            className="rounded p-1 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(c.id, "down");
                            }}
                            disabled={pos.isLast}
                            aria-label={`Move ${c.name} down`}
                            title="Move down"
                            className="rounded p-1 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {canReorder && (
                <p className="px-2 pt-2 text-[10px] text-muted-foreground italic">
                  Hover a channel to see the up/down arrows. Channels stay
                  within their category.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="min-w-0">
            {!channel ? (
              <Card>
                <CardContent className="p-12 text-center text-sm text-muted-foreground">
                  Pick a channel to edit, or create a new one.
                </CardContent>
              </Card>
            ) : (
              <ChannelEditor
                channel={channel}
                roles={roles}
                positionInfo={positionInfo.get(channel.id)}
                canManage={canManage}
                canReorder={canReorder}
                onChange={(patch) => updateChannel(channel.id, patch)}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onHardDelete={handleHardDelete}
                onMove={(dir) => handleMove(channel.id, dir)}
                onMoveEdge={(edge) => handleMoveToEdge(channel.id, edge)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChannelEditorProps {
  channel: RichChannel;
  roles: ReturnType<typeof useRoles.getState>["roles"];
  positionInfo: { isFirst: boolean; isLast: boolean } | undefined;
  canManage: boolean;
  canReorder: boolean;
  onChange: (patch: Partial<RichChannel>) => void;
  onArchive: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onMoveEdge: (edge: "top" | "bottom") => void;
}

function ChannelEditor({
  channel,
  roles,
  positionInfo,
  canManage,
  canReorder,
  onChange,
  onArchive,
  onRestore,
  onHardDelete,
  onMove,
  onMoveEdge,
}: ChannelEditorProps) {
  const isFirst = positionInfo?.isFirst ?? true;
  const isLast = positionInfo?.isLast ?? true;
  function toggleRestricted(roleId: string) {
    const has = channel.restrictedRoleIds.includes(roleId);
    onChange({
      restrictedRoleIds: has
        ? channel.restrictedRoleIds.filter((r) => r !== roleId)
        : [...channel.restrictedRoleIds, roleId],
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{channel.icon}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">
              #{channel.name}
            </h3>
            <p className="text-[11px] text-muted-foreground capitalize">
              {channel.type} channel · {CATEGORY_LABELS[channel.category]}
              {channel.archived && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[9px] uppercase"
                >
                  Archived
                </Badge>
              )}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-1">
            {channel.archived ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRestore}
                className="text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Restore
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onArchive}>
                <Archive className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Archive
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onHardDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Delete
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`ch-name-${channel.id}`}>Name</Label>
            <Input
              id={`ch-name-${channel.id}`}
              value={channel.name}
              onChange={(e) =>
                onChange({
                  name: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .slice(0, 40),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`ch-icon-${channel.id}`}>Icon (emoji)</Label>
            <Input
              id={`ch-icon-${channel.id}`}
              value={channel.icon}
              onChange={(e) => onChange({ icon: e.target.value.slice(0, 4) })}
              maxLength={4}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`ch-desc-${channel.id}`}>Description</Label>
          <Input
            id={`ch-desc-${channel.id}`}
            value={channel.description}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={120}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`ch-cat-${channel.id}`}>Category</Label>
            <select
              id={`ch-cat-${channel.id}`}
              value={channel.category}
              onChange={(e) =>
                onChange({ category: e.target.value as RichChannel["category"] })
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(["general", "local", "trips", "events", "fun"] as const).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`ch-type-${channel.id}`}>Type</Label>
            <select
              id={`ch-type-${channel.id}`}
              value={channel.type}
              onChange={(e) =>
                onChange({ type: e.target.value as ChannelType })
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="text">Text</option>
              <option value="voice">Voice</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>

        {canReorder && !channel.archived && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Position in {channel.category} category</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveEdge("top")}
                  disabled={isFirst}
                  className="h-8"
                >
                  <ChevronsUp className="h-3.5 w-3.5 mr-1" /> Top
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMove("up")}
                  disabled={isFirst}
                  className="h-8"
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1" /> Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMove("down")}
                  disabled={isLast}
                  className="h-8"
                >
                  <ChevronDown className="h-3.5 w-3.5 mr-1" /> Down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveEdge("bottom")}
                  disabled={isLast}
                  className="h-8"
                >
                  <ChevronsDown className="h-3.5 w-3.5 mr-1" /> Bottom
                </Button>
                <span className="text-[11px] text-muted-foreground ml-1">
                  Position {channel.position}
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Restrict to roles
          </Label>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Leave empty to allow everyone with view-channels permission.
            Otherwise, only members holding one of the checked roles can see
            this channel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {roles.map((r) => {
              const checked = channel.restrictedRoleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-primary/5 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleRestricted(r.id)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-sm">{r.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 text-[11px] text-muted-foreground italic">
          <Save className="h-3 w-3 mr-1" /> Changes save automatically.
        </div>
      </CardContent>
    </Card>
  );
}
