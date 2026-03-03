"use client";

import { useEffect, useState } from "react";
import {
  FaHome,
  FaCog,
  FaPen,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronUp,
  FaUserGraduate,
  FaBriefcase,
  FaChartPie,
  FaVenusMars,
} from "react-icons/fa";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar({ open, setOpen }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userListOpen, setUserListOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/sample-dashboard", icon: <FaHome /> },
    {
      name: "User List",
      href: "/sample-user-list",
      icon: <FaPen />,
      children: [
        {
          name: "Students",
          href: "/sample-user-list/students",
          icon: <FaUserGraduate />,
        },
        {
          name: "Employees",
          href: "/sample-user-list/employees",
          icon: <FaBriefcase />,
        },
      ],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: <FaChartPie />,
      children: [
        {
          name: "Sex Disaggregated Data",
          href: "/reports/sex-disaggregated-data",
          icon: <FaVenusMars />,
        },
      ],
    },
    { name: "Settings", href: "/admin-settings", icon: <FaCog /> },
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

  const isActive = (href) => pathname?.startsWith(href);

  useEffect(() => {
    const userListActive = links
      .find((l) => l.name === "User List")
      ?.children?.some((child) => isActive(child.href));
    if (userListActive) setUserListOpen(true);

    const reportsActive = links
      .find((l) => l.name === "Reports")
      ?.children?.some((child) => isActive(child.href));
    if (reportsActive) setReportsOpen(true);
  }, [pathname]);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen sm:bg-white bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
        open ? "w-64" : "w-0 sm:w-16"
      }`}
    >
      <nav
        className={`flex flex-col h-full px-3 py-4 space-y-2 mt-16 sm:${
          open ? "" : "items-center hidden sm:flex"
        }`}
      >
        {links.map((link) => {
          const hasChildren =
            Array.isArray(link.children) && link.children.length > 0;
          const isUserList = link.name === "User List";
          const isReports = link.name === "Reports";
          const isOpen = isUserList
            ? userListOpen
            : isReports
              ? reportsOpen
              : false;

          if (!hasChildren) {
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={handleMobileClose}
                className={`flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 ${
                  isActive(link.href) ? "bg-blue-50 text-blue-700" : ""
                } ${!open ? "justify-center hidden sm:flex" : ""}`}
                title={!open ? link.name : ""}
              >
                <span className="text-lg">{link.icon}</span>
                {open && <span className="ml-3">{link.name}</span>}
              </Link>
            );
          }

          return (
            <div key={link.name} className="space-y-1">
              <button
                onClick={() =>
                  isUserList
                    ? setUserListOpen((prev) => !prev)
                    : setReportsOpen((prev) => !prev)
                }
                className={`w-full flex items-center p-2 rounded hover:bg-gray-100 text-gray-700 text-left ${
                  isActive(link.href) ? "bg-blue-50 text-blue-700" : ""
                } ${!open ? "justify-center hidden sm:flex" : ""}`}
                title={!open ? link.name : ""}
                aria-expanded={isOpen}
              >
                <span className="text-lg">{link.icon}</span>
                {open && (
                  <span className="ml-3 flex-1 flex items-center justify-between">
                    {link.name}
                    <span className="text-xs text-gray-500">
                      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  </span>
                )}
              </button>

              {open && isOpen && (
                <div className="ml-6 space-y-1">
                  {link.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      onClick={handleMobileClose}
                      className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 ${
                        isActive(child.href)
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <span className="text-base">{child.icon}</span>
                      <span>{child.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

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
