"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/store";
import { useAvatarUpload } from "@/lib/use-avatar-upload";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface AvatarUploaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-16 w-16",
  md: "h-20 w-20",
  lg: "h-24 w-24",
};

const TEXT_SIZES = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export function AvatarUploader({
  size = "lg",
  className,
}: AvatarUploaderProps) {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const { upload, uploading, progress, error, isStorageConfigured, reset } =
    useAvatarUpload();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  if (!user) return null;

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick of same file
    if (!file || !user) return;
    reset();
    const url = await upload(file, user.id);
    if (url) {
      const ok = await updateProfile({ avatar: url });
      if (ok) {
        toast.success("Profile photo updated!");
      } else {
        toast.error("Couldn't save your photo", {
          description: "The upload worked but saving it failed. Try again or sign in again.",
        });
      }
    } else if (error) {
      toast.error(error);
    }
  }

  async function clearPhoto() {
    const ok = await confirm({
      title: "Remove profile photo?",
      description: "Your avatar will revert to your initials.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    const saved = await updateProfile({ avatar: "" });
    if (saved) {
      toast.success("Profile photo removed.");
    } else {
      toast.error("Couldn't update your photo. Please try again.");
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="relative group"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Avatar className={cn(SIZES[size], "ring-4 ring-rosa/20")}>
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br from-primary to-magenta text-white font-bold",
              TEXT_SIZES[size],
            )}
          >
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity",
            hover || uploading ? "opacity-100" : "opacity-0",
            uploading && "cursor-wait",
          )}
          aria-label="Change profile photo"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePick}
          className="hidden"
          aria-label="Upload a new profile photo"
        />
      </div>

      {/* Status / actions row */}
      <div className="flex flex-col items-center gap-1.5 min-h-[1.5rem]">
        {uploading && (
          <p className="text-[11px] text-muted-foreground">
            Uploading… {progress}%
          </p>
        )}
        {!uploading && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary"
              onClick={() => fileRef.current?.click()}
              disabled={!isStorageConfigured}
            >
              <Camera className="h-3 w-3 mr-1" /> Change photo
            </Button>
            {user.avatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={clearPhoto}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Remove
              </Button>
            )}
          </div>
        )}

        {!isStorageConfigured && (
          <p className="text-[10px] text-muted-foreground text-center max-w-[280px] flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            Enable Firebase Storage to upload photos. See README for setup.
          </p>
        )}

        {error && !uploading && (
          <p className="text-[11px] text-destructive text-center max-w-[280px] flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
