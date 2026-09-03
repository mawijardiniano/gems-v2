"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "./components/layout/navbar";
import Sidebar from "./components/layout/sidebar";

const ROLE_ACCESS = {
  "gad focal person": [
    "events-dashboard",
    "university-officials",
    "gfps",
    "gaa-budget",
    "gpb",
    "reports",
    "events-list",
    "create",
    "gad-ars",
    "gad-settings"
  ],
  "gad coordinator": [
    "events-dashboard",
    "university-officials",
    "gfps",
    "gaa-budget",
    "gpb",
    "reports",
    "events-list",
    "create",
    "gad-ars",
    "gad-settings"
  ],
  "planning director": ["admin-dashboard", "gpb", "gad-settings"],
};

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const sidebarRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/profile/my-profile", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok || !data.user) {
          router.replace("/");
          return;
        }

        const role = data.user.role.toLowerCase();
        setUserRole(role);

        const currentPage = pathname.split("/").filter(Boolean).pop();

        const segments = pathname.split("/").filter(Boolean);
        const basePage = segments[0];

        const allowedPages = ROLE_ACCESS[role] || [];

        if (!allowedPages.includes(basePage)) {
          router.replace("/not-authorized");
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error(err);
        router.replace("/");
      }
    };

    checkAuth();
  }, [router, pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isAuthorized) return null;

  return (
    <div className="flex relative">
      <div ref={sidebarRef}>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} role={userRole} />
      </div>

      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "sm:ml-64" : "ml-0 sm:ml-16"
        }`}
      >
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="mt-16 px-4 sm:px-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
