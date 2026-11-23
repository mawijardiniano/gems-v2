"use client";

import FileThumb from "./FileThumb";
import {
  FiCheckCircle,
  FiDownload,
  FiEdit2,
  FiEye,
  FiPaperclip,
} from "react-icons/fi";
import { isPdfFile } from "./FileThumb";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";

/* The submitted report, read-only, with an Edit button for those allowed. */
export default function ReportView({ report, canSubmit, viewerId }) {
  const {
    previewImg,
    setPreviewImg,
    success,
    showReport,
    setSuccess,
    handleEdit,
    singleFileFields,
    handleDownload,
  } = report;
  const previewDialogRef = useDialog(() => setPreviewImg(null));

  return (
    <div className="space-y-6 animate-fade-in">
      {previewImg && (
        <div
          ref={previewDialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewImg(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview (press Escape to close)"
        >
          <img
            src={previewImg}
            alt="Preview"
            className="max-w-[90%] max-h-[90%] rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* The read-only view replaces the form on success, so the
          confirmation has to be shown here or it is never seen. */}
      {success && (
        <div
          className="rounded-xl border border-success-border bg-success-subtle p-4 text-sm text-success flex items-center gap-3"
          role="status"
        >
          <FiCheckCircle size={16} className="shrink-0" />
          {success}
        </div>
      )}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success">
              <FiCheckCircle size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Accomplishment Report
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                Submitted report for this event
              </p>
            </div>
          </div>
          {(canSubmit ||
            (viewerId &&
              String(showReport?.submitted_by?._id ?? showReport?.submitted_by) ===
                String(viewerId))) && (
          <Button
            onClick={() => {
              setSuccess("");
              handleEdit();
            }}
            variant="secondary"
            className="!py-2 !px-4 !rounded-lg !text-xs shrink-0"
          >
            <FiEdit2 size={13} />
            Edit
          </Button>
          )}
        </div>

        <div className="space-y-8">
          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Narrative
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed rounded-xl bg-slate-50 p-5 border border-slate-100">
              {showReport.narrative}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {singleFileFields.map((field) => (
              <div key={field.key}>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  {field.label}
                </h4>
                {showReport[field.key]?.url ? (
                  <div className="group relative">
                    <FileThumb
                      file={showReport[field.key]}
                      alt={field.label}
                      className="h-40 w-full object-cover rounded-xl border border-gray-200 transition duration-200 group-hover:opacity-90 group-hover:shadow-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            isPdfFile(showReport[field.key])
                              ? window.open(showReport[field.key].url, "_blank", "noopener")
                              : setPreviewImg(showReport[field.key].url)
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
                        >
                          <FiEye size={12} />
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(showReport[field.key])}
                          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
                        >
                          <FiDownload size={12} />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    No file uploaded
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Event Photos
            </h4>
            {showReport.photos?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {showReport.photos.map((p, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={p.url}
                      alt={`Event photo ${i + 1}`}
                      className="h-40 w-full object-cover rounded-xl border border-gray-200 transition duration-200 group-hover:opacity-90 group-hover:shadow-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewImg(p.url)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
                        >
                          <FiEye size={12} />
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(p)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-white"
                        >
                          <FiDownload size={12} />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-500 text-sm">
                No photos uploaded
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Other Attachments
            </h4>
            {showReport.other_attachments?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {showReport.other_attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
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
                      onClick={() => handleDownload(file)}
                      className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-xs font-medium px-2 shrink-0"
                    >
                      <FiDownload size={14} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-500 text-sm">
                No attachments uploaded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
