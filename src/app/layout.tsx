import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ---- Sitesmith product identity -------------------------------------
// The public brand of this product. All marketing surfaces (metadata,
// header logo, footer copyright, OG cards) read THIS constant so the
// name lives in exactly one place.
export const SITE_NAME = "Sitesmith";
export const SITE_TAGLINE = "Craft content that ranks.";
export const SITE_DESCRIPTION =
  "Sitesmith is the multi-site content platform with AI writing, a full SEO suite, and workflow automation — connect WordPress or any REST CMS and publish from one calm dashboard.";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Sitesmith",
    "CMS",
    "content platform",
    "AI writing",
    "SEO suite",
    "content automation",
    "WordPress",
    "multi-site",
    "newsletter",
  ],
  authors: [{ name: `${SITE_NAME} Team` }],
  applicationName: SITE_NAME,
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
