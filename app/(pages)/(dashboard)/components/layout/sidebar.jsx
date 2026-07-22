"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaUser,
  FaChevronDown,
  FaCog,
  FaSignOutAlt,
  FaCalendar,
  FaIdCard,
  FaBook,
  FaClipboardList,
  FaHome,
  FaPhoneAlt,
} from "react-icons/fa";
import {
  FaGraduationCap,
  FaBriefcase,
  FaVenusMars,
  FaCompass,
  FaArrowRightFromBracket,
} from "react-icons/fa6";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

const SUB_ICONS = {
  "/dashboard/personal-information": <FaIdCard />,
  "/dashboard/academic": <FaGraduationCap />,
  "/dashboard/employment": <FaBriefcase />,
  "/dashboard/gender-equity-data": <FaVenusMars />,
  "/dashboard/contact-information": <FaPhoneAlt />,
  "/events/discover": <FaCompass />,
};

const SUB_LABELS = {
  "/dashboard/personal-information": "Personal Information",
  "/dashboard/academic": "Academic Information",
  "/dashboard/employment": "Employment Information",
  "/dashboard/gender-equity-data": "GAD Data",
  "/dashboard/contact-information": "Contact Information",
  "/events/discover": "Discover Events",
};

export default function Sidebar({ open, setOpen }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [personType, setPersonType] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleMobileClose = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setOpen(false);
    }
  }, [setOpen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile/my-profile", {
          credentials: "include",
        });
        if (!mounted) return;
        if (!res.ok) return;
        const body = await res.json();

        const profileObj = body?.data || body?.profile || body || null;
        setProfile(profileObj);
        setUser(body?.user || null);

        const pt =
          profileObj?.personal?.currentStatus ||
          profileObj?.personal_information?.person_type ||
          null;
        setPersonType(pt);
      } catch (e) {}
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/dashboard")) {
      setIsProfileOpen(true);
    }
    if (pathname.startsWith("/events")) {
      setIsEventOpen(true);
    }
  }, [pathname]);

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

  const getInitials = useCallback(() => {
    if (profile?.personal) {
      const { first_name, last_name } = profile.personal;
      return `${(first_name?.[0] || "").toUpperCase()}${(last_name?.[0] || "").toUpperCase()}`;
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "U";
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

  const isOverviewActive = pathname.startsWith("/dashboard");
  const isEventsActive = pathname.startsWith("/events");

  // Tooltip wrapper for collapsed state
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

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-screen bg-white/90 backdrop-blur-xl border-r border-gray-200/80 transition-all duration-300 z-30 flex flex-col overflow-hidden ${
          open ? "w-64" : "w-0 sm:w-[72px]"
        }`}
      >
        {/* User Profile Header */}
        <div
          className={`flex-shrink-0 border-b border-gray-100/80 ${
            open ? "px-4 py-5" : "px-0 py-4 hidden sm:flex sm:justify-center"
          }`}
        >
          {open ? (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white flex-shrink-0"
                style={{
                  backgroundColor: `hsl(${avatarColor}, 55%, 50%)`,
                }}
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
                style={{
                  backgroundColor: `hsl(${avatarColor}, 55%, 50%)`,
                }}
              >
                {getInitials()}
              </div>
            </TooltipWrapper>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent ${
            open ? "px-3" : "px-0"
          }`}
        >
          {/* ===== OVERVIEW SECTION ===== */}
          <div>
            {open && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Main Menu
              </p>
            )}

            {/* Overview parent item */}
            <TooltipWrapper label="Overview" collapsed={!open}>
              <div
                className={`relative flex items-center justify-between rounded-xl transition-all duration-200 group cursor-pointer ${
                  open ? "p-2.5" : "p-3 justify-center mx-1.5"
                } ${
                  isOverviewActive
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                onClick={() => {
                  if (open) {
                    setIsProfileOpen(!isProfileOpen);
                    router.push("/dashboard");
                  } else {
                    router.push("/dashboard");
                    handleMobileClose();
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      isOverviewActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    <FaHome
                      className={
                        isOverviewActive ? "text-blue-600" : "text-gray-400"
                      }
                      size={16}
                    />
                  </span>
                  {open && (
                    <span className="text-sm font-medium truncate">
                      Overview
                    </span>
                  )}
                </div>
                {open && (
                  <span
                    className={`flex-shrink-0 transition-all duration-200 ${
                      isProfileOpen ? "rotate-0" : "-rotate-90"
                    } ${isOverviewActive ? "text-blue-500" : "text-gray-300"}`}
                  >
                    <FaChevronDown size={10} />
                  </span>
                )}

                {/* Active indicator */}
                {isOverviewActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-full" />
                )}
              </div>
            </TooltipWrapper>

            {/* Sub-menu items */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isProfileOpen && open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                {[
                  "/dashboard/personal-information",
                  ...(personType === "Student"
                    ? ["/dashboard/academic"]
                    : []),
                  ...(personType === "Employee"
                    ? ["/dashboard/employment"]
                    : []),
                  "/dashboard/gender-equity-data",
                  "/dashboard/contact-information",
                ].map((subPath) => {
                  const isActive = pathname === subPath;
                  return (
                    <TooltipWrapper
                      key={subPath}
                      label={SUB_LABELS[subPath]}
                      collapsed={!open}
                    >
                      <Link
                        href={subPath}
                        onClick={handleMobileClose}
                        className={`relative flex items-center gap-3 rounded-lg transition-all duration-150 ${
                          open ? "p-2" : "p-2.5 justify-center mx-1"
                        } ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 transition-transform ${
                            isActive ? "scale-110 text-blue-500" : ""
                          }`}
                        >
                          {SUB_ICONS[subPath] || <FaIdCard />}
                        </span>
                        {open && (
                          <span className="text-sm truncate">
                            {SUB_LABELS[subPath]}
                          </span>
                        )}

                        {/* Active dot indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-blue-500" />
                        )}
                      </Link>
                    </TooltipWrapper>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className={`${open ? "px-3" : "px-4"} py-1`}>
            <div className="border-t border-gray-100" />
          </div>

          {/* ===== EVENTS SECTION ===== */}
          <div>
            {open && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Engagement
              </p>
            )}

            <TooltipWrapper label="Events" collapsed={!open}>
              <div
                className={`relative flex items-center justify-between rounded-xl transition-all duration-200 group cursor-pointer ${
                  open ? "p-2.5" : "p-3 justify-center mx-1.5"
                } ${
                  isEventsActive
                    ? "bg-gradient-to-r from-amber-50 to-orange-50/50 text-amber-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                onClick={() => {
                  if (open) {
                    setIsEventOpen(!isEventOpen);
                    router.push("/events");
                  } else {
                    router.push("/events");
                    handleMobileClose();
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      isEventsActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    <FaCalendar
                      className={
                        isEventsActive ? "text-amber-600" : "text-gray-400"
                      }
                      size={16}
                    />
                  </span>
                  {open && (
                    <span className="text-sm font-medium truncate">
                      Events
                    </span>
                  )}
                </div>
                {open && (
                  <span
                    className={`flex-shrink-0 transition-all duration-200 ${
                      isEventOpen ? "rotate-0" : "-rotate-90"
                    } ${isEventsActive ? "text-amber-500" : "text-gray-300"}`}
                  >
                    <FaChevronDown size={10} />
                  </span>
                )}

                {/* Active indicator */}
                {isEventsActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-amber-500 rounded-full" />
                )}
              </div>
            </TooltipWrapper>

            {/* Sub-menu items */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isEventOpen && open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                <TooltipWrapper label="Discover Events" collapsed={!open}>
                  <Link
                    href="/events/discover"
                    onClick={handleMobileClose}
                    className={`relative flex items-center gap-3 rounded-lg transition-all duration-150 ${
                      open ? "p-2" : "p-2.5 justify-center mx-1"
                    } ${
                      pathname === "/events/discover"
                        ? "bg-amber-50 text-amber-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 transition-transform ${
                        pathname === "/events/discover"
                          ? "scale-110 text-amber-500"
                          : ""
                      }`}
                    >
                      <FaCompass size={14} />
                    </span>
                    {open && (
                      <span className="text-sm truncate">Discover Events</span>
                    )}
                  </Link>
                </TooltipWrapper>
              </div>
            </div>
          </div>
        </nav>

        {/* ===== BOTTOM ACTIONS ===== */}
        <div
          className={`flex-shrink-0 border-t border-gray-100/80 py-2 ${
            open ? "px-3" : "px-0"
          }`}
        >
          <TooltipWrapper label="Settings" collapsed={!open}>
            <Link
              href="/settings"
              onClick={handleMobileClose}
              className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                open ? "p-2.5" : "p-3 justify-center mx-1.5"
              } ${
                pathname === "/settings"
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

      {/* ===== LOGOUT MODAL ===== */}
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