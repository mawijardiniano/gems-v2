"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function TransformGenderData() {
  const router = useRouter();

  const features = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: "Workforce Analytics"
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Equality Monitoring"
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: "Report Generation"
    }
  ];

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 right-20 w-80 h-80 bg-indigo-300 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-20 w-64 h-64 bg-purple-300 rounded-full blur-[100px]" />
      </div>

      {/* Abstract shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 border border-white/10 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 border border-white/10 rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto w-full px-6">
        <div className="grid gap-12 lg:gap-16 md:grid-cols-2 items-center">
          <div className="relative order-2 md:order-1 flex justify-center">
            <div className="relative">
        
              <div className="absolute -inset-4 bg-gradient-to-r from-white/10 to-transparent rounded-3xl blur-sm" />
              
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 shadow-2xl">
                <img
                  src="/transform.png"
                  alt="Data transformation"
                  className="w-full h-auto object-contain rounded-xl"
                  style={{ maxHeight: 360 }}
                  loading="eager"
                />
              </div>

      
             
            </div>
          </div>

          <div className="space-y-8 order-1 md:order-2">
           

            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
                Transform Gender Data
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-orange-200">
                  Into Action
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-lg leading-relaxed">
                Analyze workforce diversity, monitor equality initiatives, and generate reports that support inclusive decision-making.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {features.map((feat) => (
                <div
                  key={feat.label}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white border border-white/10 backdrop-blur-sm"
                >
                  {feat.icon}
                  {feat.label}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}