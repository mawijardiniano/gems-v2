"use client";

import { useState } from "react";
import {
  FaUser,
  FaChevronDown,
  FaChevronUp,
  FaCog,
  FaSignOutAlt,
  FaCalendar,
  FaIdCard,
  FaUsers,
  FaBook,
  FaBalanceScale,
  FaLeaf,
  FaVenusMars,
  FaShieldAlt,
  FaClipboardList,
} from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Sidebar({ open, setOpen }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const router = useRouter();

  const handleMobileClose = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setOpen(false);
    }
  };

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
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
        open ? "w-64" : "w-0 sm:w-16"
      }`}
    >
      <nav className="flex flex-col h-full px-2 py-4 space-y-2 mt-16">

        {/* Overview */}
        <div className={`flex items-center justify-between p-2 rounded hover:bg-gray-100 text-gray-700 ${open ? "" : "justify-center"}`}>
          <Link href="/dashboard" onClick={handleMobileClose} className="flex items-center gap-2">
            <FaUser />
            {open && <span>Overview</span>}
          </Link>
          {open && (
            <button onClick={() => setIsProfileOpen(!isProfileOpen)}>
              {isProfileOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          )}
        </div>

        {/* Profile submenu */}
        {isProfileOpen && open && (
          <div className="ml-6 space-y-1">
            <Link href="/dashboard/personal-information" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaIdCard /> Personal Information
            </Link>

            <Link href="/dashboard/roles" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaUsers /> Roles
            </Link>

            <Link href="/dashboard/development" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaBook /> Development
            </Link>

            <Link href="/dashboard/legal-knowledge" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaBalanceScale /> Legal Knowledge
            </Link>

            <Link href="/dashboard/community" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaUsers /> Community
            </Link>

            <Link href="/dashboard/environmental" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaLeaf /> Environmental
            </Link>

            <Link href="/dashboard/gender-responsiveness" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaVenusMars /> Gender Responsiveness
            </Link>

            <Link href="/dashboard/security" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaShieldAlt /> Security
            </Link>
          </div>
        )}

        {/* Events */}
        <div className={`flex items-center justify-between p-2 rounded hover:bg-gray-100 text-gray-700 ${open ? "" : "justify-center"}`}>
          <Link href="/events" onClick={handleMobileClose} className="flex items-center gap-2">
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
            <Link href="/events/invited-events" onClick={handleMobileClose} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <FaClipboardList /> Invited / Participated
            </Link>
          </div>
        )}

        {/* Settings */}
        <Link href="/settings" onClick={handleMobileClose} className={`flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 ${open ? "" : "justify-center"}`}>
          <FaCog />
          {open && <span className="ml-3">Settings</span>}
        </Link>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className={`flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 ${open ? "" : "justify-center"}`}
        >
          <FaSignOutAlt />
          {open && <span className="ml-3">Logout</span>}
        </button>
      </nav>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h2 className="text-lg font-medium">Confirm Logout</h2>
            <p className="mb-6 text-gray-600">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
