"use client";

import axios from "axios";
import { useEffect, useState } from "react";

/* The signed-in user's own GPB projects, for the GAD activity picker (the
   server only accepts links to the creator's own projects). Waits for the
   user id instead of filtering with none. */
export function useMyProjects(userId) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      return undefined;
    }
    let cancelled = false;
    axios
      .get("/api/project")
      .then((res) => {
        if (cancelled) return;
        const all = res.data?.data || [];
        setProjects(
          all.filter((p) => p.createdBy?.toString() === String(userId)),
        );
      })
      .catch(() => !cancelled && setProjects([]));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return projects;
}
