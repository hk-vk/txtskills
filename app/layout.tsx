import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelCircle } from "geist/font/pixel";
import "./globals.css";



const geistPixel = GeistPixelCircle;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  title: "txtskills - Convert llms.txt to Agent Skills",
  description: "Transform any llms.txt documentation into installable agent skills for Claude Code, Cursor, Windsurf, and more.",
  openGraph: {
    title: "txtskills - Convert llms.txt to Agent Skills",
    description: "Transform any llms.txt documentation into installable agent skills for Claude Code, Cursor, Windsurf, and more.",
    siteName: "txtskills",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "txtskills - llms.txt to agent skills" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "txtskills - Convert llms.txt to Agent Skills",
    description: "Transform any llms.txt documentation into installable agent skills for Claude Code, Cursor, Windsurf, and more.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Doto:wght@100..900&family=Geist:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${geistPixel.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
