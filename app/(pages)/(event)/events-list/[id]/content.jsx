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

export default function EventManageContent({ backPath = "/events-list" }) {
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
  const [baseUrl, setBaseUrl] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [guestTypeFilter, setGuestTypeFilter] = useState("all");
  const [guestCollegeFilter, setGuestCollegeFilter] = useState("");
  const [guestCourseFilter, setGuestCourseFilter] = useState("");
  const [guestYearFilter, setGuestYearFilter] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [attendanceQrDataUrl, setAttendanceQrDataUrl] = useState("");
  const [insightsFilter, setInsightsFilter] = useState("all");
  const [guests, setGuests] = useState([]);
  const [guestsLoading, setGuestsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "guests" || !eventId) return;
    const loadGuests = async () => {
      setGuestsLoading(true);
      try {
        const res = await axios.get(`/api/events/guests?event_id=${eventId}`);
        setGuests(res.data?.data || []);
      } catch (err) {
        setGuests([]);
      } finally {
        setGuestsLoading(false);
      }
    };
    loadGuests();
  }, [activeTab, eventId, event]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        const allProjects = res.data?.data || [];
        const myProjects = allProjects.filter(
          (p) => p.createdBy?.toString() === userId?.toString(),
        );
        setProjects(myProjects);
      } catch (err) {
        setProjects([]);
      }
    };
    fetchProjects();
  }, [userId]);

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const res = await axios.get("/api/events");
        setAllEvents(res.data?.data || []);
      } catch (err) {
        setAllEvents([]);
      }
    };
    fetchAllEvents();
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
      router.push(backPath);
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
          const startValue =
            evt.start_date ||
            (Array.isArray(evt.start_dates) ? evt.start_dates[0] : null) ||
            evt.date;
          const endValue =
            evt.end_date ||
            (Array.isArray(evt.end_dates)
              ? evt.end_dates[evt.end_dates.length - 1]
              : null) ||
            startValue;
          const startInput = formatForInput(startValue);
          const endInput = formatForInput(endValue);
          setEditData({
            event_source: evt.project ? "project" : "independent",
            type_of_activity: evt.type_of_activity,
            project: evt.project,
            gad_activity: evt.gad_activity,
            title: evt.title || "",
            description: evt.description || "",
            date: startInput || "",
            start_time: "",
            end_time: "",
            venue: evt.venue || "",
            status: evt.status || "active",
            organizing_office_unit: evt.organizing_office_unit,
            co_organizing_office_unit: evt.co_organizing_office_unit,
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
    const buildAttendanceQr = async () => {
      if (!baseUrl || !eventId) return;
      try {
        const deepLink = `${baseUrl}/attend/${eventId}`;
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
    const startValue =
      (evt && evt.start_date) ||
      start ||
      (evt && Array.isArray(evt.start_dates) ? evt.start_dates[0] : null);
    const endValue =
      (evt && evt.end_date) ||
      end ||
      (evt && Array.isArray(evt.end_dates)
        ? evt.end_dates[evt.end_dates.length - 1]
        : null);

    if (!startValue) return ["No date"];

    const startStr = formatDate(startValue);
    if (!endValue) return [startStr];
    return [`${startStr} - ${formatDate(endValue)}`];
  };

  const formatRangeLines = (start, end, evt) => {
    return getDateRangeLines(start, end, evt);
  };

  const formatForInput = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => `${n}`.padStart(2, "0");
    // Date-only events: edit with YYYY-MM-DD, no time.
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

  const goingProfiles = [];
  const interestedProfiles = [];
  const notInterestedProfiles = [];

  const attendedProfiles = useMemo(
    () =>
      (event?.attended_users || [])
        .map((a) => a?.user_id?.personal_info_id)
        .filter(Boolean),
    [event],
  );

  const ageGroupCounts = useMemo(() => {
    const counts = {};
    (event?.attended_users || []).forEach((a) => {
      const u = a?.user_id || {};
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

  const allProfiles = useMemo(() => {
    const seen = new Set();
    return [...attendedProfiles].filter((p) => {
      const key = String(p?._id ?? p);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [attendedProfiles]);

  const filteredProfiles = useMemo(() => {
    if (insightsFilter === "attended") return attendedProfiles;
    return allProfiles;
  }, [insightsFilter, attendedProfiles, allProfiles]);

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

  const buildRows = (list) =>
    buildGuestRows(list, extractGuestDetails, capitalizeName);

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

  const totalRegistered = attendedProfiles.length;
  const maleCount = genderData.find((d) => d.name === "Male")?.value || 0;
  const femaleCount = genderData.find((d) => d.name === "Female")?.value || 0;
  const attendedCount = (event?.attended_users || []).length + guests.length;

  const eventData = useMemo(
    () => [{ name: "Attended", value: attendedCount }],
    [attendedCount],
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

      const startDateTime = editData.date ? new Date(`${editData.date}T00:00`) : null;
      const endDateTime = editData.date ? new Date(`${editData.date}T23:59`) : null;

      if (
        !startDateTime ||
        !endDateTime ||
        Number.isNaN(startDateTime.getTime()) ||
        Number.isNaN(endDateTime.getTime())
      ) {
        setError("Invalid event date value.");
        setSaving(false);
        return;
      }

      const payload = {
        ...editData,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        updated_by: userId,
      };
      // Never send the removed audience fields or the UI-only source flag.
      delete payload.eligibility_criteria;
      delete payload.target_number_of_participants;
      delete payload.event_source;
      // Normalize project linkage: independent sends null, project sends id.
      if (!payload.project) payload.project = null;
      if (!payload.project) payload.gad_activity = "";

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

  const handleDownloadAttendanceQr = () => {
    if (!attendanceQrDataUrl) return;
    const link = document.createElement("a");
    link.href = attendanceQrDataUrl;
    link.download = `${event?.title || "event"}-attendance-qr.png`;
    link.click();
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
        <button onClick={() => router.push(backPath)} className="btn-secondary">
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
   <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">

      <button
        onClick={() => router.push(backPath)}
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
                {event.reference_number && (
                  <span className="mr-2 align-middle rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                    {event.reference_number}
                  </span>
                )}
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
          attendanceQrDataUrl={attendanceQrDataUrl}
          handleDownloadAttendanceQr={handleDownloadAttendanceQr}
          userId={userId}
          showDeleteModal={showDeleteModal}
          setShowDeleteModal={setShowDeleteModal}
          deleteError={deleteError}
          deleting={deleting}
          handleDeleteEvent={handleDeleteEvent}
          projects={projects}
          allEvents={allEvents}
          formatForInput={formatForInput}
          formatRangeLines={formatRangeLines}
        />
      )}

      {activeTab === "guests" && (
        <GuestTab
          event={event}
          guests={guests}
          guestsLoading={guestsLoading}
          handleDownloadGuestsPdf={(list) =>
            handleDownloadGuestsPdf(list, event, buildRows)
          }
          handleDownloadBlankGuestsPdf={() =>
            handleDownloadBlankGuestsPdf(event)
          }
          handlePrintGuests={(list) =>
            handlePrintGuests(list, event, buildRows)
          }
          guestTypeFilter={guestTypeFilter}
          setGuestTypeFilter={setGuestTypeFilter}
          guestSearch={guestSearch}
          setGuestSearch={setGuestSearch}
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
          ageGroupCounts={ageGroupCounts}
          attendedCount={attendedCount}
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