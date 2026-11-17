"use client";

import { useEffect, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import ReportsContent from "../../../(event)/reports/content";

/* The Dean's Reports page: the GAD Focal Person's person-type reports, locked
   to the Dean's assigned college. The college comes from the server record
   (my-profile), not the Redux/localStorage copy, and the reports are never
   rendered unscoped. */
export default function DeanReportsContent() {
  const [state, setState] = useState({ loading: true, college: "" });

  useEffect(() => {
    let active = true;
    (async () => {
      let college = "";
      try {
        const res = await fetch("/api/profile/my-profile", {
          credentials: "include",
        });
        if (res.ok) {
          const body = await res.json();
          college = body?.user?.assignedCollege?.trim() || "";
        }
      } catch {
        college = "";
      }
      if (active) setState({ loading: false, college });
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 rounded-full border-4 border-secondary-200 border-t-secondary-600 animate-spin" />
      </div>
    );
  }

  if (!state.college) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">No college assigned</p>
            <p className="mt-1">
              Reports are limited to your college, but your account has no
              assigned college yet. Please contact the administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <ReportsContent scopeCollege={state.college} />;
}
