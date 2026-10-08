"use client";

import { useRef, useState } from "react";
import { FaDownload, FaFileAlt, FaTimes, FaUpload } from "react-icons/fa";
import { parseCsvTable, parseGanttTable, GANTT_TEMPLATE_CSV } from "@/lib/ganttParse";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Drag-and-drop CSV uploader that previews parsed activities. */
export default function GanttUploadTab({ onApply }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setRows([]);
    setError("");
  };

  const handleFile = async (selected) => {
    if (!selected) return;
    reset();

    if (!/\.csv$/i.test(selected.name)) {
      setError(
        "Only CSV files are supported for now. Download the template, fill it in, and save it as .csv.",
      );
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File is too large (max 5MB).");
      return;
    }

    const text = await selected.text();
    const result = parseGanttTable(parseCsvTable(text));
    setFile(selected);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRows(result.rows);
  };

  const downloadTemplate = () => {
    const blob = new Blob([GANTT_TEMPLATE_CSV], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Project_GanttChart_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? "border-rose-400 bg-rose-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        <FaUpload className="text-gray-400" size={22} />
        <p className="text-sm text-gray-600">Drag and drop your file here</p>
        <p className="text-xs text-gray-400">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="text-[11px] text-gray-400">Supported: CSV (.csv)</p>
      </div>

      <button
        type="button"
        onClick={downloadTemplate}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 hover:underline"
      >
        <FaDownload size={11} />
        Download Template
      </button>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {file && rows.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FaFileAlt className="text-emerald-600" />
              <span className="font-medium">{file.name}</span>
              <span className="text-xs text-gray-400">
                {formatSize(file.size)} · {rows.length} activities
              </span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-gray-400 hover:text-red-500"
              aria-label="Remove file"
            >
              <FaTimes size={12} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onApply(rows);
              reset();
            }}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
          >
            Use these activities
          </button>
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        The system reads the activities and timelines from the file. You can
        review and edit them in the Encode tab, then generate milestones.
      </p>
    </div>
  );
}
