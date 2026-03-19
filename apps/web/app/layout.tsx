import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelCircle } from "geist/font/pixel";
import "./globals.css";



const geistPixel = GeistPixelCircle;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js";
const umamiWebsiteId =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "718bea6c-f729-46f5-92a0-cc9bbdaa75b0";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "txtskills - Convert llms.txt to Agent Skills",
  description: "Convert llms.txt to agent skills in seconds. Generate Claude Code skills, Cursor skills, Windsurf skills, Amp code skills, and more. Free llms text to agent skills converter.",
  keywords: [
    "agent skills",
    "claude code skills",
    "claude code skill converter",
    "llms text to claude code skills",
    "llms txt to agent skills converter",
    "llms.txt converter",
    "cursor skills",
    "windsurf skills",
    "amp code skills",
    "github copilot skills",
    "ai agent skills",
    "skill generator",
    "documentation to skills",
  ],
  authors: [{ name: "txtskills" }],
  creator: "txtskills",
  publisher: "txtskills",
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  openGraph: {
    title: "txtskills - Convert llms.txt to Agent Skills",
    description: "Transform any llms.txt documentation into installable agent skills for Claude Code, Cursor, Windsurf, and more.",
    siteName: "txtskills",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "txtskills - llms.txt to agent skills converter",
        type: "image/png",
      },
    ],
    type: "website",
    url: baseUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "txtskills - Convert llms.txt to Agent Skills",
    description: "Transform any llms.txt documentation into installable agent skills for Claude Code, Cursor, Windsurf, and more.",
    images: ["/og.png"],
  },
  alternates: {
    canonical: baseUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "txtskills",
    description: "Convert llms.txt documentation to installable agent skills for Claude Code, Cursor, Windsurf, and other AI agents",
    url: baseUrl,
    applicationCategory: "DeveloperApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Convert llms.txt to agent skills",
      "Support for Claude Code",
      "Support for Cursor",
      "Support for Windsurf",
      "Support for Amp code",
      "Support for GitHub Copilot",
      "Instant skill generation",
      "GitHub publishing",
    ],
  };

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Doto:wght@100..900&family=Geist:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NODE_ENV === "production" ? (
          <Script
            id="umami-analytics"
            src={umamiScriptUrl}
            strategy="afterInteractive"
            data-website-id={umamiWebsiteId}
          />
        ) : null}
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${geistPixel.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
