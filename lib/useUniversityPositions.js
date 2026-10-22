"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  filterPositionsByTab,
  positionsUrl,
  sortPositions,
} from "./universityPositionsUi";

/**
 * Shared seat state for every surface that manages the university position
 * list — the Settings "Positions" card (and later the assign-official modal).
 *
 * A near-copy of useUniversityOffices on purpose: the two lists are edited by
 * the same person and follow identical rules (two-step deactivation, never
 * delete, optimistic rows), so keeping the shapes aligned means the managers
 * cannot drift apart.
 *
 * Options
 *   - `includeCounts` also load per-seat term counts; pass `academicYear` to
 *     scope them to one roster.
 *   - `onError` / `onSuccess` surface messages on the host page's banner.
 */
export default function useUniversityPositions({
  initialPositions,
  includeCounts = true,
  academicYear = "",
  onError,
  onSuccess,
} = {}) {
  const [positions, setPositions] = useState(() => initialPositions || []);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  /**
   * The year the server actually resolved the counts against.
   *
   * It is not always the prop: an empty/unset year falls back server-side to the
   * active term, and only the response knows which. Reporting it lets a host
   * label the numbers with the year they belong to instead of re-deriving it
   * from row fields that do not carry it.
   */
  const [resolvedAcademicYear, setResolvedAcademicYear] = useState(academicYear || "");

  /**
   * Inactive seats are always fetched and filtered client-side rather than
   * excluded by the request: the tabs switch instantly, and a deactivated seat
   * is visible in the list instead of only surfacing as a refused duplicate.
   */
  const [includeInactive, setIncludeInactive] = useState(true);

  /**
   * The banner callbacks are held in refs rather than in the `useCallback`
   * dependency list on purpose.
   *
   * Hosts pass them as inline arrows (`onError: (t) => setMessage(...)`), so a
   * new function identity arrives on *every* render. If `notifyError` depended
   * on that identity then `refresh` would too, the mount effect would see a
   * fresh `refresh` each render and refetch forever — a self-sustaining loop
   * that burned the endpoint's whole rate-limit budget within a second.
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

  /**
   * Guards against overlapping loads (StrictMode remounts, rapid retries).
   *
   * `mountedRef` is set **true on mount** as well as false on unmount: React 18
   * StrictMode in dev mounts, unmounts and remounts the same instance, and a
   * ref that is only ever set to false would stay false for the life of the
   * component. Every fetch that resolved after that cycle would then skip its
   * `setState`, leaving a card that fetched 156 rows showing "0 seats" with no
   * error anywhere — the failure is silent by construction.
   */
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * A refresh requested while one was already in flight.
   *
   * The year arrives asynchronously (`gad-settings` derives it from the offices
   * response), so the mount effect runs once with `""` and again with the real
   * year. Dropping the second call on the floor — as the plain
   * `if (inFlightRef.current) return` did — meant the roster was only ever
   * loaded for whichever year happened to be current when the first request
   * started, and the correct load never ran. Instead the request is remembered
   * and replayed as soon as the in-flight one settles.
   */
  const queuedRefreshRef = useRef(null);

  /** Throttling is reported once per window instead of on every refused call. */
  const throttleNoticeRef = useRef(0);

  /**
   * Loads the seat list (and, for the picker, the office columns they live in).
   *
   * Deliberately no `setLoading(true)` on entry: a rejected (429) response must
   * not toggle `loading`, because that re-render is what kept the old office
   * loop alive after the limiter had already started refusing requests.
   */
  const refresh = useCallback(
    async (options = {}) => {
      const year = options.academicYear ?? academicYear;
      if (inFlightRef.current) {
        /* Remember the newest request instead of discarding it; the in-flight
           call replays it on completion. Last write wins, which is what a
           year change wants. */
        queuedRefreshRef.current = options;
        return undefined;
      }
      inFlightRef.current = true;
      try {
        const res = await fetch(
          positionsUrl({ includeCounts, includeInactive: true, academicYear: year }),
          { cache: "no-store" },
        );
        if (res.status === 429) {
          const now = Date.now();
          if (now - throttleNoticeRef.current > 30_000) {
            throttleNoticeRef.current = now;
            notifyError("Too many requests — seat list reload paused briefly");
          }
          return undefined;
        }
        const data = await res.json();
        if (!res.ok) {
          notifyError(data?.error || "Failed to load positions");
          return undefined;
        }
        if (mountedRef.current) {
          if (Array.isArray(data.data)) setPositions(data.data);
          if (Array.isArray(data.offices)) setOffices(data.offices);
          if (typeof data.academic_year === "string" && data.academic_year) {
            setResolvedAcademicYear(data.academic_year);
          }
        }
        return data.data || [];
      } catch {
        notifyError("Failed to load positions");
        return [];
      } finally {
        inFlightRef.current = false;
        /* Replay the request that arrived mid-flight, so a year that resolved
           while the first load was running still gets its roster. */
        const queued = queuedRefreshRef.current;
        if (queued) {
          queuedRefreshRef.current = null;
          refresh(queued);
        }
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
   * Adds a seat under an office column.
   *
   * Returns the created row, or `null` when refused. A 409 names the colliding
   * row so the operator learns whether it is an inactive seat to reactivate
   * rather than a bare "already exists" about a row they cannot see.
   */
  const addPosition = useCallback(
    async (header, name) => {
      if (!header || !name) return null;

      setBusy(true);
      try {
        const res = await fetch("/api/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ header, name }),
        });
        const data = await res.json();

        if (res.status === 409) {
          notifyError(data.error || "That seat already exists");
          return null;
        }
        if (!res.ok || !data.success) {
          notifyError(data.error || "Failed to add position");
          return null;
        }

        setPositions((prev) =>
          sortPositions([...prev.filter((p) => p._id !== data.data._id), data.data]),
        );
        notifySuccess(`Position "${data.data.name}" added`);
        return data.data;
      } catch {
        notifyError("Network error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [notifyError, notifySuccess],
  );

  /**
   * Renames a seat, moves it to another office column, or reorders it.
   *
   * A rename is retroactive in the API (term rows reference the seat by id, so
   * past tenures re-read under the new wording) — the caller warns about that
   * before sending.
   */
  const updatePosition = useCallback(
    async (position, patch = {}) => {
      if (!position?._id) return null;

      setBusy(true);
      try {
        const res = await fetch(`/api/positions/${position._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          notifyError(data.error || "Failed to update position");
          return null;
        }

        setPositions((prev) =>
          sortPositions(prev.map((p) => (p._id === data.data._id ? data.data : p))),
        );
        notifySuccess(`Position "${data.data.name}" updated`);
        return data.data;
      } catch {
        notifyError("Network error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [notifyError, notifySuccess],
  );

  /**
   * Deactivates (or reactivates) a seat.
   *
   * Deliberately a two-step confirm: the client warns with the term count it
   * already knows, and if the API still refuses (a term appeared in another
   * tab) its `occupied` count drives a second "deactivate anyway" prompt that
   * resends with `force: true`.
   */
  const setPositionActive = useCallback(
    async (position, nextActive, options = {}) => {
      if (!position?._id) return null;
      const label = options.label || position.name;
      const occupied =
        options.occupiedCount ?? Number(position.occupied_all || 0);

      if (!nextActive) {
        const warning =
          occupied > 0
            ? `Deactivate "${label}"? ${occupied} term(s) in history reference this seat. It stays on old charts but will no longer be offered for new assignments.`
            : `Deactivate "${label}"? It will no longer be offered for new assignments.`;
        if (typeof window !== "undefined" && !window.confirm(warning)) {
          return null;
        }
      }

      setBusy(true);
      try {
        const send = (force) =>
          fetch(`/api/positions/${position._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              is_active: nextActive,
              academic_year: options.academicYear ?? academicYear,
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
          window.confirm(
            `${data.occupied} term(s) still reference "${label}". Deactivate anyway?`,
          )
        ) {
          res = await send(true);
          data = await res.json();
        }

        if (!res.ok || !data.success) {
          notifyError(data.error || "Failed to update position");
          return null;
        }

        setPositions((prev) =>
          sortPositions(prev.map((p) => (p._id === data.data._id ? data.data : p))),
        );
        notifySuccess(
          `Position "${data.data.name}" ${nextActive ? "reactivated" : "deactivated"}`,
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
  const deactivatePosition = useCallback(
    (position, options) => setPositionActive(position, false, options),
    [setPositionActive],
  );

  /** Reactivate button handler — no confirm, nothing is hidden. */
  const reactivatePosition = useCallback(
    (position, options) => setPositionActive(position, true, options),
    [setPositionActive],
  );

  /** Rows for one tab ("all" | "active" | "inactive"), in chart order. */
  const byTab = useCallback(
    (tab) => filterPositionsByTab(positions, tab),
    [positions],
  );

  /** Seats grouped by office column, in office order — the manager's layout. */
  const byHeader = useMemo(() => {
    const order = offices.map((o) => o.header);
    const groups = new Map();
    for (const seat of sortPositions(positions)) {
      if (!groups.has(seat.header)) groups.set(seat.header, []);
      groups.get(seat.header).push(seat);
    }
    return [...groups.entries()]
      .map(([header, seats]) => ({ header, seats }))
      .sort((a, b) => {
        const ai = order.indexOf(a.header);
        const bi = order.indexOf(b.header);
        if (ai === -1 && bi === -1) return a.header.localeCompare(b.header);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }, [positions, offices]);

  const counts = useMemo(
    () => ({
      total: positions.length,
      active: positions.filter((p) => p.is_active !== false).length,
      inactive: positions.filter((p) => p.is_active === false).length,
    }),
    [positions],
  );

  return {
    positions,
    setPositions,
    offices,
    loading,
    busy,
    /** Year the counts belong to, as reported by the server. */
    academicYear: resolvedAcademicYear,
    includeInactive,
    setIncludeInactive,
    counts,
    byTab,
    byHeader,
    refresh,
    addPosition,
    updatePosition,
    setPositionActive,
    deactivatePosition,
    reactivatePosition,
  };
}
