"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { getSocket } from "@/utils/socket";

export default function useProfileData() {
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState(null);
  const [filterCampus, setFilterCampus] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");

  const calculateAge = (birthday) => {
    if (!birthday) return 0;
    const birth = new Date(birthday);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  useEffect(() => {
    axios
      .get("/api/profile", { withCredentials: true })
      .then((res) => setProfiles(res.data.data))
      .catch(() => setError("Failed to fetch profiles. Please log in."));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (profile) => setProfiles((prev) => [...prev, profile]);
    const handleUpdate = (profile) =>
      setProfiles((prev) =>
        prev.map((p) => (p._id === profile._id ? profile : p))
      );
    const handleDelete = ({ id }) =>
      setProfiles((prev) => prev.filter((p) => p._id !== id));

    socket.on("profile:new", handleNew);
    socket.on("profile:updated", handleUpdate);
    socket.on("profile:deleted", handleDelete);

    return () => {
      socket.off("profile:new", handleNew);
      socket.off("profile:updated", handleUpdate);
      socket.off("profile:deleted", handleDelete);
    };
  }, []);

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((p) => {
        const campusMatch = filterCampus
          ? p.affiliation?.campus === filterCampus
          : true;
        const collegeMatch =
          Array.isArray(filterCollege) && filterCollege.length > 0
            ? filterCollege.includes(p.affiliation?.college)
            : true;
        const statusMatch = filterStatus
          ? p.currentStatus === filterStatus
          : true;
        return campusMatch && collegeMatch && statusMatch;
      }),
    [profiles, filterCampus, filterCollege, filterStatus]
  );

  const campusOptions = useMemo(
    () => [
      ...new Set(profiles.map((p) => p.affiliation?.campus).filter(Boolean)),
    ],
    [profiles]
  );

  const collegeOptions = useMemo(
    () => [
      ...new Set(profiles.map((p) => p.affiliation?.college).filter(Boolean)),
    ],
    [profiles]
  );

  const statusOptions = useMemo(
    () => [...new Set(profiles.map((p) => p.currentStatus).filter(Boolean))],
    [profiles]
  );

  const genders = ["Male", "Female", "Intersex", "Prefer not to disclose"];

  const genderData = useMemo(() => {
    const count = {};
    genders.forEach((g) => (count[g] = 0));
    filteredProfiles.forEach((p) => {
      const gender = p.gadData?.sexAtBirth;
      if (genders.includes(gender)) count[gender] += 1;
    });
    return Object.keys(count).map((g) => ({ name: g, value: count[g] }));
  }, [filteredProfiles]);

  const ageData = useMemo(() => {
    const bins = {};
    filteredProfiles.forEach((p) => {
      const age = calculateAge(p.personal?.birthday);
      const bucket = Math.floor(age / 10) * 10;
      bins[bucket] = (bins[bucket] || 0) + 1;
    });
    return Object.keys(bins)
      .sort((a, b) => a - b)
      .map((b) => {
        const start = parseInt(b);
        const end = start + 9;
        return { age: `${start}-${end}`, count: bins[b] };
      });
  }, [filteredProfiles]);

  const statusData = useMemo(() => {
    const res = {};
    filteredProfiles.forEach((p) => {
      const st = p.currentStatus || "Unknown";
      res[st] = (res[st] || 0) + 1;
    });
    return Object.keys(res).map((k) => ({ name: k, value: res[k] }));
  }, [filteredProfiles]);

  const pwdData = useMemo(
    () =>
      genders.map((g) => ({
        gender: g,
        PWD: filteredProfiles.filter(
          (p) => p.gadData?.sexAtBirth === g && p.gadData?.isPWD
        ).length,
      })),
    [filteredProfiles]
  );

  const indigenousData = useMemo(
    () =>
      genders.map((g) => ({
        gender: g,
        Indigenous: filteredProfiles.filter(
          (p) => p.gadData?.sexAtBirth === g && p.gadData?.isIndigenousPerson
        ).length,
      })),
    [filteredProfiles]
  );

  const totalPWD = useMemo(
    () => filteredProfiles.filter((p) => p.gadData?.isPWD === true).length,
    [filteredProfiles]
  );

  const totalIndigenous = useMemo(
    () =>
      filteredProfiles.filter((p) => p.gadData?.isIndigenousPerson === true)
        .length,
    [filteredProfiles]
  );

  return {
    error,
    filteredProfiles,
    filterCampus,
    filterCollege,
    filterStatus,
    setFilterCampus,
    setFilterCollege,
    setFilterStatus,
    campusOptions,
    collegeOptions,
    statusOptions,
    genderData,
    ageData,
    statusData,
    pwdData,
    indigenousData,
    totalIndigenous,
    totalPWD,
  };
}
