import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GeistPixelGrid } from "geist/font/pixel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const geistPixel = GeistPixelGrid;

export const metadata: Metadata = {
  title: "txtskills - Convert llms.txt to Agent Skills",
  description: "Transform any llms.txt documentation into installable agent skills for Claude Code, Cursor, Windsurf, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${geistPixel.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
