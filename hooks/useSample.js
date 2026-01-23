"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/utils/socket";

export default function useFetchData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeProfile = (d) => ({
    ...d,
    personal_information:
      d.personal_info_id?.personal_information || d.personal_information || {},
    economic_financial_role: d.personal_info_id?.economic_financial_role || {},
    reproductive_family_role:
      d.personal_info_id?.reproductive_family_role || {},
    household_managing_role: d.personal_info_id?.household_managing_role || {},
    community_involvement: d.personal_info_id?.community_involvement || {},
    social_development: d.personal_info_id?.social_development || {},
    environmental_climate: d.personal_info_id?.environmental_climate || {},
    gender_responsive: d.personal_info_id?.gender_responsive || {},
    security_peace: d.personal_info_id?.security_peace || {},
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to fetch profiles");

        const json = await res.json();
        setData((json.data || []).map(normalizeProfile));
        console.log("Data:", json.data)
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (profile) => {
      console.log("📥 profile:new received", profile);
      setData((prev) => [...prev, normalizeProfile(profile)]);
    };

    const handleUpdate = (profile) => {
      setData((prev) =>
        prev.map((p) => (p._id === profile._id ? normalizeProfile(profile) : p))
      );
    };

    const handleDelete = (payload) => {
      const id = typeof payload === "string" ? payload : payload.id;
      console.log("🗑 profile:deleted received", id);
      setData((prev) => prev.filter((p) => p._id !== id));
    };

    socket.on("profile:new", handleNew);
    socket.on("profile:updated", handleUpdate);
    socket.on("profile:deleted", handleDelete);

    return () => {
      socket.off("profile:new", handleNew);
      socket.off("profile:updated", handleUpdate);
      socket.off("profile:deleted", handleDelete);
    };
  }, []);

  return { data, loading };
}
