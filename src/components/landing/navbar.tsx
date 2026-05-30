"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  Settings,
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { useCms } from "@/lib/cms-store";
import { toast } from "sonner";

function userInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
  const isAdmin = user?.role === "admin";

  const navLinks = useCms((s) => s.navLinks);
  const loadFromStorage = useCms((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  async function handleSignOut() {
    await logout();
    toast.success("Signed out");
    router.push("/");
  }

  const visibleLinks = navLinks.filter((l) => l.isVisible);
  const links = visibleLinks.length > 0
    ? visibleLinks.map((l) => ({ label: l.label, href: l.href }))
    : FALLBACK_LINKS;

  return (
    <>
      {/* Featured event banner */}
      <div className="fixed top-0 z-[60] w-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] animate-shimmer">
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
            {links.map((l) => (
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
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/community"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 hover:brightness-110 shadow-lg shadow-[#FF0099]/20 gap-1.5",
                  )}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Community
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors px-2 py-1 text-white"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-7 w-7">
                      {user.avatar && (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white text-[10px] font-bold">
                        {userInitials(user.name)}
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
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => router.push("/admin")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
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
                    "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 hover:brightness-110 shadow-lg shadow-[#FF0099]/20",
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
                {links.map((l) => (
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
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg border border-rosa/20 bg-rosa/5 px-3 py-2">
                      <Avatar className="h-8 w-8">
                        {user.avatar && (
                          <AvatarImage src={user.avatar} alt={user.name} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-[10px] font-bold">
                          {userInitials(user.name)}
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
