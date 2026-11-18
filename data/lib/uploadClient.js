/* Browser-side calls to /api/upload, shared by every form that attaches
   files (expenditure evidence, milestone proofs, GPB scanned copies). The
   server checks that the caller may delete a key; these helpers only make
   sure partial or abandoned uploads are cleaned up. */

export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/* Reads a JSON body without throwing on an empty or HTML error page. */
export async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/* An error message when any file has the wrong type or is too large, else
   null. `label` names the files in the message ("Proof files ..."). */
export function validateFiles(
  files,
  { types = DOCUMENT_TYPES, maxBytes = MAX_UPLOAD_BYTES, label = "Files" } = {},
) {
  const bad = (files || []).some(
    (f) => (types && !types.includes(f.type)) || f.size > maxBytes,
  );
  if (!bad) return null;
  const mb = Math.round(maxBytes / (1024 * 1024));
  return `${label} must be PDF, JPG, or PNG and under ${mb}MB each.`;
}

/* Best-effort delete; never throws. */
export async function deleteUploadedFile(key) {
  if (!key) return;
  try {
    await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  } catch (err) {
    console.warn("Failed to delete uploaded file:", key, err);
  }
}

export const deleteUploadedFiles = (files) =>
  Promise.all(
    (files || []).map((f) => deleteUploadedFile(typeof f === "string" ? f : f?.key)),
  );

/* Uploads one file to `folder` and returns { url, key, name }. */
export async function uploadFile(file, folder) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(data.error || data.message || "Upload failed");
  }
  return { url: data.url, key: data.key, name: file.name };
}

/* Uploads files one by one. If one fails, the ones already uploaded are
   deleted (they are on no record) and the error is rethrown. */
export async function uploadFiles(files, folder) {
  const uploaded = [];
  try {
    for (const file of files) {
      uploaded.push(await uploadFile(file, folder));
    }
    return uploaded;
  } catch (err) {
    await deleteUploadedFiles(uploaded);
    throw err;
  }
}
