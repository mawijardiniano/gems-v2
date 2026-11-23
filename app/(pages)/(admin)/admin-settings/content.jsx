"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import axios from "axios";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
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
  FaGraduationCap,
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
  LOGIN: {
    icon: <FaSignInAlt />,
    color: "bg-secondary-100 text-secondary-600",
    label: "Login",
  },
  UPDATE_PROFILE: {
    icon: <FaUserEdit />,
    color: "bg-secondary-100 text-secondary-600",
    label: "Profile Updated",
  },
  EVENT_REGISTER: {
    icon: <FaCalendarCheck />,
    color: "bg-emerald-100 text-success",
    label: "Event Registration",
  },
  EVENT_CREATE: {
    icon: <FaPlusCircle />,
    color: "bg-green-100 text-success",
    label: "Event Created",
  },
  EVENT_STATUS_UPDATE: {
    icon: <FaTimesCircle />,
    color: "bg-red-100 text-danger",
    label: "Event Status Change",
  },
  EVENT_UPDATE: {
    icon: <FaEdit />,
    color: "bg-yellow-100 text-warning",
    label: "Event Updated",
  },
  CHANGE_PASSWORD: {
    icon: <FaEdit />,
    color: "bg-orange-100 text-orange-600",
    label: "Password Changed",
  },
};

function ActivityIcon({ action }) {
  const cfg = ACTION_CONFIG[action] || {
    icon: <FaSignInAlt />,
    color: "bg-muted text-fg-4",
  };
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs ${cfg.color}`}
    >
      {cfg.icon}
    </div>
  );
}

export default function AdminSettings() {
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
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
  });
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Academic Term state
  const [termSchoolYear, setTermSchoolYear] = useState("");
  const [termSemester, setTermSemester] = useState("");
  const [termLoading, setTermLoading] = useState(true);
  const [termSaving, setTermSaving] = useState(false);
  const [termMessage, setTermMessage] = useState(null);

  const firstInputRef = useRef(null);

  useEffect(() => {
    if (passwordModalOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [passwordModalOpen]);

  // Fetch active term
  useEffect(() => {
    (async () => {
      setTermLoading(true);
      setTermMessage(null);
      try {
        const res = await fetch("/api/settings?key=active_term");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && data.data?.value) {
          setTermSchoolYear(data.data.value.school_year || "");
          setTermSemester(data.data.value.semester || "");
        } else {
          setTermSchoolYear("");
          setTermSemester("");
        }
      } catch (e) {
        console.error("Failed to fetch active term:", e);
        /* Blank selects otherwise look like "no term set". */
        setTermMessage({
          type: "error",
          text: "Could not load the active term. Reload the page before saving.",
        });
      } finally {
        setTermLoading(false);
      }
    })();
  }, []);

  async function saveActiveTerm() {
    if (!termSchoolYear || !termSemester) {
      setTermMessage({
        type: "error",
        text: "Please select both school year and semester.",
      });
      return;
    }
    setTermSaving(true);
    setTermMessage(null);
    try {
      const res = await axios.put("/api/settings", {
        key: "active_term",
        value: { school_year: termSchoolYear, semester: termSemester },
      });
      if (res.data.success) {
        setTermMessage({
          type: "success",
          text: "Active academic term saved successfully.",
        });
      } else {
        setTermMessage({
          type: "error",
          text: res.data.error || "Failed to save.",
        });
      }
    } catch (err) {
      setTermMessage({
        type: "error",
        text: err?.response?.data?.error || "Server error.",
      });
    } finally {
      setTermSaving(false);
    }
  }

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

  const fetchActivities = useCallback(
    async (page = 1) => {
      setActivityLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 10 });
        if (filterAction) params.set("action", filterAction);
        if (filterFrom) params.set("from", filterFrom);
        if (filterTo) params.set("to", filterTo);

        const res = await fetch(`/api/activity?${params}`);
        const data = await res.json();
        setActivities(data.activities || []);
        setPagination(
          data.pagination || { total: 0, totalPages: 0, page: 1, limit: 10 },
        );
      } catch {
        setActivities([]);
      } finally {
        setActivityLoading(false);
      }
    },
    [filterAction, filterFrom, filterTo],
  );

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  function validateInputs() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Please fill all fields." });
      return false;
    }
    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
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
      } else {
        setMessage({
          type: "error",
          text:
            res.data?.error ||
            res.data?.message ||
            "Failed to change password.",
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

  const passwordFormId = useId();

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Admin Settings</h1>
        <p className="text-sm text-fg-muted mt-1">
          Manage your account credentials, security, and activity log
        </p>
      </div>

      {/* Security Section */}
      <section className="mb-8">
        <div className="bg-white rounded-xl border border-line-subtle shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-line-faint">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-600">
                <FaLock />
              </div>
              <div>
                <h2 className="text-base font-semibold text-fg">
                  Security
                </h2>
                <p className="text-xs text-fg-muted">
                  Manage your password and account security
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-3">
                <Button onClick={openPasswordModal}>
                  <FaLock className="text-xs" />
                  Change Password
                </Button>
                <div className="text-xs text-fg-muted">
                  {userInfoLoading ? (
                    <span className="text-fg-muted">
                      Loading security info...
                    </span>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {passwordChangedAt ? (
                        <div className="flex items-center gap-2">
                          <FaHistory className="text-fg-muted shrink-0" />
                          <span>
                            Last changed:{" "}
                            <span className="font-medium text-fg-3">
                              {formatDateTime(passwordChangedAt)}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FaExclamationCircle className="text-secondary-400 shrink-0" />
                          <span className="text-secondary-600">
                            Password has never been changed
                          </span>
                        </div>
                      )}
                      {lastLogin && (
                        <div className="flex items-center gap-2">
                          <FaSignInAlt className="text-fg-muted shrink-0" />
                          <span>
                            Last login:{" "}
                            <span className="font-medium text-fg-3">
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
                <div className="flex items-center gap-2 px-3 py-2 bg-success-subtle rounded-lg border border-emerald-100 shrink-0">
                  <FaCheckCircle className="text-emerald-500 text-xs" />
                  <span className="text-xs text-success font-medium">
                    Password is active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Academic Term Section */}
      <section className="mb-8">
        <div className="bg-white rounded-xl border border-line-subtle shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-line-faint">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-600">
                <FaGraduationCap />
              </div>
              <div>
                <h2 className="text-base font-semibold text-fg">Academic Term</h2>
                <p className="text-xs text-fg-muted">
                  Set the active school year and semester for new profile registrations
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            {termLoading ? (
              <div className="flex items-center gap-2 text-sm text-fg-muted">
                <FaSpinner className="animate-spin" />
                Loading active term...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-3 mb-1">
                      School Year
                    </label>
                    <select
                      value={termSchoolYear}
                      onChange={(e) => setTermSchoolYear(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 bg-white"
                    >
                      <option value="">Select School Year</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2027-2028">2027-2028</option>
                      <option value="2028-2029">2028-2029</option>
                      <option value="2029-2030">2029-2030</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-3 mb-1">
                      Semester
                    </label>
                    <select
                      value={termSemester}
                      onChange={(e) => setTermSemester(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 bg-white"
                    >
                      <option value="">Select Semester</option>
                      <option value="1st">1st Semester</option>
                      <option value="2nd">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                </div>

                {termMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      termMessage.type === "error"
                        ? "bg-danger-subtle text-danger border border-red-100"
                        : "bg-success-subtle text-success border border-green-100"
                    }`}
                  >
                    {termMessage.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={saveActiveTerm} disabled={termSaving}>
                    {termSaving ? (
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
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Activity Log Section */}
      <section className="mb-8">
        <div className="bg-white rounded-xl border border-line-subtle shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-line-faint">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-600">
                  <FaClipboardList />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    Activity Log
                  </h2>
                  <p className="text-xs text-fg-muted">
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
                    ? "bg-secondary-50 border-secondary-200 text-secondary-700"
                    : "bg-white border-line text-fg-4 hover:bg-subtle"
                }`}
              >
                <FaFilter className="text-xs" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-6 py-4 bg-subtle border-b border-line-subtle">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-fg-4 mb-1">
                    Action Type
                  </label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-secondary-200 bg-white"
                  >
                    <option value="">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="UPDATE_PROFILE">Profile Updated</option>
                    <option value="EVENT_REGISTER">Event Registration</option>
                    <option value="EVENT_CREATE">Event Created</option>
                    <option value="EVENT_UPDATE">Event Updated</option>
                    <option value="EVENT_STATUS_UPDATE">
                      Event Status Change
                    </option>
                    <option value="CHANGE_PASSWORD">Password Changed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-4 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-secondary-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-4 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-secondary-200"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => fetchActivities(1)}
                    className="rounded-lg px-3 py-2 text-xs"
                  >
                    Apply
                  </Button>
                  {(filterAction || filterFrom || filterTo) && (
                    <Button
                      variant="secondary"
                      onClick={resetFilters}
                      className="gap-1 rounded-lg px-3 py-2 text-xs text-fg-4"
                    >
                      <FaRedo className="text-xs" />
                      Reset
                    </Button>
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
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse"
                  >
                    <div className="w-9 h-9 rounded-full bg-emphasis" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-emphasis rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <FaClipboardList className="mx-auto text-fg-faint text-3xl mb-3" />
                <p className="text-sm text-fg-muted">
                  No activity records found.
                </p>
                <p className="text-xs text-fg-muted mt-1">
                  {filterAction || filterFrom || filterTo
                    ? "Try adjusting your filters."
                    : "Activity will appear here as you use the platform."}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {activities.map((a) => {
                  const description =
                    a.description ||
                    `${ACTION_CONFIG[a.action]?.label || a.action} action performed`;
                  return (
                    <li
                      key={a._id}
                      className="flex items-start gap-3 py-3 border-b border-line-faint last:border-b-0"
                    >
                      <ActivityIcon action={a.action} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg">
                          {description}
                        </p>
                        <p className="text-xs text-fg-muted mt-0.5">
                          {timeAgo(a.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 text-2xs font-medium text-fg-muted uppercase tracking-wider">
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
            <div className="px-6 py-4 border-t border-line-faint flex items-center justify-between">
              <p className="text-xs text-fg-muted">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-1 pointer-coarse:gap-3">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  aria-label="Previous page"
                  className="touch-target p-1.5 rounded-lg border border-line text-fg-4 hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="text-xs" aria-hidden="true" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    const cur = pagination.page;
                    return (
                      p === 1 ||
                      p === pagination.totalPages ||
                      Math.abs(p - cur) <= 1
                    );
                  })
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-fg-muted text-xs">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium ${
                          p === pagination.page
                            ? "bg-secondary-600 text-white"
                            : "border border-line text-fg-4 hover:bg-subtle"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  aria-label="Next page"
                  className="touch-target p-1.5 rounded-lg border border-line text-fg-4 hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="text-xs" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Password Change Modal */}
      <Modal
        open={passwordModalOpen}
        onClose={closePasswordModal}
        title="Change Password"
        description="Update your account password"
        footer={
          <>
            <Button variant="secondary" onClick={closePasswordModal}>
              Cancel
            </Button>
            <Button type="submit" form={passwordFormId} disabled={loading}>
              {loading ? "Saving..." : "Change Password"}
            </Button>
          </>
        }
      >
        {message && (
          <div
            role="alert"
            className={`mb-3 p-3 rounded-lg text-sm ${
              message.type === "error"
                ? "bg-danger-subtle text-danger border border-red-100"
                : "bg-success-subtle text-success border border-green-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <form id={passwordFormId} onSubmit={handleModalSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-3">
              Current Password
            </label>
            <div className="mt-1 relative">
              <input
                ref={firstInputRef}
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 top-2.5 text-xs font-medium text-secondary-600 hover:text-secondary-700"
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-3">
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-2.5 text-xs font-medium text-secondary-600 hover:text-secondary-700"
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-fg-muted mt-1">
              At least 8 characters. Include letters and numbers.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-3">
              Confirm New Password
            </label>
            <div className="mt-1 relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-2.5 text-xs font-medium text-secondary-600 hover:text-secondary-700"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Password Change"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={performChange}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-fg-4">
          Are you sure you want to change your password? This action will
          update your account credentials immediately.
        </p>
      </Modal>
    </div>
  );
}
