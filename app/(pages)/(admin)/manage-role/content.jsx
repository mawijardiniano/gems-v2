"use client";
import React, { useState, useEffect, useMemo, useCallback, useId } from "react";
import { COLLEGES, SCOPED_ROLES } from "@/data/lib/colleges";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";
import {
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlinePencilAlt,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineAcademicCap,
  HiOutlineOfficeBuilding,
  HiOutlineUserCircle,
  HiOutlineBadgeCheck,
  HiOutlineStar,
  HiOutlineBriefcase,
  HiOutlineGlobe,
  HiOutlineLightBulb,
  HiOutlineCog,
  HiOutlineClipboardCheck,
  HiOutlineUsers,
} from "react-icons/hi";

const ROLES = [
  "User",
  "GAD Focal Person",
  "SUC President",
  "GAD Coordinator",
  "ICTU Director",
  "Planning Director",
  "Dean",
  "Campus Director",
];

const ROLE_COLORS = {
  "SUC President": "bg-secondary-100 text-secondary-800 ring-secondary-600/20",
  "GAD Coordinator":
    "bg-secondary-100 text-secondary-800 ring-secondary-600/20",
  "GAD Focal Person": "bg-cyan-100 text-cyan-800 ring-cyan-600/20",
  "ICTU Director": "bg-secondary-100 text-secondary-800 ring-secondary-600/20",
  "Planning Director": "bg-teal-100 text-teal-800 ring-teal-600/20",
  Dean: "bg-secondary-100 text-secondary-800 ring-secondary-600/20",
  "Campus Director": "bg-rose-100 text-rose-800 ring-rose-600/20",
  User: "bg-muted text-fg-2 ring-gray-600/20",
};

const ROLE_ICONS = {
  "SUC President": HiOutlineStar,
  "GAD Coordinator": HiOutlineClipboardCheck,
  "GAD Focal Person": HiOutlineUserCircle,
  "ICTU Director": HiOutlineCog,
  "Planning Director": HiOutlineBriefcase,
  Dean: HiOutlineAcademicCap,
  "Campus Director": HiOutlineOfficeBuilding,
  User: HiOutlineUsers,
};

function RoleBadge({ role }) {
  const Icon = ROLE_ICONS[role] || HiOutlineBadgeCheck;
  const colorClass =
    ROLE_COLORS[role] || "bg-muted text-fg-2 ring-gray-600/20";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${colorClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {role}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-emphasis rounded-lg" />
        <div className="h-10 w-36 bg-emphasis rounded-lg" />
      </div>
      <div className="h-10 w-full bg-emphasis rounded-lg" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="text-center py-16">
      <HiOutlineUserGroup className="mx-auto h-16 w-16 text-fg-faint" />
      <h3 className="mt-4 text-lg font-semibold text-fg">
        {hasSearch ? "No matching users found" : "No roles assigned yet"}
      </h3>
      <p className="mt-2 text-sm text-fg-muted max-w-sm mx-auto">
        {hasSearch
          ? "Try adjusting your search terms or clear the filter to see all users."
          : "Assign roles to users to manage their permissions and access levels."}
      </p>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-success-subtle border-success-border text-success"
      : "bg-danger-subtle border-danger-border text-danger";
  const Icon = type === "success" ? HiOutlineCheck : HiOutlineExclamation;

  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-lg ${bgColor} animate-slide-in`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="touch-target ml-2 shrink-0"
      >
        <HiOutlineX className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ManageRoleContent() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [assignedCollege, setAssignedCollege] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const ITEMS_PER_PAGE = 10;

  /* Role holders come from the server, filtered by role. The table used to
     load 100 arbitrary accounts and filter them here, so most Deans, Focal
     Persons and Directors never showed up. Refetched after every save so a
     newly assigned role appears. */
  const loadRoleHolders = useCallback(async () => {
    const roles = encodeURIComponent(ROLES.slice(1).join(","));
    try {
      const res = await fetch(`/api/profile/search?roles=${roles}&limit=500`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to load role holders");
      setUsers(data.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load role holders", "error");
    }
  }, []);

  useEffect(() => {
    setPageLoading(true);
    loadRoleHolders().finally(() => setPageLoading(false));
  }, [loadRoleHolders]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(modalSearch), 300);
    return () => clearTimeout(handler);
  }, [modalSearch]);

  const [modalUsers, setModalUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const q = debouncedSearch.trim();
    fetch(`/api/profile/search?q=${encodeURIComponent(q)}&limit=30`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setModalUsers(data.data || []);
      })
      .catch(() => {
        if (!cancelled) setModalUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const filteredModalUsers = useMemo(() => {
    return modalUsers;
  }, [modalUsers]);

  const specialRoleUsers = useMemo(
    () => users.filter((u) => ROLES.slice(1).includes(u.role)),
    [users],
  );

  const filteredTableUsers = useMemo(() => {
    let filtered = specialRoleUsers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.personal_info_id?.personal?.first_name || "")
            .toLowerCase()
            .includes(s) ||
          (u.personal_info_id?.personal?.last_name || "")
            .toLowerCase()
            .includes(s) ||
          (u.role || "").toLowerCase().includes(s) ||
          (u.assignedCollege || "").toLowerCase().includes(s),
      );
    }
    return filtered;
  }, [search, specialRoleUsers]);

  const totalPages = Math.ceil(filteredTableUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredTableUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const showToast = (message, type) => {
    setToast({ message, type });
  };

  const openAssignModal = () => {
    setShowModal(true);
    setModalSearch("");
    setSelectedUser(null);
    setSelectedRole(ROLES[0]);
    setAssignedCollege("");
    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setShowModal(true);
    setModalSearch("");
    setSelectedUser(user);
    setSelectedRole(user.role);
    setAssignedCollege(user.assignedCollege || "");
    setEditingUser(user);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          assignedCollege: SCOPED_ROLES.includes(selectedRole)
            ? assignedCollege
            : undefined,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          editingUser
            ? "Role updated successfully!"
            : "Role assigned successfully!",
          "success",
        );
        closeModal();
        await loadRoleHolders();
      } else {
        showToast(data.message || "Failed to assign role", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
    setLoading(false);
  };

  const modalTitleId = useId();
  const modalDialogRef = useDialog(closeModal);

  if (pageLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">
            Manage Roles
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Assign and manage user roles and permissions across the system
          </p>
        </div>
        <Button onClick={openAssignModal}>
          <HiOutlineShieldCheck className="h-5 w-5" />
          Assign Role
        </Button>
      </div>

      <div className="relative mb-6">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-fg-muted" />
        <input
          type="text"
          placeholder="Search by name, role, or college..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-line rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition duration-200"
        />
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead>
              <tr className="bg-subtle">
                <th className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  College / Unit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Assigned Role
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4">
                    <EmptyState hasSearch={!!search} />
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const firstName =
                    user.personal_info_id?.personal?.first_name ||
                    user.personal_info_id?.first_name ||
                    "";
                  const lastName =
                    user.personal_info_id?.personal?.last_name ||
                    user.personal_info_id?.last_name ||
                    "";
                  const college =
                    user.assignedCollege ||
                    user.personal_info_id?.affiliation?.office ||
                    "—";
                  return (
                    <tr
                      key={user._id}
                      className="hover:bg-subtle/80 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-secondary-50 to-secondary-100/60 border border-secondary-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-secondary-600">
                              {firstName.charAt(0)}
                              {lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fg">
                              {firstName} {lastName}
                            </p>
                            {user.username && (
                              <p className="text-xs text-fg-muted">
                                @{user.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-fg-4">{college}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-secondary-600 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors duration-150"
                        >
                          <HiOutlinePencilAlt className="h-4 w-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-subtle border-t border-line">
            <p className="text-sm text-fg-muted">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredTableUsers.length,
                )}
              </span>{" "}
              of{" "}
              <span className="font-medium">{filteredTableUsers.length}</span>{" "}
              results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-fg-3 bg-white border border-line-strong rounded-lg hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1,
                )
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-fg-muted">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === p
                          ? "bg-secondary-600 text-white shadow-sm"
                          : "text-fg-3 bg-white border border-line-strong hover:bg-subtle"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-fg-3 bg-white border border-line-strong rounded-lg hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div
            ref={modalDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-line-subtle">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary-50 to-secondary-100/60 border border-secondary-100 flex items-center justify-center">
                  <HiOutlineShieldCheck className="h-5 w-5 text-secondary-600" />
                </div>
                <div>
                  <h3 id={modalTitleId} className="text-lg font-semibold text-fg">
                    {editingUser ? "Edit Role" : "Assign Role"}
                  </h3>
                  <p className="text-sm text-fg-muted">
                    {editingUser
                      ? "Update the role for this user"
                      : "Search and select a user to assign a role"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="touch-target p-2 text-fg-muted hover:text-fg-4 hover:bg-muted rounded-lg transition-colors"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-fg-3 mb-1.5">
                  Select User
                </label>
                <div className="relative">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
                  <input
                    type="text"
                    placeholder="Search by name or username..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-line rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto border border-line-subtle rounded-lg divide-y divide-line-faint">
                  {filteredModalUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-fg-muted">
                      No users found
                    </div>
                  ) : (
                    filteredModalUsers.map((u) => {
                      const fn = u.personal_info_id?.personal?.first_name || "";
                      const ln = u.personal_info_id?.personal?.last_name || "";
                      const isSelected = selectedUser?._id === u._id;
                      return (
                        <div
                          key={u._id}
                          onClick={() => setSelectedUser(u)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-secondary-50 border-l-2 border-secondary-500"
                              : "hover:bg-subtle border-l-2 border-transparent"
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isSelected
                                ? "bg-secondary-100 text-secondary-600"
                                : "bg-muted text-fg-muted"
                            }`}
                          >
                            {fn.charAt(0)}
                            {ln.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-fg truncate">
                              {fn} {ln}
                            </p>
                            {u.role && (
                              <p className="text-xs text-fg-muted truncate">
                                Current: {u.role}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <HiOutlineCheck className="h-4 w-4 text-secondary-600 shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-3 mb-1.5">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => {
                    const Icon = ROLE_ICONS[role] || HiOutlineBadgeCheck;
                    const isActive = selectedRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition duration-150 ${
                          isActive
                            ? "bg-secondary-50 border-secondary-200 text-secondary-700 ring-1 ring-secondary-200"
                            : "bg-white border-line text-fg-4 hover:border-line-strong hover:bg-subtle"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-secondary-500" : "text-fg-muted"
                          }`}
                        />
                        <span className="truncate">{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {SCOPED_ROLES.includes(selectedRole) && (
                <div>
                  <label className="block text-sm font-medium text-fg-3 mb-1.5">
                    Assigned College <span className="text-danger">*</span>
                  </label>
                  <select
                    value={assignedCollege}
                    onChange={(e) => setAssignedCollege(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition"
                  >
                    <option value="">Select a college...</option>
                    {COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-subtle border-t border-line-subtle">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={
                  !selectedUser ||
                  loading ||
                  (SCOPED_ROLES.includes(selectedRole) && !assignedCollege)
                }
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : editingUser ? (
                  "Update Role"
                ) : (
                  "Assign Role"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
