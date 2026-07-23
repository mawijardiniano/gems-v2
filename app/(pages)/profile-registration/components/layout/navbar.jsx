"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 z-50 flex items-center px-4 shadow-sm">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:shadow-lg transition-shadow">
            GE
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-700 to-indigo-700 bg-clip-text text-transparent">
            Gender Equality
          </span>
        </Link>
      </div>
    </nav>
  );
}