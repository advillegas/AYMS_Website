"use client";

import { useAuth } from "@/lib/store";
import { ProfileView } from "@/components/community/profile-view";

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);

  if (!user) return null;

  return (
    <div className="h-full overflow-auto [background-color:#fff]">
      <ProfileView
        profile={user}
        isSelf
        onSave={async (patch) => {
          await updateProfile(patch);
        }}
      />
    </div>
  );
}
