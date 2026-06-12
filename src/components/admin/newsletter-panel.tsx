"use client";

/**
 * Admin "Audience" panel — read-only list of newsletter / lead signups
 * captured by the public site, with a client-side CSV export.
 *
 * Matches the DARK admin theme (bg-[#1A0814], text-white/60). Reads via
 * the realtime `useNewsletterList` hook (onSnapshot over
 * `newsletterSignups`). No new dependency — CSV is built and downloaded
 * with a Blob + object URL.
 */

import { useMemo, useState } from "react";
import { Download, Users, Search, Loader2, Mail } from "lucide-react";
import {
  useNewsletterList,
  type NewsletterSignup,
} from "@/lib/use-newsletter";
import { isFirebaseConfigured } from "@/lib/firebase";

const SOURCE_LABEL: Record<NewsletterSignup["source"], string> = {
  contact: "Contact",
  footer: "Footer",
  waitlist: "Waitlist",
  featured: "Featured",
};

const SOURCE_BADGE: Record<NewsletterSignup["source"], string> = {
  contact: "bg-[#FF0099]/15 text-[#FFB3D0] border-[#FF0099]/25",
  footer: "bg-[#9B2C8A]/20 text-[#E6A8DE] border-[#9B2C8A]/30",
  waitlist: "bg-[#DAA520]/15 text-[#F0D080] border-[#DAA520]/25",
  featured: "bg-[#2D8B6F]/20 text-[#9BE0C8] border-[#2D8B6F]/30",
};

/** RFC-4180-ish CSV cell: wrap in quotes and double any inner quotes. */
function csvCell(value: string | undefined): string {
  const s = value ?? "";
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCsv(rows: NewsletterSignup[]): string {
  const header = [
    "email",
    "name",
    "source",
    "tripId",
    "locale",
    "status",
    "createdAt",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.email),
        csvCell(r.name),
        csvCell(r.source),
        csvCell(r.tripId),
        csvCell(r.locale),
        csvCell(r.status),
        csvCell(r.createdAt),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function NewsletterPanel() {
  const { signups, loading, isFirestore } = useNewsletterList();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return signups;
    return signups.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q) ||
        SOURCE_LABEL[s.source].toLowerCase().includes(q),
    );
  }, [signups, search]);

  function handleExport() {
    const csv = buildCsv(filtered);
    // Prepend a UTF-8 BOM so Excel reads accented names correctly.
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `ayms-audience-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF0099]/20 to-[#B51760]/10">
            <Users className="h-4 w-4 text-[#FF0099]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Audience</h2>
            <p className="text-[11px] text-white/40">
              {loading ? "Loading…" : `${signups.length} signups`}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgb(255_0_153/0.30)] transition-all hover:brightness-110 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-white/10 px-5 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or source…"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs text-white placeholder:text-white/30 outline-none transition-colors focus-visible:border-[#FF0099]/40 focus-visible:ring-1 focus-visible:ring-[#FF0099]/40"
          />
        </div>
      </div>

      {/* Not-configured notice */}
      {!isFirebaseConfigured && (
        <div className="mx-5 mt-4 rounded-xl border border-[#DAA520]/25 bg-[#DAA520]/10 px-4 py-3 text-[11px] leading-relaxed text-[#F0D080]">
          Firebase isn&apos;t configured in this environment, so signups
          aren&apos;t being persisted. Add your Firebase keys to capture and
          export real audience data.
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audience…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <Mail className="h-5 w-5 text-white/25" />
            </div>
            <p className="text-sm text-white/40">
              {search
                ? "No signups match your search."
                : isFirestore
                  ? "No signups yet. They'll appear here in real time."
                  : "No signups to show."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-white/85">
                      {s.email}
                    </td>
                    <td className="px-4 py-3 text-white/55">
                      {s.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SOURCE_BADGE[s.source]}`}
                      >
                        {SOURCE_LABEL[s.source]}
                        {s.tripId ? ` · ${s.tripId}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/45">
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
