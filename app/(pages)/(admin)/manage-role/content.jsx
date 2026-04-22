"use client";
import React, { useState, useEffect } from "react";

const ROLES = [
  "User",
  "GAD Focal Person",
  "SUC President",
  "GAD Coordinator",
  "ICTU Director",
  "Planning Director"
];

export default function ManageRoleContent() {
  const openEditModal = (user) => {
    setShowModal(true);
    setSearch("");
    setSelectedUser(user);
    setSelectedRole(user.role);
    setSuccess("");
    setError("");
  };
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/profile`)
      .then((res) => res.json())
      .then((data) => setUsers(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let filtered = users;
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      filtered = users.filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.first_name?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.last_name?.toLowerCase().includes(s),
      );
    }
    setFilteredUsers(filtered.slice(0, 30));
  }, [debouncedSearch, users]);

  const openModal = () => {
    setShowModal(true);
    setSearch("");
    setSelectedUser(null);
    setSelectedRole(ROLES[0]);
    setSuccess("");
    setError("");
  };

  const closeModal = () => setShowModal(false);

  const handleAssign = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/auth/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Role assigned successfully!");
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id ? { ...u, role: selectedRole } : u,
          ),
        );
        setShowModal(false);
      } else {
        setError(data.message || "Failed to assign role");
      }
    } catch (e) {
      setError("Network error");
    }
    setLoading(false);
  };

  const specialRoleUsers = users.filter((u) => ROLES.slice(1).includes(u.role));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-lg text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex justify-between">
        <h2 className="text-3xl font-bold mb-4">Manage Roles</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
          onClick={openModal}
        >
          Create
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 text-5xl"
              onClick={closeModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-2">Assign Role</h3>
            <input
              type="text"
              placeholder="Search user by name or username"
              className="border px-2 py-1 w-full mb-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-32 overflow-y-auto border mb-2">
              {filteredUsers.length === 0 && (
                <div className="p-2 text-gray-400">No users found</div>
              )}
              {filteredUsers.map((u) => (
                <div
                  key={u._id}
                  className={`p-2 cursor-pointer hover:bg-blue-100 ${selectedUser?._id === u._id ? "bg-blue-200" : ""}`}
                  onClick={() => setSelectedUser(u)}
                >
                  {u.personal_info_id?.personal.first_name}{" "}
                  {u.personal_info_id?.personal.last_name}
                  {u.role && (
                    <span className="ml-2 text-xs text-gray-500">
                      [{u.role}]
                    </span>
                  )}
                </div>
              ))}
            </div>
            <label className="block mb-1">Select Role:</label>
            <select
              className="border px-2 py-1 w-full mb-2"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
              onClick={handleAssign}
              disabled={!selectedUser || loading}
            >
              {loading ? "Assigning..." : "Assign Role"}
            </button>
            {success && <div className="text-green-600 mt-2">{success}</div>}
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold mt-8 mb-2">Assigned Roles</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">College/Unit</th>
              <th className="border px-4 py-2">Assigned Role</th>
              <th className="border px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {specialRoleUsers.length === 0 && (
              <tr>
                <td className="border px-4 py-2 text-gray-400" colSpan={4}>
                  Assigned Roles
                </td>
              </tr>
            )}
            {specialRoleUsers.map((user) => {
              const firstName =
                user.personal_info_id?.personal?.first_name ||
                user.personal_info_id?.first_name ||
                "";
              const lastName =
                user.personal_info_id?.personal?.last_name ||
                user.personal_info_id?.last_name ||
                "";
              const college = user.personal_info_id?.affiliation?.office;
              return (
                <tr key={user._id}>
                  <td className="border px-4 py-2">
                    {firstName} {lastName}
                  </td>
                  <td className="border px-4 py-2">{college}</td>
                  <td className="border px-4 py-2 font-semibold">
                    {user.role}
                  </td>
                  <td className="px-4 py-2 flex justify-center">
                    <button
                      className="bg-green-500 text-white px-2 py-1 rounded text-md"
                      onClick={() => openEditModal(user)}
                    >
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
  );
}
