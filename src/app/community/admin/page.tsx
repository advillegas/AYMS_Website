"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield, Hash, UserCog, Calendar } from "lucide-react";

const TILES = [
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
    desc: "Live Firestore directory. Edit roles, see presence, and remove stale profiles.",
  },
  {
    href: "/community/admin/calendar",
    icon: Calendar,
    title: "Calendar",
    desc: "Sync Google Calendar feeds, create manual events, and manage the community calendar.",
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
