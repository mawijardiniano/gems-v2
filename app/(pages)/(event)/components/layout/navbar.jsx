"use client";

import { FaUserCircle, FaBars } from "react-icons/fa";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Dropdown, DropdownItem } from "flowbite-react";
import { useRouter } from "next/navigation";

export default function Navbar({ toggleSidebar }) {
  const router = useRouter();

  const { profile, loading } = useMyProfile();

  // const handleLogout = async () => {
  //   try {
  //     await fetch("/api/auth/logout", {
  //       method: "POST",
  //       credentials: "include",
  //     });
  //     router.push("/");
  //   } catch (err) {
  //     console.error("Logout failed:", err);
  //   }
  // };

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex justify-between items-center px-4 z-30">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-700 hover:text-black"
        >
          <FaBars size={20} />
        </button>
        <span className="text-xl font-bold">Events Management</span>
      </div>
      {/* 
      <Dropdown
        color="white"
        className="border border-gray-400"
        label={
          <div className="flex items-center space-x-2">
            <FaUserCircle className="w-6 h-6 text-gray-700" />
            <span className="text-gray-700">
              {loading ? "Loading..." : profile?.name || "Admin"}
            </span>
          </div>
        }
      >
        <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
      </Dropdown> */}
    </nav>
  );
}
