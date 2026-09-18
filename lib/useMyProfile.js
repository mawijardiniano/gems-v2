"use client";

import { useEffect, useState } from "react";


let inflight = null;

const normalizeProfile = (body) => body?.data || body?.profile || body || null;

function loadMyProfile() {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/profile/my-profile", {
        credentials: "include",
      });
      if (!res.ok) return null;

      const body = await res.json();
      return { profile: normalizeProfile(body), user: body?.user || null };
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export default function useMyProfile() {
  const [state, setState] = useState({ profile: null, user: null });

  useEffect(() => {
    let active = true;

    loadMyProfile().then((result) => {
      if (active && result) setState(result);
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
