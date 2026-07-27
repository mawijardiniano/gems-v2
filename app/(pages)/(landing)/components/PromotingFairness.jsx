"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function PromotingFairness() {
  const router = useRouter();

  const pillars = [
    "Equal Access",
    "Workplace Policies",
    "Gender Programs",
    "Inclusive Culture",
  ];

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
      {/* Background with warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-1/3 w-72 h-72 bg-yellow-300 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-red-300 rounded-full blur-[100px]" />
      </div>

      {/* Diagonal pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="h-full w-full"
          style={{
            background: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)`,
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto w-full px-6">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
          <div className="space-y-8">
           

            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
                Promoting Fairness
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-200">
                  And Inclusion
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-lg leading-relaxed">
                Ensure equal access to opportunities, strengthen workplace
                policies, and support gender-responsive programs across the
                institution.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {pillars.map((pillar) => (
                <div
                  key={pillar}
                  className="group relative overflow-hidden rounded-xl bg-white/10 p-4 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
                >
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-white/5 rounded-full transition-all duration-300 group-hover:scale-150" />
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white mb-3">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-white">{pillar}</p>
                  </div>
                </div>
              ))}
            </div>

           
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-[40px] blur-xl" />

              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
                {/* Modern 3D-style diversity illustration */}
                <svg viewBox="0 0 340 300" className="w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FCA5A5" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#F97316" stopOpacity="0.9" />
                    </linearGradient>
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Background decorative circles */}
                  <circle cx="170" cy="150" r="130" fill="white" fillOpacity="0.06" />
                  <circle cx="170" cy="150" r="95" fill="white" fillOpacity="0.04" />
                  <circle cx="170" cy="150" r="60" fill="white" fillOpacity="0.03" />

                  {/* Central connected nodes network */}
                  <g opacity="0.3">
                    <line x1="170" y1="80" x2="100" y2="150" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="170" y1="80" x2="170" y2="200" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="170" y1="80" x2="240" y2="150" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="100" y1="150" x2="170" y2="200" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="170" y1="200" x2="240" y2="150" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="100" y1="150" x2="240" y2="150" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
                  </g>

                  {/* People nodes with gradient colors */}
                  {/* Top */}
                  <g filter="url(#shadow)">
                    <circle cx="170" cy="80" r="22" fill="url(#g1)" />
                    <circle cx="170" cy="80" r="8" fill="white" fillOpacity="0.3" />
                  </g>
                  {/* Left */}
                  <g filter="url(#shadow)">
                    <circle cx="100" cy="150" r="22" fill="url(#g2)" />
                    <circle cx="100" cy="150" r="8" fill="white" fillOpacity="0.3" />
                  </g>
                  {/* Bottom */}
                  <g filter="url(#shadow)">
                    <circle cx="170" cy="200" r="22" fill="url(#g3)" />
                    <circle cx="170" cy="200" r="8" fill="white" fillOpacity="0.3" />
                  </g>
                  {/* Right */}
                  <g filter="url(#shadow)">
                    <circle cx="240" cy="150" r="22" fill="url(#g4)" />
                    <circle cx="240" cy="150" r="8" fill="white" fillOpacity="0.3" />
                  </g>
                  {/* Extra - top left */}
                  <g filter="url(#shadow)">
                    <circle cx="120" cy="100" r="16" fill="url(#g5)" />
                    <circle cx="120" cy="100" r="6" fill="white" fillOpacity="0.3" />
                  </g>
                  {/* Extra - top right */}
                  <g filter="url(#shadow)">
                    <circle cx="220" cy="100" r="16" fill="url(#g6)" />
                    <circle cx="220" cy="100" r="6" fill="white" fillOpacity="0.3" />
                  </g>

                  {/* Center star */}
                  <g filter="url(#shadow)">
                    <path d="M170 135l4 12h13l-10 7 4 12-11-7-11 7 4-12-10-7h13z" fill="white" fillOpacity="0.6" />
                  </g>

                  {/* Sparkle dots */}
                  <circle cx="60" cy="80" r="2.5" fill="white" fillOpacity="0.5" />
                  <circle cx="280" cy="80" r="2.5" fill="white" fillOpacity="0.5" />
                  <circle cx="60" cy="200" r="2" fill="white" fillOpacity="0.4" />
                  <circle cx="280" cy="200" r="2" fill="white" fillOpacity="0.4" />
                  <circle cx="170" cy="40" r="2" fill="white" fillOpacity="0.4" />
                  <circle cx="170" cy="250" r="2" fill="white" fillOpacity="0.4" />
                  <circle cx="80" cy="120" r="1.5" fill="white" fillOpacity="0.3" />
                  <circle cx="260" cy="120" r="1.5" fill="white" fillOpacity="0.3" />
                </svg>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}