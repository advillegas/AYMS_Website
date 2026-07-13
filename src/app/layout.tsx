import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Playfair_Display, Cormorant_Garamond, Fraunces } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ChatProvider } from "@/components/chatbot/chat-provider";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ImageCropperProvider } from "@/components/admin/image-cropper";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { SiteThemeVars } from "@/components/site-theme-vars";
import { InlineEditBar } from "@/components/inline/inline-edit-bar";
import { getPageSeo } from "@/lib/seo-config";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-detail",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["italic", "normal"],
  display: "swap",
});

// Editorial-luxe display serif (contemporary high-contrast; PP-Editorial-New
// vibe). Scoped via the --font-display CSS var + .font-display utility so it
// only touches the marketing surfaces, not the logged-in community app.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const SITE_URL = "https://amigasymassocial.com";
const SITE_NAME = "Amigas Y Más Social";
const DEFAULT_DESCRIPTION =
  "The Latina travel community where you find your new amigas. " +
  "Group trips for Latinas to Cancún, Colombia, Bali, Japan & more. " +
  "Connect, empower, celebrate — sisterhood, cultura, aventura.";

export async function generateMetadata(): Promise<Metadata> {
  // Home title/description are owner-editable in Admin → SEO (the `home`
  // slug); everything else stays coded. Falls back to defaults if unset.
  const home = await getPageSeo("home");
  const homeTitle =
    home.title?.trim() || `${SITE_NAME} — Latina Travel Community & Group Trips`;
  const homeDescription = home.description?.trim() || DEFAULT_DESCRIPTION;
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: homeTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description: homeDescription,
  keywords: [
    "latina travel",
    "latin travel",
    "latina community",
    "latina travel community",
    "travel communities",
    "travel groups",
    "travel groups for women",
    "latina travel group",
    "latina travel groups",
    "group trips for latinas",
    "latina group travel",
    "travel for latinas",
    "latina sisterhood",
    "latina trip",
    "amigas y más",
    "latina travel community",
    "latina women travel",
    "latina empowerment",
    "hispanic travel group",
    "latina vacation",
    "latina adventure travel",
    "latina culture travel",
    "latina solo travel group",
  ],
  icons: {
    icon: "/ayms-logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: homeTitle,
    description: homeDescription,
    url: SITE_URL,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — connect, empower, celebrate`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@amigasymassocial",
    creator: "@amigasymassocial",
    title: homeTitle,
    description: homeDescription,
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${geistMono.variable} ${playfair.variable} ${cormorant.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to content
        </a>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ConfirmProvider>
            <ImageCropperProvider>
            <AuthBootstrap />
            <SiteThemeVars />
            <div
              id="main-content"
                tabIndex={-1}
                className="flex flex-1 flex-col outline-none"
              >
                {children}
              </div>
              <ChatProvider />
              <InlineEditBar />
              <Toaster richColors position="bottom-right" />
            </ImageCropperProvider>
            </ConfirmProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
