"use client";

import axios from "axios";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import { COLLEGE_TO_PROGRAMS, YEAR_LEVELS } from "@/lib/colleges";
import OverviewTab from "./components/OverviewTab";
import AttendanceTab from "./components/AttendanceTab";
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
  const [guestSexFilter, setGuestSexFilter] = useState("all");
  const [guestCollegeFilter, setGuestCollegeFilter] = useState("");
  const [guestCourseFilter, setGuestCourseFilter] = useState("");
  const [guestYearFilter, setGuestYearFilter] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [attendanceQrDataUrl, setAttendanceQrDataUrl] = useState("");
  const [guests, setGuests] = useState([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestValidationFilter, setGuestValidationFilter] = useState("all");
  const [guestCounts, setGuestCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [guestReloadKey, setGuestReloadKey] = useState(0);
  /* Bumped after a manual encode so the event and the attendance table are
     re-fetched and every headcount / insight recomputes. */
  const [eventReloadKey, setEventReloadKey] = useState(0);

  /* Always fetch every validation status into `guests` so the Attendance
     table and every Insight number read the exact same records. The queue
     filter is applied in the component instead of on the server: a server
     side filter used to drop the row an organizer had just encoded, which
     made Insights and Attendance disagree. */
  const loadGuests = async () => {
    if (!eventId) return;
    setGuestsLoading(true);
    try {
      const res = await axios.get(
        `/api/events/guests?event_id=${eventId}&validation_status=all`,
      );
      setGuests(res.data?.data || []);
      if (res.data?.counts) setGuestCounts(res.data.counts);
    } catch (err) {
      setGuests([]);
    } finally {
      setGuestsLoading(false);
    }
  };

  useEffect(() => {
    /* Overview and Insights both read guests: approved ones join every
       headcount, pending ones drive the validation badge. */
    if (
      (activeTab !== "attendance" &&
        activeTab !== "overview" &&
        activeTab !== "insights") ||
      !eventId
    )
      return;
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eventId, guestReloadKey]);

  const handleGuestValidation = async (guestIds, action, note) => {
    const ids = (Array.isArray(guestIds) ? guestIds : [guestIds]).filter(Boolean);
    if (ids.length === 0 || !eventId) return;
    await axios.patch("/api/events/guests", {
      event_id: eventId,
      guest_ids: ids,
      action,
      note: note || "",
    });
    setGuestReloadKey((k) => k + 1);
  };

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
        if (guestTypeFilter === "stakeholder")
          return details.status === "Stakeholder";
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
  }, [eventId, eventReloadKey]);

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

    /* Date-only overview card: the time of day is noise here, and a
       same-day event should read as one date, not "X - X". */
    const startStr = formatDateOnly(startValue);
    if (!endValue) return [startStr];

    const endStr = formatDateOnly(endValue);
    if (startStr === endStr) return [startStr];
    return [`${startStr} - ${endStr}`];
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

  /* Ids of accounts already present in the guest sheet. A manual encode writes
     an EventGuest row, so the same person can sit in both attended_users (their
     QR check-in) and approvedGuests (the organizer's record). Insights must
     count them once, and the Attendance table must not list them twice. */
  const guestUserIds = useMemo(() => {
    const ids = new Set();
    (Array.isArray(guests) ? guests : []).forEach((g) => {
      if (g?.user_id) ids.add(String(g.user_id));
    });
    return ids;
  }, [guests]);

  /* Profiles of attendees with a system account that the guest sheet does not
     already cover — one per person, so a repeated scan cannot inflate a count.
     Guests handled below live in `approvedGuests`. */
  const attendedProfiles = useMemo(
    () => {
      const seen = new Set();
      return (event?.attended_users || [])
        .filter((a) => {
          const id = a?.user_id?._id ?? a?.user_id;
          if (!id) return false;
          return !guestUserIds.has(String(id));
        })
        .map((a) => a?.user_id?.personal_info_id)
        .filter((p) => {
          if (!p) return false;
          const key = String(p?._id ?? p);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    },
    [event, guestUserIds],
  );

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

  /* Approved guest check-ins (legacy rows without a status count as approved). */
  const approvedGuests = useMemo(
    () =>
      (Array.isArray(guests) ? guests : []).filter(
        (g) => !g?.validation_status || g.validation_status === "approved",
      ),
    [guests],
  );

  /* A QR check-in by somebody with an account writes Event.attended_users and
     no guest row, so the sheet used to stay empty for them even though Insights
     counted them. Those profiles are turned into approved table rows here, with
     the same column shape a guest row has. Rows are keyed by the account id
     with a `checkin:` prefix so they can never collide with an EventGuest _id,
     and Accounts already covered by the sheet are skipped — no double rows. */
  const checkinGuestRows = useMemo(() => {
    return (event?.attended_users || [])
      .map((entry) => ({
        entry,
        user: entry?.user_id,
      }))
      .filter(({ user }) => user && (user._id || user.personal_info_id))
      .filter(({ user }) => {
        const accountId = user?._id ?? user?.user_id;
        if (accountId && guestUserIds.has(String(accountId))) return false;
        if (user?.personal_info_id) {
          const pid = String(user.personal_info_id?._id ?? user.personal_info_id);
          if (guestUserIds.has(pid)) return false;
        }
        return true;
      })
      .map(({ entry, user }) => {
        const details = extractGuestDetails(user);
        return {
          _id: `checkin:${user?._id ?? user?.personal_info_id}`,
          full_name: details.name,
          sex: details.sex,
          age: details.age,
          participant_type: details.status,
          department_office_org: details.department || details.college || details.office,
          program_year_section: details.programYearSection,
          position_designation: details.positionDesignation,
          contact: details.contact,
          attended_at: entry?.attended_at || null,
          validation_status: "approved",
          source: "account-check-in",
          validation_note: "Recorded automatically from a signed-in QR check-in",
        };
      });
  }, [event, guestUserIds]);

  /* What the Attendance table renders: every guest row plus the QR-only
     account check-ins, approved ones first so a freshly recorded row is
     visible on page one. */
  const attendanceGuests = useMemo(() => {
    const score = (g) => (!g?.validation_status || g.validation_status === "approved" ? 0 : 1);
    const time = (g) => new Date(g?.attended_at || 0).getTime() || 0;
    return [...(Array.isArray(guests) ? guests : []), ...checkinGuestRows].sort(
      (a, b) => score(a) - score(b) || time(b) - time(a),
    );
  }, [guests, checkinGuestRows]);

/* Every insight below reads the same two sources: attendedProfiles
   (users with accounts) + approvedGuests (QR check-ins). No filter —
   the old All/Attended dropdown was a no-op. */
  const roleCounts = useMemo(() => {
    const counts = { Student: 0, Employee: 0, Stakeholder: 0, Unspecified: 0 };
    attendedProfiles.forEach((p) => {
      const status = p?.personal?.currentStatus;
      if (status === "Student") counts.Student += 1;
      else if (status === "Employee") counts.Employee += 1;
      else counts.Unspecified += 1;
    });
    approvedGuests.forEach((g) => {
      const type = g?.participant_type;
      if (type === "Student") counts.Student += 1;
      else if (type === "Employee") counts.Employee += 1;
      else if (type === "Stakeholder") counts.Stakeholder += 1;
      else counts.Unspecified += 1;
    });
    return counts;
  }, [attendedProfiles, approvedGuests]);

  const genderData = useMemo(() => {
    const counts = { Male: 0, Female: 0 };
    attendedProfiles.forEach((p) => {
      const g = p?.gadData?.sexAtBirth;
      if (g && counts[g] !== undefined) counts[g] += 1;
    });
    approvedGuests.forEach((g) => {
      const sex = g?.sex === "Male" || g?.sex === "Female" ? g.sex : null;
      if (sex) counts[sex] += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [attendedProfiles, approvedGuests]);
  const genderDataChart = genderData;

  const ageData = useMemo(() => {
    const bins = {};
    attendedProfiles.forEach((p) => {
      const age = calculateAge(p?.personal?.birthday);
      if (age === null || Number.isNaN(age)) return;
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}-${bucket + 9}`;
      bins[label] = (bins[label] || 0) + 1;
    });
    approvedGuests.forEach((g) => {
      const age = Number(g?.age);
      if (!Number.isFinite(age) || age <= 0) return;
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}-${bucket + 9}`;
      bins[label] = (bins[label] || 0) + 1;
    });
    return Object.keys(bins)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((age) => ({ name: age, value: bins[age] }));
  }, [attendedProfiles, approvedGuests]);

  const collegeData = useMemo(() => {
    const counts = {};
    attendedProfiles.forEach((p) => {
      const departmentUnit =
        p?.affiliation?.employment_information?.office ||
        p?.affiliation?.academic_information?.college;
      const college = departmentUnit;
      counts[college] = (counts[college] || 0) + 1;
    });
    approvedGuests.forEach((g) => {
      const college = String(g?.department_office_org || "").trim();
      if (!college) return;
      counts[college] = (counts[college] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [attendedProfiles, approvedGuests]);

  const perYearData = useMemo(() => {
    const counts = {};
    attendedProfiles.forEach((p) => {
      let year = p?.affiliation?.academic_information?.year_level;
      if (!year || typeof year !== "string" || !year.trim()) return;
      year = year.trim();
      counts[year] = (counts[year] || 0) + 1;
    });
    /* Guest students store "Program Year Section" — take the first year token. */
    approvedGuests.forEach((g) => {
      if (g?.participant_type !== "Student") return;
      const raw = String(g?.program_year_section || "");
      const match = raw.match(
        /\b([1-6](?:st|nd|rd|th)\s*Year|[1-6](?:st|nd|rd|th))\b/i,
      );
      if (!match) return;
      const year = match[1].replace(/\s+/g, " ").trim();
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
  }, [attendedProfiles]);

  const statusCounts = useMemo(() => {
    const counts = {};
    attendedProfiles.forEach((p) => {
      const status = p?.personal?.currentStatus || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    /* Approved guest check-ins join the breakdown by their participant type so
       Students, Employees and Stakeholders are all represented. */
    (Array.isArray(guests) ? guests : [])
      .filter((g) => !g?.validation_status || g.validation_status === "approved")
      .forEach((g) => {
        const status = g?.participant_type || "Unknown";
        counts[status] = (counts[status] || 0) + 1;
      });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [attendedProfiles, guests]);

  const affiliationData = statusCounts;

  const maleCount = genderData.find((d) => d.name === "Male")?.value || 0;
  const femaleCount = genderData.find((d) => d.name === "Female")?.value || 0;
  /* Strict validation: only approved guest check-ins count toward attendance.
     Guest rows without a status (created before manual validation) count too.
     `attendedProfiles` already excludes accounts the sheet covers, so a person
     recorded by hand after scanning the QR is counted once, not twice. */
  const approvedGuestCount = approvedGuests.length;
  const attendedCount = attendedProfiles.length + approvedGuestCount;

  /* Mean age across every attended participant with a known age — profile
     birthdays plus the age guests type into the QR form. */
  const avgAge = useMemo(() => {
    const ages = [];
    attendedProfiles.forEach((p) => {
      const age = calculateAge(p?.personal?.birthday);
      if (age !== null && !Number.isNaN(age)) ages.push(age);
    });
    approvedGuests.forEach((g) => {
      const age = Number(g?.age);
      if (Number.isFinite(age) && age > 0) ages.push(age);
    });
    if (ages.length === 0) return null;
    return Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10;
  }, [attendedProfiles, approvedGuests]);

  const pendingGuestCount = (Array.isArray(guests) ? guests : []).filter(
    (g) => g?.validation_status === "pending",
  ).length;

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
          { key: "attendance", label: "Attendance" },
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
          attendedCount={attendedCount}
          pendingGuestCount={pendingGuestCount}
          userId={userId}
          showDeleteModal={showDeleteModal}
          setShowDeleteModal={setShowDeleteModal}
          deleteError={deleteError}
          deleting={deleting}
          handleDeleteEvent={handleDeleteEvent}
          projects={projects}
          allEvents={allEvents}
          guests={attendanceGuests}
          formatForInput={formatForInput}
          formatRangeLines={formatRangeLines}
        />
      )}

      {activeTab === "attendance" && (
        <AttendanceTab
          event={event}
          guests={attendanceGuests}
          guestsLoading={guestsLoading}
          counts={guestCounts}
          validationFilter={guestValidationFilter}
          setValidationFilter={setGuestValidationFilter}
          onValidate={handleGuestValidation}
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
          guestSexFilter={guestSexFilter}
          setGuestSexFilter={setGuestSexFilter}
          guestSearch={guestSearch}
          setGuestSearch={setGuestSearch}
          existingGuests={attendanceGuests}
          onEncoded={() => {
            setGuestReloadKey((k) => k + 1);
            setEventReloadKey((k) => k + 1);
          }}
        />
      )}

      {activeTab === "insights" && (
        <InsightTab
          attendedCount={attendedCount}
          maleCount={maleCount}
          femaleCount={femaleCount}
          avgAge={avgAge}
          roleCounts={roleCounts}
          statusCounts={statusCounts}
          genderDataChart={genderDataChart}
          affiliationData={affiliationData}
          ageData={ageData}
          collegeData={collegeData}
          perYearData={perYearData}
        />
      )}

      {activeTab === "reports" && (
        <ReportTab
          event={event}
          approvedGuestCount={approvedGuestCount}
          attendedCount={attendedCount}
        />
      )}
    </div>
  );
}