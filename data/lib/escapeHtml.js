/* Escapes text for interpolation into HTML strings. The print views build a
   page as a template string and write it into a same-origin iframe, so any
   user-entered text (a gender issue, a guest's department) must be escaped or
   it runs as markup in the printing user's session. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
