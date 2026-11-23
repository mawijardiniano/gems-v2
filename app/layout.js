"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/store/provider";
import { registerServiceWorker } from "@/data/lib/pwa/registerSW";
import AttendanceSyncToast from "@/components/AttendanceSyncToast";

/* Brand face. Self-hosted (no render-blocking Google Fonts request), variable
   weight axis, metric-adjusted fallback to avoid layout shift. Exposed as
   --font-inter on <html>; app/globals.css maps --font-sans to it. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8e3b9e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GEMS" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased">
        <ReduxProvider>{children}</ReduxProvider>
        <AttendanceSyncToast />
      </body>
    </html>
  );
}
