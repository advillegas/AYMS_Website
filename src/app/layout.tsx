import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ChatProvider } from "@/components/chatbot/chat-provider";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-detail",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["italic", "normal"],
  display: "swap",
});

const SITE_URL = "https://amigasymassocial.com";
const SITE_NAME = "Amigas Y Más Social";
const DEFAULT_DESCRIPTION =
  "The Latina travel community where you find your new amigas. " +
  "Group trips for Latinas to Cancún, Colombia, Bali, Japan & more. " +
  "Connect, empower, celebrate — sisterhood, cultura, aventura.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Latina Travel Community & Group Trips`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "latina travel",
    "latina community",
    "latina travel group",
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
    title: `${SITE_NAME} — Latina Travel Community & Group Trips`,
    description: DEFAULT_DESCRIPTION,
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
    title: `${SITE_NAME} — Latina Travel Community & Group Trips`,
    description: DEFAULT_DESCRIPTION,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${geistMono.variable} ${playfair.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthBootstrap />
            {children}
            <ChatProvider />
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
