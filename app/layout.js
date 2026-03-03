"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/store/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  useEffect(() => {
    fetch("/api/socket")
      .then(() => console.log("Socket.IO init requested"))
      .catch((err) => console.error("Socket.IO init failed", err));
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
