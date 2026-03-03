"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900">
              Gender Equity Management System
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Collect insights, manage profiles, and visualize impact — all in
              one privacy-first platform.
            </p>

            {/* <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/survey")}
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md"
              >
                Take Survey
              </button>

              <a
                className="inline-flex items-center text-sm text-gray-500 mt-2 md:mt-0"
              >
                Learn more →
              </a>
            </div> */}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md bg-gradient-to-br from-indigo-50 to-white rounded-lg p-8 flex items-center justify-center border border-gray-100">
              <svg
                width="220"
                height="160"
                viewBox="0 0 220 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <rect
                  x="10"
                  y="60"
                  width="40"
                  height="60"
                  rx="6"
                  fill="#6366F1"
                />
                <rect
                  x="60"
                  y="40"
                  width="40"
                  height="80"
                  rx="6"
                  fill="#818CF8"
                />
                <rect
                  x="110"
                  y="20"
                  width="40"
                  height="100"
                  rx="6"
                  fill="#A5B4FC"
                />
                <rect
                  x="160"
                  y="80"
                  width="40"
                  height="40"
                  rx="6"
                  fill="#C7D2FE"
                />
                <circle cx="40" cy="30" r="18" fill="#FDE68A" />
                <circle cx="100" cy="10" r="10" fill="#FBCFE8" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
