"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import OfficesManager from "../components/offices/OfficesManager";
import useUniversityOffices from "@/lib/useUniversityOffices";
import PositionsManager from "@/components/positions/PositionsManager";
import useUniversityPositions from "@/lib/useUniversityPositions";
import { pickResolvedAcademicYear } from "@/lib/academicYear";
import {
  SIGNATORY_SEED_YEARS,
  getSignatories,
  signatoryYearRows,
} from "@/lib/signatories";
import {
  FaSignInAlt,
  FaUserEdit,
  FaPlusCircle,
  FaCalendarCheck,
  FaEdit,
  FaTimesCircle,
  FaLock,
  FaClipboardList,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaRedo,
  FaShieldAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaHistory,
  FaSave,
  FaSpinner,
} from "react-icons/fa";

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "min", secs: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) return `${count} ${i.label}${count > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

function formatDateTime(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_CONFIG = {
  LOGIN: { icon: <FaSignInAlt />, color: "bg-secondary-100 text-secondary-600", label: "Login" },
  UPDATE_PROFILE: { icon: <FaUserEdit />, color: "bg-secondary-100 text-secondary-600", label: "Profile Updated" },
  EVENT_REGISTER: { icon: <FaCalendarCheck />, color: "bg-emerald-100 text-emerald-600", label: "Event Registration" },
  EVENT_CREATE: { icon: <FaPlusCircle />, color: "bg-green-100 text-green-600", label: "Event Created" },
  EVENT_STATUS_UPDATE: { icon: <FaTimesCircle />, color: "bg-red-100 text-red-600", label: "Event Status Change" },
  EVENT_UPDATE: { icon: <FaEdit />, color: "bg-yellow-100 text-yellow-600", label: "Event Updated" },
  CHANGE_PASSWORD: { icon: <FaEdit />, color: "bg-orange-100 text-orange-600", label: "Password Changed" },
};

/* A quiet label above a group of cards.
 *
 * The page carries four unrelated jobs — account security, the shared
 * directory, the report signature block, and the activity log — and they used
 * to sit in one flat column where a card's importance was implied only by its
 * position in the file. A heading costs one line and states who the cards
 * below it affect.
 *
 * Styled smaller and lighter than a card's own `h2` on purpose: the hierarchy
 * reads group → card → content, never heading → heading. */
function GroupHeading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
      {children}
    </h3>
  );
}

function ActivityIcon({ action }) {
  const cfg = ACTION_CONFIG[action] || { icon: <FaSignInAlt />, color: "bg-gray-100 text-gray-600" };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

export default function Settings() {
  const role = useSelector((state) => state.auth.role);
  /* The office list is global, so only the GAD focal person may write to it.
     Coordinators and the planning director see the same card read-only, and the
     API refuses their writes regardless of what this renders. */
  const canManageOffices = role?.toLowerCase() === "gad focal person";
  /* The seat list is the same kind of global org-chart data as the office list,
     so it is gated identically: the GAD focal person writes, everyone who can
     reach the University Officials page reads. */
  const canManagePositions = canManageOffices;

  /* Report signatories are the names printed on the GPB and the GAD-AR. The
     rule is deliberately narrower than the office list: they are the Focal
     Person's own signature, so the Focal Person and the admin may edit them and
     nobody else. The API enforces the same list
     (SETTING_WRITE_ROLES in app/api/settings/route.js), so a role that cannot
     edit never even sees the card — no dead controls. */
  const canEditSignatories =
    role?.toLowerCase() === "gad focal person" || role?.toLowerCase() === "admin";

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // User info state
  const [userInfo, setUserInfo] = useState(null);
  const [userInfoLoading, setUserInfoLoading] = useState(true);

  // Activity log state
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 10 });
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* ── Report signatories (the GPB / GAD-AR signature block) ──
     Stored as the `report_signatories` system setting, keyed by academic year,
     so a GPB from an earlier year keeps the signatories in post then. Each slot
     may be a person picked from the directory (`profile_id` set) or a name typed
     by hand for someone with no GEMS profile — `name` is what prints either way.
     See lib/signatories.js. */
  const [sigYear, setSigYear] = useState("");
  const [sigPreparedBy, setSigPreparedBy] = useState("");
  const [sigApprovedBy, setSigApprovedBy] = useState("");
  const [sigByYear, setSigByYear] = useState({});
  const [sigLoading, setSigLoading] = useState(true);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigMessage, setSigMessage] = useState(null);
  /* Which slot's picker is open, and its query/results. */
  const [sigOpenPicker, setSigOpenPicker] = useState("");
  const [sigQuery, setSigQuery] = useState("");
  const [sigResults, setSigResults] = useState([]);
  const [sigSearching, setSigSearching] = useState(false);

  /* ── Offices & Groups (see lib/useUniversityOffices.js) ──
     The list is global, so it is loaded with the assigned-official counts for
     the active academic year and edited here rather than in the assign modal.

     The banner callbacks are memoised: `useUniversityOffices` keeps them in a
     ref, but a stable identity here also stops `setMessage` being called with a
     fresh object on every render. */
  const reportOfficeError = useCallback(
    (text) => setMessage({ type: "error", text }),
    [],
  );
  const reportOfficeSuccess = useCallback(
    (text) => setMessage({ type: "success", text }),
    [],
  );

  const {
    offices,
    loading: officesLoading,
    busy: officeBusy,
    counts,
    academicYear: officesYear,
    addOffice: handleAddOffice,
    deactivateOffice: handleDeactivateOffice,
    reactivateOffice: handleReactivateOffice,
  } = useUniversityOffices({
    includeCounts: true,
    onError: reportOfficeError,
    onSuccess: reportOfficeSuccess,
  });

  /* ── Positions / seats (see lib/useUniversityPositions.js) ──
     The seat list is a separate collection from the office list — offices are
     the columns of the org chart, positions are the seats inside them — so it
     has its own hook, its own endpoint and its own card, but the same audience
     and the same never-delete rule.

     It is handed the year the *offices* response resolved rather than a year
     derived here. Deriving it locally meant reading `academic_year` off office
     rows, which do not carry it (the route reports it on the response body), so
     the value was always `""` — an empty-year fetch that then had to be
     corrected by a second one. Passing the real year loads the roster once. */
  const {
    positions,
    offices: positionOffices,
    loading: positionsLoading,
    busy: positionBusy,
    academicYear: positionsYear,
    addPosition: handleAddPosition,
    updatePosition: handleUpdatePosition,
    deactivatePosition: handleDeactivatePosition,
    reactivatePosition: handleReactivatePosition,
  } = useUniversityPositions({
    includeCounts: true,
    academicYear: officesYear,
    onError: reportOfficeError,
    onSuccess: reportOfficeSuccess,
  });

  /* Which academic year the assigned counts belong to — taken from whichever
     response has resolved one, so an install whose active term is unset does
     not label the numbers with a year nobody is looking at. */
  const officesAcademicYear = pickResolvedAcademicYear(positionsYear, officesYear);

  /* Deep links from University Officials ("Manage Offices" -> #offices,
     "Manage Positions" -> #positions): keep the section in view once the card
     has rendered and flash it so the operator can see where they landed.
     The sections carry `scroll-mt-24` already, so only the allowlist below
     decides which hash is honoured — an unrecognised hash is ignored rather
     than scrolled to.

     The group ids are listed too, so a link can target a whole group. Note the
     `if (!target) return;` guard below is load-bearing: an id absent from this
     list is silently ignored, so a hash that "does nothing" is usually a
     missing entry here rather than a broken scroll. */
  const DEEP_LINK_SECTIONS = [
    "account",
    "directory",
    "report-output",
    "activity",
    "offices",
    "positions",
    "signatories",
  ];
  const [highlightedSection, setHighlightedSection] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = DEEP_LINK_SECTIONS.find(
      (id) => window.location.hash === `#${id}`,
    );
    if (!target) return;
    const scroll = window.setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ block: "start" }),
      80,
    );
    setHighlightedSection(target);
    const clear = window.setTimeout(() => setHighlightedSection(null), 2200);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(clear);
    };
  }, [officesLoading]);

  const firstInputRef = useRef(null);

  /* ── Report signatories: load, search, save ──────────────────────────────
     Only fetched when the role may edit, so other roles never trigger a read
     they cannot act on. */
  useEffect(() => {
    if (!canEditSignatories) {
      setSigLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings?key=report_signatories", {
          cache: "no-store",
        });
        const data = await res.json();
        const value = data.success ? data.data?.value || {} : {};
        /* Keep the STORED keys (`prepared_by` / `approved_by`) in state.
           Renaming them here to `{ name, approved }` made the editor the only
           consumer able to read its own state: `lib/signatories` looks for the
           stored keys, so every reader that goes through it — the table first
           among them — saw a well-formed entry with two blank slots and drew
           "—" for names that were saved all along. One shape, read one way. */
        const years = {};
        for (const [year, entry] of Object.entries(value)) {
          if (!/^\d{4}-\d{4}$/.test(year)) continue;
          years[year] = {
            prepared_by: entry?.prepared_by,
            approved_by: entry?.approved_by,
          };
        }
        if (cancelled) return;
        setSigByYear(years);
        /* Newest year actually stored — a year nobody has configured is a bad
           place to land the form, even though the table lists it. Rows are
           newest-first, so the newest is the FIRST one, not the last. */
        const fallback = signatoryYearRows(years, [])[0]?.year || "";
        const initial = getSignatories(years, fallback);
        setSigYear(fallback);
        setSigPreparedBy(initial.prepared_by);
        setSigApprovedBy(initial.approved_by);
      } catch (e) {
        console.error("Failed to fetch report signatories:", e);
      } finally {
        if (!cancelled) setSigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canEditSignatories]);

  /* Debounced directory search for the name picker. Driven by the field's own
     text, so there is a single value in play: what you type is both the search
     term and, if you ignore the suggestions, the name that saves. The route
     masks names by the caller's role, so a role without PII access simply sees
     masked rows. */
  useEffect(() => {
    if (!sigOpenPicker) return;
    const q = sigQuery.trim();
    if (q.length < 2) {
      setSigResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSigSearching(true);
      try {
        const res = await fetch(`/api/profile/search?q=${encodeURIComponent(q)}&limit=10`);
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        if (cancelled) return;
        setSigResults(
          rows
            .map((row) => {
              const p = row?.personal_info_id?.personal || {};
              /* First + last only. Signatories print without a middle name, and
                 the picked value is what the report stores, so the middle name
                 must not be composed here in the first place. */
              const name = [p.first_name, p.last_name]
                .filter(Boolean)
                .join(" ")
                .trim();
              return name
                ? { id: String(row.personal_info_id?._id || row._id || ""), name }
                : null;
            })
            .filter(Boolean),
        );
      } catch {
        if (!cancelled) setSigResults([]);
      } finally {
        if (!cancelled) setSigSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [sigQuery, sigOpenPicker]);

  /* Every year the dropdown offers, newest first, with that year's printed
     names. The union of the seed years and whatever is stored is computed here
     once for BOTH the dropdown and the table below it, so the two can never
     disagree about which years exist. Names come through `getSignatories`, the
     same read path the PDF routes and the print components use, so the table
     shows exactly what would print — middle name stripped, blank as "". */
  const sigRows = useMemo(
    () => signatoryYearRows(sigByYear, SIGNATORY_SEED_YEARS),
    [sigByYear],
  );

  /* Switching year loads that year's saved names, so editing one year never
     silently overwrites another. Read through `getSignatories`, not by reaching
     into the entry: the form and the table must agree about what a year holds,
     and they only do if both ask the same function. */
  function selectSigYear(year) {
    const { prepared_by, approved_by } = getSignatories(sigByYear, year);
    setSigYear(year);
    setSigPreparedBy(prepared_by);
    setSigApprovedBy(approved_by);
    setSigOpenPicker("");
    setSigQuery("");
    setSigMessage(null);
  }

  async function saveReportSignatories() {
    if (!sigYear) {
      setSigMessage({ type: "error", text: "Select an academic year first." });
      return;
    }
    if (!sigPreparedBy.trim() && !sigApprovedBy.trim()) {
      setSigMessage({
        type: "error",
        text: "Enter at least one name, or the reports will print a blank signature line.",
      });
      return;
    }
    setSigSaving(true);
    setSigMessage(null);
    try {
      /* Send every year, not just the edited one: the setting is a single
         document, so a partial write would drop the other years. A name is sent
         as a plain string — the API normalizes it to the stored object shape. */
      const value = {
        ...sigByYear,
        [sigYear]: {
          prepared_by: sigPreparedBy.trim(),
          approved_by: sigApprovedBy.trim(),
        },
      };
      const res = await axios.put("/api/settings", {
        key: "report_signatories",
        value,
      });
      if (res.data.success) {
        setSigByYear(value);
        setSigMessage({ type: "success", text: "Report signatories saved." });
      } else {
        setSigMessage({ type: "error", text: res.data.error || "Failed to save." });
      }
    } catch (err) {
      setSigMessage({
        type: "error",
        text: err?.response?.data?.error || "Server error.",
      });
    } finally {
      setSigSaving(false);
    }
  }

  useEffect(() => {
    if (passwordModalOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [passwordModalOpen]);

  // Fetch user info (includes passwordChangedAt)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile/my-profile");
        const data = await res.json();
        if (data?.user) {
          setUserInfo(data.user);
        }
      } catch (e) {
        console.error("Failed to fetch user info:", e);
      } finally {
        setUserInfoLoading(false);
      }
    })();
  }, []);

  const fetchActivities = useCallback(async (page = 1) => {
    setActivityLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filterAction) params.set("action", filterAction);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      setActivities(data.activities || []);
      setPagination(data.pagination || { total: 0, totalPages: 0, page: 1, limit: 10 });
    } catch {
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  }, [filterAction, filterFrom, filterTo]);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  function validateInputs() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Please fill all fields." });
      return false;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return false;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return false;
    }
    return true;
  }

  function openPasswordModal() {
    setMessage(null);
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    setPasswordModalOpen(false);
    setConfirmOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleModalSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!validateInputs()) return;
    setConfirmOpen(true);
  }

  async function performChange() {
    setConfirmOpen(false);
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      if (res.data && res.data.success) {
        // Refresh user info to get updated passwordChangedAt
        try {
          const userRes = await fetch("/api/profile/my-profile");
          const userData = await userRes.json();
          if (userData?.user) setUserInfo(userData.user);
        } catch (e) {}
        
        setMessage({ type: "success", text: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordModalOpen(false);
        // Keep the activity card honest — the change is logged like any other.
        fetchActivities(1);
      } else {
        setMessage({
          type: "error",
          text: res.data?.error || res.data?.message || "Failed to change password.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error || "Server error.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchActivities(newPage);
  }

  function resetFilters() {
    setFilterAction("");
    setFilterFrom("");
    setFilterTo("");
  }

  const passwordChangedAt = userInfo?.passwordChangedAt;
  const lastLogin = userInfo?.lastLogin;

  const officesBanner =
    message &&
    (message.type === "error" ? (
      <div
        role="alert"
        className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <FaExclamationCircle className="mt-0.5 shrink-0" />
        <span className="flex-1">{message.text}</span>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Dismiss"
          className="shrink-0 text-red-400 transition hover:text-red-600"
        >
          <FaTimesCircle />
        </button>
      </div>
    ) : (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <FaCheckCircle className="shrink-0" />
        {message.text}
      </div>
    ));

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your account security, the shared directory every report draws on, the
          signature block those reports print, and your activity log
        </p>
      </div>

      {/* Account security — yours alone. First because it is the one thing
          people come here for under time pressure (a password they cannot
          change blocks everything else). */}
      <div id="account" className="mb-8 scroll-mt-24">
        <GroupHeading>Account security</GroupHeading>

        {/* Security Section */}
        <section className="mb-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <FaLock />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Security</h2>
                <p className="text-xs text-gray-500">Manage your password and account security</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            {/* Password Info & Change Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-3">
                <button
                  onClick={openPasswordModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors shadow-sm hover:shadow-md"
                >
                  <FaLock className="text-xs" />
                  Change Password
                </button>
                <div className="text-xs text-gray-500">
                  {userInfoLoading ? (
                    <span className="text-gray-400">Loading security info...</span>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {passwordChangedAt ? (
                        <div className="flex items-center gap-2">
                          <FaHistory className="text-gray-400 shrink-0" />
                          <span>
                            Last changed:{" "}
                            <span className="font-medium text-gray-700">
                              {formatDateTime(passwordChangedAt)}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FaExclamationCircle className="text-secondary-400 shrink-0" />
                          <span className="text-secondary-600">Password has never been changed</span>
                        </div>
                      )}
                      {lastLogin && (
                        <div className="flex items-center gap-2">
                          <FaSignInAlt className="text-gray-400 shrink-0" />
                          <span>
                            Last login:{" "}
                            <span className="font-medium text-gray-700">
                              {formatDateTime(lastLogin)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {passwordChangedAt && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 shrink-0">
                  <FaCheckCircle className="text-emerald-500 text-xs" />
                  <span className="text-xs text-emerald-700 font-medium">
                    Password is active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Shared directory — the org chart. Read by everyone, written by the
          Focal Person. Stated in the heading because an office rename reaches
          every later report, which is not obvious from the card alone. */}
      <div id="directory" className="mb-8 scroll-mt-24">
        <GroupHeading>Shared directory · every year, every report</GroupHeading>

      {/* Offices & Groups Section — the office list behind the
          "Office / Group" picker on the University Officials page. */}
      <section id="offices" className="mb-8 scroll-mt-24">
        {officesBanner}
        <div
          className={`rounded-2xl transition-shadow duration-500 ${
            highlightedSection === "offices"
              ? "ring-2 ring-secondary-300 ring-offset-2"
              : ""
          }`}
        >
          <OfficesManager
            offices={offices}
            counts={counts}
            academicYear={officesAcademicYear}
            busy={officeBusy}
            onAdd={canManageOffices ? handleAddOffice : undefined}
            onDeactivate={canManageOffices ? handleDeactivateOffice : undefined}
            onReactivate={canManageOffices ? handleReactivateOffice : undefined}
          />
        </div>
      </section>

      {/* Positions Section — the seats inside each office column. Distinct from
          Offices & Groups above: that card edits the columns, this edits the
          rows within them. */}
      <section id="positions" className="mb-8 scroll-mt-24">
        <div
          className={`rounded-2xl transition-shadow duration-500 ${
            highlightedSection === "positions"
              ? "ring-2 ring-secondary-300 ring-offset-2"
              : ""
          }`}
        >
          <PositionsManager
            positions={positions}
            offices={positionOffices.length ? positionOffices : offices}
            academicYear={officesAcademicYear}
            busy={positionBusy}
            onAdd={canManagePositions ? handleAddPosition : undefined}
            onUpdate={canManagePositions ? handleUpdatePosition : undefined}
            onDeactivate={canManagePositions ? handleDeactivatePosition : undefined}
            onReactivate={canManagePositions ? handleReactivatePosition : undefined}
          />
        </div>
      </section>
      </div>

      {/* Report output — the names that print on the GPB and GAD-AR.
          Hidden entirely for roles that may not edit: the API refuses their
          writes, so showing a disabled form would only invite a 403. The whole
          group goes, heading included, rather than leaving an empty label. */}
      {canEditSignatories && (
        <div id="report-output" className="mb-8 scroll-mt-24">
          <GroupHeading>Report output · printed signature block</GroupHeading>
          <section id="signatories" className="mb-0 scroll-mt-24">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-600">
                  <FaUserEdit />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Report Signatories
                  </h2>
                  <p className="text-xs text-gray-500">
                    Names printed on the GPB and GAD-AR signature block
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              {sigLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FaSpinner className="animate-spin" />
                  Loading signatories...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Every year at a glance, newest first. Read-only on
                      purpose: editing stays in the form below, which keeps the
                      directory picker and the "type any name" escape hatch.
                      Edit only moves the form to that year and scrolls to it —
                      there is one editor, not one per row, so a half-typed
                      name can never be lost by opening a second row. */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        Configured years
                      </h3>
                      <span className="text-xs text-gray-500">
                        {sigRows.length} academic year{sigRows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                              Academic Year
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                              Prepared By
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                              Approved By
                            </th>
                            <th className="w-20 px-4 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sigRows.map((row) => {
                            /* The row being edited is tinted so the link between
                               the table and the form below is visible without
                               scrolling back up to read the dropdown. */
                            const active = row.year === sigYear;
                            return (
                              <tr
                                key={row.year}
                                className={active ? "bg-secondary-50/50" : "hover:bg-gray-50"}
                              >
                                <td className={`px-4 py-2.5 whitespace-nowrap ${active ? "font-medium text-gray-900" : "text-gray-700"}`}>
                                  {row.year}
                                </td>
                                {[row.prepared_by, row.approved_by].map((name, i) => (
                                  <td key={i} className="px-4 py-2.5">
                                    {name ? (
                                      <span className="text-gray-900">{name}</span>
                                    ) : (
                                      /* Same meaning as the underscore rule the
                                         reports print, in a form that reads as
                                         "not set" rather than as a name. */
                                      <span className="text-gray-400 italic">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      selectSigYear(row.year);
                                      document
                                        .getElementById("signatories-form")
                                        ?.scrollIntoView({ block: "start", behavior: "smooth" });
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary-600 hover:text-secondary-700"
                                  >
                                    <FaEdit className="text-[10px]" />
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div id="signatories-form" className="space-y-4 scroll-mt-24">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Academic Year
                      </label>
                      <select
                        value={sigYear}
                        onChange={(e) => selectSigYear(e.target.value)}
                        className="w-full sm:w-64 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 bg-white"
                      >
                        <option value="">Select Academic Year</option>
                        {sigRows.map((row) => (
                          <option key={row.year} value={row.year}>
                            {row.year}
                          </option>
                        ))}
                      </select>
                    </div>

                  {[
                    { slot: "prepared_by", label: "Prepared By", role: "GAD Focal Point/Person", value: sigPreparedBy, setValue: setSigPreparedBy },
                    { slot: "approved_by", label: "Approved By", role: "University President", value: sigApprovedBy, setValue: setSigApprovedBy },
                  ].map((field) => (
                      <div key={field.slot}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                      {/* ONE control, not two. The box holds the name you will
                          save; typing in it also searches the directory, and the
                          matches appear directly beneath it. Picking a match just
                          fills the box. Whatever is in the box when you press
                          Save is what is stored — so a name with no GEMS profile
                          works by simply typing it and ignoring the suggestions. */}
                      <div className="relative">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            field.setValue(e.target.value);
                            setSigOpenPicker(field.slot);
                            setSigQuery(e.target.value);
                          }}
                          onFocus={() => {
                            setSigOpenPicker(field.slot);
                            setSigQuery(field.value);
                          }}
                          onBlur={() => {
                            /* Delay so a click on a suggestion registers first. */
                            setTimeout(() => setSigOpenPicker(""), 150);
                          }}
                          placeholder="Type a name, or search the directory"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 bg-white"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-1.5">
                          <FaSearch className="text-xs text-gray-400" aria-hidden />
                          {field.value && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => field.setValue("")}
                              aria-label={`Clear ${field.label}`}
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              <FaTimesCircle className="text-xs" />
                            </button>
                          )}
                        </div>

                        {sigOpenPicker === field.slot && sigQuery.trim().length >= 2 && (
                          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                            <div className="max-h-56 overflow-y-auto">
                              {sigSearching ? (
                                <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                                  <FaSpinner className="animate-spin" /> Searching...
                                </div>
                              ) : sigResults.length ? (
                                sigResults.map((person) => (
                                  <button
                                    key={person.id || person.name}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      field.setValue(person.name);
                                      setSigOpenPicker("");
                                      setSigQuery("");
                                      setSigResults([]);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50"
                                  >
                                    {person.name}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-xs text-gray-500">
                                  No directory match — the typed name will be used as is.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {field.role} — pick from the directory or just type a name.
                        </p>
                      </div>
                    ))}

                    {sigMessage && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          sigMessage.type === "error"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : "bg-green-50 text-green-700 border border-green-100"
                        }`}
                      >
                        {sigMessage.text}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Pick a person from the directory, or type a name for someone
                      without a GEMS profile. A blank field prints an underscore
                      rule. Names are stored per academic year, so an earlier GPB
                      keeps the signatories in post then.
                    </p>

                    <div className="flex justify-end">
                      <button
                        onClick={saveReportSignatories}
                        disabled={sigSaving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary-600 text-white text-sm font-medium rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50"
                      >
                        {sigSaving ? (
                          <>
                            <FaSpinner className="animate-spin text-xs" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="text-xs" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        </div>
      )}

      {/* Activity Log — the account's own audit trail. Last on purpose: it is
          read after acting, not before, and it is the one card that grows
          without limit (paginated), so putting it anywhere but the end would
          push the configuration people came for below the fold. */}
      <div id="activity" className="mb-8 scroll-mt-24">
        <GroupHeading>Your activity</GroupHeading>
        <section className="mb-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-600">
                  <FaClipboardList />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Activity Log</h2>
                  <p className="text-xs text-gray-500">
                    {pagination.total > 0
                      ? `${pagination.total} activity record${pagination.total !== 1 ? "s" : ""} found`
                      : "Track your recent account activity"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  showFilters
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FaFilter className="text-[10px]" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
                  >
                    <option value="">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="UPDATE_PROFILE">Profile Updated</option>
                    <option value="EVENT_REGISTER">Event Registration</option>
                    <option value="EVENT_CREATE">Event Created</option>
                    <option value="EVENT_UPDATE">Event Updated</option>
                    <option value="EVENT_STATUS_UPDATE">Event Status Change</option>
                    <option value="CHANGE_PASSWORD">Password Changed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fetchActivities(1)}
                    className="px-3 py-2 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Apply
                  </button>
                  {(filterAction || filterFrom || filterTo) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <FaRedo className="text-[10px]" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity List */}
          <div className="px-6 py-4">
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <FaClipboardList className="mx-auto text-gray-300 text-3xl mb-3" />
                <p className="text-sm text-gray-500">No activity records found.</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filterAction || filterFrom || filterTo
                    ? "Try adjusting your filters."
                    : "Activity will appear here as you use the platform."}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {activities.map((a) => {
                  const description = a.description || `${ACTION_CONFIG[a.action]?.label || a.action} action performed`;
                  return (
                    <li
                      key={a._id}
                      className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-b-0"
                    >
                      <ActivityIcon action={a.action} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {description}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {timeAgo(a.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {ACTION_CONFIG[a.action]?.label || a.action}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="text-[10px]" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    const cur = pagination.page;
                    return p === 1 || p === pagination.totalPages || Math.abs(p - cur) <= 1;
                  })
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-400 text-xs">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium ${
                          p === pagination.page
                            ? "bg-rose-600 text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            </div>
          )}
        </div>
        </section>
      </div>

      {/* Password Change Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closePasswordModal} />
          <div className="relative z-50 w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-500 mt-1">Update your account password</p>
              </div>

              {message && (
                <div
                  role="alert"
                  className={`mb-3 p-3 rounded-lg text-sm ${
                    message.type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <div className="mt-1 relative">
                    <input
                      ref={firstInputRef}
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((s) => !s)}
                      className="absolute right-3 top-2.5 text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      {showCurrent ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <div className="mt-1 relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 top-2.5 text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      {showNew ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">At least 8 characters. Include letters and numbers.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <div className="mt-1 relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-2.5 text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-50 w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Password Change</h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to change your password? This action will update your account credentials immediately.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performChange}
                  className="px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}