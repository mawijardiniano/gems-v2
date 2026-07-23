"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FaUserPlus, FaSignInAlt, FaTimes, FaBars } from "react-icons/fa";
import SignIn from "../SignIn";

export default function Navbar() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full h-16 z-50 flex items-center transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:shadow-lg transition-shadow">
              GE
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-700 to-indigo-700 bg-clip-text text-transparent">
              Gender Equality
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/profile-registration"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 hover:text-violet-900 hover:bg-violet-50 rounded-xl transition-all duration-200"
            >
              <FaUserPlus size={14} />
              Sign up
            </Link>
            <button
              onClick={() => setShowSignIn(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
            >
              <FaSignInAlt size={14} />
              Sign in
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-xl text-violet-700 hover:bg-violet-50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 mx-4 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-down">
            <div className="p-4 space-y-2">
              <Link
                href="/profile-registration"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition-colors"
              >
                <FaUserPlus size={16} className="text-violet-500" />
                Sign up
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSignIn(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-colors"
              >
                <FaSignInAlt size={16} />
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In Modal */}
      {showSignIn && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSignIn(false)}
        >
          <div
            className="relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors z-10"
              onClick={() => setShowSignIn(false)}
              aria-label="Close"
            >
              <FaTimes size={14} />
            </button>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-0 sm:p-2 min-w-[360px] max-w-full border border-white/40">
              <SignIn />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}