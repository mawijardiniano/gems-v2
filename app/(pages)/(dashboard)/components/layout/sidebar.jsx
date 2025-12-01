"use client";

import { FaHome, FaUsers, FaChartBar, FaCog } from "react-icons/fa";
import Link from "next/link";

export default function Sidebar({ open }) {
  const links = [
    { name: "Dashboard", href: "/dashboard", icon: <FaHome /> },
    { name: "Settings", href: "/admin/settings", icon: <FaCog /> },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <nav
        className={`flex flex-col h-full px-2 py-4 space-y-2 mt-16 ${
          open ? "" : "items-center"
        }`}
      >
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 ${
              !open ? "justify-center" : ""
            }`}
            title={!open ? link.name : ""}
          >
            <span className="text-lg">{link.icon}</span>
            {open && <span className="ml-3">{link.name}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
