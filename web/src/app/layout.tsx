import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Clawbrowser — Fingerprint control for AI agents",
    template: "%s — Clawbrowser",
  },
  description:
    "Chromium-based browser with managed fingerprints and proxy routing for AI automation and multi-account use.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAFAF8] dark:bg-[#0c0c0e] text-zinc-950 dark:text-zinc-50">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
