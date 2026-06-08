"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * Google sign-in button with the official multicolor "G" mark and
 * white background per Google's branding guidelines.
 *
 * https://developers.google.com/identity/branding-guidelines
 */
export function GoogleButton({
  onClick,
  loading = false,
  disabled = false,
  label = "Continue with Google",
  className,
}: GoogleButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
      aria-label={loading ? "Connecting to Google" : label}
      variant="outline"
      className={cn(
        "w-full bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 dark:bg-white dark:text-slate-700 dark:hover:bg-slate-50",
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Connecting to Google...
        </>
      ) : (
        <>
          <GoogleGlyph className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.708-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.886-1.737 2.986-4.296 2.986-7.351z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.227-2.51c-.895.6-2.04.955-3.391.955-2.605 0-4.81-1.76-5.598-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.402 13.9c-.2-.6-.314-1.241-.314-1.9 0-.659.114-1.3.314-1.9V7.51H3.064A9.997 9.997 0 0 0 2 12c0 1.614.386 3.14 1.064 4.49l3.338-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.866-2.866C16.96 2.99 14.696 2 12 2A9.997 9.997 0 0 0 3.064 7.51l3.338 2.59c.787-2.364 2.992-4.123 5.598-4.123z"
      />
    </svg>
  );
}
