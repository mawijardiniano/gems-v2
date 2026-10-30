/* Report content model, shared by the PDF generators and the in-browser
   preview.

   A report is a flat, ordered list of sections. A section is one of four plain
   data shapes:

     { type: "heading",   text }
     { type: "paragraph", text }
     { type: "bullets",   items: [string] }
     { type: "table",     title?, head: [string], body: [[...]], emptyLabel? }

   Both renderers walk exactly this list, so the preview cannot drift from the
   PDF: there is no second copy of the layout to keep in step. Everything here
   is pure data — no jsPDF, no React — so it is safe to build in tests and on
   both the server and the client.

   A table section without a `title` is titled in the PDF and untitled in the
   preview; the summary tables sit directly under a preceding heading. */

export const SECTION = {
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  BULLETS: "bullets",
  TABLE: "table",
};

export const section = {
  heading: (text) => ({ type: SECTION.HEADING, text }),
  paragraph: (text) => ({ type: SECTION.PARAGRAPH, text }),
  bullets: (items) => ({ type: SECTION.BULLETS, items: items || [] }),
  /* `head`/`body` come straight from the table builders, so a table section is
     always the same object those functions already return. */
  table: (title, table, emptyLabel) => ({
    type: SECTION.TABLE,
    title: title || "",
    head: table?.head || [],
    body: table?.body || [],
    emptyLabel: emptyLabel || "No data available.",
  }),
};

/* The rows a table section actually renders, so the preview and the PDF agree
   on when a table is "empty" (no rows) versus populated. */
export function sectionRowCount(sectionItem) {
  if (sectionItem?.type !== SECTION.TABLE) return 0;
  return Array.isArray(sectionItem.body) ? sectionItem.body.length : 0;
}

/* A report is empty when no section carries any content — used by the preview
   to show a single empty state instead of a column of headings with nothing
   under them. */
export function reportSectionCount(sections) {
  return Array.isArray(sections) ? sections.length : 0;
}
