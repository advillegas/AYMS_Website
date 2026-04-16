"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { CommunityShell } from "@/components/community/community-shell";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return <CommunityShell>{children}</CommunityShell>;
}
