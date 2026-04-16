"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, LayoutDashboard, Sparkles, Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";

const SECTION_LINKS = [
  { label: "Home", href: "/" },
  { label: "Trips", href: "/trips" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Play", href: "/play" },
  { label: "FAQ", href: "/faq" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === "admin";

  return (
    <>
      {/* Featured event banner */}
      <div className="fixed top-0 z-[60] w-full bg-gradient-to-r from-[#E8458B] via-[#D4357A] to-[#E8458B] animate-shimmer">
        <Link
          href="/featured"
          className="flex h-8 items-center justify-center gap-2 text-xs font-semibold text-white hover:text-white/90 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          <span>Featured Event — Check it out!</span>
          <Sparkles className="h-3 w-3" />
        </Link>
      </div>

      <header className="fixed top-8 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/ayms-logo.svg"
              alt="AYMS Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-lg font-semibold tracking-tight font-[family-name:var(--font-heading)] text-white">
              Amigas Y Más
            </span>
          </Link>

          <nav className="hidden items-center gap-4 lg:flex">
            {SECTION_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-white/50 hover:text-white hover:bg-white/10 gap-1.5 text-xs",
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            {isAuthenticated ? (
              <Link
                href="/community"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0 hover:brightness-110 shadow-lg shadow-[#E8458B]/20 gap-1.5",
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Community
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "text-white/70 hover:text-white hover:bg-white/10",
                  )}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0 hover:brightness-110 shadow-lg shadow-[#E8458B]/20",
                  )}
                >
                  Join Us
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "lg:hidden text-white hover:bg-white/10",
              )}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex items-center gap-2 mb-6">
                <Image src="/ayms-logo.svg" alt="AYMS" width={32} height={32} className="rounded-full" />
                <span className="font-semibold font-[family-name:var(--font-heading)]">Amigas Y Más</span>
              </div>
              <nav className="flex flex-col gap-3">
                <Link
                  href="/featured"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-base font-semibold text-primary"
                >
                  <Sparkles className="h-4 w-4" /> Featured Event
                </Link>
                {SECTION_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="text-base font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-rosa/15" />
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                  >
                    <Settings className="h-4 w-4" /> Admin Portal
                  </Link>
                )}
                {isAuthenticated ? (
                  <Link
                    href="/community"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants(),
                      "bg-gradient-to-r from-primary to-magenta text-white border-0 gap-2",
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Community Portal
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "outline" }))}>
                      Log In
                    </Link>
                    <Link href="/register" onClick={() => setOpen(false)} className={cn(buttonVariants(), "bg-gradient-to-r from-primary to-magenta text-white border-0")}>
                      Join Us
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
