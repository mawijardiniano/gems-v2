"use client";

import { useState, useMemo } from "react";
import {
  FaHome,
  FaPen,
  FaSignOutAlt,
  FaFolder,
  FaMoneyBill,
  FaUsers,
} from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Sidebar({ open, setOpen, role }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const router = useRouter();

  const ROLE_ACCESS = {
    "gad focal person": [
      "events-dashboard",
      "university-officials",
      "gfps",
      "gaa-budget",
      "gpb",
      "events-list",
    ],
    "gad coordinator": [
      "events-dashboard",
      "university-officials",
      "gfps",
      "gaa-budget",
      "gpb",
      "events-list",
    ],
    "planning director": [
      "admin-dashboard",
      "gpb",
    ],
  };

  const links = [
    {
      name: "Dashboard",
      href: "/events-dashboard",
      icon: <FaHome />,
      key: "events-dashboard",
    },
        {
      name: "Dashboard",
      href: "/admin-dashboard",
      icon: <FaHome />,
      key: "admin-dashboard",
    },
    {
      name: "University Officials",
      href: "/university-officials",
      icon: <FaUsers />,
      key: "university-officials",
    },
    {
      name: "GFPS",
      href: "/gfps",
      icon: <FaUsers />,
      key: "gfps",
    },
    {
      name: "GAA Budget",
      href: "/gaa-budget",
      icon: <FaMoneyBill />,
      key: "gaa-budget",
    },
    {
      name: "GPB",
      href: "/gpb",
      icon: <FaFolder />,
      key: "gpb",
    },
    {
      name: "Events",
      href: "/events-list",
      icon: <FaPen />,
      key: "events-list",
    },
  ];

  const filteredLinks = useMemo(() => {
    const normalizedRole = role?.toLowerCase();
    const allowed = ROLE_ACCESS[normalizedRole] || [];
    return links.filter((link) => allowed.includes(link.key));
  }, [role]);

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

        {filteredLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            onClick={handleMobileClose}
            className={`flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 ${
              !open ? "justify-center" : ""
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
          >
            <FaSignOutAlt />
            {open && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </nav>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <FaSignOutAlt className="text-2xl text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Confirm Logout</h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to log out? You will need to sign in again to access your account.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
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