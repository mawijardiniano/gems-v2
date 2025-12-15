"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/layout/navbar";
import Sidebar from "./components/layout/sidebar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [initialMobileCheckDone, setInitialMobileCheckDone] = useState(false);
  const sidebarRef = useRef(null);
  const router = useRouter();

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

        if (data.user.role.toLowerCase() !== "admin") {
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
  }, [router]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);

      if (mobile && !initialMobileCheckDone) {
        setSidebarOpen(false);
        setInitialMobileCheckDone(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [initialMobileCheckDone]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isMobile) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [sidebarOpen, isMobile]);

  if (!isAuthorized) return null;

  return (
    <div className="flex relative">
      <div ref={sidebarRef}>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
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
        <main className="mt-16 px-4 sm:px-6 bg-gray-50 h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
