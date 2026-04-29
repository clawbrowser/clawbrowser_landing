import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
    "Chromium-based browser with managed sessions, fingerprint profiles, and residential/datacenter proxy routing for AI automation and multi-account use.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  metadataBase: new URL("https://clawbrowser.ai"),
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
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZT2RLVFSVB" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-ZT2RLVFSVB');
        `}</Script>
      </body>
    </html>
  );
}
