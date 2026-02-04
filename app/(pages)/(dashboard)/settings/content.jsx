"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function Settings() {
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

  const firstInputRef = useRef(null);

  useEffect(() => {
    if (passwordModalOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [passwordModalOpen]);

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

  return (
    <div className="p-4">
      <div className="max-w-xl mb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Account Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your account credentials and preferences
        </p>
      </div>

      <div className="max-w-xl bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          </div>

          <div className="flex items-center justify-start">
            <h1
              role="button"
              onClick={openPasswordModal}
              className="text-lg font-semibold text-indigo-600 cursor-pointer hover:underline"
            >
              Change password
            </h1>
          </div>
        </div>
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closePasswordModal}
          />
          <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">Change password</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Update your account password
                </p>
              </div>

              {message && (
                <div
                  role="alert"
                  className={`mb-3 p-3 rounded text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      ref={firstInputRef}
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((s) => !s)}
                      className="absolute right-3 top-2 text-sm text-indigo-600"
                    >
                      {showCurrent ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 top-2 text-sm text-indigo-600"
                    >
                      {showNew ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Use at least 8 characters. Include letters and numbers.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm new password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-2 text-sm text-indigo-600"
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="px-3 py-2 rounded-md bg-gray-100 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-2 rounded-md bg-indigo-600 text-white"
                  >
                    {loading ? "Saving..." : "Change password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium">Confirm password change</h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to change your password? This action will
                update your account credentials immediately.
              </p>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-3 py-2 rounded-md bg-gray-100 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={performChange}
                  className="px-3 py-2 rounded-md bg-indigo-600 text-white"
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
