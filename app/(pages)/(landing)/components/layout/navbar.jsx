"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white border-b z-50 flex items-center">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold text-indigo-600">
            Gender Equity
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-6">
          <Link href="/profile-registration" className="text-gray-600 hover:text-indigo-600">
            Sign up
          </Link>
          <Link href="/authentication/signin" className="text-gray-600">
            Sign in
          </Link>
        </div>

        <div className="sm:hidden flex items-center gap-4">
          <button
            onClick={() => router.push("/profile-registration")}
            className="text-sm text-indigo-600 hover:text-indigo-600"
          >
            Sign up
          </button>
          <button
            onClick={() => router.push("/authentication/signin")}
            className="text-sm text-indigo-600"
          >
            Sign in
          </button>
        </div>
      </div>
    </nav>
  );
}
