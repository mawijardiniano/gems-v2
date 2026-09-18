"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import useMyProfile from "@/lib/useMyProfile";
import {
  FaHome,
  FaSignOutAlt,
  FaFolder,
  FaMoneyBill,
  FaUsers,
  FaCalendarAlt,
  FaCalendarDay,
  FaClipboardList,
  FaCog,
  FaFileAlt,
  FaVenusMars,
  FaChartLine,
  FaUserGraduate,
  FaUserTie,
  FaSitemap,
} from "react-icons/fa";
import { FaArrowRightFromBracket } from "react-icons/fa6";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TooltipWrapper = ({ label, children, collapsed }) => {
  if (!collapsed) return children;
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
};

export default function Sidebar({ open, setOpen, role }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { profile, user } = useMyProfile();
  const [showProjectMonitoring, setShowProjectMonitoring] = useState(false);
  const [showGenderStatistics, setShowGenderStatistics] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const ROLE_ACCESS = {
    "gad focal person": [
      "events-dashboard",
      "university-officials",
      "gfps",
      "gaa-budget",
      "gpb",
      "events-list",
      "gad-ars",
      "gender-statistics",
      "gad-settings",
      "gad-projects"
    ],
    "gad coordinator": [
      "events-dashboard",
      "university-officials",
      "gfps",
      "gaa-budget",
      "gpb",
      "events-list",
      "gad-ars",
      "gender-statistics",
      "gad-settings",
      "gad-projects"
    ],
    

  };

  const links = [
    {
      name: "Dashboard",
      href: "/events-dashboard",
      icon: <FaHome size={16} />,
      key: "events-dashboard",
    },
    {
      name: "Dashboard",
      href: "/admin-dashboard",
      icon: <FaHome size={16} />,
      key: "admin-dashboard",
    },
    {
      name: "Organizational Structure",
      icon: <FaSitemap size={16} />,
      key: "organizational-structure",
      children: [
        {
          name: "University Officials",
          href: "/university-officials",
          icon: <FaUsers size={14} />,
          key: "university-officials",
        },
        {
          name: "GFPS",
          href: "/gfps",
          icon: <FaClipboardList size={14} />,
          key: "gfps",
        },
      ],
    },
    {
      name: "GAA Budget",
      href: "/gaa-budget",
      icon: <FaMoneyBill size={16} />,
      key: "gaa-budget",
    },
    {
      name: "GPB",
      href: "/gpb",
      icon: <FaFolder size={16} />,
      key: "gpb",
    },
  ];

  const filteredLinks = useMemo(() => {
    const normalizedRole = role?.toLowerCase();
    const allowed = ROLE_ACCESS[normalizedRole] || [];
    return links
      .map((link) => ({
        ...link,
        children: link.children?.filter((child) =>
          allowed.includes(child.key)
        ),
      }))
      .filter((link) => {
        if (Array.isArray(link.children)) return link.children.length > 0;
        return allowed.includes(link.key);
      });
  }, [role]);

  const structureLink = useMemo(
    () => filteredLinks.find((link) => link.key === "organizational-structure"),
    [filteredLinks]
  );

  const structureChildren = structureLink?.children || [];

  const structureActive = structureChildren.some(
    (child) => pathname?.startsWith(child.href)
  );

  const dashboardLinks = useMemo(
    () => filteredLinks.filter((link) => link.key.endsWith("dashboard")),
    [filteredLinks]
  );

  const mainLinks = useMemo(
    () =>
      filteredLinks.filter(
        (link) =>
          !link.key.endsWith("dashboard") &&
          !Array.isArray(link.children)
      ),
    [filteredLinks]
  );

  const userAllowedPages = useMemo(() => {
    const normalizedRole = role?.toLowerCase();
    return ROLE_ACCESS[normalizedRole] || [];
  }, [role]);

  const reportsActive =
    pathname?.startsWith("/reports") || pathname?.startsWith("/gad-ars");

  const handleMobileClose = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setOpen(false);
    }
  }, [setOpen]);

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

  const isActive = useCallback(
    (href) => {
      if (href === "/events-dashboard") return pathname === "/events-dashboard";
      if (href === "/admin-dashboard") return pathname === "/admin-dashboard";
      return pathname?.startsWith(href);
    },
    [pathname]
  );

 
  useEffect(() => {
    if (
      pathname?.startsWith("/project-monitoring") ||
      pathname?.startsWith("/events-list")
    ) {
      setShowProjectMonitoring(true);
    }
    if (pathname?.startsWith("/gender-statistics")) {
      setShowGenderStatistics(true);
    }
    if (
      pathname?.startsWith("/university-officials") ||
      pathname?.startsWith("/gfps")
    ) {
      setShowStructure(true);
    }
  }, [pathname]);

  const getInitials = useCallback(() => {
    if (profile?.personal) {
      const { first_name, last_name } = profile.personal;
      return `${(first_name?.[0] || "").toUpperCase()}${(last_name?.[0] || "").toUpperCase()}`;
    }
    return user?.username?.[0]?.toUpperCase() || "G";
  }, [profile, user]);

  const getDisplayName = useCallback(() => {
    if (profile?.personal) {
      const { first_name, middle_name, last_name } = profile.personal;
      return [first_name, middle_name, last_name].filter(Boolean).join(" ");
    }
    return user?.username || "User";
  }, [profile, user]);

  const getEmail = useCallback(() => {
    if (profile?.contact?.email) return profile.contact.email;
    if (user?.username?.includes("@")) return user.username;
    return "";
  }, [profile, user]);

  const avatarColor = getDisplayName()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return (
    <>
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white/90 backdrop-blur-xl border-r border-gray-200/80 transition-all duration-300 z-30 flex flex-col overflow-hidden ${
          open ? "w-64" : "w-0 sm:w-[72px]"
        }`}
      >
      
        <div
          className={`flex-shrink-0 border-b border-gray-100/80 ${
            open ? "px-4 py-5" : "px-0 py-4 hidden sm:flex sm:justify-center"
          }`}
        >
          {open ? (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white flex-shrink-0"
                style={{ backgroundColor: `hsl(${avatarColor}, 55%, 50%)` }}
              >
                {getInitials()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {getDisplayName()}
                </p>
                {getEmail() && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {getEmail()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <TooltipWrapper label={getDisplayName()} collapsed={!open}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white cursor-default flex-shrink-0 mx-auto"
                style={{ backgroundColor: `hsl(${avatarColor}, 55%, 50%)` }}
              >
                {getInitials()}
              </div>
            </TooltipWrapper>
          )}
        </div>

   
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent ${
            open ? "px-3" : "px-0"
          }`}
        >
          {open && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              GAD Engagement
            </p>
          )}

          {dashboardLinks.map((link) => {
            const linkActive = isActive(link.href);
            return (
              <TooltipWrapper key={link.key} label={link.name} collapsed={!open}>
                <Link
                  href={link.href}
                  onClick={handleMobileClose}
                  className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                    open ? "p-2.5" : "p-3 justify-center mx-1.5"
                  } ${
                    linkActive
                      ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      linkActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    {link.icon}
                  </span>
                  {open && (
                    <span className="text-sm font-medium truncate">
                      {link.name}
                    </span>
                  )}
                  {linkActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                  )}
                </Link>
              </TooltipWrapper>
            );
          })}

      


          {userAllowedPages.includes("gad-projects") && (
            <>
              {open ? (
                <div>
                  <button
                    onClick={() =>
                      setShowProjectMonitoring((prev) => !prev)
                    }
                    className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 w-full p-2.5 ${
                      showProjectMonitoring ||
                      pathname?.startsWith("/project-monitoring") ||
                      pathname?.startsWith("/events-list")
                        ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <FaChartLine size={16} className="flex-shrink-0" />
                    <span className="text-sm font-medium truncate flex-1 text-left">
                      Project Monitoring
                    </span>
                    <span
                      className={`text-xs transition-transform ${
                        showProjectMonitoring ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {showProjectMonitoring && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      <TooltipWrapper
                        label="GAD Projects/Activities"
                        collapsed={!open}
                      >
                        <Link
                          href="/project-monitoring/gad-projects"
                          onClick={handleMobileClose}
                          className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-2.5 ${
                            pathname?.startsWith(
                              "/project-monitoring/gad-projects",
                            )
                              ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <FaClipboardList
                            size={14}
                            className="flex-shrink-0 opacity-60"
                          />
                          <span className="text-sm font-medium truncate">
                            GAD Projects/Activities
                          </span>
                          {pathname?.startsWith(
                            "/project-monitoring/gad-projects",
                          ) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                          )}
                        </Link>
                      </TooltipWrapper>

                      <TooltipWrapper
                        label="Event Management"
                        collapsed={!open}
                      >
                        <Link
                          href="/events-list"
                          onClick={handleMobileClose}
                          className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-2.5 ${
                            pathname?.startsWith("/events-list")
                              ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <FaCalendarAlt
                            size={14}
                            className="flex-shrink-0 opacity-60"
                          />
                          <span className="text-sm font-medium truncate">
                            Event Management
                          </span>
                          {pathname?.startsWith("/events-list") && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                          )}
                        </Link>
                      </TooltipWrapper>

                      <TooltipWrapper
                        label="Event Calendar"
                        collapsed={!open}
                      >
                        <Link
                          href="/project-monitoring/event-calendar"
                          onClick={handleMobileClose}
                          className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-2.5 ${
                            pathname?.startsWith(
                              "/project-monitoring/event-calendar",
                            )
                              ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <FaCalendarDay
                            size={14}
                            className="flex-shrink-0 opacity-60"
                          />
                          <span className="text-sm font-medium truncate">
                            Event Calendar
                          </span>
                          {pathname?.startsWith(
                            "/project-monitoring/event-calendar",
                          ) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                          )}
                        </Link>
                      </TooltipWrapper>
                    </div>
                  )}
                </div>
              ) : (
                <TooltipWrapper label="Project Monitoring" collapsed={!open}>
                  <Link
                    href="/project-monitoring/gad-projects"
                    onClick={handleMobileClose}
                    className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-3 justify-center mx-1.5 ${
                      pathname?.startsWith("/project-monitoring") ||
                      pathname?.startsWith("/events-list")
                        ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <FaChartLine size={16} className="flex-shrink-0" />
                  </Link>
                </TooltipWrapper>
              )}
            </>
          )}

          {userAllowedPages.includes("gender-statistics") && (
            <>
              {open ? (
                <div>
                  <button
                    onClick={() =>
                      setShowGenderStatistics((prev) => !prev)
                    }
                    className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 w-full p-2.5 ${
                      showGenderStatistics ||
                      pathname?.startsWith("/gender-statistics")
                        ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <FaVenusMars size={16} className="flex-shrink-0" />
                    <span className="text-sm font-medium truncate flex-1 text-left">
                      Gender Statistics
                    </span>
                    <span
                      className={`text-xs transition-transform ${
                        showGenderStatistics ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {showGenderStatistics && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      <TooltipWrapper label="Students" collapsed={!open}>
                        <Link
                          href="/gender-statistics/students"
                          onClick={handleMobileClose}
                          className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-2.5 ${
                            pathname?.startsWith(
                              "/gender-statistics/students",
                            )
                              ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <FaUserGraduate
                            size={14}
                            className="flex-shrink-0 opacity-60"
                          />
                          <span className="text-sm font-medium truncate">
                            Students
                          </span>
                          {pathname?.startsWith(
                            "/gender-statistics/students",
                          ) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                          )}
                        </Link>
                      </TooltipWrapper>

                      <TooltipWrapper label="Employees" collapsed={!open}>
                        <Link
                          href="/gender-statistics/employees"
                          onClick={handleMobileClose}
                          className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-2.5 ${
                            pathname?.startsWith(
                              "/gender-statistics/employees",
                            )
                              ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <FaUserTie
                            size={14}
                            className="flex-shrink-0 opacity-60"
                          />
                          <span className="text-sm font-medium truncate">
                            Employees
                          </span>
                          {pathname?.startsWith(
                            "/gender-statistics/employees",
                          ) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                          )}
                        </Link>
                      </TooltipWrapper>
                    </div>
                  )}
                </div>
              ) : (
                <TooltipWrapper label="Gender Statistics" collapsed={!open}>
                  <Link
                    href="/gender-statistics/students"
                    onClick={handleMobileClose}
                    className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-3 justify-center mx-1.5 ${
                      pathname?.startsWith("/gender-statistics")
                        ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <FaVenusMars size={16} className="flex-shrink-0" />
                  </Link>
                </TooltipWrapper>
              )}
            </>
          )}

          {mainLinks.map((link) => {
            const linkActive = isActive(link.href);
            return (
              <TooltipWrapper key={link.key} label={link.name} collapsed={!open}>
                <Link
                  href={link.href}
                  onClick={handleMobileClose}
                  className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                    open ? "p-2.5" : "p-3 justify-center mx-1.5"
                  } ${
                    linkActive
                      ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      linkActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    {link.icon}
                  </span>
                  {open && (
                    <span className="text-sm font-medium truncate">
                      {link.name}
                    </span>
                  )}
                  {linkActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                  )}
                </Link>
              </TooltipWrapper>
            );
          })}

                    {structureChildren.length > 0 && (
            <>
              {open ? (
                <div>
                  <button
                    onClick={() => setShowStructure((prev) => !prev)}
                    className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 w-full p-2.5 ${
                      showStructure || structureActive
                        ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <FaSitemap size={16} className="flex-shrink-0" />
                    <span className="text-sm font-medium truncate flex-1 text-left">
                      Organizational Structure
                    </span>
                    <span
                      className={`text-xs transition-transform ${
                        showStructure ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {showStructure && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      {structureChildren.map((child) => {
                        const childActive = pathname?.startsWith(child.href);
                        return (
                          <TooltipWrapper
                            key={child.key}
                            label={child.name}
                            collapsed={!open}
                          >
                            <Link
                              href={child.href}
                              onClick={handleMobileClose}
                              className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-2.5 ${
                                childActive
                                  ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              }`}
                            >
                              <span className="flex-shrink-0 opacity-60">
                                {child.icon}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {child.name}
                              </span>
                              {childActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                              )}
                            </Link>
                          </TooltipWrapper>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <TooltipWrapper label="Organizational Structure" collapsed={!open}>
                  <Link
                    href={structureChildren[0]?.href}
                    onClick={handleMobileClose}
                    className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group p-3 justify-center mx-1.5 ${
                      structureActive
                        ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <FaSitemap size={16} className="flex-shrink-0" />
                  </Link>
                </TooltipWrapper>
              )}
            </>
          )}

          {userAllowedPages.includes("gad-ars") && (
            <TooltipWrapper label="Reports" collapsed={!open}>
              <Link
                href="/reports"
                onClick={handleMobileClose}
                className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                  open ? "p-2.5" : "p-3 justify-center mx-1.5"
                } ${
                  reportsActive
                    ? "bg-gradient-to-r from-rose-50 to-pink-50/50 text-rose-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span
                  className={`flex-shrink-0 transition-transform duration-200 ${
                    reportsActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  <FaFileAlt size={16} />
                </span>
                {open && (
                  <span className="text-sm font-medium truncate">Reports</span>
                )}
                {reportsActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-full" />
                )}
              </Link>
            </TooltipWrapper>
          )}
        </nav>

        <div
          className={`flex-shrink-0 border-t border-gray-100/80 py-2 ${
            open ? "px-3" : "px-0"
          }`}
        >
          <TooltipWrapper label="Settings" collapsed={!open}>
            <Link
              href="/gad-settings"
              onClick={handleMobileClose}
              className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                open ? "p-2.5" : "p-3 justify-center mx-1.5"
              } ${
                pathname === "/gad-settings"
                  ? "bg-gradient-to-r from-gray-50 to-gray-100/50 text-gray-800"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="flex-shrink-0 transition-transform group-hover:rotate-90 duration-300">
                <FaCog
                  size={16}
                  className="text-gray-400 group-hover:text-gray-600"
                />
              </span>
              {open && <span className="text-sm font-medium">Settings</span>}
            </Link>
          </TooltipWrapper>

          <TooltipWrapper label="Logout" collapsed={!open}>
            <button
              onClick={() => setShowLogoutModal(true)}
              className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group w-full ${
                open ? "p-2.5" : "p-3 justify-center mx-0"
              } text-red-500 hover:bg-red-50 hover:text-red-600`}
            >
              <span className="flex-shrink-0 transition-transform group-hover:translate-x-0.5 duration-200">
                <FaArrowRightFromBracket size={16} />
              </span>
              {open && <span className="text-sm font-medium">Logout</span>}
            </button>
          </TooltipWrapper>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 space-y-6 text-center animate-slide-up">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <FaSignOutAlt className="text-2xl text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">
                Confirm Logout
              </h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to log out? You will need to sign in again
                to access your account.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}