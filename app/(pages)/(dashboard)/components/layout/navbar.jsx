"use client";

import { useEffect, useState } from "react";
import { FaUserCircle, FaBars } from "react-icons/fa";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Dropdown, DropdownItem } from "flowbite-react";
import { useRouter } from "next/navigation";
import { logout } from "@/store/slices/authSlice";
import { useDispatch } from "react-redux";
import Link from "next/link";

export default function Navbar({ toggleSidebar }) {
  const [token, setToken] = useState(null);
  const router = useRouter();
  const dispatch = useDispatch()

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  const { profile, loading } = useMyProfile(token);

  const handleLogout = () => {
    dispatch(logout())
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex justify-between items-center px-4 z-30">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-700 hover:text-black"
        >
          <FaBars size={20} />
        </button>
        <span className="text-xl font-bold">Dashboard</span>
      </div>

      <Dropdown
        color="white"
        className="border border-gray-400"
        label={
          <div className="flex items-center space-x-2">
            <FaUserCircle className="w-6 h-6 text-gray-700" />
            <span className="text-gray-700">{loading ? "Loading..." : profile?.userId.name || "Admin"}</span>
          </div>
        }
      >
      <Link href={"/my-profile"}>
      <DropdownItem>My Profile</DropdownItem>
      </Link>

        <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
      </Dropdown>
    </nav>
  );
}
