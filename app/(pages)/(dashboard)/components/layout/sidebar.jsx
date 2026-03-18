"use client";

import { useState, useEffect } from "react";
import {
  FaUser,
  FaChevronDown,
  FaChevronUp,
  FaCog,
  FaSignOutAlt,
  FaCalendar,
  FaIdCard,
  FaBook,
  FaClipboardList,
} from "react-icons/fa";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar({ open, setOpen }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [personType, setPersonType] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleMobileClose = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setOpen(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile/my-profile", {
          credentials: "include",
        });
        if (!mounted) return;
        if (!res.ok) return;
        const body = await res.json();

        const profileObj = body?.data || body?.profile || body || null;
        const pt =
          profileObj?.personal?.currentStatus ||
          profileObj?.personal_information?.person_type ||
          null;
        setPersonType(pt);
      } catch (e) {}
    })();
    return () => (mounted = false);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setShowLogoutModal(false);
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-30 overflow-hidden ${
        open ? "w-64" : "w-0 sm:w-16"
      }`}
    >
      <nav
        className={`flex flex-col h-full py-4 space-y-2 mt-16 transition-all duration-200 ${
          open ? "px-4" : "px-0"
        }`}
      >
        {/* Overview/Profile Section */}
        <div
          className={`flex items-center justify-between p-2 rounded hover:bg-blue-200  text-gray-700 ${open ? "" : "justify-center"} ${pathname.startsWith("/dashboard") ? "bg-blue-100" : ""}`}
        >
          <Link
            href="/dashboard"
            onClick={handleMobileClose}
            className="flex items-center gap-2"
          >
            <FaUser />
            {open && <span>Overview</span>}
          </Link>
          {open && (
            <button onClick={() => setIsProfileOpen(!isProfileOpen)}>
              {isProfileOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          )}
        </div>
        {isProfileOpen && open && (
          <div className="ml-6 space-y-1">
            <Link
              href="/dashboard/personal-information"
              onClick={handleMobileClose}
              className={`flex items-center gap-2 p-2 rounded  hover:bg-blue-200  ${pathname === "/dashboard/personal-information" ? "bg-blue-100" : ""}`}
            >
              <FaIdCard /> Personal Information
            </Link>
            {personType === "Student" && (
              <Link
                href="/dashboard/academic"
                onClick={handleMobileClose}
                className={`flex items-center gap-2 p-2 rounded  hover:bg-blue-200  ${pathname === "/dashboard/academic" ? "bg-blue-100" : ""}`}
              >
                <FaBook /> Academic Information
              </Link>
            )}
            {personType === "Employee" && (
              <Link
                href="/dashboard/employment"
                onClick={handleMobileClose}
                className={`flex items-center gap-2 p-2 rounded  hover:bg-blue-200  ${pathname === "/dashboard/employment" ? "bg-blue-100" : ""}`}
              >
                <FaIdCard /> Employment Information
              </Link>
            )}
            <Link
              href="/dashboard/gender-equity-data"
              onClick={handleMobileClose}
              className={`flex items-center gap-2 p-2 rounded  hover:bg-blue-200  ${pathname === "/dashboard/gender-equity-data" ? "bg-blue-100" : ""}`}
            >
              <FaIdCard /> GAD Data
            </Link>
            <Link
              href="/dashboard/contact-information"
              onClick={handleMobileClose}
              className={`flex items-center gap-2 p-2 rounded  hover:bg-blue-200  ${pathname === "/dashboard/contact-information" ? "bg-blue-100" : ""}`}
            >
              <FaIdCard /> Contact Information
            </Link>
          </div>
        )}
        {/* Events Section */}
        <div
          className={`flex items-center justify-between p-2 rounded hover:bg-blue-200  text-gray-700 ${open ? "" : "justify-center"} ${pathname.startsWith("/events") ? "bg-blue-100" : ""}`}
        >
          <Link
            href="/events"
            onClick={handleMobileClose}
            className="flex items-center gap-2"
          >
            <FaCalendar />
            {open && <span>Events</span>}
          </Link>
          {open && (
            <button onClick={() => setIsEventOpen(!isEventOpen)}>
              {isEventOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          )}
        </div>
        {isEventOpen && open && (
          <div className="ml-6 space-y-1">
            <Link
              href="/events/discover"
              onClick={handleMobileClose}
              className={`flex items-center gap-2 p-2 rounded  hover:bg-blue-200  ${pathname === "/events/discover" ? "bg-blue-100" : ""}`}
            >
              <FaClipboardList /> Discover
            </Link>
          </div>
        )}
        {/* Settings */}
        <div
          className={`flex items-center p-2 rounded  hover:bg-blue-200  text-gray-700 ${open ? "" : "justify-center"} ${pathname.startsWith("/settings") ? "bg-blue-100" : ""}`}
        >
          <Link
            href="/settings"
            onClick={handleMobileClose}
            className={`flex items-center ${pathname === "/settings" ? "bg-blue-100" : ""}`}
          >
            <FaCog />
            {open && <span className="ml-3">Settings</span>}
          </Link>
        </div>
        {/* Logout */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className={`flex items-center p-2 rounded  hover:bg-blue-200  text-gray-700 ${open ? "" : "justify-center"}`}
        >
          <FaSignOutAlt />
          {open && <span className="ml-3">Logout</span>}
        </button>
      </nav>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h2 className="text-lg font-medium">Confirm Logout</h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
