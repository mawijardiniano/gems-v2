"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "./components/layout/navbar";
import Sidebar from "./components/layout/sidebar";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import SkipLink from "@/components/layout/SkipLink";
import { useDialog } from "@/hooks/useDialog";
import { EVENT_ROLE_PAGE_ACCESS } from "@/data/lib/roleAccess";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState(null);

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

        const segments = pathname.split("/").filter(Boolean);
        const basePage = segments[0];

        const allowedPages = EVENT_ROLE_PAGE_ACCESS[role] || [];

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
    // Phones start with the drawer closed (the other role layouts do the
    // same); after that the user's open/closed choice is left alone.
    let initialCheckDone = false;
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (!initialCheckDone) {
        if (mobile) setSidebarOpen(false);
        initialCheckDone = true;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isAuthorized) return null;

  return (
    <div className="flex relative">
      <SkipLink />
      <div
        ref={isMobile && sidebarOpen ? drawerRef : sidebarRef}
        role={isMobile && sidebarOpen ? "dialog" : undefined}
        aria-modal={isMobile && sidebarOpen ? true : undefined}
        aria-label={isMobile && sidebarOpen ? "Navigation" : undefined}
        inert={isMobile && !sidebarOpen}
      >
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} role={userRole} />
      </div>

      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`flex-1 min-w-0 transition-all duration-300 ${
          sidebarOpen ? "sm:ml-80" : "ml-0 sm:ml-20"
        }`}
      >
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mt-16 min-h-[calc(100vh-4rem)] px-4 sm:px-6 bg-gray-50"
        >
          <PageBreadcrumbs role="event" />
          {children}
        </main>
      </div>
    </div>
  );
}
