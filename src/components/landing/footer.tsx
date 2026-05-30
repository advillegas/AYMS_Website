import Link from "next/link";
import Image from "next/image";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-rosa/15 py-14 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-rosa/8 to-background" />
      <div className="absolute inset-0 pattern-dots opacity-15" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/ayms-logo.svg" alt="AYMS" width={36} height={36} className="rounded-full glow-pink" />
            <div>
              <Link href="/" className="text-lg font-bold font-[family-name:var(--font-heading)] bg-gradient-to-r from-primary to-magenta bg-clip-text text-transparent">
                Amigas Y Más Social
              </Link>
              <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase font-medium">
                connect · empower · celebrate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/amigasymassocial/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-magenta/10 text-primary transition-all hover:glow-pink hover:scale-110"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-rosa/10 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Amigas Y Más Social. All rights
          reserved. ♡
        </div>
      </div>
    </footer>
  );
}
