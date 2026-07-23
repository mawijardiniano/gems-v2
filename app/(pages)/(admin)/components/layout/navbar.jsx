"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaBars,
  FaCog,
  FaSignOutAlt,
  FaChevronDown,
  FaShieldAlt,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import NotificationBell from "@/components/NotificationBell";
import { logout as reduxLogout } from "@/store/slices/authSlice";

export default function Navbar({ toggleSidebar }) {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const dispatch = useDispatch();
  const role = useSelector((state) => state.auth.role);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile", {
          withCredentials: true,
        });
        if (res.data.success) {
          setUser(res.data.user);
          setProfile(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const getInitials = useCallback(() => {
    if (profile?.personal) {
      const { first_name, last_name } = profile.personal;
      return `${(first_name?.[0] || "").toUpperCase()}${(last_name?.[0] || "").toUpperCase()}`;
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "A";
  }, [profile, user]);

  const getDisplayName = useCallback(() => {
    if (profile?.personal) {
      const { first_name, middle_name, last_name } = profile.personal;
      return [first_name, middle_name, last_name].filter(Boolean).join(" ");
    }
    return user?.username || "Admin";
  }, [profile, user]);

  const getEmail = useCallback(() => {
    if (profile?.contact?.email) return profile.contact.email;
    if (user?.username?.includes("@")) return user.username;
    return "";
  }, [profile, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await axios.post("/api/auth/logout", {}, { withCredentials: true });
    } catch {
      // Proceed with local logout regardless
    }
    dispatch(reduxLogout());
    router.push("/");
  };

  const avatarColor =
    getDisplayName()
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  const roleLabel =
    role === "planning director" ? "Planning Director" : "Admin";

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/80 flex justify-between items-center px-4 z-30 shadow-sm">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <FaBars size={18} />
        </button>
        <div className="hidden sm:block">
          <span className="text-lg font-bold tracking-tight text-gray-900">
            ADMIN PANEL
          </span>
          <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">
            {roleLabel}
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors group"
            aria-label="User menu"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm ring-2 ring-white transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `hsl(${avatarColor}, 55%, 50%)`,
              }}
            >
              {getInitials()}
            </div>
            <FaChevronDown
              size={10}
              className={`text-gray-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
                    style={{
                      backgroundColor: `hsl(${avatarColor}, 55%, 50%)`,
                    }}
                  >
                    {getInitials()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {getDisplayName()}
                    </p>
                    {getEmail() && (
                      <p className="text-xs text-gray-400 truncate">
                        {getEmail()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-1.5">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/admin-settings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <FaCog size={14} className="text-gray-400" />
                  Settings
                </button>
              </div>

              <div className="border-t border-gray-50 py-1.5">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <FaSignOutAlt size={14} />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </nav>
  );
}
