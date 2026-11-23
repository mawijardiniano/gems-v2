"use client";

import { FaSignOutAlt } from "react-icons/fa";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

/* "Confirm Logout" dialog shared by every role's sidebar.

   <LogoutConfirmModal open={showLogoutModal}
                       onCancel={() => setShowLogoutModal(false)}
                       onConfirm={handleLogout} />

   Cancel, the X, Escape and a backdrop click all call `onCancel`.
   `busy` (optional) blocks closing and shows a spinner on Logout while the
   request runs; the sidebars do not use it today. */
export default function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Confirm Logout"
      size="sm"
      busy={busy}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            loading={busy}
          >
            Logout
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
          <FaSignOutAlt className="text-2xl text-red-500" aria-hidden="true" />
        </div>
        <p className="text-sm text-gray-500">
          Are you sure you want to log out? You will need to sign in again
          to access your account.
        </p>
      </div>
    </Modal>
  );
}
