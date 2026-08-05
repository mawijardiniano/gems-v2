"use client";

import axios from "axios";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import { COLLEGE_TO_PROGRAMS, YEAR_LEVELS } from "@/lib/colleges";
import OverviewTab from "./components/OverviewTab";
import GuestTab from "./components/GuestTab";
import InsightTab from "./components/InsightTab";
import ReportTab from "./components/ReportTab";
import {
  buildGuestRows,
  handlePrintGuests,
  handleDownloadGuestsPdf,
  handleDownloadBlankGuestsPdf,
} from "./components/PrintUtils";

export default function EventManageContent() {
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
  const [guestCollegeFilter, setGuestCollegeFilter] = useState("");
  const [guestCourseFilter, setGuestCourseFilter] = useState("");
  const [guestYearFilter, setGuestYearFilter] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [attendanceQrDataUrl, setAttendanceQrDataUrl] = useState("");
  const [interestedSearch, setInterestedSearch] = useState("");
  const [insightsFilter, setInsightsFilter] = useState("all");

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
        if (guestCollegeFilter && details.college !== guestCollegeFilter)
          return false;
        if (guestCourseFilter && details.course !== guestCourseFilter)
          return false;
        if (guestYearFilter && details.yearLevel !== guestYearFilter)
          return false;
        if (!guestSearch) return true;
        const searchTerm = guestSearch.toLowerCase();
        return (
          details.name?.toLowerCase().includes(searchTerm) ||
          details.course?.toLowerCase().includes(searchTerm) ||
          details.college?.toLowerCase().includes(searchTerm) ||
          details.department?.toLowerCase().includes(searchTerm) ||
          details.programYearSection?.toLowerCase().includes(searchTerm)
        );
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
          let startDates =
            Array.isArray(evt.start_dates) && evt.start_dates.length > 0
              ? evt.start_dates.map(formatForInput)
              : [formatForInput(evt.start_date || evt.date)];
          let endDates =
            Array.isArray(evt.end_dates) && evt.end_dates.length > 0
              ? evt.end_dates.map(formatForInput)
              : [formatForInput(evt.end_date)];
          if (!startDates[0])
            startDates[0] = formatForInput(evt.start_date || evt.date);
          if (!endDates[0]) endDates[0] = formatForInput(evt.end_date);
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

  useEffect(() => {
    const buildAttendanceQr = async () => {
      if (!baseUrl || !eventId) return;
      try {
        const deepLink = `${baseUrl}/events/attendance/${eventId}`;
        const dataUrl = await QRCode.toDataURL(deepLink, { width: 220 });
        setAttendanceQrDataUrl(dataUrl);
      } catch (e) {
        setAttendanceQrDataUrl("");
      }
    };
    buildAttendanceQr();
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

  const formatDateOnly = (value) => {
    const opts = {
      month: "long",
      day: "numeric",
      year: "numeric",
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
    const cleaned = value
      .replace(/\b(of|and|the|&)\b/gi, " ")
      .replace(/[()]/g, " ");
    const matches = cleaned.match(/\b[A-Za-z0-9]/g);
    if (!matches) return value.trim();
    return matches.join("").toUpperCase();
  };

  const capitalizeName = (value) => {
    if (!value || typeof value !== "string") return value;
    return value
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
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

  const filteredProfiles = useMemo(() => {
    if (insightsFilter === "going") return goingProfiles;
    if (insightsFilter === "interested") return interestedProfiles;
    if (insightsFilter === "not_interested") return notInterestedProfiles;
    return [...goingProfiles, ...interestedProfiles, ...notInterestedProfiles];
  }, [insightsFilter, goingProfiles, interestedProfiles, notInterestedProfiles]);

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
      course: academic.course || "",
      yearLevel: academic.year_level || "",
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

  const buildRows = (guests) =>
    buildGuestRows(guests, extractGuestDetails, capitalizeName);

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

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${event?.title || "event"}-qr.png`;
    link.click();
  };

  const handleDownloadAttendanceQr = () => {
    if (!attendanceQrDataUrl) return;
    const link = document.createElement("a");
    link.href = attendanceQrDataUrl;
    link.download = `${event?.title || "event"}-attendance-qr.png`;
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <FaSpinner className="animate-spin text-blue-500" size={20} />
          <span>Loading event...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-error mb-4">{error}</div>
        <button onClick={() => router.push("/events-list")} className="btn-secondary">
          <FiArrowLeft aria-hidden="true" /> Back to Events
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-container text-center text-gray-500 py-16">
        Event not found.
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      {showQrPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-gray-900">
                Do you have a GEMS account?
              </h2>
              <button
                onClick={handleQrNoAccount}
                className="btn-ghost !p-2"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-600 leading-relaxed">
                If yes, sign in so we can link your participation. If not, we will
                take you to a quick survey instead.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={handleQrNoAccount} className="btn-secondary">
                No, take survey
              </button>
              <button onClick={handleQrYesAccount} className="btn-primary">
                Yes, I have an account
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push("/events-list")}
        className="btn-ghost !px-3 !py-2 !rounded-lg"
        aria-label="Back to events"
      >
        <FiArrowLeft aria-hidden="true" /> Back to Events
      </button>

      <div className="card p-6 !rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-200 shrink-0">
              {event.title?.[0]?.toUpperCase() || "E"}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {event.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {event.type_of_activity || "Event"} •{" "}
                {event.venue || "Venue TBD"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
        {[
          { key: "overview", label: "Overview" },
          { key: "guests", label: "Guests" },
          { key: "insights", label: "Insights" },
          { key: "reports", label: "Post-Activity Report" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
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
          attendanceQrDataUrl={attendanceQrDataUrl}
          handleDownloadAttendanceQr={handleDownloadAttendanceQr}
          showQrPrompt={showQrPrompt}
          setShowQrPrompt={setShowQrPrompt}
          handleQrYesAccount={handleQrYesAccount}
          handleQrNoAccount={handleQrNoAccount}
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
        <GuestTab
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
          buildGuestRows={buildRows}
          handleDownloadGuestsPdf={(guests) =>
            handleDownloadGuestsPdf(guests, event, buildRows)
          }
          handleDownloadBlankGuestsPdf={() =>
            handleDownloadBlankGuestsPdf(event)
          }
          handlePrintGuests={(guests) =>
            handlePrintGuests(guests, event, buildRows)
          }
          guestTypeFilter={guestTypeFilter}
          setGuestTypeFilter={setGuestTypeFilter}
          guestCollegeFilter={guestCollegeFilter}
          setGuestCollegeFilter={setGuestCollegeFilter}
          guestCourseFilter={guestCourseFilter}
          setGuestCourseFilter={setGuestCourseFilter}
          guestYearFilter={guestYearFilter}
          setGuestYearFilter={setGuestYearFilter}
          guestSearch={guestSearch}
          setGuestSearch={setGuestSearch}
          COLLEGE_TO_PROGRAMS={COLLEGE_TO_PROGRAMS}
          YEAR_LEVELS={YEAR_LEVELS}
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
        />
      )}

      {activeTab === "reports" && <ReportTab event={event} />}
    </div>
  );
}