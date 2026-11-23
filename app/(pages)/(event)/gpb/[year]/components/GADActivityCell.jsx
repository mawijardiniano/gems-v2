"use client";

/* Read-only GAD activity cell: the title with its description underneath, so
   the table, the print view and the reports all keep the single "GAD Activity"
   column the official GPB form uses. */
export default function GADActivityCell({ title, description }) {
  if (!title && !description) return null;
  return (
    <div>
      <div className="text-xs text-fg">{title}</div>
      {description ? (
        <div className="mt-1 text-xs text-fg">{description}</div>
      ) : null}
    </div>
  );
}
