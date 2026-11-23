"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/layout/navbar";
import Sidebar from "./components/layout/sidebar";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import SkipLink from "@/components/layout/SkipLink";
import { useDialog } from "@/hooks/useDialog";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [initialMobileCheckDone, setInitialMobileCheckDone] = useState(false);
  const sidebarRef = useRef(null);
  const router = useRouter();

  /* On phones the open sidebar is a drawer over the page: make it a real
     dialog (focus moves in, Tab stays inside, Escape closes, focus returns to
     the menu button). Closed, it is zero-width but its links would still be
     tabbable, so it is made inert. */
  const closeDrawer = useCallback(() => setSidebarOpen(false), []);
  const drawerDialogRef = useDialog(closeDrawer);
  const drawerRef = useCallback(
    (node) => {
      sidebarRef.current = node;
      return drawerDialogRef(node);
    },
    [drawerDialogRef],
  );

  useEffect(() => {
    const checkAuth = async () => {
      const qs =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      if (qs?.get("qr") === "1") {
        setIsAuthorized(true);
        return;
      }
      try {
        const res = await fetch("/api/profile/my-profile", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        console.log("Dashboard auth check data:", data);

        if (!res.ok || !data.user) {
          const currentPath =
            window.location.pathname + window.location.search;
          router.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
          return;
        }

        if (!data.user.role || data.user.role.toLowerCase() !== "user") {
          console.log("User not authorized, role:", data.user.role);
          router.replace("/not-authorized");
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error(err);
        const currentPath = window.location.pathname + window.location.search;
        router.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
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
    <div className="flex relative bg-gray-50">
      <SkipLink />
      <div
        ref={isMobile && sidebarOpen ? drawerRef : sidebarRef}
        role={isMobile && sidebarOpen ? "dialog" : undefined}
        aria-modal={isMobile && sidebarOpen ? true : undefined}
        aria-label={isMobile && sidebarOpen ? "Navigation" : undefined}
        inert={isMobile && !sidebarOpen}
      >
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
          sidebarOpen ? "sm:ml-80" : "ml-0 sm:ml-20"
        }`}
      >
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mt-16 min-h-[calc(100vh-4rem)] px-4 sm:px-6 bg-gray-50"
        >
          <PageBreadcrumbs role="dashboard" />
          {children}
        </main>
      </div>
    </div>
  );
}
