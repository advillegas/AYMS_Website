"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Shield,
  Hash,
  UserCog,
  Calendar,
  ShieldAlert,
  BarChart3,
  Plane,
  Inbox,
} from "lucide-react";

const TILES = [
  {
    href: "/community/admin/trips",
    icon: Plane,
    title: "Trips",
    desc: "Create, edit, publish, feature, and reorder the trips shown on the marketing site.",
  },
  {
    href: "/community/admin/leads",
    icon: Inbox,
    title: "Leads & inquiries",
    desc: "Trip reservations, waitlists, and newsletter signups — your pipeline in one place.",
  },
  {
    href: "/community/admin/roles",
    icon: Shield,
    title: "Roles & permissions",
    desc: "Create roles, set colors, configure permissions, and assign members.",
  },
  {
    href: "/community/admin/channels",
    icon: Hash,
    title: "Channels",
    desc: "Add, rename, restrict, archive, or delete community channels.",
  },
  {
    href: "/community/admin/members",
    icon: UserCog,
    title: "Members",
    desc: "Live Firestore directory. Edit roles, see presence, ban/mute, and remove profiles.",
  },
  {
    href: "/community/admin/moderation",
    icon: ShieldAlert,
    title: "Moderation",
    desc: "Triage reports, delete messages, ban/mute members, and review the audit log.",
  },
  {
    href: "/community/admin/analytics",
    icon: BarChart3,
    title: "Analytics",
    desc: "Member growth, channel activity, and upcoming events at a glance.",
  },
  {
    href: "/community/admin/calendar",
    icon: Calendar,
    title: "Events & calendar",
    desc: "Sync feeds, create/edit events, toggle publish, and manage the community calendar.",
  },
];

export default function AdminLandingPage() {
  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <Shield className="h-6 w-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the AYMS community.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group">
              <Card className="h-full transition-all group-hover:shadow-lg group-hover:border-primary/40 group-hover:-translate-y-0.5">
                <CardHeader>
                  <t.icon className="h-7 w-7 text-primary" />
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {t.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.desc}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
