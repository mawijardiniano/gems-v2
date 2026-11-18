"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PROJECTS_PER_PAGE,
  filterGadProjects,
  officeOptionsFor,
  statusTotals,
  yearsOf,
} from "../lib/gadProjects";

/* Filters, pagination, the opened project and the ?focus= deep link from
   Reports. */
export function useGadProjectList(projects, loading) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  /* Which tab of the opened project shows — reset whenever one opens. */
  const [detailTab, setDetailTab] = useState("details");
  const [currentPage, setCurrentPage] = useState(1);

  const years = useMemo(() => yearsOf(projects), [projects]);

  useEffect(() => {
    if (!loading && years.length > 0 && !yearFilter) {
      setYearFilter(String(years[0]));
    }
  }, [loading, years, yearFilter]);

  const filteredProjects = useMemo(
    () =>
      filterGadProjects(projects, {
        year: yearFilter,
        office: officeFilter,
        status: statusFilter,
        search,
      }),
    [projects, search, yearFilter, officeFilter, statusFilter],
  );

  const officeOptions = useMemo(() => officeOptionsFor(projects), [projects]);
  const totals = useMemo(() => statusTotals(filteredProjects), [filteredProjects]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE),
  );
  const paginatedProjects = useMemo(
    () =>
      filteredProjects.slice(
        (currentPage - 1) * PROJECTS_PER_PAGE,
        currentPage * PROJECTS_PER_PAGE,
      ),
    [filteredProjects, currentPage],
  );

  /* While a project is open the others are hidden; closing it brings the
     list back. */
  const visibleProjects = useMemo(() => {
    if (!expandedId) return paginatedProjects;
    const focused = filteredProjects.find(
      (p) => String(p._id) === String(expandedId),
    );
    return focused ? [focused] : paginatedProjects;
  }, [filteredProjects, paginatedProjects, expandedId]);

  /* Filters narrow the list — always fall back to the first page. */
  useEffect(() => {
    setCurrentPage(1);
  }, [yearFilter, officeFilter, statusFilter, search]);

  /* Never leave the view on a page that no longer exists. */
  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  /* ── ?focus= deep link ───────────────────────────────────
     Runs once per value. It used to re-run on every `projects` or page
     change, so saving anything snapped the view back to the focused
     project's Details tab and overrode the year the user had picked. */
  const searchParams = useSearchParams();
  const focusParam = searchParams?.get("focus");
  const focusAppliedRef = useRef(null);
  useEffect(() => {
    if (loading || !focusParam) return undefined;
    if (focusAppliedRef.current === focusParam) return undefined;
    const focusProject = projects.find(
      (p) => String(p._id) === String(focusParam),
    );
    if (!focusProject) return undefined;
    focusAppliedRef.current = focusParam;
    if (focusProject.year) setYearFilter(String(focusProject.year));
    setDetailTab("details");
    setExpandedId(focusProject._id);
    const timer = setTimeout(() => {
      document
        .getElementById(`gad-project-${focusProject._id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(timer);
  }, [loading, projects, focusParam]);

  /* Keep the deep-linked project on the page that shows it. */
  const focusPageRef = useRef(null);
  useEffect(() => {
    if (!focusParam || filteredProjects.length === 0) return;
    if (focusPageRef.current === focusParam) return;
    const idx = filteredProjects.findIndex(
      (p) => String(p._id) === String(focusParam),
    );
    if (idx < 0) return;
    focusPageRef.current = focusParam;
    setCurrentPage(Math.floor(idx / PROJECTS_PER_PAGE) + 1);
  }, [focusParam, filteredProjects]);

  /* Changing a filter closes the opened project. */
  const withClose = (setter) => (value) => {
    setter(value);
    setExpandedId(null);
  };

  const toggleExpand = (id) => {
    setDetailTab("details");
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const goToPage = (next) => {
    setCurrentPage(Math.min(Math.max(next, 1), totalPages));
    document
      .getElementById("gad-projects-table")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFilters = () => {
    setSearch("");
    setYearFilter(years.length > 0 ? String(years[0]) : "");
    setOfficeFilter("all");
    setStatusFilter("all");
    setExpandedId(null);
  };

  return {
    years,
    officeOptions,
    filters: { search, yearFilter, officeFilter, statusFilter },
    setSearch: withClose(setSearch),
    setYearFilter: withClose(setYearFilter),
    setOfficeFilter: withClose(setOfficeFilter),
    setStatusFilter: withClose(setStatusFilter),
    resetFilters,
    filteredProjects,
    visibleProjects,
    totals,
    currentPage,
    totalPages,
    goToPage,
    expandedId,
    closeProject: () => setExpandedId(null),
    toggleExpand,
    detailTab,
    setDetailTab,
  };
}
