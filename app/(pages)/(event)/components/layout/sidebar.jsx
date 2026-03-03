"use client";

import { useState } from "react";
import { FaHome, FaCog, FaPen, FaSignOutAlt } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Sidebar({ open, setOpen }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const router = useRouter();

  const links = [
    { name: "Dashboard", href: "/events-dashboard", icon: <FaHome /> },
    { name: "Events", href: "/events-list ", icon: <FaPen /> },
    // { name: "Settings", href: "/admin-settings", icon: <FaCog /> },
  ];

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
      className={`fixed top-0 left-0 h-screen sm:bg-white bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
        open ? "w-64" : "w-0 sm:w-16"
      }`}
    >
      <nav
        className={`flex flex-col h-full px-2 py-4 space-y-2 mt-16 sm:${
          open ? "" : "items-center hidden sm:flex"
        }`}
      >
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            onClick={handleMobileClose}
            className={`flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 ${
              !open ? "justify-center hidden sm:flex" : ""
            }`}
            title={!open ? link.name : ""}
          >
            <span className="text-lg">{link.icon}</span>
            {open && <span className="ml-3">{link.name}</span>}
          </Link>
        ))}

        <div className="mb-auto">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-700 ${
              !open ? "justify-center" : ""
            }`}
            title={!open ? "Logout" : ""}
          >
            <span className="text-lg">
              <FaSignOutAlt />
            </span>
            {open && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </nav>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-82 sm:w-96">
            <h2 className="text-lg font-medium">Confirm Logout</h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
