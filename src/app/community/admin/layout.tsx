"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/use-roles-store";
import { Loader2, ShieldOff } from "lucide-react";

/**
 * Admin gate. Renders nothing for unprivileged users (and bounces
 * them back to /community). Privilege check is the viewAdminPanel
 * permission; admins have it by default.
 *
 * NOTE: This is a client-side gate. For real production, mirror the
 * same checks in Firestore security rules so the admin pages can't
 * be bypassed by hand-crafting requests.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hasPermission } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (user && !hasPermission("viewAdminPanel")) {
      router.replace("/community");
    }
  }, [user, hasPermission, router]);

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!hasPermission("viewAdminPanel")) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <ShieldOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold">Admin only</p>
          <p className="text-xs text-muted-foreground mt-1">
            You don&apos;t have permission to view this section.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
