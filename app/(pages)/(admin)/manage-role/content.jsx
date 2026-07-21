"use client";
import React, { useState, useEffect, useMemo } from "react";
import { COLLEGES, SCOPED_ROLES } from "@/lib/colleges";
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
  "SUC President": "bg-purple-100 text-purple-800 ring-purple-600/20",
  "GAD Coordinator": "bg-blue-100 text-blue-800 ring-blue-600/20",
  "GAD Focal Person": "bg-cyan-100 text-cyan-800 ring-cyan-600/20",
  "ICTU Director": "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  "Planning Director": "bg-teal-100 text-teal-800 ring-teal-600/20",
  Dean: "bg-amber-100 text-amber-800 ring-amber-600/20",
  "Campus Director": "bg-rose-100 text-rose-800 ring-rose-600/20",
  User: "bg-gray-100 text-gray-800 ring-gray-600/20",
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
  const colorClass = ROLE_COLORS[role] || "bg-gray-100 text-gray-800 ring-gray-600/20";
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
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-10 w-full bg-gray-200 rounded-lg" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="text-center py-16">
      <HiOutlineUserGroup className="mx-auto h-16 w-16 text-gray-300" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {hasSearch ? "No matching users found" : "No roles assigned yet"}
      </h3>
      <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
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
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800";
  const Icon = type === "success" ? HiOutlineCheck : HiOutlineExclamation;

  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-lg ${bgColor} animate-slide-in`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 shrink-0">
        <HiOutlineX className="h-4 w-4" />
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

  useEffect(() => {
    setPageLoading(true);
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setUsers(data.data || []))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(modalSearch), 300);
    return () => clearTimeout(handler);
  }, [modalSearch]);

  const filteredModalUsers = useMemo(() => {
    if (!debouncedSearch) return users.slice(0, 30);
    const s = debouncedSearch.toLowerCase();
    return users
      .filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.first_name?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.last_name?.toLowerCase().includes(s)
      )
      .slice(0, 30);
  }, [debouncedSearch, users]);

  const specialRoleUsers = useMemo(
    () => users.filter((u) => ROLES.slice(1).includes(u.role)),
    [users]
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
          (u.assignedCollege || "").toLowerCase().includes(s)
      );
    }
    return filtered;
  }, [search, specialRoleUsers]);

  const totalPages = Math.ceil(filteredTableUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredTableUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
          "success"
        );
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id
              ? {
                  ...u,
                  role: selectedRole,
                  assignedCollege: SCOPED_ROLES.includes(selectedRole)
                    ? assignedCollege
                    : u.assignedCollege,
                }
              : u
          )
        );
        closeModal();
      } else {
        showToast(data.message || "Failed to assign role", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
    setLoading(false);
  };

  if (pageLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Manage Roles
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Assign and manage user roles and permissions across the system
          </p>
        </div>
        <button
          onClick={openAssignModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          <HiOutlineShieldCheck className="h-5 w-5" />
          Assign Role
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, role, or college..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  College / Unit
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Assigned Role
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                      className="hover:bg-gray-50/80 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                              {firstName.charAt(0)}
                              {lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {firstName} {lastName}
                            </p>
                            {user.username && (
                              <p className="text-xs text-gray-400">
                                @{user.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {college}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredTableUsers.length
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
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                )
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === p
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
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
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center">
                  <HiOutlineShieldCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingUser ? "Edit Role" : "Assign Role"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingUser
                      ? "Update the role for this user"
                      : "Search and select a user to assign a role"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select User
                </label>
                <div className="relative">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or username..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                  {filteredModalUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      No users found
                    </div>
                  ) : (
                    filteredModalUsers.map((u) => {
                      const fn =
                        u.personal_info_id?.personal?.first_name || "";
                      const ln =
                        u.personal_info_id?.personal?.last_name || "";
                      const isSelected = selectedUser?._id === u._id;
                      return (
                        <div
                          key={u._id}
                          onClick={() => setSelectedUser(u)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 border-l-2 border-blue-500"
                              : "hover:bg-gray-50 border-l-2 border-transparent"
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isSelected
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {fn.charAt(0)}
                            {ln.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {fn} {ln}
                            </p>
                            {u.role && (
                              <p className="text-xs text-gray-400 truncate">
                                Current: {u.role}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <HiOutlineCheck className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                          isActive
                            ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-blue-500" : "text-gray-400"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Assigned College <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignedCollege}
                    onChange={(e) => setAssignedCollege(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={
                  !selectedUser ||
                  loading ||
                  (SCOPED_ROLES.includes(selectedRole) && !assignedCollege)
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
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