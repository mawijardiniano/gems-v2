"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildDefaultOfficeRows,
  filterOfficesByTab,
  findOffice,
  normalizeOfficeName,
  officeCountsWithAssigned,
  officeDeactivateForcePrompt,
  officeDeactivateWarning,
  officeDuplicateMessage,
  officesUrl,
  selectableOffices,
  sortOffices,
} from "./universityOffices";

/**
 * Shared office state for every surface that manages the university office
 * list — the Settings "Offices & Groups" card and the assign-official modal on
 * the University Officials page.
 *
 * One implementation means the two cannot drift: both read the same
 * `/api/university-offices` rows, apply the same optimistic updates and use the
 * same two-step deactivation (refuse while seats are assigned, then a force
 * retry the operator confirms).
 *
 * Options
 *   - `initialOffices` rows to render before the first fetch (the seeded default
 *     keeps the assign modal usable offline, the Settings card passes []).
 *   - `includeCounts` also load assigned-official counts per office; pass the
 *     `academicYear` to scope them to one roster.
 *   - `onError` / `onSuccess` surface messages on the host page's own banner.
 */

// `officesUrl` lives in lib/universityOffices.js (pure, testable without a
// bundler); re-exported here so existing importers keep working.
export { officesUrl };

export default function useUniversityOffices({
  initialOffices,
  includeCounts = false,
  academicYear = "",
  onError,
  onSuccess,
} = {}) {
  const [offices, setOffices] = useState(
    () => initialOffices || (includeCounts ? [] : buildDefaultOfficeRows()),
  );
  const [loading, setLoading] = useState(Boolean(includeCounts));
  const [busy, setBusy] = useState(false);
  /**
   * Inactive rows are always loaded and filtered client-side instead of being
   * excluded by the request. The tabs then switch instantly, and — the reason
   * this matters — a deactivated office is visible in the list rather than
   * only surfacing as a refused duplicate.
   */
  const [includeInactive, setIncludeInactive] = useState(true);

  /**
   * The banner callbacks are kept in refs rather than in the `useCallback`
   * dependency list on purpose.
   *
   * Hosts pass them as inline arrows (`onError: (t) => setMessage(...)`), so a
   * new function identity arrives on *every* render. If `notifyError` depended
   * on that identity then `refresh` would too, the mount effect below would see
   * a fresh `refresh` each render and refetch forever — a self-sustaining loop
   * that burned the endpoint's whole rate-limit budget within a second and then
   * returned 429s for every other API the page touched.
   */
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  onErrorRef.current = onError;
  onSuccessRef.current = onSuccess;

  const notifyError = useCallback((text) => {
    if (text) onErrorRef.current?.(text);
  }, []);

  const notifySuccess = useCallback((text) => {
    if (text) onSuccessRef.current?.(text);
  }, []);

  /** Guards against overlapping loads (StrictMode remounts, rapid retries). */
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  /**
   * Throttling is reported once per window instead of on every refused call:
   * a loop that is already spamming the endpoint would otherwise flood the
   * banner too.
   */
  const throttleNoticeRef = useRef(0);

  /**
   * Loads the office list. Counts are opt-in, so the assign modal keeps the
   * lean request it always made while Settings asks for the numbers.
   *
   * Deliberately no `setLoading(true)` on entry: a rejected (429) response must
   * not toggle `loading`, because that re-render is what kept the old loop
   * alive after the limiter had already started refusing requests.
   */
  const refresh = useCallback(
    async (options = {}) => {
      const year = options.academicYear ?? academicYear;
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      try {
        const res = await fetch(
          officesUrl({ includeCounts, includeInactive: true, academicYear: year }),
          { cache: "no-store" },
        );
        if (res.status === 429) {
          const now = Date.now();
          if (now - throttleNoticeRef.current > 30_000) {
            throttleNoticeRef.current = now;
            notifyError("Too many requests — office list reload paused briefly");
          }
          return undefined;
        }
        const data = await res.json();
        if (!res.ok) {
          notifyError(data?.error || "Failed to load offices");
          return undefined;
        }
        if (Array.isArray(data.data) && mountedRef.current) {
          setOffices(data.data);
        }
        return data.data || [];
      } catch {
        notifyError("Failed to load offices");
        return [];
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    [academicYear, includeCounts, notifyError],
  );

  useEffect(() => {
    refresh({ academicYear });
    // Re-runs only when the requested year changes (or the shape of the
    // request does) so the counts follow the roster.
  }, [refresh, academicYear]);

  /**
   * Adds an office.
   *
   * Returns the created row, or the existing row when the name collided with
   * one that was only inactive — in that case the caller can reactivate it
   * rather than being told "already exists" about a row it cannot see.
   */
  const addOffice = useCallback(
    async (name) => {
      const header = normalizeOfficeName(name);
      if (!header) return null;

      setBusy(true);
      try {
        const res = await fetch("/api/university-offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ header }),
        });
        const data = await res.json();

        if (res.status === 409) {
          // The API reports which row collided. An inactive one is the case
          // worth recovering from: the operator asked for this office, it
          // exists, it is just hidden — so name its state and where to find it
          // rather than claiming it "already exists" with nothing on screen.
          const existing = data.data || findOffice(offices, header);
          notifyError(officeDuplicateMessage(header, existing));
          return null;
        }

        if (!res.ok || !data.success) {
          notifyError(data.error || "Failed to add office");
          return null;
        }

        setOffices((prev) =>
          sortOffices([
            ...prev.filter((o) => o._id !== data.data._id),
            data.data,
          ]),
        );
        notifySuccess(`Office "${data.data.header}" added`);
        return data.data;
      } catch {
        notifyError("Network error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [notifyError, notifySuccess, offices],
  );

  /**
   * Deactivates (or reactivates) an office.
   *
   * Deactivation is deliberately a two-step confirm: the client warns with the
   * seat count it already knows, and if the API still refuses (someone was
   * assigned in another tab) its `occupied` count drives a second "deactivate
   * anyway" prompt that resends the request with `force: true`.
   */
  const setOfficeActive = useCallback(
    async (office, nextActive, options = {}) => {
      if (!office) return null;
      const header = office.header;
      const year = options.academicYear ?? academicYear;
      const assigned =
        options.assignedCount ?? Number(office.assigned_count || 0);

      if (!nextActive) {
        const warning = officeDeactivateWarning(header, assigned, year);
        if (typeof window !== "undefined" && !window.confirm(warning)) {
          return null;
        }
      }

      setBusy(true);
      try {
        const send = (force) =>
          fetch(`/api/university-offices/${office._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              is_active: nextActive,
              academic_year: year,
              force,
            }),
          });

        let res = await send(false);
        let data = await res.json();

        if (
          !nextActive &&
          res.status === 409 &&
          (data.occupied ?? 0) > 0 &&
          typeof window !== "undefined" &&
          window.confirm(officeDeactivateForcePrompt(header, data.occupied))
        ) {
          res = await send(true);
          data = await res.json();
        }

        if (!res.ok || !data.success) {
          notifyError(data.error || "Failed to update office");
          return null;
        }

        setOffices((prev) =>
          prev.map((o) => (o._id === data.data._id ? data.data : o)),
        );
        notifySuccess(
          `Office "${data.data.header}" ${nextActive ? "reactivated" : "deactivated"}`,
        );
        return data.data;
      } catch {
        notifyError("Network error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [academicYear, notifyError, notifySuccess],
  );

  /** Deactivate button handler. */
  const deactivateOffice = useCallback(
    (office, options) => setOfficeActive(office, false, options),
    [setOfficeActive],
  );

  /** Reactivate button handler — no confirm, nothing is hidden. */
  const reactivateOffice = useCallback(
    (office, options) => setOfficeActive(office, true, options),
    [setOfficeActive],
  );

  /** Active names, in chart order — the picker + filter list. */
  const activeHeaders = useMemo(
    () => selectableOffices(offices, includeInactive).map((o) => o.header),
    [offices, includeInactive],
  );

  const counts = useMemo(() => officeCountsWithAssigned(offices), [offices]);

  /** Rows for one tab ("all" | "active" | "inactive"), in chart order. */
  const byTab = useCallback((tab) => filterOfficesByTab(offices, tab), [offices]);

  return {
    offices,
    setOffices,
    loading,
    busy,
    includeInactive,
    setIncludeInactive,
    activeHeaders,
    counts,
    byTab,
    refresh,
    addOffice,
    deactivateOffice,
    reactivateOffice,
  };
}
