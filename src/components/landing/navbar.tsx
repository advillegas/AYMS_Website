"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { toast } from "sonner";

const FALLBACK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Trips", href: "/trips" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Play", href: "/play" },
  { label: "FAQ", href: "/faq" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const pathname = usePathname();

  async function handleSignOut() {
    await logout();
    toast.success("See you soon, amiga ♡");
    router.push("/");
  }

  const links = FALLBACK_LINKS;

  return (
    <>
      {/* Announcement bar — thin refined magenta strip */}
      <div className="fixed top-0 z-[60] w-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099]">
        <Link
          href="/featured"
          className="group flex h-7 items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/95 transition-colors hover:text-white"
        >
          <Sparkles className="h-3 w-3 opacity-80" aria-hidden="true" />
          <span>Featured Event — Check it out</span>
          <span className="opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <header className="fixed top-7 z-50 w-full">
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
          <div className="glass-nav flex h-14 items-center justify-between rounded-full px-3 pl-5 shadow-[0_8px_30px_rgb(34_16_25/0.08)]">
          <Link href="/" aria-label="Amigas Y Más Social — home" className="flex items-center">
            <Image
              src="/ayms-wordmark.png"
              alt="Amigas Y Más Social"
              width={266}
              height={192}
              priority
              unoptimized
              className="h-10 w-auto drop-shadow-[0_2px_8px_rgb(255_0_153/0.18)]"
            />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative text-sm font-medium transition-colors hover:text-[#FF0099]",
                    "after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-[#FF0099] after:transition-all after:duration-300",
                    active
                      ? "text-[#FF0099] after:w-full"
                      : "text-ink-soft after:w-0 hover:after:w-full",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/community"
                  className="lift inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-2 text-sm font-semibold text-white shadow-[0_6px_20px_rgb(255_0_153/0.25)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF7]"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Community
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1.5 rounded-full bg-[#FACDE8]/35 hover:bg-[#FACDE8]/55 transition-colors px-2 py-1 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/40"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-7 w-7">
                      {user.avatar && (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white text-[10px] font-bold">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold truncate">
                        {user.name}
                      </p>
                      {user.email && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push("/community/profile")}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/community")}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Community
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-[#221019]/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/40"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="lift inline-flex items-center rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-2 text-sm font-semibold text-white shadow-[0_6px_20px_rgb(255_0_153/0.25)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF7]"
                >
                  Become an Amiga
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "lg:hidden rounded-full text-ink hover:bg-[#FACDE8]/40",
              )}
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </SheetTrigger>
            <SheetContent side="right" className="w-72 canvas-editorial">
              <div className="flex items-center mb-6">
                <Image src="/ayms-wordmark.png" alt="Amigas Y Más Social" width={266} height={192} unoptimized className="h-12 w-auto" />
              </div>
              <nav className="flex flex-col gap-3">
                <Link
                  href="/featured"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-base font-semibold text-primary"
                >
                  <Sparkles className="h-4 w-4" /> Featured Event
                </Link>
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="text-base font-medium text-ink transition-colors hover:text-[#FF0099]"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-[#221019]/10" />
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg border border-rosa/20 bg-rosa/5 px-3 py-2">
                      <Avatar className="h-8 w-8">
                        {user.avatar && (
                          <AvatarImage src={user.avatar} alt={user.name} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-[10px] font-bold">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {user.name}
                        </p>
                        {user.email && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
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
                    <Link
                      href="/community/profile"
                      onClick={() => setOpen(false)}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "gap-2",
                      )}
                    >
                      <UserIcon className="h-4 w-4" />
                      My Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        void handleSignOut();
                      }}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "gap-2 text-destructive hover:text-destructive hover:bg-destructive/10",
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "outline" }))}>
                      Log In
                    </Link>
                    <Link href="/register" onClick={() => setOpen(false)} className={cn(buttonVariants(), "bg-gradient-to-r from-primary to-magenta text-white border-0")}>
                      Become an Amiga
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
