"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";

/* Loads every GAD project the viewer may see, plus the viewer's id, role
   and assigned college (which decides the budget figures they may read). */
export function useGadProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState({
    userId: null,
    role: "",
    assignedCollege: "",
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/project", { withCredentials: true });
      setProjects(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load GAD projects:", err);
      setError("Failed to load GAD projects. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("/api/profile/my-profile", {
          withCredentials: true,
        });
        if (!mounted) return;
        setViewer({
          userId: res.data?.user?._id || null,
          role: res.data?.user?.role || "",
          assignedCollege: res.data?.user?.assignedCollege || "",
        });
      } catch {
        if (mounted) setViewer({ userId: null, role: "", assignedCollege: "" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* Applies a saved change to one project without reloading the list. */
  const patchProject = useCallback((projectId, changes) => {
    setProjects((prev) =>
      prev.map((p) =>
        String(p._id) === String(projectId) ? { ...p, ...changes } : p,
      ),
    );
  }, []);

  return { projects, loading, error, viewer, loadProjects, patchProject };
}
