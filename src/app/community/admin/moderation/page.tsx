"use client";

/**
 * Moderation queue (community admin · LIGHT Card theme).
 *
 * Master-detail like the members admin page:
 *   - Left: the open-reports list (with a filter for status).
 *   - Right: the selected report's detail — context snapshot, a jump
 *     to where the message lives, and moderator actions (delete the
 *     message, ban/mute the author, resolve/dismiss the report).
 *   - A second tab renders the append-only audit log.
 *
 * Gated by `manageMessages` OR `banMembers` (the layout already gates
 * the whole /community/admin area by viewAdminPanel). Firestore
 * security rules remain the real server-side backstop.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShieldAlert,
  ShieldOff,
  Flag,
  Trash2,
  Ban,
  MicOff,
  Mic,
  Check,
  X,
  ScrollText,
  ExternalLink,
  Wifi,
  WifiOff,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useMe } from "@/lib/use-roles-store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useChannelChat } from "@/lib/use-firebase-chat";
import {
  useReports,
  useModActions,
  useModeration,
  useIsBanned,
  useMuteEntry,
  type ModReport,
  type ReportStatus,
  type ModAction,
  type ModActionKind,
} from "@/lib/use-moderation-store";

const STATUS_FILTERS: { key: ReportStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

export default function ModerationPage() {
  const { hasPermission } = useMe();
  // The slice gate: anyone who can manage messages OR ban members.
  const canModerate =
    hasPermission("manageMessages") || hasPermission("banMembers");

  const { reports, loading } = useReports();
  const [tab, setTab] = useState<"queue" | "log">("queue");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return reports;
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const openCount = reports.filter((r) => r.status === "open").length;

  if (!canModerate) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <ShieldOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold">Moderators only</p>
          <p className="text-xs text-muted-foreground mt-1">
            You need the manage-messages or ban-members permission to use the
            moderation queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Moderation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Triage member reports and review every moderation action.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
            isFirebaseConfigured
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          {isFirebaseConfigured ? (
            <>
              <Wifi className="h-3 w-3" /> Firebase live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" /> Local only
            </>
          )}
        </span>
      </div>

      {/* Tab toggle (queue / audit log) */}
      <div className="mb-4 inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab("queue")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
            tab === "queue"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Flag className="h-3.5 w-3.5" /> Report queue
          {openCount > 0 && (
            <span className="ml-0.5 rounded-full bg-[#FF0099] px-1.5 text-[10px] font-bold text-white tabular-nums">
              {openCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("log")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
            tab === "log"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ScrollText className="h-3.5 w-3.5" /> Audit log
        </button>
      </div>

      {!isFirebaseConfigured && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 text-sm text-amber-900 dark:text-amber-200">
            Firebase isn&apos;t configured. Reports and the audit log are stored
            in Firestore — add the{" "}
            <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code> env vars to
            enable them.
          </CardContent>
        </Card>
      )}

      {tab === "queue" ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      statusFilter === f.key
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {f.label}
                    {f.key === "open" && openCount > 0 && (
                      <span className="ml-1 tabular-nums">({openCount})</span>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
                {loading && filtered.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground italic">
                    Loading reports…
                  </p>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="p-10 text-center">
                    <Flag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {statusFilter === "open"
                        ? "No open reports. The community's behaving 💗"
                        : "Nothing here."}
                    </p>
                  </div>
                )}
                {filtered.map((r) => (
                  <ReportRow
                    key={r.id}
                    report={r}
                    selected={selectedId === r.id}
                    onSelect={() => setSelectedId(r.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:sticky lg:top-4 self-start">
            {selected ? (
              <ReportDetail
                report={selected}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-sm text-muted-foreground">
                  Pick a report on the left to see context and take action.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <AuditLog />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report list row                                                     */
/* ------------------------------------------------------------------ */

const STATUS_TONE: Record<ReportStatus, string> = {
  open: "bg-[#FF0099]/10 text-[#B51760]",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  dismissed: "bg-muted text-muted-foreground",
};

function ReportRow({
  report,
  selected,
  onSelect,
}: {
  report: ModReport;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
            STATUS_TONE[report.status],
          )}
        >
          {report.status}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {report.targetType === "member" ? (
            <UserIcon className="h-3 w-3" />
          ) : (
            <Flag className="h-3 w-3" />
          )}
          {report.targetType}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/80">
          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm font-semibold truncate">{report.reason}</p>
      <p className="text-[11px] text-muted-foreground truncate">
        {report.snapshot.userName
          ? `Against ${report.snapshot.userName}`
          : "Against a member"}
        {report.snapshot.content ? ` · “${report.snapshot.content}”` : ""}
      </p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Report detail + actions                                             */
/* ------------------------------------------------------------------ */

function ReportDetail({
  report,
  onClose,
}: {
  report: ModReport;
  onClose: () => void;
}) {
  const { user: me, hasPermission } = useMe();
  const confirm = useConfirm();
  const moderation = useModeration();
  const isBanned = useIsBanned(report.reportedUserId);
  const muteEntry = useMuteEntry(report.reportedUserId);
  const canManageMessages = hasPermission("manageMessages");
  const canBan = hasPermission("banMembers");
  const canMute = hasPermission("muteMembers");

  const actor = me ? { id: me.id, name: me.name } : null;

  // Bind a channel-scoped chat hook to the reported message's channel
  // so we can delete it through the verified chat layer (which keeps
  // thread counts in sync). For member reports there's no channel.
  const channelId = report.channelId ?? "";
  const { deleteMessage } = useChannelChat(channelId);

  const reportedName = report.snapshot.userName ?? "this member";

  async function handleDeleteMessage() {
    if (report.targetType !== "message") return;
    const ok = await confirm({
      title: "Delete reported message?",
      description: "This removes the message for everyone. This can't be undone.",
      destructive: true,
      confirmText: "Delete message",
    });
    if (!ok) return;
    const deleted = await deleteMessage(report.targetId);
    if (deleted) {
      toast.success("Message deleted.");
      // Log the delete against the audit trail (the chat layer itself
      // doesn't know about moderation).
      if (actor) {
        void moderation.logModAction({
          action: "delete-message",
          actorId: actor.id,
          actorName: actor.name,
          targetId: report.targetId,
          targetName: report.snapshot.userName ?? null,
          meta: { reportId: report.id, channelId: report.channelId ?? null },
        });
      }
    } else {
      toast.error(
        "Couldn't delete it — it may already be gone. You can still resolve the report.",
      );
    }
  }

  async function handleBan() {
    if (!actor) return;
    if (isBanned) {
      moderation.unban(report.reportedUserId, actor, reportedName);
      toast.success(`${reportedName} unbanned.`);
      return;
    }
    const ok = await confirm({
      title: `Ban ${reportedName}?`,
      description:
        "They'll be blocked from posting and their messages hidden. They'll be notified.",
      destructive: true,
      confirmText: "Ban member",
    });
    if (!ok) return;
    moderation.ban(
      report.reportedUserId,
      actor,
      report.reason,
      reportedName,
    );
    toast.success(`${reportedName} banned.`);
  }

  function handleMute(durationMs: number | null) {
    if (!actor) return;
    moderation.mute(
      report.reportedUserId,
      actor,
      report.reason,
      durationMs,
      reportedName,
    );
    toast.success(
      durationMs
        ? `${reportedName} muted temporarily.`
        : `${reportedName} muted.`,
    );
  }

  function handleUnmute() {
    if (!actor) return;
    moderation.unmute(report.reportedUserId, actor, reportedName);
    toast.success(`${reportedName} unmuted.`);
  }

  async function handleResolve(status: "resolved" | "dismissed") {
    if (!actor) return;
    await moderation.resolveReport(report, actor, status);
    toast.success(
      status === "resolved" ? "Report resolved." : "Report dismissed.",
    );
    onClose();
  }

  // Deep-link to the channel the message lives in, with the message
  // anchor so the moderator lands near it.
  const jumpHref =
    report.targetType === "message" && report.channelId
      ? `/community?c=${encodeURIComponent(report.channelId)}#msg-${report.targetId}`
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                STATUS_TONE[report.status],
              )}
            >
              {report.status}
            </span>
            <h2 className="mt-1.5 text-base font-bold leading-tight">
              {report.reason}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(report.createdAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1 text-xs">
          <p>
            <span className="text-muted-foreground">Reported member: </span>
            <span className="font-medium">{reportedName}</span>
            {isBanned && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                <Ban className="h-2.5 w-2.5" /> Banned
              </span>
            )}
            {muteEntry && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                <MicOff className="h-2.5 w-2.5" /> Muted
              </span>
            )}
          </p>
          <p>
            <span className="text-muted-foreground">Reported by: </span>
            <span className="font-medium">
              {report.reporterName ?? (report.reporterId || "unknown")}
            </span>
          </p>
        </div>

        {report.snapshot.content && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Message snapshot
            </p>
            <div className="rounded-md border border-rosa/25 bg-muted/30 px-3 py-2 text-sm">
              {report.snapshot.content}
            </div>
          </div>
        )}

        {jumpHref && (
          <Link
            href={jumpHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Jump to message in chat
          </Link>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Take action
          </p>
          <div className="flex flex-wrap gap-2">
            {report.targetType === "message" && canManageMessages && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteMessage}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete message
              </Button>
            )}
            {canMute &&
              (muteEntry ? (
                <Button variant="outline" size="sm" onClick={handleUnmute}>
                  <Mic className="h-3.5 w-3.5 mr-1" /> Unmute
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMute(24 * 60 * 60 * 1000)}
                  >
                    <MicOff className="h-3.5 w-3.5 mr-1" /> Mute 24h
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMute(null)}
                  >
                    <MicOff className="h-3.5 w-3.5 mr-1" /> Mute ∞
                  </Button>
                </>
              ))}
            {canBan && (
              <Button
                variant={isBanned ? "outline" : "destructive"}
                size="sm"
                onClick={handleBan}
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                {isBanned ? "Unban" : "Ban member"}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Resolve / dismiss */}
        {report.status === "open" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handleResolve("resolved")}
              className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 hover:brightness-110"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Mark resolved
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResolve("dismissed")}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Dismiss
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            This report is {report.status}. Actions above still work if you need
            to escalate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

const ACTION_META: Record<
  ModActionKind,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  ban: {
    label: "Banned",
    icon: <Ban className="h-3.5 w-3.5" />,
    tone: "text-destructive",
  },
  unban: {
    label: "Unbanned",
    icon: <Ban className="h-3.5 w-3.5" />,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  mute: {
    label: "Muted",
    icon: <MicOff className="h-3.5 w-3.5" />,
    tone: "text-amber-600 dark:text-amber-400",
  },
  unmute: {
    label: "Unmuted",
    icon: <Mic className="h-3.5 w-3.5" />,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  kick: {
    label: "Kicked",
    icon: <UserIcon className="h-3.5 w-3.5" />,
    tone: "text-destructive",
  },
  "delete-message": {
    label: "Deleted message",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    tone: "text-destructive",
  },
  "resolve-report": {
    label: "Resolved report",
    icon: <Check className="h-3.5 w-3.5" />,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  "dismiss-report": {
    label: "Dismissed report",
    icon: <X className="h-3.5 w-3.5" />,
    tone: "text-muted-foreground",
  },
};

function AuditLog() {
  const { actions, loading } = useModActions();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Audit log
          </h2>
          <span className="text-xs text-muted-foreground">
            {actions.length} action{actions.length === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
          {loading && actions.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground italic">
              Loading audit log…
            </p>
          )}
          {!loading && actions.length === 0 && (
            <div className="p-10 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No moderation actions yet.
              </p>
            </div>
          )}
          {actions.map((a) => (
            <AuditRow key={a.id} action={a} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AuditRow({ action }: { action: ModAction }) {
  const meta = ACTION_META[action.action] ?? ACTION_META["delete-message"];
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span className={cn("mt-0.5 shrink-0", meta.tone)}>{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className={cn("font-semibold", meta.tone)}>{meta.label}</span>
          {action.targetName && (
            <>
              {" "}
              <span className="text-muted-foreground">→</span>{" "}
              <span className="font-medium">{action.targetName}</span>
            </>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">
          by {action.actorName || action.actorId || "unknown"}
          {action.reason ? ` · ${action.reason}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground/80">
        {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}
