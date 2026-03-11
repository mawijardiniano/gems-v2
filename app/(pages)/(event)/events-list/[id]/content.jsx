"use client";

import axios from "axios";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
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
          setEditData({
            title: evt.title || "",
            description: evt.description || "",
            start_date: formatForInput(evt.start_date || evt.date),
            end_date: formatForInput(evt.end_date),
            venue: evt.venue || "",
            status: evt.status || "active",
            eligibility_criteria: evt.eligibility_criteria,
            target_number_of_participants: evt.target_number_of_participants,
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
    const end = event.end_date || event.start_date || event.date;
    if (!end) return false;
    return new Date(end).getTime() < Date.now();
  }, [event]);

  const formatRange = (start, end) => {
    if (!start) return "No date";
    const opts = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    const format = (value) => {
      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? "Invalid date"
        : d.toLocaleString(undefined, opts);
    };

    const startStr = format(start);
    if (!end) return startStr;
    const endStr = format(end);
    return `${startStr} - ${endStr}`;
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

  const formatCheckboxPair = (value) => {
    const normalized = (value || "").toLowerCase();
    const isMale = normalized === "male";
    const isFemale = normalized === "female";
    return `[${isMale ? "x" : " "}] Male\n[${isFemale ? "x" : " "}] Female`;
  };

  const formatGenderCheckbox = (value) => {
    const normalized = (value || "").toLowerCase();
    const isMale = normalized === "male";
    const isFemale = normalized === "female";
    const isLgbt = normalized === "lgbt" || normalized === "lgbtqia+";
    return (
      `[${isMale ? "x" : " "}] Male\n` +
      `[${isFemale ? "x" : " "}] Female\n` +
      `[${isLgbt ? "x" : " "}] LGBTQIA+`
    );
  };

  const formatParticipantCheckbox = (value) => {
    const normalized = (value || "").toLowerCase();
    const isStudent = normalized === "student";
    const isEmployee = normalized === "employee";
    const isExternal = normalized === "external";
    return (
      `[${isStudent ? "x" : " "}] Student\n` +
      `[${isEmployee ? "x" : " "}] Employee\n` +
      `[${isExternal ? "x" : " "}] External Stakeholders`
    );
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
    const getDepartmentRaw = (details) =>
      details.office || details.college || "No Department/College";
    const sorted = [...guests].sort((a, b) => {
      const detailsA = extractGuestDetails(a);
      const detailsB = extractGuestDetails(b);
      const depA = (getDepartmentRaw(detailsA) || "").toLowerCase();
      const depB = (getDepartmentRaw(detailsB) || "").toLowerCase();
      if (depA < depB) return -1;
      if (depA > depB) return 1;
      const nameA = (detailsA.name || "").toLowerCase();
      const nameB = (detailsB.name || "").toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    let rowIdx = 1;
    const rows = [];
    let lastDepartment = null;
    sorted.forEach((g) => {
      const details = extractGuestDetails(g);
      const departmentRaw =
        details.office || details.college || "No Department/College";
      if (departmentRaw !== lastDepartment) {
        rows.push({
          isDepartmentHeader: true,
          department: departmentRaw,
        });
        lastDepartment = departmentRaw;
        rowIdx = 1;
      }
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
      // Try to extract a number for fallback
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
        const payload = {
          ...editData,
          start_date: new Date(editData.start_date).toISOString(),
          end_date: new Date(editData.end_date).toISOString(),
          updated_by: userId,
        };
        console.log('Saving event payload:', payload);
        const res = await axios.put(`/api/events/${event._id}`, payload);
        const updated = res.data?.data || event;
        setEvent(updated);
        setEditData({
          title: updated.title || "",
          description: updated.description || "",
          start_date: formatForInput(updated.start_date || updated.date),
          end_date: formatForInput(updated.end_date),
          venue: updated.venue || "",
          status: updated.status || "active",
          eligibility_criteria: updated.eligibility_criteria,
          target_number_of_participants: updated.target_number_of_participants,
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
      "Students",      "Others",
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

    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable").catch(() => null),
      ]);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "legal",
      });

      const pageWidth = doc.internal.pageSize.getWidth();

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
      ];

      const selectedType = event.type_of_activity || "";
      const isPredefined = ACTIVITY_TYPES.includes(selectedType);

      let typeList = ACTIVITY_TYPES.map((type) => {
        const mark = type === selectedType ? "(X)" : "( )";
        return `${mark} ${type}`;
      }).join("    ");

      if (isPredefined) {
        typeList += "    ( ) Other";
      } else if (selectedType) {
        typeList += `    (X) Other: ${selectedType}`;
      } else {
        typeList += "    ( ) Other: __________";
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("UNIVERSITY ACTIVITY ATTENDANCE SHEET", pageWidth / 2, 12, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      let y = 20;

      doc.text("I. Activity Information", 14, y);
      y += 6;

      doc.text(`Activity Title: ${event.title || ""}`, 14, y);
      y += 6;

      const labelX = 14;
      const listX = 50;
      doc.text("Type of Activity:", labelX, y);
      doc.text(typeList, listX, y);
      y += 6;

      doc.text(`Date: ${dateLabel}`, 14, y);
      y += 6;

      doc.text(`Venue: ${event.venue || ""}`, 14, y);
      y += 6;

      doc.text(
        `Organizing Office/Unit: ${event.organizing_office_unit || ""}`,
        14,
        y,
      );

      y += 10;

      doc.text("II. Participating Attendance", 14, y);
      y += 6;

      const head = [
        [
          "No.",
          "Full Name",
          "Sex",
          "Gender Identity",
          "Age",
          "Participant Type",
          "Department / Office / Organization",
          "Position/\nDesignation\n(Employee/\nStakeholders)",
          "Program / Year / Section(For Students)",
          "Contact No.",
          "Email Address",
          "Signature",
        ],
      ];

      const blankBody = Array.from({ length: 100 }, () => [
        "",
        "",
        formatCheckboxPair(""),
        formatGenderCheckbox(""),
        "",
        formatParticipantCheckbox(""),
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      const autoTable =
        autoTableModule?.default || doc.autoTable || doc.lastAutoTable;

      if (typeof autoTable === "function") {
        autoTable(doc, {
          head,
          body: blankBody,
          startY: y,
          margin: { left: 6, right: 6 },
          tableWidth: pageWidth - 12,
          styles: {
            fontSize: 10,
            cellPadding: 3,
            halign: "center",
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: 0,
            lineWidth: 0.1,
          },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { halign: "left", cellWidth: "auto" },
            2: { halign: "left", cellWidth: 22 },
            3: { halign: "left", cellWidth: 28 },
            4: { halign: "center", cellWidth: 14 },
            5: { halign: "left", cellWidth: 46 },
            6: { halign: "left", cellWidth: 28 },
            7: { halign: "left", cellWidth: 36 },
            8: { halign: "left", cellWidth: 28 },
            9: { halign: "left", cellWidth: 26 },
            10: { halign: "left", cellWidth: 32 },
            11: { halign: "left", cellWidth: 24 },
          },
        });
      }

      doc.save(`${event.title || "guest-list"}-blank.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Unable to generate PDF. Please try again.");
    }
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
      <div className="p-6 text-center text-gray-500">Loading event...</div>
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* <button
            onClick={() => router.push("/events-list")}
            className="p-2 text-2xl inline-flex items-center"
            aria-label="Back to events"
          >
            <FiArrowLeft aria-hidden="true" />
          </button> */}
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {formatRange(event.start_date || event.date, event.end_date)}
            </p>
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
            onClick={() => setIsEditing((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
          >
            <FiEdit2 aria-hidden="true" />
            {isEditing ? "" : ""}
          </button>
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 text-sm text-gray-800">
            <div>
              <p className="text-gray-500">Start</p>
              <p className="font-medium">
                {formatRange(event.start_date || event.date, null)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">End</p>
              <p className="font-medium">{formatRange(event.end_date, null)}</p>
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
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex flex-col gap-1 mb-2">
                <label className="text-sm text-gray-600">Start</label>
                <input
                  type="datetime-local"
                  className="border rounded px-3 py-2"
                  value={editData?.start_date || ""}
                  onChange={(e) =>
                    handleEditChange("start_date", e.target.value)
                  }
                />
              </div>
              <div className="flex flex-col gap-1 mb-2">
                <label className="text-sm text-gray-600">End</label>
                <input
                  type="datetime-local"
                  className="border rounded px-3 py-2"
                  value={editData?.end_date || ""}
                  onChange={(e) => handleEditChange("end_date", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-2">
              <label className="text-sm text-gray-600">Description</label>
              <textarea
                rows={4}
                className="border rounded px-3 py-2"
                value={editData?.description || ""}
                onChange={(e) =>
                  handleEditChange("description", e.target.value)
                }
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm">Eligibility Criteria</label>
              <select
                value={editData?.eligibility_criteria}
                onChange={(e) =>
                  handleEditChange("eligibility_criteria", e.target.value)
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select eligibility criteria</option>
                {ELIGIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    title: event.title || "",
                    description: event.description || "",
                    start_date: formatForInput(event.start_date || event.date),
                    end_date: formatForInput(event.end_date),
                    venue: event.venue || "",
                    status: event.status || "active",
                    eligibility_criteria: event.eligibility_criteria,
                    target_number_of_participants:
                      event.target_number_of_participants,
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
                      <th className="p-2 font-medium">
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
                            <td className="p-2 text-center">
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
            <div className="text-sm text-gray-600">
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
                    <th className="px-4 py-2 font-medium">Email Address</th>
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
                          <td className="px-4 py-2 text-center">
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
        <button className="bg-black text-white px-4 py-1 rounded-md">
          Generate Report
        </button>
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

      <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-6 gap-2 rounded-md">
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
        <div className="gap-4 grid grid-cols-3">
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
