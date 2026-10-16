"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheck,
  FiLoader,
  FiSearch,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { FaGraduationCap } from "react-icons/fa";

/* Stakeholders are not in the profile records — they only enter through the QR
   guest form, so manual encoding is limited to these two types. */
const TYPES = [
  {
    key: "Student",
    label: "Student",
    icon: FaGraduationCap,
    hint: "Program / year level",
  },
  {
    key: "Employee",
    label: "Employee",
    icon: FiBriefcase,
    hint: "Office / position",
  },
];

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

const fullNameOf = (person) => {
  const personal = person?.personal_info_id?.personal || {};
  const first = personal.first_name || personal.firstName || "";
  const last = personal.last_name || personal.lastName || "";
  return `${first} ${last}`.trim();
};

/* Student rows show course / year / college; employee rows show office /
   position. Both fall back to the search payload's own fields. */
const detailsOf = (person, type) => {
  const affiliation =
    person?.personal_info_id?.affiliation || person?.affiliation || {};
  const academic = affiliation.academic_information || {};
  const employment = affiliation.employment_information || {};

  if (type === "Employee") {
    return [
      employment.office,
      employment.employment_status || employment.employment_appointment_status,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  return [
    academic.course,
    academic.year_level,
    academic.college || person?.assignedCollege,
  ]
    .filter(Boolean)
    .join(" • ");
};


export default function ManualEncodeModal({
  open,
  onClose,
  eventId,
  eventTitle,
  onEncoded,
  existingGuests = [],
}) {
  const [type, setType] = useState("Student");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  /* Reset the whole flow every time the modal is reopened. */
  useEffect(() => {
    if (!open) return;
    setType("Student");
    setQuery("");
    setResults([]);
    setSearching(false);
    setSearchError("");
    setPicked(null);
    setSaving(false);
    setFeedback(null);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  /* Debounced profile search — the endpoint already exists and is auth'd. */
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `/api/profile/search?q=${encodeURIComponent(term)}&limit=20`,
        );
        if (!active) return;
        setResults(Array.isArray(res.data?.data) ? res.data.data : []);
        setSearchError("");
      } catch (err) {
        if (!active) return;
        setResults([]);
        setSearchError(
          err?.response?.data?.message || "Unable to search profile records.",
        );
      } finally {
        if (active) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open]);

  /* The search endpoint returns every non-Admin account, so narrow to the
     chosen participant type using the profile's own currentStatus. Records
     without a status are kept rather than silently hidden. */
  const visibleResults = results.filter((person) => {
    const status =
      person?.personal_info_id?.personal?.currentStatus ||
      person?.personal?.currentStatus ||
      "";
    return !status || status === type;
  });

  /* The attendance sheet only accepts Male / Female and the encode endpoint
     rejects a profile without `gadData.sexAtBirth`. Surface that before the
     organizer clicks Record, so the reason is visible instead of a failed
     request. The route still enforces it for callers that skip this UI. */
  const pickedSexAtBirth = String(
    picked?.personal_info_id?.gadData?.sexAtBirth ||
      picked?.gadData?.sexAtBirth ||
      "",
  ).trim();
  const pickedSexMissing =
    Boolean(picked) && pickedSexAtBirth !== "Male" && pickedSexAtBirth !== "Female";

  /* Belt and braces: if the person already sits in the table (any validation
     status) the row is not sent again — the API would only re-approve it and
     report "already recorded", which reads like a failure to the organizer even
     though the person is already counted. The check is advisory: the request
     still goes out when the loaded list is stale. */
  const alreadyInSheet = (person, sheet = []) => {
    if (!person) return false;
    const id = String(person?._id || "");
    const name = fullNameOf(person).toLowerCase();
    return (Array.isArray(sheet) ? sheet : []).some((g) => {
      if (id && String(g?.user_id || "") === id) return true;
      const rowName = String(g?.full_name || "").trim().toLowerCase();
      return Boolean(name) && rowName === name;
    });
  };

  const handleEncode = async () => {
    if (!picked || !eventId) return;
    const person = picked;
    const name = fullNameOf(person) || "This person";
    const identity = {
      full_name: fullNameOf(person),
      sex: pickedSexAtBirth,
      contact: String(
        person?.personal_info_id?.contact?.mobileNumber ||
          person?.personal_info_id?.contact?.phoneNumber ||
          person?.contact?.mobileNumber ||
          "",
      ).trim(),
    };
    setSaving(true);
    setFeedback(null);
    try {
      /* True when the sheet already holds this person, so we tell the organizer
         they were already counted instead of leaving them guessing. */
      const alreadyListed = alreadyInSheet(person, existingGuests);
      /* The row already exists: no second write, but the table is refreshed and
         the message states the person is counted either way. */
      if (alreadyListed) {
        setFeedback({
          tone: "ok",
          message: `Already in the attendance sheet — ${name} is already counted`,
        });
        setPicked(null);
        setQuery("");
        setResults([]);
        onEncoded?.();
        return;
      }

      /* Writes an approved EventGuest row so the person appears in the
         attendance table, overview counters, prints and reports — the same
         records QR check-ins use. Duplicates come back as already_attended.
         Identity fields travel with the request: if a QR walk-in already holds
         the name, the API adopts THAT row and uses them to complete it, so the
         table never shows a half-blank entry. */
      const res = await axios.post("/api/events/guests/manual", {
        event_id: eventId,
        user_id: person._id,
        full_name: identity.full_name,
        sex: identity.sex,
        contact: identity.contact,
      });
      const data = res.data || {};
      /* approved / adopted / linked row that the caller must be told about. */
      const wasWritten =
        data.validation_status === "approved" || data.adopted === true;
      const already = data.already_attended === true;
      const adopted = data.adopted === true;
      setFeedback({
        tone: wasWritten ? "ok" : already ? "warn" : "ok",
        message: adopted
          ? `Already checked in — ${name} is now in the attendance sheet`
          : already
            ? `Already recorded — ${name}`
            : `Recorded — ${name}`,
      });
      setPicked(null);
      setQuery("");
      setResults([]);
      /* Any 2xx produced a visible row, so always refetch. The former guard
         skipped this on a bare already_attended, which left the table stale. */
      onEncoded?.();
    } catch (err) {
      setFeedback({
        tone: "error",
        message: err?.response?.data?.message || "Unable to record attendance.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const chosenName = picked ? fullNameOf(picked) || "Selected record" : "";
  const chosenDetails = picked ? detailsOf(picked, type) : "";
  const chosenId = picked?.username || "";
  const term = query.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiUserPlus size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Manual Encode
              </p>
              <p className="text-xs text-gray-400">
                Record attendance without a QR scan
                {eventTitle ? ` for ${eventTitle}` : ""}.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close manual encode"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Participant type */}
          <div className="flex flex-wrap items-center gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setType(t.key);
                    setFeedback(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
            <span className="text-[11px] text-gray-400">
              {TYPES.find((t) => t.key === type)?.hint}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              ref={inputRef}
              className="input !pl-9 !rounded-lg"
              type="text"
              placeholder="Type a name, ID or username..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setFeedback(null);
              }}
            />
            {searching && (
              <FiLoader
                className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-gray-400"
                size={14}
              />
            )}
          </div>

          {searchError && <p className="text-xs text-rose-600">{searchError}</p>}


          {/* Results */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100">
            {term.length < MIN_QUERY ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">
                Type at least {MIN_QUERY} letters to search {type.toLowerCase()}{" "}
                records.
              </p>
            ) : visibleResults.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">
                {searching
                  ? "Searching records..."
                  : `No matching ${type.toLowerCase()} records.`}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visibleResults.map((person) => {
                  const name =
                    fullNameOf(person) || person.username || "Unknown";
                  const details = detailsOf(person, type);
                  const active = picked?._id === person._id;
                  return (
                    <li
                      key={person._id}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        active ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {name}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {[person.username, details]
                            .filter(Boolean)
                            .join(" • ") || "No details on record"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(person);
                          setFeedback(null);
                        }}
                        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800"
                        }`}
                      >
                        {active ? (
                          <>
                            <FiCheck className="mr-1 inline" size={12} /> Selected
                          </>
                        ) : (
                          "Select"
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {picked && (
            <div
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                pickedSexMissing
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              {pickedSexMissing ? (
                <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" size={14} />
              ) : (
                <FiCheck className="mt-0.5 shrink-0 text-emerald-600" size={14} />
              )}
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold ${
                    pickedSexMissing ? "text-amber-900" : "text-emerald-900"
                  }`}
                >
                  {chosenName}
                </p>
                <p
                  className={`truncate text-xs ${
                    pickedSexMissing ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {[chosenId, chosenDetails || type].filter(Boolean).join(" • ")}
                </p>
                {pickedSexMissing && (
                  <p className="mt-1 text-xs text-amber-700">
                    No sex at birth on record for this profile, so the attendance
                    sheet cannot include them. Add it to the person&apos;s GAD
                    data first.
                  </p>
                )}
              </div>
            </div>
          )}

          {feedback && (
            <div
              className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                feedback.tone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : feedback.tone === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {feedback.tone === "ok" ? (
                <FiCheck className="mt-0.5 shrink-0" size={13} />
              ) : (
                <FiAlertCircle className="mt-0.5 shrink-0" size={13} />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !py-2 !px-4 !text-xs !rounded-lg"
          >
            {feedback?.tone === "ok" ? "Done" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!picked || saving || pickedSexMissing}
            title={
              pickedSexMissing
                ? "This profile has no sex at birth on record."
                : undefined
            }
            onClick={handleEncode}
            className="btn-primary !py-2 !px-4 !text-xs !rounded-lg"
          >
            {saving ? (
              <FiLoader className="animate-spin" size={13} />
            ) : (
              <FiUserPlus size={13} />
            )}
            Record Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

