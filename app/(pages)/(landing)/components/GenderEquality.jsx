"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function GenderEquality() {
  const router = useRouter();

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center bg-pink-100">
      <div className="max-w-6xl mx-auto w-full ">
        <div className="grid gap-8 md:grid-cols-2 items-center ">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-orange-500">
              <span className="text-violet-800">G</span>ENDER{" "}
              <span className="text-violet-800">E</span>QUALITY{" "}
              <span className="text-violet-800">M</span>ANAGMENT{" "}
              <span className="text-violet-800">S</span>YSTEM
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Collect insights, manage profiles, and visualize impact — all in
              one privacy-first platform.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-xl p-8 flex items-center justify-center">
              <img
                src="/hero.png"
                alt="Hero"
                className="w-full h-auto object-contain"
                style={{ maxHeight: 240 }}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
