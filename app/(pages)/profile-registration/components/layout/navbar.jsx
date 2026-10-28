"use client";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 z-50 flex items-center px-4 shadow-sm">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <BrandMark
            size={34}
            className="shadow-md transition-shadow group-hover:shadow-lg"
          />
          <span className="text-lg font-bold bg-gradient-to-r from-secondary-800 to-secondary-500 bg-clip-text text-transparent">
            Gender Equality
          </span>
        </Link>
      </div>
    </nav>
  );
}

