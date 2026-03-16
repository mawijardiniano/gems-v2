"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SignIn from "../SignIn";

export default function Navbar() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-16 bg-pink-200 z-50 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-violet-800">
              Gender Equality
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/profile-registration"
              className="text-violet-800 hover:text-indigo-600"
            >
              Sign up
            </Link>
            <button
              className="text-pink-200 bg-violet-800 px-3 py-1 rounded-md"
              onClick={() => setShowSignIn(true)}
            >
              Sign in
            </button>
          </div>

          <div className="sm:hidden flex items-center gap-4">
            <button
              onClick={() => router.push("/profile-registration")}
              className="text-sm text-indigo-600 hover:text-indigo-600"
            >
              Sign up
            </button>
            <button
              onClick={() => setShowSignIn(true)}
              className="text-sm text-indigo-600"
            >
              Sign in
            </button>
          </div>
        </div>
      </nav>
      {showSignIn && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 bg-opacity-40"
          onClick={() => setShowSignIn(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 rounded-full text-4xl font-bold z-10"
              onClick={() => setShowSignIn(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="border border-white/40 bg-white/30 backdrop-blur-sm rounded-2xl shadow-lg p-0 sm:p-2 min-w-[340px] max-w-full">
              <SignIn />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
