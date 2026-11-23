"use client";

import FileThumb from "./FileThumb";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiFileText,
  FiLoader,
  FiPaperclip,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { FaMagic } from "react-icons/fa";
import { EMPTY_FILES } from "../../hooks/useAccomplishmentReport";

/* The report form: narrative (with AI draft), required files, photos and attachments. */
export default function ReportForm({ report }) {
  const {
    handleSubmit,
    error,
    success,
    generateNarrative,
    generating,
    form,
    setForm,
    singleFileFields,
    handleSingleFileUpload,
    fileLifecycle,
    files,
    filesRef,
    updateFiles,
    handlePhotosUpload,
    removePhoto,
    handleOtherAttachmentsUpload,
    removeOtherAttachment,
    isEditing,
    setIsEditing,
    setFiles,
    setError,
    submitting,
    isUploading,
  } = report;

  return (
    <div className="space-y-6 animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
            <FiFileText size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Post-Activity Report
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              Submit the official report for this event
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
            <FiAlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-3">
            <FiCheckCircle size={16} className="shrink-0" />
            {success}
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label !mb-0">
              Narrative Report <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={generateNarrative}
              disabled={generating}
              className="btn-secondary !py-1.5 !px-3 !text-xs !rounded-lg"
            >
              <FaMagic className="text-secondary-500" size={12} />
              {generating ? "Generating..." : "Generate Narrative"}
            </button>
          </div>
          <textarea
            name="narrative"
            value={form.narrative}
            onChange={(e) => setForm({ ...form, narrative: e.target.value })}
            className="input min-h-[120px] resize-y"
            placeholder="Describe what happened during the event..."
          />
        </div>

        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
            Required Documents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {singleFileFields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-gray-100 bg-slate-50/50 p-4"
              >
                <label className="label">
                  {field.label} <span className="text-red-500">*</span>
                </label>
                <div className="file-input">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      handleSingleFileUpload(
                        file,
                        field.key,
                        field.folder,
                        field.label,
                      );
                    }}
                  />
                </div>
                {fileLifecycle.isUploadingTarget(field.key) && (
                  <p className="text-xs text-secondary-500 mt-2 flex items-center gap-1">
                    <FiLoader className="animate-spin" /> Uploading...
                  </p>
                )}
                {files[field.key]?.url && (
                  <div className="relative mt-3 inline-block">
                    <FileThumb
                      file={files[field.key]}
                      alt={field.label}
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                      aria-label={`Remove ${field.label}`}
                      onClick={() => {
                        const old = filesRef.current[field.key];
                        updateFiles((prev) => ({ ...prev, [field.key]: null }));
                        fileLifecycle.release(old);
                      }}
                    >
                      <FiX size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">
            Event Photos <span className="text-red-500">*</span>
          </label>
          <div className="file-input">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                e.target.value = "";
                handlePhotosUpload(list);
              }}
            />
          </div>
          {fileLifecycle.isUploadingTarget("photos") && (
            <p className="text-xs text-secondary-500 mt-2 flex items-center gap-1">
              <FiLoader className="animate-spin" /> Uploading photos...
            </p>
          )}
          {files.photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {files.photos.map((p, i) => (
                <div key={i} className="relative group">
                  <img
                    src={p.url}
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                    alt={`photo-${i}`}
                  />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => removePhoto(i)}
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="label">
            Other Attachments{" "}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <div className="file-input">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                e.target.value = "";
                handleOtherAttachmentsUpload(list);
              }}
            />
          </div>
          {fileLifecycle.isUploadingTarget("other_attachments") && (
            <p className="text-xs text-secondary-500 mt-2 flex items-center gap-1">
              <FiLoader className="animate-spin" /> Uploading attachments...
            </p>
          )}
          {files.other_attachments.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              {files.other_attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <FiPaperclip size={14} />
                  </span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary-600 hover:underline flex-1 truncate"
                  >
                    {file.name || `Attachment ${i + 1}`}
                  </a>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 shrink-0"
                    onClick={() => removeOtherAttachment(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-5 border-t border-gray-100">
          {isEditing && (
            <button
              type="button"
              onClick={async () => {
                await fileLifecycle.rollback();
                fileLifecycle.resetSession();
                setIsEditing(false);
                setForm({ narrative: "" });
                setFiles(EMPTY_FILES);
                setError("");
              }}
              className="btn-secondary !rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || isUploading}
            className="btn-primary !rounded-lg"
          >
            {submitting ? (
              <>
                <FiLoader className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <FiUpload size={14} />
                {isEditing ? "Update Report" : "Submit Report"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
