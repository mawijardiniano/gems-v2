"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-pink-200 z-50 flex items-center px-4">
  <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-violet-800">
            Gender Equality
          </Link>
        </div>
        </div>

    </nav>
  );
}
