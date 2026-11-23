"use client";

import { useRef, useState } from "react";

/* Reviewer comments on a project: the "add comment" modal and deleting a
   comment from a row. The author is taken from the session by the API. */
export function useProjectComments({ onChanged, confirm }) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState("approval");
  const [commentField, setCommentField] = useState([]);
  const [commentProjectId, setCommentProjectId] = useState(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const deletingCommentRef = useRef(false);

  /* Starts empty: a draft cancelled on one project used to be pre-filled,
     and could be submitted, on the next. */
  const openComment = (projectId) => {
    setComment("");
    setCommentType("approval");
    setCommentField(["general"]);
    setCommentProjectId(projectId);
    setCommentError("");
    setShowCommentForm(true);
  };

  const closeComment = () => {
    if (commentSaving) return;
    setShowCommentForm(false);
    setCommentField([]);
  };

  const handleSubmitComment = async () => {
    if (commentSaving || !comment.trim() || !commentProjectId) return;
    const fields =
      Array.isArray(commentField) && commentField.length > 0
        ? commentField
        : typeof commentField === "string" && commentField.trim()
          ? [commentField]
          : ["general"];

    setCommentSaving(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/project/${commentProjectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, message: comment, type: commentType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCommentError(data.message || data.error || "Failed to save comment");
        return;
      }
      setComment("");
      setShowCommentForm(false);
      setCommentField([]);
      setCommentProjectId(null);
      onChanged?.();
    } catch {
      setCommentError("Failed to save comment. Check your connection.");
    } finally {
      setCommentSaving(false);
    }
  };

  /* One delete at a time, and only after the reviewer confirms. */
  const handleDeleteComment = async (projectId, commentId) => {
    if (deletingCommentRef.current) return;
    if (
      !(await confirm({
        title: "Delete this comment?",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }
    deletingCommentRef.current = true;
    setCommentError("");
    try {
      const res = await fetch(
        `/api/project/${projectId}/comments?commentId=${encodeURIComponent(commentId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCommentError(data.message || data.error || "Unable to delete the comment.");
        return;
      }
      onChanged?.();
    } catch {
      setCommentError("Unable to delete the comment. Check your connection.");
    } finally {
      deletingCommentRef.current = false;
    }
  };

  return {
    showCommentForm,
    setShowCommentForm,
    openComment,
    closeComment,
    comment,
    setComment,
    commentType,
    setCommentType,
    commentField,
    setCommentField,
    setCommentProjectId,
    commentSaving,
    commentError,
    handleSubmitComment,
    handleDeleteComment,
  };
}

/* The delete-project confirmation. Guarded against double clicks, and a
   refusal (e.g. the GPB was approved meanwhile) is shown in the modal. */
export function useDeleteProject({ onDeleted }) {
  const [deleteModal, setDeleteModal] = useState({ open: false, project: null });
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openDelete = (project) => {
    setDeleteError("");
    setDeleteModal({ open: true, project });
  };

  const closeDelete = () => {
    if (deletingProject) return;
    setDeleteError("");
    setDeleteModal({ open: false, project: null });
  };

  const handleDelete = async (projectId) => {
    if (deletingProject) return;
    setDeletingProject(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/project/${projectId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || data.message || "Unable to delete the project.");
        return;
      }
      setDeleteModal({ open: false, project: null });
      onDeleted?.();
    } catch {
      setDeleteError("Unable to delete the project. Check your connection.");
    } finally {
      setDeletingProject(false);
    }
  };

  return {
    deleteModal,
    setDeleteModal,
    deletingProject,
    deleteError,
    setDeleteError,
    openDelete,
    closeDelete,
    handleDelete,
  };
}
