"use client";

import axios from "axios";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import MarSULogo from "@/public/getThemePhoto.png";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FiArrowLeft, FiEdit2 } from "react-icons/fi";

function CheckboxDropdown({ label, options, selected, onChange, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white"
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected.length === 0 ? "Select..." : selected.join(", ")}
        <span className="float-right">▼</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
                className="mr-2"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventManageContent() {
  const handleAssignGoing = async () => {
    if (!eventId || interestedSelected.length === 0) return;
    try {
      await axios.post("/api/events/participation", {
        event_id: eventId,
        user_id: interestedSelected,
        status: "going",
      });
      const res = await axios.get(`/api/events/${eventId}`);
      setEvent(res.data?.data || event);
      setInterestedSelected([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign going.");
    }
  };
  const [interestedSearch, setInterestedSearch] = useState("");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params?.id;

  const [event, setEvent] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [guestTab, setGuestTab] = useState("going");
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQrPrompt, setShowQrPrompt] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [interestedSelected, setInterestedSelected] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [guestTypeFilter, setGuestTypeFilter] = useState("all");
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        setProjects(res.data?.data || []);
      } catch (err) {
        setProjects([]);
      }
    };
    fetchProjects();
  }, []);

  const getFilteredGuests = (guests) => {
    return guests
      .filter((guest) => {
        const details = extractGuestDetails(guest);
        if (guestTypeFilter === "student") return details.status === "Student";
        if (guestTypeFilter === "employee")
          return details.status === "Employee";
        return true;
      })
      .filter((guest) => {
        const details = extractGuestDetails(guest);
        if (!interestedSearch) return true;
        return details.name
          ?.toLowerCase()
          .includes(interestedSearch.toLowerCase());
      });
  };
  const handleDeleteEvent = async () => {
    setDeleting(true);
    setDeleteError("");

    try {
      if (event?.event_poster?.key) {
        await axios.delete("/api/upload", {
          data: { key: event.event_poster.key },
        });
      }

      await axios.delete(`/api/events/${eventId}`);

      setShowDeleteModal(false);
      router.push("/events-list");
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        try {
          const profileRes = await axios.get("/api/profile/my-profile");
          setUserId(profileRes.data?.user?._id || null);
        } catch (profileErr) {
          const status = profileErr?.response?.status;
          if (status !== 401 && status !== 403) throw profileErr;
          setUserId(null);
        }

        if (!eventId) {
          setError("Event id is missing.");
          return;
        }

        const res = await axios.get(`/api/events/${eventId}`);
        const evt = res.data?.data || null;
        setEvent(evt);
        if (evt) {
          console.log("Loaded event:", evt);
          let startDates =
            Array.isArray(evt.start_dates) && evt.start_dates.length > 0
              ? evt.start_dates.map(formatForInput)
              : [formatForInput(evt.start_date || evt.date)];
          let endDates =
            Array.isArray(evt.end_dates) && evt.end_dates.length > 0
              ? evt.end_dates.map(formatForInput)
              : [formatForInput(evt.end_date)];
          console.log("Initial startDates:", startDates);
          console.log("Initial endDates:", endDates);
          if (!startDates[0])
            startDates[0] = formatForInput(evt.start_date || evt.date);
          if (!endDates[0]) endDates[0] = formatForInput(evt.end_date);
          console.log("Final startDates:", startDates);
          console.log("Final endDates:", endDates);
          setEditData({
            type_of_activity: evt.type_of_activity,
            project: evt.project,
            gad_activity: evt.gad_activity,
            title: evt.title || "",
            description: evt.description || "",
            number_of_days: evt.number_of_days,
            start_dates: startDates,
            end_dates: endDates,
            venue: evt.venue || "",
            status: evt.status || "active",
            organizing_office_unit: evt.organizing_office_unit,
            co_organizing_office_unit: evt.co_organizing_office_unit,
            eligibility_criteria: evt.eligibility_criteria,
            target_number_of_participants: evt.target_number_of_participants,
            event_poster: evt.event_poster || "",
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load event.");
      } finally {
        setLoading(false);
        setProfileChecked(true);
      }
    };

    load();
  }, [eventId]);

  useEffect(() => {
    if (searchParams?.get("qr") === "1" && profileChecked && !userId) {
      setShowQrPrompt(true);
    } else {
      setShowQrPrompt(false);
    }
  }, [searchParams, profileChecked, userId]);

  useEffect(() => {
    const envQrPublic = process.env.NEXT_PUBLIC_QR_BASE_URL;
    const envQr = process.env.NEXT_QR_BASE_URL;
    const envPublic = process.env.NEXT_PUBLIC_BASE_URL;
    const picked = envQrPublic || envQr || envPublic;
    if (picked) {
      setBaseUrl(picked.replace(/\/$/, ""));
      return;
    }
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const buildQr = async () => {
      if (!baseUrl || !eventId) return;
      try {
        const deepLink = `${baseUrl}/events/discover/${eventId}?qr=1`;
        const dataUrl = await QRCode.toDataURL(deepLink, { width: 220 });
        setQrDataUrl(dataUrl);
      } catch (e) {
        setQrDataUrl("");
      }
    };
    buildQr();
  }, [baseUrl, eventId]);

  const isPast = useMemo(() => {
    if (!event) return false;
    let end = event.end_date || event.start_date || event.date;
    if (Array.isArray(event.end_dates) && event.end_dates.length > 0) {
      end = event.end_dates[event.end_dates.length - 1];
    }
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  }, [event]);

  const formatDate = (value) => {
    const opts = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "Invalid date"
      : d.toLocaleString(undefined, opts);
  };

  const getDateRangeLines = (start, end, evt) => {
    const startDates =
      evt && Array.isArray(evt.start_dates) && evt.start_dates.length > 0
        ? evt.start_dates
        : start
          ? [start]
          : [];
    const endDates =
      evt && Array.isArray(evt.end_dates) && evt.end_dates.length > 0
        ? evt.end_dates
        : end
          ? [end]
          : [];

    if (startDates.length === 0) return ["No date"];

    return startDates.map((sd, idx) => {
      const ed = endDates[idx];
      const startStr = formatDate(sd);
      if (!ed) return `Day ${idx + 1}: ${startStr}`;
      const endStr = formatDate(ed);
      return `Day ${idx + 1}: ${startStr} - ${endStr}`;
    });
  };

  const formatRange = (start, end, evt) => {
    return getDateRangeLines(start, end, evt).join(" | ");
  };

  const formatRangeLines = (start, end, evt) => {
    return getDateRangeLines(start, end, evt);
  };

  const formatForInput = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => `${n}`.padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toAcronym = (value) => {
    if (!value || typeof value !== "string") return "";
    const cleaned = value.replace(/\bof\b/gi, " ");
    const matches = cleaned.replace(/[()]/g, " ").match(/\b[A-Za-z0-9]/g);
    if (!matches) return value.trim();
    return matches.join("").toUpperCase();
  };

  const goingProfiles = useMemo(
    () =>
      (event?.registered_users || [])
        .map((u) => u?.personal_info_id)
        .filter(Boolean),
    [event],
  );

  const interestedProfiles = useMemo(
    () =>
      (event?.interested_users || [])
        .map((u) => u?.personal_info_id)
        .filter(Boolean),
    [event],
  );

  const notInterestedProfiles = useMemo(
    () =>
      (event?.not_interested_users || [])
        .map((u) => u?.personal_info_id)
        .filter(Boolean),
    [event],
  );

  const ageGroupCounts = useMemo(() => {
    const counts = {};
    (event?.registered_users || []).forEach((u) => {
      const info = u?.personal_info_id || u?.personal_info || {};
      const personal = info.personal || u?.personal || {};
      const birthday = personal.birthday;
      if (!birthday) return;
      const birth = new Date(birthday);
      if (Number.isNaN(birth.getTime())) return;
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      if (age < 0) return;
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}-${bucket + 9}`;
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [event]);

  const [insightsFilter, setInsightsFilter] = useState("all");

  const filteredProfiles = useMemo(() => {
    if (insightsFilter === "going") return goingProfiles;
    if (insightsFilter === "interested") return interestedProfiles;
    if (insightsFilter === "not_interested") return notInterestedProfiles;
    return [...goingProfiles, ...interestedProfiles, ...notInterestedProfiles];
  }, [
    insightsFilter,
    goingProfiles,
    interestedProfiles,
    notInterestedProfiles,
  ]);

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const extractGuestDetails = (guest) => {
    const info = guest?.personal_info_id || guest?.personal_info || {};
    const personal = info.personal || guest?.personal || {};
    const gadData = info.gadData || guest?.gadData || {};
    const affiliation = info.affiliation || guest?.affiliation || {};
    const contactInfo = info.contact || guest?.contact || {};
    const academic =
      affiliation.academic_information || affiliation.academicInformation || {};
    const employment =
      affiliation.employment_information ||
      affiliation.employmentInformation ||
      {};

    const positionDesignation =
      employment.employment_status ||
      employment.employment_appointment_status ||
      "";
    const programYearSection = academic.course
      ? `${academic.course}${academic.year_level ? ` / ${academic.year_level}` : ""}`
      : academic.year_level || "";

    const nameFromPersonal =
      `${personal.first_name || personal.firstName || ""} ${personal.last_name || personal.lastName || ""}`
        .trim()
        .replace(/^\s+|\s+$/g, "");

    const departmentRaw = employment.office || academic.college || "";
    const department = toAcronym(departmentRaw);

    const genderPreference =
      gadData.gender_preference || gadData.genderPreference || "";
    const status = personal.currentStatus || "";
    const contact = contactInfo.mobileNumber || contactInfo.phoneNumber || "";
    const email = contactInfo.email || "";

    return {
      name: nameFromPersonal || "Unknown guest",
      age: calculateAge(personal?.birthday),
      sex: gadData?.sexAtBirth || "",
      college: academic.college || "",
      office: employment.office || "",
      department,
      genderPreference,
      status,
      positionDesignation,
      programYearSection,
      contact,
      email,
    };
  };

  const interestedFiltered = useMemo(() => {
    if (!event?.interested_users) return [];
    return event.interested_users.filter((guest) => {
      const details = extractGuestDetails(guest);
      if (!interestedSearch) return true;
      return details.name
        ?.toLowerCase()
        .includes(interestedSearch.toLowerCase());
    });
  }, [event, interestedSearch]);

  const interestedSelectAll =
    interestedFiltered.length > 0 &&
    interestedFiltered.every((guest) => interestedSelected.includes(guest._id));

  const handleInterestedSelectAll = (e) => {
    const checked = e.target.checked;
    if (checked) {
      setInterestedSelected(interestedFiltered.map((guest) => guest._id));
    } else {
      setInterestedSelected([]);
    }
  };

  const buildGuestRows = (guests) => {
    const sorted = [...guests].sort((a, b) => {
      const detailsA = extractGuestDetails(a);
      const detailsB = extractGuestDetails(b);
      const nameA = (detailsA.name || "").toLowerCase();
      const nameB = (detailsB.name || "").toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    let rowIdx = 1;
    const rows = [];
    sorted.forEach((g) => {
      const details = extractGuestDetails(g);
      rows.push({
        isDepartmentHeader: false,
        data: [
          rowIdx++,
          details.name,
          details.sex || "",
          details.genderPreference || "",
          details.age ?? "",
          details.status,
          details.department,
          details.positionDesignation || "",
          details.programYearSection || "",
          details.contact,
          details.email,
          "",
        ],
      });
    });
    return rows;
  };

  const genderData = useMemo(() => {
    const counts = { Male: 0, Female: 0 };
    filteredProfiles.forEach((p) => {
      const g = p?.gadData?.sexAtBirth;
      if (g && counts[g] !== undefined) counts[g] += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredProfiles]);
  const genderDataChart = genderData;

  const ageData = useMemo(() => {
    const bins = {};
    filteredProfiles.forEach((p) => {
      const age = calculateAge(p?.personal?.birthday);
      if (age === null || Number.isNaN(age)) return;
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}-${bucket + 9}`;
      bins[label] = (bins[label] || 0) + 1;
    });
    return Object.keys(bins)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((age) => ({ name: age, value: bins[age] }));
  }, [filteredProfiles]);

  const collegeData = useMemo(() => {
    const counts = {};
    filteredProfiles.forEach((p) => {
      const departmentUnit =
        p?.affiliation?.employment_information?.office ||
        p?.affiliation?.academic_information?.college;
      const college = departmentUnit;
      counts[college] = (counts[college] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredProfiles]);

  const perYearData = useMemo(() => {
    const counts = {};
    filteredProfiles.forEach((p) => {
      let year = p?.affiliation?.academic_information?.year_level;
      if (!year || typeof year !== "string" || !year.trim()) return;
      year = year.trim();
      counts[year] = (counts[year] || 0) + 1;
    });

    const yearOrder = [
      "1st Year",
      "2nd Year",
      "3rd Year",
      "4th Year",
      "5th Year",
      "6th Year",
      "1st",
      "2nd",
      "3rd",
      "4th",
      "5th",
      "6th",
    ];
    const getOrder = (label) => {
      const idx = yearOrder.findIndex((y) =>
        label.toLowerCase().startsWith(y.toLowerCase()),
      );
      if (idx !== -1) return idx;
      const num = parseInt(label);
      return Number.isNaN(num) ? 99 : num + 10;
    };
    return Object.entries(counts)
      .filter(([name]) => name && name !== "null" && name !== "undefined")
      .sort((a, b) => getOrder(a[0]) - getOrder(b[0]))
      .map(([name, value]) => ({ name, value }));
  }, [filteredProfiles]);

  const statusCounts = useMemo(() => {
    const counts = {};
    filteredProfiles.forEach((p) => {
      const status = p?.personal?.currentStatus || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredProfiles]);

  const affiliationData = statusCounts;

  const totalRegistered = goingProfiles.length;
  const maleCount = genderData.find((d) => d.name === "Male")?.value || 0;
  const femaleCount = genderData.find((d) => d.name === "Female")?.value || 0;
  const interestedCount = event?.interested_users?.length || 0;
  const notInterestedCount = event?.not_interested_users?.length || 0;
  const goingCount = (event?.registered_users || []).length;

  const eventData = useMemo(
    () => [
      { name: "Interested", value: interestedCount },
      { name: "Not Interested", value: notInterestedCount },
      { name: "Going", value: goingCount },
    ],
    [interestedCount, notInterestedCount, goingCount],
  );

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleSave = async () => {
    if (!event?._id || !userId || !editData) return;

    setSaving(true);
    setError("");

    try {
      const oldPoster = event.event_poster;
      const newPoster = editData.event_poster;

      const payload = {
        ...editData,
        start_dates: editData.start_dates.map((d) => new Date(d).toISOString()),
        end_dates: editData.end_dates.map((d) => new Date(d).toISOString()),
        updated_by: userId,
      };

      const res = await axios.put(`/api/events/${event._id}`, payload);
      const updated = res.data?.data || event;
      if (oldPoster?.key && newPoster?.key && oldPoster.key !== newPoster.key) {
        await axios.delete("/api/upload", {
          data: { key: oldPoster.key },
        });
      }

      setEvent({
        ...updated,
        event_poster: updated.event_poster ?? editData.event_poster,
      });

      setEditData({
        ...updated,
        event_poster: updated.event_poster || editData.event_poster || "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintGuests = (guests) => {
    if (typeof window === "undefined") return;

    const rows = buildGuestRows(guests)
      .map((row) => {
        if (row.isDepartmentHeader) {
          return `<tr><td colspan="12" style="background:#e6f0fa;font-weight:bold;text-align:left;padding:8px 12px;">${row.department}</td></tr>`;
        } else {
          return `<tr>${row.data
            .map((cell) => `<td>${cell === undefined ? "" : cell}</td>`)
            .join("")}</tr>`;
        }
      })
      .join("");

    const dateLabel = formatRange(
      event.start_date || event.date,
      event.end_date,
    );

    const ACTIVITY_TYPES = [
      "Academic",
      "Administrative",
      "GAD",
      "Extension Research",
      "Students",
      "Others",
    ];

    const selectedType = event.type_of_activity;

    const typeOfActivityHTML = ACTIVITY_TYPES.map((type) => {
      const checked = type === selectedType ? "☑" : "☐";
      return `<span class="checkbox-item">${checked} ${type}</span>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${event.title || "Guest List"}</title>
  <style>
    @page { size: landscape; }

    body {
      font-family: Arial, sans-serif;
      padding: 0 2px 24px 2px;
      margin: 0;
      color: #111;
    }

    h3 {
      margin: 0 0 10px;
      text-align: center;
    }

    h4 {
      margin: 4px 0;
      font-weight: 500;
    }

    .checkbox-container {
      margin-top: 4px;
      margin-bottom: 8px;
      line-height: 1.8;
    }

    .checkbox-item {
      display: inline-block;
      gap: 30px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 6px;
      text-align: center;
      font-size: 12px;
    }

    th {
      background: #f5f5f5;
    } 
      .container div {
  background-color: #f1f1f1;
  border: 1px solid black;
  text-align: center;
}
  </style>
</head>

<body>

 
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; justify-items: center; margin-bottom: 16px; margin-top: 0;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <img src="/getThemePhoto.png" alt="MarSULogo" width="100" style="display: block; margin: 0 auto;" />
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
      <h2 style="margin: 0; font-size:16px; font-weight: bold; letter-spacing: 2px;">MARINDUQUE STATE UNIVERSITY</h2>
      <h3 style="margin: 0; font-weight: 100; font-size:16px;">Gender and Development Unit</h3>
    </div>
    <div></div>
</div>

  <h3 style="font-size:16px;">UNIVERSITY ACTIVITY ATTENDANCE SHEET</h3>

<div style="margin-left: 50px;">
        <h4 style="font-weight: bold;">I.<b style="margin-left: 20px;">Activity Information</b></h4>
    <div style="margin-left: 30px;">
    <h4><span style="font-weight: bold;">Activity Title:</span> ${event.title || "Guest List"}</h4>
    <h4><span style="font-weight: bold;">Type of Activity:</span> ${typeOfActivityHTML}</h4>
    <h4> <span style="font-weight: bold;">Date:</span>${dateLabel}</h4>
    <h4><span style="font-weight: bold;">Venue:</span> ${event.venue || ""}</h4>
     <h4><span style="font-weight: bold;">Organizing Office/Unit::</span> ${event.organizing_office_unit || ""}</h4>
    </div>

  <h4 style="margin:12px 0px 24px 0px; font-weight: bold;">II.<b style="margin-left: 20px;">Participating Attendance</b></h4>
  </div>
  <table>
    <thead>
      <tr>
        <th>No.</th>
        <th>Full Name</th>
        <th>Sex</th>
        <th>Gender  <br/> Identity</th>
        <th>Age</th>
        <th>Participant <br/> Type</th>
        <th>Department /<br/> Office /<br/> Organization</th>
        <th>Position /<br/> Designation <br/> (Employee/<br/>Stakeholders)</th>
        <th>Program / Year /<br/> Section <br/> (For Students)</th>
        <th>Contact No.</th>
        <th>Email Address</th>
        <th>Signature</th>
      </tr>
    </thead>

    <tbody>
      ${rows || '<tr><td colspan="12">No guests registered yet.</td></tr>'}
    </tbody>

  </table>

</body>
</html>`;

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;

    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  const handleDownloadGuestsPdf = (guests) => {
    if (typeof window === "undefined") return;

    const rows = buildGuestRows(guests)
      .map((row) => {
        if (row.isDepartmentHeader) {
          return `<tr><td colspan="12" style="font-weight:bold;text-align:left;padding:8px 12px;font-size: 16px;">${row.department}</td></tr>`;
        } else if (row.data && Array.isArray(row.data)) {
          return `<tr>${row.data
            .map(
              (cell) =>
                `<td style="border: 1px solid #ccc; padding:8px; text-align: center; font-size: 12px;">${cell === undefined ? "" : cell}</td>`,
            )
            .join("")}</tr>`;
        } else {
          return "";
        }
      })
      .join("");

    const dateLabel = formatRange(
      event.start_date || event.date,
      event.end_date,
    );

    const ACTIVITY_TYPES = [
      "Academic",
      "Administrative",
      "GAD",
      "Extension Research",
      "Students",
      "Others",
    ];

    const selectedType = event.type_of_activity;

    const typeOfActivityHTML = ACTIVITY_TYPES.map((type) => {
      const checked = type === selectedType ? "☑" : "☐";
      return `<span class="checkbox-item">${checked} ${type}</span>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${event.title || "Guest List"}</title>
  <style>
    @page { size: landscape; }
    body {
      font-family: Arial, sans-serif;
      padding: 24px 24px 24px 24px;
      margin: 0;
      color: #111;
    }
    h3 {
      margin: 0 0 10px;
      text-align: center;
    }
    h4 {
      margin: 4px 0;
      font-weight: 500;
    }
    .checkbox-container {
      margin-top: 4px;
      margin-bottom: 8px;
      line-height: 1.8;
    }
    .checkbox-item {
      display: inline-block;
      gap: 30px;
    }
  </style>
</head>
<body>
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; justify-items: center; margin-bottom: 4px; margin-top: 0;">
  <div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">
    <img src="/getThemePhoto.png" alt="MarSULogo" width="100" style="display: block; margin: 10px auto;" />
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
    <h1 style="margin: 0; font-weight: bold; letter-spacing: 2px;">MARINDUQUE STATE UNIVERSITY</h1>
    <h3 style="margin: 0; font-weight: 400;">Gender and Development Unit</h3>
  </div>
  <div></div>
</div>
  <h3 style="margin: 0; font-weight: bold; text-align: center;">UNIVERSITY ACTIVITY ATTENDANCE SHEET</h3>
    <div style="margin-left: 50px;">
        <h4 style="font-weight: bold;">I.<b style="margin-left: 20px;">Activity Information</b></h4>
    <div style="margin-left: 30px;">
    <h4><span style="font-weight: bold;">Activity Title:</span> ${event.title || "Guest List"}</h4>
    <h4><span style="font-weight: bold;">Type of Activity:</span> ${typeOfActivityHTML}</h4>
    <h4> <span style="font-weight: bold;">Date:</span>${dateLabel}</h4>
    <h4><span style="font-weight: bold;">Venue:</span> ${event.venue || ""}</h4>
     <h4><span style="font-weight: bold;">Organizing Office/Unit::</span> ${event.organizing_office_unit || ""}</h4>
    </div>

  <h4 style="margin:12px 0px 24px 0px; font-weight: bold;">II.<b style="margin-left: 20px;">Participating Attendance</b></h4>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ccc;">
    <thead>
      <tr>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">No.</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Full Name</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Sex</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Gender <br/> Identity</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Age</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Participant Type</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Department / <br/>Office /<br/> Organization</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Position /<br/> Designation <br/>(Employee/<br/>Stakeholders)</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Program / Year / <br/> Section (For Student)</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Contact No.</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Email Address</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Signature</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows ||
        `<tr><td colspan="12" style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px;">No guests registered yet.</td></tr>`
      }
    </tbody>
  </table>
</body>
</html>`;

    import("html2pdf.js")
      .then((html2pdf) => {
        html2pdf
          .default()
          .from(html)
          .set({
            margin: 0,
            filename: `${event.title || "guest-list"}-guests.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { orientation: "landscape", unit: "mm", format: "legal" },
          })
          .save();
      })
      .catch((err) => {
        console.error("PDF export failed", err);
        alert("Unable to generate PDF. Please try again.");
      });
  };

  const handleDownloadBlankGuestsPdf = async () => {
    if (typeof window === "undefined") return;

    const blankRowHtml = () =>
      `<tr>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: left; font-size: 12px;">[ ] Male<br/>[ ] Female</td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: left; font-size: 12px;">[ ] Male<br/>[ ] Female<br/>[ ] LGBTQIA+</td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: left; font-size: 12px;">[ ] Student<br/>[ ] Employee<br/>[ ] External Stakeholders</td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
      <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px;"></td>
    </tr>`;

    const blankRowsFirst = Array.from({ length: 5 }, blankRowHtml).join("");
    const blankRowsSecond = Array.from({ length: 9 }, blankRowHtml).join("");

    const tableHeader = `
    <thead>
      <tr>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">No.</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Full Name</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Sex</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Gender <br/> Identity</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Age</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Participant Type</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Department / <br/>Office /<br/> Organization</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Position /<br/> Designation <br/>(Employee/<br/>Stakeholders)</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Program / Year / <br/> Section (For Student)</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Contact No.</th>
        <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5;">Signature</th>
      </tr>
    </thead>
  `;

    const dateLabel = formatRange(
      event.start_date || event.date,
      event.end_date,
    );

    const ACTIVITY_TYPES = [
      "Academic",
      "Administrative",
      "GAD",
      "Extension Research",
      "Students",
      "Others",
    ];

    const selectedType = event.type_of_activity;

    const typeOfActivityHTML = ACTIVITY_TYPES.map((type) => {
      const checked = type === selectedType ? "☑" : "☐";
      return `<span class="checkbox-item">${checked} ${type}</span>`;
    }).join("");

    let tablesHtml = "";
    tablesHtml += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ccc; page-break-after: always;">${tableHeader}<tbody>${blankRowsFirst}</tbody></table>`;
    tablesHtml += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ccc;">${tableHeader}<tbody>${blankRowsSecond}</tbody></table>`;
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${event.title || "Guest List"}</title>
  <style>
    @page { size: landscape; }
    body {
      font-family: Arial, sans-serif;
      padding: 24px 24px 24px 24px;
      margin: 0;
      color: #111;
    }
    h3 {
      margin: 0 0 10px;
      text-align: center;
    }
    h4 {
      margin: 4px 0;
      font-weight: 500;
    }
    .checkbox-container {
      margin-top: 4px;
      margin-bottom: 8px;
      line-height: 1.8;
    }
    .checkbox-item {
      display: inline-block;
      gap: 30px;
    }
  </style>
</head>
<body>
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; justify-items: center; margin-bottom: 4px; margin-top: 0;">
  <div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">
    <img src="/getThemePhoto.png" alt="MarSULogo" width="100" style="display: block; margin: 10px auto;" />
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
    <h1 style="margin: 0; font-weight: bold; letter-spacing: 2px;">MARINDUQUE STATE UNIVERSITY</h1>
    <h3 style="margin: 0; font-weight: 400;">Gender and Development Unit</h3>
  </div>
  <div></div>
</div>
  <h3 style="margin: 0; font-weight: bold; text-align: center;">UNIVERSITY ACTIVITY ATTENDANCE SHEET</h3>
    <div style="margin-left: 50px;">
        <h4 style="font-weight: bold;">I.<b style="margin-left: 20px;">Activity Information</b></h4>
    <div style="margin-left: 30px;">
    <h4><span style="font-weight: bold;">Activity Title:</span> ${event.title || "Guest List"}</h4>
    <h4><span style="font-weight: bold;">Type of Activity:</span> ${typeOfActivityHTML}</h4>
    <h4> <span style="font-weight: bold;">Date:</span>${dateLabel}</h4>
    <h4><span style="font-weight: bold;">Venue:</span> ${event.venue || ""}</h4>
     <h4><span style="font-weight: bold;">Organizing Office/Unit::</span> ${event.organizing_office_unit || ""}</h4>
    </div>

  <h4 style="margin:12px 0px 24px 0px; font-weight: bold;">II.<b style="margin-left: 20px;">Participating Attendance</b></h4>
  </div>
  ${tablesHtml}
</body>
</html>`;

    import("html2pdf.js")
      .then((html2pdf) => {
        html2pdf
          .default()
          .from(html)
          .set({
            margin: 0,
            filename: `${event.title || "guest-list"}-guests.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { orientation: "landscape", unit: "mm", format: "legal" },
          })
          .save();
      })
      .catch((err) => {
        console.error("PDF export failed", err);
        alert("Unable to generate PDF. Please try again.");
      });
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${event?.title || "event"}-qr.png`;
    link.click();
  };

  const handleQrYesAccount = () => {
    setShowQrPrompt(false);
    if (userId) {
      return;
    }
    router.push(
      `/authentication/signin?redirect=/events/discover/${eventId}?qr=1`,
    );
  };

  const handleQrNoAccount = () => {
    setShowQrPrompt(false);
    router.push("/profile-registration");
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 h-screen">
        Loading event...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700 mb-4">
          {error}
        </div>
        <button
          onClick={() => router.push("/events-list")}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Back to Events
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center text-gray-500">Event not found.</div>
    );
  }

  const alreadyRegistered = (event.registered_users || []).some(
    (u) => u?.toString?.() === userId || u === userId,
  );

  return (
    <div className="max-w-7xl mx-auto p-5 space-y-6">
      {showQrPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold">
              Do you have a GEMS account?
            </h2>
            <p className="text-gray-600">
              If yes, sign in so we can link your participation. If not, we will
              take you to a quick survey instead.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={handleQrNoAccount}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                No, take survey
              </button>
              <button
                onClick={handleQrYesAccount}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Yes, I have an account
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => router.push("/events-list")}
        className="p-2 text-md inline-flex items-center text-blue-500"
        aria-label="Back to events"
      >
        <FiArrowLeft aria-hidden="true" />{" "}
        <p className="text-blue-500"> Back to Events</p>
      </button>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
          </div>
        </div>
      </div>
      <div className="border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-2 -mb-px border-b-2 text-md font-medium transition ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("guests")}
          className={`pb-3 px-2 -mb-px border-b-2 text-md font-medium transition ${
            activeTab === "guests"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Guest
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`pb-3 px-2 -mb-px border-b-2 text-md font-medium transition ${
            activeTab === "insights"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Insights
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 px-2 -mb-px border-b-2 text-md font-medium transition ${
            activeTab === "reports"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Post-Activity Report
        </button>
      </div>

      {activeTab === "overview" && (
        <OverviewTabs
          isPast={isPast}
          event={event}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          editData={editData}
          setEditData={setEditData}
          handleEditChange={handleEditChange}
          handleSave={handleSave}
          saving={saving}
          error={error}
          baseUrl={baseUrl}
          eventId={eventId}
          qrDataUrl={qrDataUrl}
          handleDownloadQr={handleDownloadQr}
          showQrPrompt={showQrPrompt}
          setShowQrPrompt={setShowQrPrompt}
          handleQrYesAccount={handleQrYesAccount}
          handleQrNoAccount={handleQrNoAccount}
          formatRange={formatRange}
          userId={userId}
          showDeleteModal={showDeleteModal}
          setShowDeleteModal={setShowDeleteModal}
          deleteError={deleteError}
          deleting={deleting}
          handleDeleteEvent={handleDeleteEvent}
          projects={projects}
          formatForInput={formatForInput}
          formatRangeLines={formatRangeLines}
        />
      )}

      {activeTab === "guests" && (
        <GuestTabs
          guestTab={guestTab}
          setGuestTab={setGuestTab}
          event={event}
          interestedSearch={interestedSearch}
          setInterestedSearch={setInterestedSearch}
          interestedSelectAll={interestedSelectAll}
          handleInterestedSelectAll={handleInterestedSelectAll}
          interestedSelected={interestedSelected}
          setInterestedSelected={setInterestedSelected}
          handleAssignGoing={handleAssignGoing}
          extractGuestDetails={extractGuestDetails}
          buildGuestRows={buildGuestRows}
          handleDownloadGuestsPdf={handleDownloadGuestsPdf}
          handleDownloadBlankGuestsPdf={handleDownloadBlankGuestsPdf}
          handlePrintGuests={handlePrintGuests}
          guestTypeFilter={guestTypeFilter}
          setGuestTypeFilter={setGuestTypeFilter}
          getFilteredGuests={getFilteredGuests}
        />
      )}

      {activeTab === "insights" && (
        <InsightTab
          insightsFilter={insightsFilter}
          setInsightsFilter={setInsightsFilter}
          totalRegistered={totalRegistered}
          maleCount={maleCount}
          femaleCount={femaleCount}
          statusCounts={statusCounts}
          interestedCount={interestedCount}
          notInterestedCount={notInterestedCount}
          ageGroupCounts={ageGroupCounts}
          goingCount={goingCount}
          genderDataChart={genderDataChart}
          affiliationData={affiliationData}
          eventData={eventData}
          ageData={ageData}
          collegeData={collegeData}
          perYearData={perYearData}
          PerYearChart={PerYearChart}
        />
      )}

      {activeTab === "reports" && <ReportTab event={event} />}
    </div>
  );
}

function OverviewTabs({
  isPast,
  event,
  isEditing,
  setIsEditing,
  editData,
  setEditData,
  handleEditChange,
  handleSave,
  saving,
  error,
  baseUrl,
  eventId,
  qrDataUrl,
  handleDownloadQr,
  showQrPrompt,
  setShowQrPrompt,
  handleQrYesAccount,
  handleQrNoAccount,
  formatRange,
  userId,
  showDeleteModal,
  setShowDeleteModal,
  deleteError,
  deleting,
  handleDeleteEvent,
  projects,
  formatForInput,
  formatRangeLines,
}) {
  const ELIGIBILITY_OPTIONS = [
    { value: "Scholarship Applicant", label: "Scholarship Applicant" },
    { value: "Solo Parent", label: "Solo Parent" },
    { value: "PWDs", label: "Person with Disability (PWD)" },
    { value: "Indigenous Group", label: "Indigenous Group Member" },
    { value: "LGBTQIA+", label: "LGBTQIA+" },
    { value: "Low Income Student", label: "Low-income Student" },
    { value: "None", label: "None" },
  ];
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterError, setPosterError] = useState("");
   const [generating, setGenerating] = useState(false);

 const generateDescription = async () => {
    setGenerating(true);
    try {
      // Pull variables from editData instead of formData
      const {
        title,
        venue,
        type_of_activity,
        gad_activity,
        eligibility_criteria,
        target_number_of_participants,
        start_dates,
      } = editData || {};

      const response = await fetch("/api/events/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          venue,
          number_of_days: start_dates?.length || 1, // Dynamically get days
          type_of_activity,
          gad_activity,
          eligibility_criteria,
          target_number_of_participants,
        }),
      });

      const data = await response.json();
      
      if (data.description) {
        handleEditChange("description", data.description);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate description.");
        } finally {
      setGenerating(false);
    }
  };


  const handlePosterUpload = async (file) => {
    if (!file) return;
    setPosterUploading(true);
    setPosterError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "events/posters");

      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      handleEditChange("event_poster", {
        url: res.data.url,
        key: res.data.key,
      });
    } catch (err) {
      setPosterError("Failed to upload image. Please try again.");
    } finally {
      setPosterUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {isPast && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <h1 className="text-xl font-medium text-red-700">
            This event has ended
          </h1>
          <p className="text-gray-700">
            Thank you for hosting. We hope it was a success!
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Event Details</h2>
          <button
            onClick={async () => {
              if (
                isEditing &&
                editData?.event_poster?.key &&
                editData.event_poster?.key !== event.event_poster?.key
              ) {
                try {
                  await axios.delete("/api/upload", {
                    data: { key: editData.event_poster.key },
                  });
                } catch (err) {
                  console.error("Failed to delete orphan poster:", err);
                }
              }
              setIsEditing((prev) => !prev);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
          >
            <FiEdit2 aria-hidden="true" />
          </button>
        </div>

        {!isEditing ? (
          <div>
            {/* {event.event_poster && (
  <div className="col-span-2">
    <p className="text-gray-500 text-sm">Event Poster</p>
    <img
      src={event.event_poster}
      alt="Event poster"
      className="mt-1 w-48 h-48 object-cover rounded border"
    />
  </div>
)} */}
            <div className="flex flex-col gap-2 mb-2">
              <div>
                <p className="text-gray-500 text-sm">Event Description</p>
                <p className="font-medium text-sm">{event.description}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">GAD Activity</p>
                <p className="font-medium text-sm">{event.gad_activity}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
              <div>
                <p className="text-gray-500">Date Range</p>
                <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                  {formatRangeLines(
                    event.start_date || event.date,
                    event.end_date,
                    event,
                  ).map((line, idx) => (
                    <span key={idx}>{line}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500">Number of Days</p>
                <p className="font-medium">
                  {(event.start_dates && event.start_dates.length) ||
                    event.number_of_days ||
                    1}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Venue</p>
                <p className="font-medium">{event.venue || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Participants</p>
                <p className="font-medium">
                  {event.registered_users.length || "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 mb-2">
                <label className="text-sm text-gray-600">Event Poster</label>
                {editData?.event_poster && (
                  <div className="mb-2">
                    <img
                      src={editData.event_poster.url}
                      alt="Event poster"
                      className="w-40 h-40 object-cover rounded border"
                    />
                    <button
                      type="button"
                      className="mt-1 text-xs text-red-500 hover:underline"
                      onClick={() => handleEditChange("event_poster", "")}
                    >
                      Remove poster
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="border rounded px-3 py-2 text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePosterUpload(file);
                  }}
                />

                {posterUploading && (
                  <p className="text-sm text-blue-500">Uploading...</p>
                )}
                {posterError && (
                  <p className="text-sm text-red-500">{posterError}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Type of Activity <span className="text-red-500">*</span>
                </label>
                <select
                  value={editData?.type_of_activity}
                  onChange={(e) =>
                    handleEditChange("type_of_activity", e.target.value)
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="Academic">Academic</option>
                  <option value="Administrative">Administrative</option>
                  <option value="GAD">GAD</option>
                  <option value="Extension Research">Extension Research</option>
                  <option value="Students">Students</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Project / GAD Activity <span className="text-red-500">*</span>
                </label>
                <select
                  value={
                    editData?.project && editData?.gad_activity
                      ? `${editData.project}||||${editData.gad_activity}`
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleEditChange("project", "");
                      handleEditChange("gad_activity", "");
                      return;
                    }
                    const [project, gad_activity] = val.split("||||");
                    handleEditChange("project", project);
                    handleEditChange("gad_activity", gad_activity);
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">No Project</option>
                  {projects.flatMap((proj) =>
                    (Array.isArray(proj.gad_activity)
                      ? proj.gad_activity
                      : [proj.gad_activity]
                    )
                      .filter(Boolean)
                      .map((activity, idx) => {
                        const label =
                          typeof activity === "object"
                            ? activity.value
                            : activity;

                        return (
                          <option
                            key={proj._id + "-" + idx}
                            value={proj._id + "||||" + label}
                          >
                            {label}
                          </option>
                        );
                      }),
                  )}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Title</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2"
                  value={editData?.title || ""}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Venue</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2"
                  value={editData?.venue || ""}
                  onChange={(e) => handleEditChange("venue", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Event Days
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Number of Days: {editData?.start_dates?.length || 1}
                </p>
                {editData?.start_dates &&
                  editData?.end_dates &&
                  editData.start_dates.map((start, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                      <span className="text-xs text-gray-500 mr-2">
                        Day {idx + 1}
                      </span>
                      <input
                        type="datetime-local"
                        className="border rounded px-2 py-1"
                        value={start}
                        onChange={(e) => {
                          const newStarts = [...editData.start_dates];
                          newStarts[idx] = e.target.value;
                          handleEditChange("start_dates", newStarts);
                        }}
                      />
                      <span className="mx-1">to</span>
                      <input
                        type="datetime-local"
                        className="border rounded px-2 py-1"
                        value={editData.end_dates[idx]}
                        onChange={(e) => {
                          const newEnds = [...editData.end_dates];
                          newEnds[idx] = e.target.value;
                          handleEditChange("end_dates", newEnds);
                        }}
                      />
                      <button
                        type="button"
                        className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                        onClick={() => {
                          const newStarts = editData.start_dates.filter(
                            (_, i) => i !== idx,
                          );
                          const newEnds = editData.end_dates.filter(
                            (_, i) => i !== idx,
                          );
                          handleEditChange("start_dates", newStarts);
                          handleEditChange("end_dates", newEnds);
                        }}
                        disabled={editData.start_dates.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                <button
                  type="button"
                  className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  onClick={() => {
                    handleEditChange("start_dates", [
                      ...(editData.start_dates || []),
                      "",
                    ]);
                    handleEditChange("end_dates", [
                      ...(editData.end_dates || []),
                      "",
                    ]);
                  }}
                >
                  Add Day
                </button>
              </div>
            </div>

           <div className="flex flex-col gap-1 mb-2">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-600">Description</label>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generating}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  {generating ? "Generating..." : "✨ Auto-Generate"}
                </button>
              </div>
              <textarea
                rows={4}
                className="border rounded px-3 py-2"
                value={editData?.description || ""}
                onChange={(e) =>
                  handleEditChange("description", e.target.value)
                }
              />
            </div>

            <CheckboxDropdown
              label="Organizing Office/Unit"
              options={[
                "Graduate School",
                "College of Agriculture",
                "College of Allied Health Sciences",
                "College of Arts & Social Sciences",
                "College of Business & Accountancy",
                "College of Criminal Justice Education",
                "College of Education",
                "College of Engineering",
                "College of Environmental Studies",
                "College of Fisheries & Aquatic Sciences",
                "College of Governance",
                "College of Industrial Technology",
                "College of Information & Computing Sciences",
                "Offices under the Office of the University President",
                "Offices under the Office of the Vice President for Academic Affairs",
                "Offices under the Office of the Vice President for Administration and Finance",
                "Offices under the Office of the Vice President for Research and Extension",
                "Offices under the Office of the Vice President for Student Affairs and Services",
              ]}
              selected={editData?.organizing_office_unit || []}
              onChange={(vals) =>
                handleEditChange("organizing_office_unit", vals)
              }
              required
            />
            <CheckboxDropdown
              label="Co Organizing Office/Unit"
              options={[
                "Graduate School",
                "College of Agriculture",
                "College of Allied Health Sciences",
                "College of Arts & Social Sciences",
                "College of Business & Accountancy",
                "College of Criminal Justice Education",
                "College of Education",
                "College of Engineering",
                "College of Environmental Studies",
                "College of Fisheries & Aquatic Sciences",
                "College of Governance",
                "College of Industrial Technology",
                "College of Information & Computing Sciences",
                "Offices under the Office of the University President",
                "Offices under the Office of the Vice President for Academic Affairs",
                "Offices under the Office of the Vice President for Administration and Finance",
                "Offices under the Office of the Vice President for Research and Extension",
                "Offices under the Office of the Vice President for Student Affairs and Services",
              ]}
              selected={editData?.co_organizing_office_unit || []}
              onChange={(vals) =>
                handleEditChange("co_organizing_office_unit", vals)
              }
              required
            />
            <div className="mb-2">
              <CheckboxDropdown
                label="Eligibility Criteria"
                options={ELIGIBILITY_OPTIONS.map((o) => o.value)}
                selected={editData?.eligibility_criteria || []}
                onChange={(vals) =>
                  handleEditChange("eligibility_criteria", vals)
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1 mb-6">
              <label className="text-sm text-gray-600">
                Target Number of Participants
              </label>
              <input
                type="text"
                className="border rounded px-3 py-2"
                value={editData?.target_number_of_participants || ""}
                onChange={(e) =>
                  handleEditChange(
                    "target_number_of_participants",
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={async () => {
                  if (
                    editData?.event_poster?.key &&
                    editData.event_poster?.key !== event.event_poster?.key
                  ) {
                    try {
                      await axios.delete("/api/upload", {
                        data: { key: editData.event_poster.key },
                      });
                    } catch (err) {
                      console.error("Failed to delete orphan poster:", err);
                    }
                  }
                  setIsEditing(false);
                  setEditData({
                    type_of_activity: event.type_of_activity,
                    project: event.project,
                    gad_activity: event.gad_activity,
                    title: event.title || "",
                    description: event.description || "",
                    number_of_days: event.number_of_days || "",
                    start_dates: Array.isArray(event.start_dates)
                      ? event.start_dates.map(formatForInput)
                      : [],
                    end_dates: Array.isArray(event.end_dates)
                      ? event.end_dates.map(formatForInput)
                      : [],
                    venue: event.venue || "",
                    status: event.status || "active",
                    organizing_office_unit: event.organizing_office_unit,
                    co_organizing_office_unit: event.co_organizing_office_unit,
                    eligibility_criteria: event.eligibility_criteria,
                    target_number_of_participants:
                      event.target_number_of_participants,
                    event_poster: event.event_poster || null,
                  });
                }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setIsEditing(false);
                }}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Event QR</h3>
            <p className="text-sm text-gray-600">
              Guests can scan to open this event page and get prompted based on
              their account status.
            </p>
          </div>
          <button
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            Download QR
          </button>
        </div>
        {qrDataUrl ? (
          <div className="flex items-center gap-4 flex-wrap">
            <img
              src={qrDataUrl}
              alt="Event QR code"
              className="w-40 h-40 border rounded-lg p-2 bg-white"
            />
            <div className="text-sm text-gray-700">
              <p className="font-semibold">Scan destination</p>
              <p className="break-all text-gray-600">
                {`${baseUrl}/events/discover/${eventId}?qr=1`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Generating QR...</p>
        )}
      </div>
      <div>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Event
        </button>

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-red-600">
                  Delete Event
                </h2>
              </div>
              <div className="px-6 py-4 text-md text-gray-700 font-medium">
                <p>Are you sure you want to delete this event?</p>
                <p className="mt-2 text-gray-500">
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-red-600 mt-2">{deleteError}</p>
                )}
              </div>
              <div className="px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border rounded text-sm"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded text-sm disabled:bg-gray-400"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuestTabs({
  guestTab,
  setGuestTab,
  event,
  interestedSearch,
  setInterestedSearch,
  interestedSelectAll,
  handleInterestedSelectAll,
  interestedSelected,
  setInterestedSelected,
  handleAssignGoing,
  extractGuestDetails,
  buildGuestRows,
  handleDownloadGuestsPdf,
  handleDownloadBlankGuestsPdf,
  handlePrintGuests,
  guestTypeFilter,
  setGuestTypeFilter,
  getFilteredGuests,
}) {
  const [goingPage, setGoingPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");
  const filteredGoingGuests = getFilteredGuests(event.registered_users);
  const totalGoingPages = Math.ceil(filteredGoingGuests.length / pageSize) || 1;
  const paginatedGoingGuests = filteredGoingGuests.slice(
    (goingPage - 1) * pageSize,
    goingPage * pageSize,
  );

  useEffect(() => {
    setGoingPage(1);
  }, [guestTypeFilter, event.registered_users, guestTab, pageSize]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);
  return (
    <div className="space-y-3">
      <button
        onClick={() => setGuestTab("going")}
        className={`pb-3 px-2 -mb-px border-b-2 text-md font-medium transition ${
          guestTab === "going"
            ? "border-blue-600 text-blue-700"
            : "border-transparent text-gray-600 hover:text-gray-800"
        }`}
      >
        Going
      </button>
      <button
        onClick={() => setGuestTab("interested")}
        className={`pb-3 px-2 -mb-px border-b-2 text-md font-medium transition ${
          guestTab === "interested"
            ? "border-blue-600 text-blue-700"
            : "border-transparent text-gray-600 hover:text-gray-800"
        }`}
      >
        Interested
      </button>
      {guestTab === "going" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-2">
            <h2 className="text-lg font-medium">
              Guest List ({filteredGoingGuests.length})
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {/* <label className="flex items-center gap-1 text-sm">
                Page size:
                <select
                  className="border rounded px-1 py-0.5 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[5, 10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label> */}
              <select
                className="border rounded px-2 py-1 text-sm"
                value={guestTypeFilter}
                onChange={(e) => setGuestTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="student">Students Only</option>
                <option value="employee">Employees Only</option>
              </select>
              <button
                onClick={() => handleDownloadGuestsPdf(filteredGoingGuests)}
                className="text-sm text-blue-600 hover:underline"
              >
                Download PDF
              </button>
              <button
                onClick={() => handleDownloadBlankGuestsPdf()}
                className="text-sm text-blue-600 hover:underline"
              >
                Blank Attendance Print
              </button>
              <button
                onClick={() => handlePrintGuests(filteredGoingGuests)}
                className="text-sm text-blue-600 hover:underline"
              >
                Print
              </button>
            </div>
          </div>
          {filteredGoingGuests.length > 0 ? (
            <>
              <div className="overflow-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr className="text-center">
                      <th className="p-2 font-medium">No.</th>
                      <th className="px-4 py-2 font-medium">Full Name</th>
                      <th className="px-4 py-2 font-medium">Sex</th>
                      <th className="px-4 py-2 font-medium">Gender Identity</th>
                      <th className="px-4 py-2 font-medium">Age</th>
                      <th className="px-4 py-2 font-medium">
                        Participant Type
                      </th>
                      <th className="px-4 py-2 font-medium">
                        Department/
                        <br />
                        Office/
                        <br />
                        Organization
                      </th>
                      <th className="px-4 py-2 font-medium">
                        Position/
                        <br />
                        Designation
                        <br />
                        (Employee/
                        <br />
                        Stakeholders)
                      </th>
                      <th className="px-4 py-2 font-medium">
                        Program/ <br />
                        Year/ <br />
                        Section
                        <br />
                        (For Students)
                      </th>
                      <th className="p-2 font-medium">Contact No.</th>
                      <th className="max-w-40 p-2 font-medium">
                        Email
                        <br /> Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedGoingGuests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-4 text-center text-gray-500"
                        >
                          No matching guests found.
                        </td>
                      </tr>
                    ) : (
                      paginatedGoingGuests.map((guest, idx) => {
                        const details = extractGuestDetails(guest);
                        return (
                          <tr key={guest?._id?.toString?.() || guest}>
                            <td className="p-2">
                              {(goingPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="p-2">{details.name}</td>
                            <td className="p-2 text-center">
                              {details.sex || "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.genderPreference || "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.age ?? "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.status || "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.department || "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.positionDesignation || "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.programYearSection || "—"}
                            </td>
                            <td className="p-2 text-center">
                              {details.contact || "—"}
                            </td>
                            <td className="max-w-40 truncate p-2 text-center">
                              {details.email || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between gap-2 mt-4">
                <span className="flex items-center gap-1 text-sm">
                  Rows per page:
                  <input
                    type="number"
                    min={1}
                    className="border rounded px-1 py-0.5 text-sm w-16"
                    value={pageSizeInput}
                    onChange={(e) => {
                      setPageSizeInput(e.target.value);
                      const val = Number(e.target.value);
                      if (e.target.value === "" || isNaN(val)) return;
                      if (val > 0) setPageSize(val);
                    }}
                    onBlur={(e) => {
                      if (
                        !pageSizeInput ||
                        isNaN(Number(pageSizeInput)) ||
                        Number(pageSizeInput) < 1
                      ) {
                        setPageSizeInput(String(pageSize));
                      }
                    }}
                  />
                </span>
                <div>
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    onClick={() => setGoingPage((p) => Math.max(1, p - 1))}
                    disabled={goingPage === 1}
                  >
                    Prev
                  </button>
                  <span className="px-2">
                    Page {goingPage} of {totalGoingPages}
                  </span>
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    onClick={() =>
                      setGoingPage((p) => Math.min(totalGoingPages, p + 1))
                    }
                    disabled={goingPage === totalGoingPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 h-screen">
              No guests registered yet.
            </div>
          )}
        </div>
      )}

      {guestTab === "interested" && (
        <div>
          <div className="flex flex-row justify-end gap-4 py-2">
            <input
              className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              placeholder="Search interested guests by name..."
              value={interestedSearch}
              onChange={(e) => setInterestedSearch(e.target.value)}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={interestedSelectAll}
                onChange={handleInterestedSelectAll}
              />
              <span>Select All</span>
            </label>
          </div>
          {Array.isArray(event.interested_users) &&
          event.interested_users.length > 0 ? (
            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr className="text-center">
                    <th className="px-4 py-2 font-medium">No.</th>
                    <th className="px-4 py-2 font-medium">Full Name</th>
                    <th className="px-4 py-2 font-medium">Sex</th>
                    <th className="px-4 py-2 font-medium">Gender Identity</th>
                    <th className="px-4 py-2 font-medium">Age</th>
                    <th className="px-4 py-2 font-medium">Participant Type</th>
                    <th className="px-4 py-2 font-medium">
                      Department/
                      <br />
                      Office/
                      <br />
                      Organization
                    </th>
                    <th className="px-4 py-2 font-medium">
                      Position/ <br />
                      Designation
                      <br />
                      (Employee/ <br />
                      Stakeholders)
                    </th>
                    <th className="px-4 py-2 font-medium">
                      Program/ <br />
                      Year/ <br />
                      Section
                      <br />
                      (For Students)
                    </th>
                    <th className="px-4 py-2 font-medium">Contact No.</th>
                    <th className="px-4 py-2 font-medium max-w-40 truncate">
                      Email Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const filtered = event.interested_users.filter((guest) => {
                      const details = extractGuestDetails(guest);
                      if (!interestedSearch) return true;
                      return details.name
                        ?.toLowerCase()
                        .includes(interestedSearch.toLowerCase());
                    });
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-4 text-center text-gray-500"
                          >
                            No matching guests found.
                          </td>
                        </tr>
                      );
                    }
                    return filtered.map((guest, idx) => {
                      const details = extractGuestDetails(guest);
                      return (
                        <tr key={guest?._id?.toString?.() || guest}>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={interestedSelected.includes(guest._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setInterestedSelected((prev) => [
                                    ...prev,
                                    guest._id,
                                  ]);
                                } else {
                                  setInterestedSelected((prev) =>
                                    prev.filter((id) => id !== guest._id),
                                  );
                                }
                              }}
                            />
                            {/* {idx + 1} */}
                          </td>
                          <td className="px-4 py-2">{details.name}</td>
                          <td className="px-4 py-2 text-center">
                            {details.sex || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.genderPreference || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.age ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.status || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.department || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.positionDesignation || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.programYearSection || "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {details.contact || "—"}
                          </td>
                          <td className="px-4 py-2 text-center max-w-40 truncate">
                            {details.email || "—"}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              No guests registered yet.
            </div>
          )}
          <div className="pt-4">
            <button
              className="bg-black text-white px-4 py-1 rounded-md"
              disabled={interestedSelected.length === 0}
              onClick={handleAssignGoing}
            >
              Assign Going
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightTab({
  insightsFilter,
  setInsightsFilter,
  totalRegistered,
  maleCount,
  femaleCount,
  statusCounts,
  interestedCount,
  notInterestedCount,
  ageGroupCounts,
  goingCount,
  genderDataChart,
  affiliationData,
  eventData,
  ageData,
  collegeData,
  perYearData,
  PerYearChart,
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <select
          className="border rounded px-3 py-2 text-sm bg-white"
          value={insightsFilter}
          onChange={(e) => setInsightsFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="going">Going</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
        </select>
        {/* <button className="bg-black text-white px-4 py-1 rounded-md">
          Generate Report
        </button> */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg bg-white">
          <p className="text-sm text-gray-500">Interested</p>
          <p className="text-2xl font-semibold">{interestedCount}</p>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <p className="text-sm text-gray-500">Not Interested</p>
          <p className="text-2xl font-semibold">{notInterestedCount}</p>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <p className="text-sm text-gray-500">Going</p>
          <p className="text-2xl font-semibold">{goingCount}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
        <div className="border border-gray-200 p-4 rounded-md gap-4">
          <div className="flex flex-col border-gray-400">
            {/* <div className="flex flex-col">
            <p className="text-sm text-gray-500">Total Registered</p>
            <p className="text-md font-semibold">{totalRegistered}</p>
          </div> */}
            <h1 className="text-md font-medium">Sex At Birth</h1>
            <div className="flex flex-row gap-2">
              <div className=" flex flex-row gap-1 justify-center border border-gray-200 px-2 py-1">
                <p className="text-sm text-gray-500">Male:</p>
                <p className="text-sm font-semibold">{maleCount}</p>
              </div>
              <div className=" flex flex-row gap-1 justify-center border border-gray-200 px-2 py-1">
                <p className="text-sm text-gray-500">Female:</p>
                <p className="text-sm font-semibold">{femaleCount}</p>
              </div>
            </div>
          </div>
          <h1 className="text-md font-medium">Status</h1>
          <div className="flex flex-row gap-4">
            {statusCounts.map((s) => (
              <div
                key={s.name}
                className="flex flex-row gap-2 border border-gray-200 px-2 py-1"
              >
                <p className="text-sm text-gray-500">{s.name}:</p>
                <p className="text-sm font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
          <div>
            <h1 className="text-md font-medium">Age Group</h1>
            <div className="grid md:grid-cols-6 grid-cols-3 gap-2 rounded-md">
              {ageGroupCounts && Object.keys(ageGroupCounts).length > 0 ? (
                Object.entries(ageGroupCounts)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([label, count]) => (
                    <div
                      key={label}
                      className="flex flex-row items-center justify-center px-2 py-1 border border-gray-200"
                    >
                      <span className="text-sm text-gray-500">{label}: </span>
                      <span className="text-sm">{count}</span>
                    </div>
                  ))
              ) : (
                <span className="text-gray-500">
                  No age group data available.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border border-gray-200 p-4 rounded-md">
          <h1 className="text-md font-medium">College</h1>
          <div className="flex flex-col">
            {Array.isArray(collegeData) && collegeData.length > 0 ? (
              collegeData.map((c) => (
                <div key={c.name} className="text-sm flex items-center gap-2">
                  <span className="text-gray-500">{c.name}</span>
                  <span className="ml-auto font-medium">{c.value}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-500">No college data available.</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
        <div className="gap-4 grid md:grid-cols-3 grid-cols-1">
          <SexChart data={genderDataChart} />
          <StatusChart data={affiliationData} />
          <EventChart data={eventData} />
        </div>
        <AgeChart data={ageData} />
        <CollegeChart data={collegeData} />
        <PerYearChart data={perYearData} />
      </div>
    </div>
  );
}

function ReportTab({ event }) {
  const [form, setForm] = useState({ narrative: "" });

  const [files, setFiles] = useState({
    office_memorandum: null,
    activity_design: null,
    attendance_sheet: null,
    photos: [],
    other_attachments: [],
  });

  const [uploading, setUploading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [deletedPhotoKeys, setDeletedPhotoKeys] = useState([]);
  const [deletedAttachmentKeys, setDeletedAttachmentKeys] = useState([]);

  const deleteFileByKey = async (key) => {
    if (!key) return;
    try {
      await axios.delete("/api/upload", { data: { key } });
    } catch (err) {
      console.log("Failed to delete old file:", err);
    }
  };

  const handleEdit = () => {
    setForm({ narrative: showReport?.narrative || "" });
    setFiles({
      office_memorandum: showReport?.office_memorandum || null,
      activity_design: showReport?.activity_design || null,
      attendance_sheet: showReport?.attendance_sheet || null,
      photos: showReport?.photos || [],
      other_attachments: showReport?.other_attachments || [],
    });
    setIsEditing(true);
  };

  const handleSingleFileUpload = async (file, field, folder) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles((prev) => {
        const oldFile = prev[field];
        if (oldFile?.key) deleteFileByKey(oldFile.key);
        return { ...prev, [field]: { url: res.data.url, key: res.data.key } };
      });
    } catch {
      setError(`Failed to upload ${field}`);
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handlePhotosUpload = async (fileList) => {
    setUploading((prev) => ({ ...prev, photos: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "reports/photos");
          const res = await axios.post("/api/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return { url: res.data.url, key: res.data.key };
        }),
      );
      setFiles((prev) => ({
        ...prev,
        photos: isEditing ? [...prev.photos, ...uploaded] : uploaded,
      }));
    } catch {
      setError("Failed to upload photos");
    } finally {
      setUploading((prev) => ({ ...prev, photos: false }));
    }
  };

  const handleOtherAttachmentsUpload = async (fileList) => {
    setUploading((prev) => ({ ...prev, other_attachments: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "reports/other-attachments");
          const res = await axios.post("/api/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return { url: res.data.url, key: res.data.key, name: file.name };
        }),
      );
      setFiles((prev) => ({
        ...prev,
        other_attachments: [...prev.other_attachments, ...uploaded], // ← always append
      }));
    } catch {
      setError("Failed to upload attachments");
    } finally {
      setUploading((prev) => ({ ...prev, other_attachments: false }));
    }
  };
  ``;
  const removePhoto = (idx) => {
    setDeletedPhotoKeys((prev) => {
      const photo = files.photos[idx];
      if (!photo?.key) return prev;
      return [...prev, photo.key];
    });
    setFiles((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  const removeOtherAttachment = (idx) => {
    setDeletedAttachmentKeys((prev) => {
      const file = files.other_attachments[idx];
      if (!file?.key) return prev;
      return [...prev, file.key];
    });
    setFiles((prev) => ({
      ...prev,
      other_attachments: prev.other_attachments.filter((_, i) => i !== idx),
    }));
  };

const fetchReport = async () => {
  try {
    const res = await fetch(`/api/events/accomplishment-report/${event._id}`);
    const data = await res.json();

    console.log("fetchReport response:", data); 

    if (!data?.data) {
      setShowReport(null);
      return;
    }

    const report = data.data;

    const hasContent =
      report.narrative?.trim() ||
      report.office_memorandum?.url ||
      report.activity_design?.url ||
      report.attendance_sheet?.url ||
      report.photos?.length > 0 ||
      report.other_attachments?.length > 0;

    if (!hasContent) {
      setShowReport(null);
      return;
    }

    setShowReport(report);
  } catch {
    setShowReport(null);
  }
};

  useEffect(() => {
    if (event?._id) fetchReport();
  }, [event?._id]);

const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setError("");
  setSuccess("");

  try {
    const url = isEditing
      ? `/api/events/accomplishment-report/${event._id}`
      : `/api/events/accomplishment-report`;
    const method = isEditing ? "PUT" : "POST";

    const currentFiles = { ...files };
    const currentDeletedPhotoKeys = [...deletedPhotoKeys];
    const currentDeletedAttachmentKeys = [...deletedAttachmentKeys];

    if (currentDeletedPhotoKeys.length > 0) {
      await Promise.all(currentDeletedPhotoKeys.map((key) => deleteFileByKey(key)));
    }
    if (currentDeletedAttachmentKeys.length > 0) {
      await Promise.all(currentDeletedAttachmentKeys.map((key) => deleteFileByKey(key)));
    }

    const payload = {
      event_id: event._id,
      narrative: form.narrative,
      office_memorandum: currentFiles.office_memorandum,
      activity_design: currentFiles.activity_design,
      attendance_sheet: currentFiles.attendance_sheet,
      photos: currentFiles.photos.filter(
        (p) => !currentDeletedPhotoKeys.includes(p.key)
      ),
      other_attachments: currentFiles.other_attachments.filter(
        (p) => !currentDeletedAttachmentKeys.includes(p.key)
      ),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to submit");
    }

    const responseData = await res.json();
    const savedReport = responseData.data || responseData;

    // ← directly set from response, no fetchReport needed
    setShowReport(savedReport);

    setSuccess(
      isEditing ? "Report updated successfully." : "Report submitted successfully.",
    );
    setForm({ narrative: "" });
    setFiles({
      office_memorandum: null,
      activity_design: null,
      attendance_sheet: null,
      photos: [],
      other_attachments: [],
    });
    setDeletedPhotoKeys([]);
    setDeletedAttachmentKeys([]);
    setIsEditing(false);

  } catch (err) {
    console.error("Submit error:", err);
    setError(err.message || "Failed to submit report.");
  } finally {
    setSubmitting(false);
  }
};

if (showReport !== null && !isEditing) {
    return (
      <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        {previewImg && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setPreviewImg(null)}
          >
            <img
              src={previewImg}
              className="max-w-[90%] max-h-[90%] rounded shadow-lg"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Accomplishment Report</h3>
          <button
            onClick={handleEdit}
            className="px-4 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Edit
          </button>
        </div>

        <div>
          <h4 className="font-semibold text-gray-600">Narrative </h4>
          <p className="text-sm whitespace-pre-wrap">{showReport.narrative}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold">Office Memorandum</h4>
            {showReport.office_memorandum?.url ? (
              <img
                src={showReport.office_memorandum.url}
                className="h-40 w-full object-cover rounded border cursor-pointer"
                onClick={() => setPreviewImg(showReport.office_memorandum.url)}
              />
            ) : (
              <p className="text-xs text-gray-400">No file uploaded</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold">Activity Design</h4>
            {showReport.activity_design?.url ? (
              <img
                src={showReport.activity_design.url}
                className="h-40 w-full object-cover rounded border cursor-pointer"
                onClick={() => setPreviewImg(showReport.activity_design.url)}
              />
            ) : (
              <p className="text-xs text-gray-400">No file uploaded</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold">Attendance Sheet</h4>
          {showReport.attendance_sheet?.url ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <img
                src={showReport.attendance_sheet.url}
                className="h-40 w-full object-cover rounded border cursor-pointer"
                onClick={() => setPreviewImg(showReport.attendance_sheet.url)}
              />
            </div>
          ) : (
            <p className="text-xs text-gray-400">No file uploaded</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold">Event Photos </h4>
          {showReport.photos?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {showReport.photos.map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  className="h-40 w-full object-cover rounded border cursor-pointer"
                  onClick={() => setPreviewImg(p.url)}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No photos uploaded</p>
          )}
        </div>

        {/* Other Attachments - view mode */}
        <div>
          <h4 className="font-semibold">Other Attachments</h4>
          {showReport.other_attachments?.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1">
              {showReport.other_attachments.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border rounded px-3 py-2 text-sm bg-gray-50 text-blue-600 hover:underline"
                >
                  📎 {file.name || `Attachment ${i + 1}`}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No attachments uploaded</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="border border-gray-200 rounded-lg p-6 space-y-4 bg-white"
      >
        <h3 className="text-lg font-semibold">Post-Activity Report</h3>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <div>
          <label className="block text-sm font-medium mb-1">
            Narrative Report <span className="text-red-500">*</span>
          </label>
          <textarea
            name="narrative"
            value={form.narrative}
            onChange={(e) => setForm({ ...form, narrative: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm min-h-[100px] resize-y"
            placeholder="Describe what happened during the event..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Office Memorandum <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="border rounded px-3 py-2 text-sm w-full"
            onChange={(e) =>
              handleSingleFileUpload(
                e.target.files[0],
                "office_memorandum",
                "reports/memorandum",
              )
            }
          />
          {uploading.office_memorandum && (
            <p className="text-xs text-blue-500 mt-1">Uploading...</p>
          )}
          {files.office_memorandum?.url && (
            <div className="relative mt-2 inline-block">
              <img
                src={files.office_memorandum.url}
                className="w-20 h-20 object-cover rounded border"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                onClick={() =>
                  setFiles((prev) => ({ ...prev, office_memorandum: null }))
                }
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Activity Design <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="border rounded px-3 py-2 text-sm w-full"
            onChange={(e) =>
              handleSingleFileUpload(
                e.target.files[0],
                "activity_design",
                "reports/activity-design",
              )
            }
          />
          {uploading.activity_design && (
            <p className="text-xs text-blue-500 mt-1">Uploading...</p>
          )}
          {files.activity_design?.url && (
            <div className="relative mt-2 inline-block">
              <img
                src={files.activity_design.url}
                className="w-20 h-20 object-cover rounded border"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                onClick={() =>
                  setFiles((prev) => ({ ...prev, activity_design: null }))
                }
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Attendance Sheet <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="border rounded px-3 py-2 text-sm w-full"
            onChange={(e) =>
              handleSingleFileUpload(
                e.target.files[0],
                "attendance_sheet",
                "reports/attendance",
              )
            }
          />
          {uploading.attendance_sheet && (
            <p className="text-xs text-blue-500 mt-1">Uploading...</p>
          )}
          {files.attendance_sheet?.url && (
            <div className="relative mt-2 inline-block">
              <img
                src={files.attendance_sheet.url}
                className="w-20 h-20 object-cover rounded border"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                onClick={() =>
                  setFiles((prev) => ({ ...prev, attendance_sheet: null }))
                }
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Event Photos <span className="text-red-500">*</span></label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="border rounded px-3 py-2 text-sm w-full"
            onChange={(e) => handlePhotosUpload(e.target.files)}
          />
          {uploading.photos && (
            <p className="text-xs text-blue-500 mt-1">Uploading photos...</p>
          )}
          {files.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.photos.map((p, i) => (
                <div key={i} className="relative">
                  <img
                    src={p.url}
                    className="w-20 h-20 object-cover rounded border"
                    alt={`photo-${i}`}
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    onClick={() => removePhoto(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Other Attachments <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            multiple
            className="border rounded px-3 py-2 text-sm w-full"
            onChange={(e) => handleOtherAttachmentsUpload(e.target.files)}
          />
          {uploading.other_attachments && (
            <p className="text-xs text-blue-500 mt-1">
              Uploading attachments...
            </p>
          )}
          {files.other_attachments.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {files.other_attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 border rounded px-3 py-2 text-sm bg-gray-50"
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex-1 truncate"
                  >
                    📎 {file.name || `Attachment ${i + 1}`}
                  </a>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 text-xs px-2 shrink-0"
                    onClick={() => removeOtherAttachment(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setForm({ narrative: "" });
                setFiles({
                  office_memorandum: null,
                  activity_design: null,
                  attendance_sheet: null,
                  photos: [],
                  other_attachments: [],
                });
                setDeletedPhotoKeys([]);
                setDeletedAttachmentKeys([]);
                setShowReport(showReport);
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function SexChart({ data }) {
  const COLORS = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#06b6d4"];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="bg-gray-50 p-4 w-full rounded-md">
        <h2 className="font-semibold mb-2">Sex Breakdown</h2>
        {safeData.length === 0 ? (
          <p className="text-sm text-gray-600">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={safeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {safeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatusChart({ data }) {
  const COLORS = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#06b6d4"];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="bg-gray-50 p-4 w-full rounded-md">
        <h2 className="font-semibold mb-2">Status Breakdown</h2>
        {safeData.length === 0 ? (
          <p className="text-sm text-gray-600">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={safeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {safeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EventChart({ data }) {
  const COLORS = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#06b6d4"];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="bg-gray-50 p-4 w-full rounded-md">
        <h2 className="font-semibold mb-2">Event Breakdown</h2>
        {safeData.length === 0 ? (
          <p className="text-sm text-gray-600">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={safeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {safeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function CollegeChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">College</h2>
      </div>
      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal">
            <XAxis dataKey="name" type="category" width={120} />
            <YAxis type="number" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#38bdf8">
              <LabelList dataKey="value" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PerYearChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">Per Year</h2>
      </div>
      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal">
            <XAxis dataKey="name" type="category" width={120} />
            <YAxis type="number" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#38bdf8">
              <LabelList dataKey="value" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

//sample filter attendance
// export function groupStudentsByCollegeYear(guests) {
//   const groups = {};
//   guests.forEach((guest) => {
//     if (guest.status === "Student") {
//       const college = guest.college || "Unknown College";
//       const year = guest.year || "Unknown Year";
//       if (!groups[college]) groups[college] = {};
//       if (!groups[college][year]) groups[college][year] = [];
//       groups[college][year].push(guest);
//     }
//   });
//   return groups;
// }

// export function groupEmployeesByOffice(guests) {
//   const groups = {};
//   guests.forEach((guest) => {
//     if (guest.status === "Employee") {
//       const office = guest.office || "Unknown Office";
//       if (!groups[office]) groups[office] = [];
//       groups[office].push(guest);
//     }
//   });
//   return groups;
// }

function AgeChart({ data }) {
  return (
    <div className="bg-white shadow rounded">
      <div className="bg-gray-200 px-4 py-2">
        <h2 className="text-xl font-semibold text-center">Age Group</h2>
      </div>
      <div className="w-full h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal">
            <XAxis dataKey="name" type="category" />
            <YAxis type="number" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#38bdf8">
              <LabelList dataKey="value" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
