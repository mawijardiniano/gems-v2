"use client";

import axios from "axios";
import { useState } from "react";

/* Cancel, reinstate and delete. Status changes go through the lifecycle
   endpoint, which enforces the transition matrix and requires a reason to
   cancel; afterwards `reload()` refreshes the event so the badge, the
   Overview banner and Insights all update from one source. */
export function useEventLifecycle({ eventId, reload, onDeleted }) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reinstating, setReinstating] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleCancelEvent = async () => {
    if (!eventId || !cancelReason.trim()) return;

    setCancelling(true);
    setCancelError("");

    try {
      await axios.patch(`/api/events/${eventId}/status`, {
        status: "cancelled",
        cancelReason: cancelReason.trim(),
      });

      setShowCancelModal(false);
      setCancelReason("");
      reload();
    } catch (err) {
      /* Surfaces "A reason is required…" and "An event that is … cannot be
         marked …" from the API rather than a generic failure. */
      setCancelError(
        err?.response?.data?.message || "Failed to cancel the event.",
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleReinstateEvent = async () => {
    if (!eventId) return;

    setReinstating(true);
    setCancelError("");

    try {
      await axios.patch(`/api/events/${eventId}/status`, {
        status: "active",
        cancelReason: "",
      });
      reload();
    } catch (err) {
      setCancelError(
        err?.response?.data?.message || "Failed to reinstate the event.",
      );
    } finally {
      setReinstating(false);
    }
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    setDeleteError("");

    try {
      /* The server's delete cascade removes the poster file too; deleting it
         from here first lost the poster whenever the DELETE then failed. */
      await axios.delete(`/api/events/${eventId}`);
      setShowDeleteModal(false);
      onDeleted?.();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  return {
    showCancelModal,
    setShowCancelModal,
    cancelReason,
    setCancelReason,
    cancelling,
    reinstating,
    cancelError,
    handleCancelEvent,
    handleReinstateEvent,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    deleteError,
    handleDeleteEvent,
  };
}
