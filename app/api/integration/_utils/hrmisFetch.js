/* Reads rows from the configured HRMIS endpoint. Shared by the fetch route
   (which stages the rows) and the connection test (which only reports what
   came back), so both apply the same timeout, size, redirect and shape
   rules. */
import {
  MAX_BATCH_ROWS,
  MAX_SOURCE_BYTES,
} from "@/app/api/integration/_utils/staging";

export const FETCH_TIMEOUT_MS = 30000;

/* An endpoint URL may carry a token in its query string. Only the host is ever
   written to the log — enough to name the external system, not enough to leak
   the credential used to reach it. */
export function safeHost(endpoint) {
  try {
    return new URL(endpoint).host || null;
  } catch {
    return null;
  }
}

const MB = MAX_SOURCE_BYTES / 1024 / 1024;

function fail(code, status, message, logMessage = message) {
  return { error: { code, status, message, logMessage } };
}

/**
 * Returns `{ rows }`, or `{ error: { code, status, message, logMessage } }`
 * where `message` is for the response and `logMessage` for the audit log.
 */
export async function fetchHrmisRows(
  endpoint,
  headers = {},
  { timeoutMs = FETCH_TIMEOUT_MS } = {},
) {
  const timedOut = `Fetch timed out after ${timeoutMs / 1000}s`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetch(endpoint, {
        headers,
        signal: controller.signal,
        /* A redirect could send the request (and its auth headers) to a
           host the config check never saw. */
        redirect: "error",
      });
    } catch (err) {
      if (err?.name === "AbortError") return fail("FETCH_TIMEOUT", 504, timedOut);
      return fail(
        "FETCH_UNREACHABLE",
        502,
        `Failed to reach endpoint: ${err.message}`,
        err.message,
      );
    }

    if (!response.ok) {
      return fail(
        "FETCH_REJECTED",
        400,
        `Failed to fetch endpoint: ${response.status}`,
        `Endpoint responded ${response.status}`,
      );
    }

    /* Read the body under the same timeout, and refuse anything that is
       too large, not JSON, or not a list of rows — staging an empty batch
       would hide a broken feed. */
    let text;
    try {
      const declared = Number(response.headers.get("content-length") || 0);
      if (declared > MAX_SOURCE_BYTES) {
        return fail("FETCH_TOO_LARGE", 413, `Response is too large (max ${MB} MB).`);
      }
      text = await response.text();
    } catch (err) {
      return err?.name === "AbortError"
        ? fail("FETCH_TIMEOUT", 504, timedOut)
        : fail("FETCH_UNREADABLE", 502, `Failed to read response: ${err.message}`);
    }

    if (text.length > MAX_SOURCE_BYTES) {
      return fail("FETCH_TOO_LARGE", 413, `Response is too large (max ${MB} MB).`);
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return fail("FETCH_NOT_JSON", 502, "Endpoint did not return valid JSON.");
    }

    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : null;
    if (!rows) {
      return fail(
        "FETCH_BAD_SHAPE",
        502,
        "Endpoint response is not a list of rows (expected an array or { data: [] }).",
      );
    }
    if (rows.length > MAX_BATCH_ROWS) {
      return fail(
        "FETCH_TOO_MANY_ROWS",
        413,
        `Endpoint returned ${rows.length} rows; the limit per batch is ${MAX_BATCH_ROWS}.`,
      );
    }
    return { rows };
  } finally {
    clearTimeout(timer);
  }
}
