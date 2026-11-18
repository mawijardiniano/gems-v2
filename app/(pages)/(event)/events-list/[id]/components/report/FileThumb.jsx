"use client";

import { FiFileText } from "react-icons/fi";

/* Memorandum, activity design and attendance sheet accept PDFs too; those
   cannot be previewed with <img>. */
export const isPdfFile = (file) =>
  /\.pdf($|\?)/i.test(String(file?.key || file?.name || file?.url || ""));

export default function FileThumb({ file, className, alt }) {
  if (isPdfFile(file)) {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} flex flex-col items-center justify-center gap-1 bg-slate-50 text-gray-500 text-xs font-medium`}
      >
        <FiFileText size={22} aria-hidden="true" />
        PDF
      </a>
    );
  }
  return <img src={file.url} alt={alt} className={className} />;
}
