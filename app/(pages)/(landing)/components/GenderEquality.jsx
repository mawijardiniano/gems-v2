"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function GenderEquality() {
  const router = useRouter();

  return (
    <section className="relative min-h-[calc(100vh-4rem)] pt-16 flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-violet-800 to-pink-900" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-400 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-400 rounded-full blur-[150px]" />
      </div>

      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto w-full px-6">
        <div className="grid gap-12 lg:gap-16 md:grid-cols-2 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-white">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-white to-violet-300">
                  Gender Equality
                </span>
                <br />
                <span className="text-white/90">Management System</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-lg leading-relaxed">
                Collect insights, manage profiles, and visualize impact — all in
                one privacy-first platform designed for modern institutions.
              </p>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-pink-500/30 rounded-full blur-[80px]" />

              <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-3 backdrop-blur-sm border border-white/10 shadow-2xl">
                <img
                  src="/hero.png"
                  alt="GEMS Platform"
                  className="w-full h-auto object-contain rounded-xl"
                  style={{ maxHeight: 320 }}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
