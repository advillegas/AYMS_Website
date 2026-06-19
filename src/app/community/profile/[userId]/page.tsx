"use client";

import { useParams } from "next/navigation";
import { useProfileLookup } from "@/lib/profile-lookup";
import { useAuth } from "@/lib/store";
import { ProfileView } from "@/components/community/profile-view";
import { User } from "lucide-react";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const currentUser = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const profile = useProfileLookup(userId);
  const isSelf = currentUser?.id === userId;

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <User className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">Profile not found</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          This member doesn&apos;t exist or hasn&apos;t set up their profile yet.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto [background-color:#fff]">
      <ProfileView
        profile={profile}
        isSelf={isSelf}
        onSave={isSelf ? (patch) => updateProfile(patch) : undefined}
      />
    </div>
  );
}
