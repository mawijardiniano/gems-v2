"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeGpbProject } from "../lib/projectForm";

/* Loads one year's GPB (its projects, status and linked GAA budget) and the
   year's budget summary. Both refresh functions are stable, so callers can
   run them after a create, edit, delete or comment. */
export function useGpbYear(year) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [gpbId, setGpbId] = useState(null);
  const [gpbStatus, setGpbStatus] = useState(null);
  const [totalGAA, setTotalGAA] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);

  /* `quiet` refreshes in the background: after a delete or a comment the
     table used to be replaced by "Loading projects..." and lose its place. */
  const fetchProjects = useCallback(
    async ({ quiet = false } = {}) => {
      if (!year) return;
      if (!quiet) setLoading(true);
      setLoadError("");
      try {
        const res = await fetch(`/api/gpb/${year}`);
        const data = await res.json().catch(() => ({}));
        /* A 403/404 used to throw on `data.data` further down and leave an
           empty plan on screen with no message and a working "+ Add Project". */
        if (!res.ok || !data?.data) {
          setProjects([]);
          setLoadError(
            res.status === 404
              ? `There is no GPB for ${year} yet.`
              : res.status === 403
                ? "You are not allowed to view this GPB."
                : data?.message || data?.error || "Unable to load this GPB.",
          );
          return;
        }

        setProjects((data.data.projects || []).map(normalizeGpbProject));
        setGpbId(data.data._id);
        setGpbStatus(data.data.status_of_gpb || null);
        /* "Total GAA" is the budget attached to this GPB — the one the
           dashboard and the matrix PDF show — not a separate lookup by year. */
        const linkedBudget = data.data.gaaBudgetId;
        setTotalGAA(
          linkedBudget && typeof linkedBudget === "object"
            ? linkedBudget.totalGAA
            : null,
        );
      } catch (err) {
        console.error(err);
        setProjects([]);
        setLoadError("Unable to load this GPB. Check your connection and retry.");
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [year],
  );

  const fetchBudgetSummary = useCallback(async () => {
    if (!year) return;
    try {
      const res = await fetch(`/api/project/budget/summary/${year}`);
      const data = await res.json().catch(() => ({}));
      setBudgetSummary(res.ok ? data?.budgetSummary || null : null);
    } catch (err) {
      console.error(err);
      setBudgetSummary(null);
    }
  }, [year]);

  useEffect(() => {
    fetchProjects();
    fetchBudgetSummary();
  }, [fetchProjects, fetchBudgetSummary]);

  return {
    projects,
    loading,
    loadError,
    gpbId,
    gpbStatus,
    status: gpbStatus?.status,
    totalGAA,
    budgetSummary,
    fetchProjects,
    fetchBudgetSummary,
  };
}
