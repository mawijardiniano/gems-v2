"use client";

import { FaBars } from "react-icons/fa";
export default function Navbar({ toggleSidebar }) {
  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex justify-between items-center px-4 z-30">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="text-gray-700 hover:text-black"
          >
            <FaBars size={20} />
          </button>
          <div>
            <span className="text-xl font-bold">GENDER MANAGEMENT</span>
            <p className="text-xs text-gray-500">User Portal</p>
          </div>
        </div>
      </nav>
    </>
  );
}
