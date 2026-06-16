"use client";

import { FaBars } from "react-icons/fa";
import NotificationBell from "@/components/NotificationBell";
import { useSelector } from "react-redux";

export default function Navbar({ toggleSidebar }) {
  const role = useSelector((state) => state.auth.role);
  console.log("Role", role);

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex justify-between items-center px-4 z-30">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-700 hover:text-black"
        >
          <FaBars size={20} />
        </button>

        {role === "dean" && (
          <span className="text-xl font-bold">Dashboard</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </nav>
  );
}
