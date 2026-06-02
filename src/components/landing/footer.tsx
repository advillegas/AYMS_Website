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
    <footer className="relative overflow-hidden bg-[#1a0a12] py-16">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f060a] to-[#1a0a12]" />
      <div className="absolute inset-0 pattern-dots opacity-[0.06]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-4">
            <Image
              src="/ayms-logo.svg"
              alt="AYMS"
              width={44}
              height={44}
              className="rounded-full shadow-[0_0_20px_rgb(255_0_153/0.30)]"
            />
            <div>
              <Link href="/" className="text-lg font-bold font-[family-name:var(--font-heading)] text-gradient-brand">
                Amigas Y Más Social
              </Link>
              <p className="text-[10px] text-white/60 tracking-[0.22em] uppercase font-medium mt-0.5">
                connect · empower · celebrate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/amigasymassocial/"
              target="_blank"
              rel="noopener noreferrer"
              className="lift flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/60 transition-colors hover:text-[#FF0099] hover:border-[#FF0099]/30"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.07] pt-6 text-center text-sm text-white/60">
          &copy; {new Date().getFullYear()} Amigas Y Más Social. All rights
          reserved. ♡
        </div>
      </div>
    </footer>
  );
}
