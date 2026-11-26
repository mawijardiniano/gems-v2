/* The reason a profile save was refused, for the toast. The profile route
   answers { status: "error", message } with a readable message; a refused
   session answers { error }. Falls back to `fallback` when the body has
   neither (network error page, empty body). */
export async function saveErrorMessage(res, fallback) {
  const body = await res.json().catch(() => null);
  const reason = body?.message || body?.error;
  return typeof reason === "string" && reason.trim() ? reason : fallback;
}

/* Error toasts stay up longer than success ones: they carry a reason the
   person has to read and act on. */
export const toastDuration = (type) => (type === "failure" ? 7000 : 3000);
