"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  FaBook,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaFileAlt,
  FaFileCsv,
  FaFileExcel,
  FaFileImage,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
  FaFlask,
  FaFolderOpen,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaTrashAlt,
  FaUpload,
  FaUser,
} from "react-icons/fa";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_ALLOWED_EXTS,
  MAX_FILE_SIZE,
} from "@/lib/knowledgeResources";

// ─── Constants ──────────────────────────────────────────────────────
const CATEGORY_STYLES = {
  "Training Material": "bg-blue-100 text-blue-800 ring-blue-600/20",
  Manual: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  Research: "bg-violet-100 text-violet-800 ring-violet-600/20",
  Other: "bg-gray-100 text-gray-700 ring-gray-500/20",
};

const CATEGORY_ICONS = {
  "Training Material": FaChalkboardTeacher,
  Manual: FaBook,
  Research: FaFlask,
  Other: FaFolderOpen,
};

const ACCEPT_ATTR = KNOWLEDGE_ALLOWED_EXTS.join(",");

const MAX_FILE_SIZE_LABEL = "25MB";

// ─── Helpers ────────────────────────────────────────────────────────
function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getExtension(name) {
  const idx = String(name || "").lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

function fileIconFor(name) {
  const ext = getExtension(name);
  if (ext === ".pdf") return FaFilePdf;
  if ([".doc", ".docx"].includes(ext)) return FaFileWord;
  if ([".xls", ".xlsx"].includes(ext)) return FaFileExcel;
  if ([".ppt", ".pptx"].includes(ext)) return FaFilePowerpoint;
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    return FaFileImage;
  }
  if (ext === ".csv") return FaFileCsv;
  return FaFileAlt;
}

// ─── Skeleton ───────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100 p-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-3/5 bg-gray-200 rounded" />
          <div className="h-3 w-2/5 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────
function EmptyState({ hasFilters, onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <FaFolderOpen className="h-7 w-7 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">
        {hasFilters ? "No documents found" : "No documents yet"}
      </p>
      <p className="text-xs text-gray-500 text-center max-w-xs mb-4">
        {hasFilters
          ? "Try a different category or search term."
          : "Upload training materials, manuals, research, and other references for everyone to access."}
      </p>
      {!hasFilters && (
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
        >
          <FaUpload size={14} /> Upload Document
        </button>
      )}
    </div>
  );
}

export default function KnowledgeResourcesContent() {
  const role = useSelector((state) => state.auth.role)?.toLowerCase() || "";
  const userId = useSelector((state) => state.auth.userId);
  const fileInputRef = useRef(null);

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formFile, setFormFile] = useState(null);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canDeleteAny = ["suc president", "planning director"].includes(role);

  const canDelete = useCallback(
    (resource) =>
      canDeleteAny ||
      String(resource?.uploaded_by || "") === String(userId || ""),
    [canDeleteAny, userId]
  );

  // ── Auto-dismiss messages ────────────────────────────────────────
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // ── Data loading ─────────────────────────────────────────────────
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/knowledge-resources");
      const list = res.data?.data;
      setResources(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) {
      setResources([]);
      setError(
        err.response?.data?.error || "Failed to load knowledge resources"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return resources.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (!term) return true;
      return (
        String(item.title || "").toLowerCase().includes(term) ||
        String(item.file?.name || "").toLowerCase().includes(term) ||
        String(item.uploaded_by_name || "").toLowerCase().includes(term)
      );
    });
  }, [resources, activeCategory, search]);

  const counts = useMemo(() => {
    const base = { all: resources.length };
    KNOWLEDGE_CATEGORIES.forEach((cat) => {
      base[cat] = resources.filter((item) => item.category === cat).length;
    });
    return base;
  }, [resources]);

  const hasFilters = activeCategory !== "all" || search.trim().length > 0;

  // ── Upload handlers ──────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormCategory("");
    setFormFile(null);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const openUploadModal = () => {
    resetForm();
    setUploadOpen(true);
  };

  const closeUploadModal = () => {
    if (uploading) return;
    setUploadOpen(false);
    resetForm();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormError("");
    if (!file) {
      setFormFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormFile(null);
      setFormError(`File exceeds the maximum allowed size (${MAX_FILE_SIZE_LABEL})`);
      return;
    }
    setFormFile(file);
  };

  const handleUpload = async () => {
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!formCategory) {
      setFormError("Please select a category.");
      return;
    }
    if (!formFile) {
      setFormError("Please choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", formFile);
      formData.append("title", formTitle.trim());
      formData.append("category", formCategory);

      await axios.post("/api/knowledge-resources", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Document uploaded successfully.");
      setUploadOpen(false);
      resetForm();
      fetchResources();
    } catch (err) {
      setFormError(
        err.response?.data?.error || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // ── Delete handlers ──────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/knowledge-resources/${deleteTarget._id}`);
      setSuccess(`"${deleteTarget.title}" deleted successfully.`);
      setDeleteTarget(null);
      fetchResources();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete document");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Knowledge Resources
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and share training materials, manuals, research, and other
            references
          </p>
        </div>

        <button
          onClick={openUploadModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors shadow-sm"
        >
          <FaCloudUploadAlt size={16} /> Upload Document
        </button>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <FaExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["all", ...KNOWLEDGE_CATEGORIES].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {cat === "all" ? "All" : cat}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-rose-100 text-rose-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {counts[cat] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <FaSearch
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, file, or uploader..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>
      {/* ── Documents ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
          <EmptyState hasFilters={hasFilters} onUpload={openUploadModal} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const CategoryIcon = CATEGORY_ICONS[item.category] || FaFolderOpen;
            const FileIcon = fileIconFor(item.file?.name);
            return (
              <div
                key={item._id}
                className="flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {item.title}
                    </p>
                    <span
                      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                        CATEGORY_STYLES[item.category] ||
                        "bg-gray-100 text-gray-700 ring-gray-500/20"
                      }`}
                    >
                      <CategoryIcon size={10} />
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                  <p className="flex items-center gap-2">
                    <FaFileAlt className="shrink-0 text-gray-400" size={11} />
                    <span className="truncate">
                      {item.file?.name || "Document"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <FaUser className="shrink-0 text-gray-400" size={11} />
                    <span className="truncate">
                      {item.uploaded_by_name || "Unknown"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <FaCalendarAlt
                      className="shrink-0 text-gray-400"
                      size={11}
                    />
                    {formatDate(item.createdAt)} · {formatBytes(item.file?.size)}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={item.file?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FaEye size={11} /> View
                    </a>
                    <a
                      href={item.file?.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FaDownload size={11} /> Download
                    </a>
                  </div>

                  {canDelete(item) && (
                    <button
                      onClick={() => setDeleteTarget(item)}
                      title="Delete document"
                      className="mt-1 rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload modal ────────────────────────────────────────── */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <FaCloudUploadAlt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Upload Document
                  </h2>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, PowerPoint, images, or text — up to{" "}
                    {MAX_FILE_SIZE_LABEL}
                  </p>
                </div>
              </div>
              <button
                onClick={closeUploadModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. GAD Training Module 2026"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Select a category</option>
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center hover:border-rose-300 hover:bg-rose-50/40 transition-colors"
                >
                  {formFile ? (
                    <span className="flex items-center justify-center gap-2 text-sm text-gray-700">
                      <FaFileAlt className="text-rose-500" />
                      <span className="truncate">{formFile.name}</span>
                      <span className="shrink-0 text-xs text-gray-400">
                        ({formatBytes(formFile.size)})
                      </span>
                    </span>
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-sm text-gray-500">
                      <FaCloudUploadAlt className="h-6 w-6 text-gray-300" />
                      Click to choose a file
                    </span>
                  )}
                </button>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
                  <FaExclamationTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <p className="text-xs text-red-700">{formError}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} /> Uploading...
                  </>
                ) : (
                  <>
                    <FaUpload size={13} /> Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 text-center shadow-xl animate-slide-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <FaTrashAlt className="text-2xl text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">
                Delete Document
              </h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete{" "}
                <span className="font-medium text-gray-700">
                  &quot;{deleteTarget.title}&quot;
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

