"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function SimplifyGender() {
  const router = useRouter();

  const features = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: "Profile Management"
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: "Document Management"
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      label: "Compliance Tracking"
    }
  ];

  return (
    <section className="relative min-h-[calc(100vh-4rem)] pt-16 flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-700 via-purple-700 to-violet-800" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 right-20 w-80 h-80 bg-fuchsia-300 rounded-full blur-[130px]" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-violet-300 rounded-full blur-[100px]" />
      </div>

      {/* Hexagonal pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto w-full px-6">
        <div className="grid gap-12 lg:gap-16 md:grid-cols-2 items-center">
          <div className="space-y-8">


            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
                Simplify Gender
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-fuchsia-200">
                  Equality Monitoring
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-lg leading-relaxed">
                Track employee information, manage documents, and monitor compliance with gender equality policies — all from a single dashboard.
              </p>
            </div>

            {/* Benefits with icons */}
            <div className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-4 rounded-xl bg-white/10 px-5 py-3.5 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:translate-x-1"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{feature.label}</p>
                    <p className="text-xs text-white/50">Seamless management tools</p>
                  </div>
                </div>
              ))}
            </div>


          </div>

          <div className="relative flex justify-center">
            <div className="relative">
   
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 rounded-full blur-[80px]" />
              
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-3 backdrop-blur-sm border border-white/10 shadow-2xl">
                <img
                  src="/simplify.png"
                  alt="Simplify monitoring"
                  className="w-full h-auto object-contain rounded-xl"
                  style={{ maxHeight: 340 }}
                  loading="eager"
                />
              </div>

              {/* Feature badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                All-in-One
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}