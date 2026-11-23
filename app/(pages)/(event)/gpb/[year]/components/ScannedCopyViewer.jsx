"use client";

import { useId } from "react";
import { FiDownload, FiFileText, FiX } from "react-icons/fi";
import { getScannedFileType } from "../lib/projectForm";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";

/* Extracted from the GPB year page (gpb/[year]/content.jsx). The page owns
   the state and handlers and passes them in. */
export default function ScannedCopyViewer({
  closeScannedViewer,
  downloadScannedCopy,
  scannedPreviewError,
  scannedPreviewLoading,
  selectedGPBStatus,
  setScannedPreviewError,
  setScannedPreviewLoading,
  year,
}) {
  const dialogRef = useDialog(closeScannedViewer);
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={closeScannedViewer}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-sm shrink-0">
              <FiFileText className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm font-semibold text-gray-900 truncate">
                Scanned Copy
              </h2>
              <p className="text-xs text-gray-500 truncate">
                GPB Year {year} · Status attachment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              onClick={downloadScannedCopy}
            >
              <FiDownload className="h-3.5 w-3.5" />
              Download
            </Button>
            <button
              type="button"
              aria-label="Close"
              onClick={closeScannedViewer}
              className="touch-target h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden"
          style={{ minHeight: "55vh" }}
        >
          {scannedPreviewLoading &&
            !scannedPreviewError &&
            getScannedFileType(selectedGPBStatus.scanned_copy.url) !==
              "other" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80">
                <svg
                  className="animate-spin h-8 w-8 text-white"
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
              </div>
            )}

          {scannedPreviewError ? (
            <div className="text-center p-8">
              <p className="text-sm text-gray-300">{scannedPreviewError}</p>
              <Button
                variant="primary"
                className="mt-3"
                onClick={downloadScannedCopy}
              >
                <FiDownload className="h-3.5 w-3.5" />
                Download instead
              </Button>
            </div>
          ) : getScannedFileType(selectedGPBStatus.scanned_copy.url) ===
            "image" ? (
            <img
              key={selectedGPBStatus.scanned_copy.url}
              src={selectedGPBStatus.scanned_copy.url}
              alt="Scanned copy"
              className="max-w-full max-h-[70vh] object-contain"
              onLoad={() => setScannedPreviewLoading(false)}
              onError={() => {
                setScannedPreviewLoading(false);
                setScannedPreviewError(
                  "Failed to load preview. Try downloading the file instead.",
                );
              }}
            />
          ) : getScannedFileType(selectedGPBStatus.scanned_copy.url) ===
            "pdf" ? (
            <iframe
              key={selectedGPBStatus.scanned_copy.url}
              src={selectedGPBStatus.scanned_copy.url}
              title="Scanned copy preview"
              className="w-full"
              style={{ height: "70vh", border: "none" }}
              onLoad={() => setScannedPreviewLoading(false)}
              onError={() => {
                setScannedPreviewLoading(false);
                setScannedPreviewError(
                  "Failed to load preview. Try downloading the file instead.",
                );
              }}
            />
          ) : (
            <div className="text-center p-8">
              <FiFileText className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-300">
                Preview not available for this file type.
              </p>
              <Button
                variant="primary"
                className="mt-3"
                onClick={downloadScannedCopy}
              >
                <FiDownload className="h-3.5 w-3.5" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
