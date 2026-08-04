// Offline attendance queue using IndexedDB
// Queues attendance POSTs when offline, replays them when connectivity returns
// via Background Sync (handled in public/sw.js)

const DB_NAME = "gems-pwa";
const STORE_NAME = "attendance";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Queue an attendance record for offline sync
export async function queueAttendance({ event_id, user_id, captured_at }) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add({ event_id, user_id, captured_at });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to queue attendance:", err);
    throw err;
  }
}

// Get all queued attendance records
export async function getQueuedAttendance() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to read attendance queue:", err);
    return [];
  }
}

// Remove a queued attendance record after successful sync
export async function removeQueuedAttendance(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to remove queued attendance:", err);
  }
}

// Register a background sync for the attendance queue
// Falls back gracefully if the API is unavailable (e.g. iOS Safari)
export async function registerAttendanceSync() {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    if (!("sync" in registration)) return false;
    await registration.sync.register("attendance-sync");
    return true;
  } catch (err) {
    console.warn("Background sync not available:", err);
    return false;
  }
}

// Check if the browser is currently online
export function isOnline() {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// Manually replay the queued attendance records against the server.
// Used as a fallback when Background Sync is unavailable (e.g. iOS Safari),
// and also triggered when the browser fires the "online" event.
// Returns the list of items that were successfully synced.
export async function syncQueuedAttendance() {
  const queued = await getQueuedAttendance();
  if (queued.length === 0) return [];

  const synced = [];
  const failed = [];

  for (const item of queued) {
    try {
      const response = await fetch("/api/events/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: item.event_id,
          user_id: item.user_id,
          captured_at: item.captured_at,
        }),
      });

      if (response.ok || response.status === 400) {
        // 400 means the server rejected it (e.g. already attended, event not started)
        // drop from queue since retrying won't help
        await removeQueuedAttendance(item.id);
        let alreadyAttended = false;
        let errorCode = null;
        try {
          const body = await response.json();
          alreadyAttended = !!body.already_attended;
          errorCode = body.code || null;
        } catch (e) {
          // Non-JSON response — assume it was recorded successfully
        }
        synced.push({ ...item, already_attended: alreadyAttended, error_code: errorCode });
      } else {
        // 5xx or other - keep in queue and retry later
        failed.push(item);
      }
    } catch (err) {
      // Network error - keep in queue, retry later
      failed.push(item);
    }
  }

  return synced;
}