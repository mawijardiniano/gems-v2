"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const DEFAULT_LIMIT = 50;

export default function useProfileList({
  initialData = null,
  initialTotal = 0,
  initialTotalPages = 1,
  limit = DEFAULT_LIMIT,
  college = null,
  type = null,
  filters = {},
} = {}) {
  const [data, setData] = useState(initialData || []);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!initialData);

  const initializedRef = useRef(false);
  const didMountRef = useRef(false);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const filtersKey = JSON.stringify({
    sex: filters.sex || "",
    yearLevel: filters.yearLevel || "",
    colleges: filters.colleges || [],
    offices: filters.offices || [],
    employmentStatus: filters.employmentStatus || "",
    appointmentStatus: filters.appointmentStatus || [],
    schoolYear: filters.schoolYear || "",
    semester: filters.semester || "",
    searchName: filters.searchName || "",
  });

  const fetchPage = useCallback(
    async (pageNum) => {
      setLoading(true);
      try {
        const f = filtersRef.current;
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(limit),
        });
        if (college) params.set("college", college);
        if (type) params.set("type", type);

        if (f.sex) params.set("sex", f.sex);
        if (f.yearLevel) params.set("yearLevel", f.yearLevel);
        if (Array.isArray(f.colleges) && f.colleges.length > 0)
          params.set("colleges", f.colleges.join(","));
        if (Array.isArray(f.offices) && f.offices.length > 0)
          params.set("offices", f.offices.join(","));
        if (f.employmentStatus) params.set("employmentStatus", f.employmentStatus);
        if (Array.isArray(f.appointmentStatus) && f.appointmentStatus.length > 0)
          params.set("appointmentStatus", f.appointmentStatus.join(","));
        if (f.schoolYear) params.set("schoolYear", f.schoolYear);
        if (f.semester) params.set("semester", f.semester);
        if (f.searchName && String(f.searchName).trim())
          params.set("search", String(f.searchName).trim());

        const res = await fetch(`/api/profile/list?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch profiles");

        const json = await res.json();
        setData(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
        setPage(json.page || pageNum);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    },

    [limit, college, type, filtersKey],
  );


  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (Array.isArray(initialData) && initialData.length > 0) {
      setData(initialData);
      setTotal(initialTotal);
      setTotalPages(initialTotalPages);
      setPage(1);
      setLoading(false);
    } else {
      fetchPage(1);
    }

  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchPage(1);
  }, [fetchPage]);

  const goToPage = useCallback(
    (pageNum) => {
      const target = Math.min(Math.max(1, pageNum), totalPages);
      if (target !== page) fetchPage(target);
    },
    [page, totalPages, fetchPage],
  );

  return { data, total, totalPages, page, loading, goToPage };
}