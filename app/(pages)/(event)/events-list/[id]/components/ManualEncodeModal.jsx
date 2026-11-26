"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useDialog } from "@/hooks/useDialog";
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
import Button from "@/components/ui/Button";

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
  const info = person?.personal_info_id || {};
  const personal = info.personal || {};
  const first = personal.first_name || personal.firstName || "";
  const last = personal.last_name || personal.lastName || "";
  const composed = `${first} ${last}`.trim();

  return composed || info.displayName || "";
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

  /* A same-name warning belongs to the person it was raised for: picking
     someone else clears it, so its button cannot record the wrong person. */
  useEffect(() => {
    setFeedback((f) => (f?.sameName ? null : f));
  }, [picked]);

  /* The row already holding this account in the loaded table, any status: a
     guest row linked to the account, or a signed-in QR check-in (`checkin:`
     rows carry the account id in their key). Matched on the account only;
     same-name QR walk-ins are checked by the API, which can tell the
     organizer and let them record a different person who shares the name.
     Advisory: the API refuses the same cases when the loaded list is stale. */
  const rowInSheet = (person, sheet = []) => {
    const id = String(person?._id || "");
    if (!id) return null;
    return (
      (Array.isArray(sheet) ? sheet : []).find(
        (g) =>
          String(g?.user_id || "") === id || String(g?._id || "") === `checkin:${id}`,
      ) || null
    );
  };

  /* Why the person can't be recorded again, worded like the API's reply. */
  const onListMessage = (name, row) => {
    const status = row?.validation_status || "approved";
    const via =
      row?.source === "manual-encode"
        ? " by manual encode"
        : row?.source === "account-check-in"
          ? " through the QR code (signed in)"
          : " through the QR code";
    if (status === "approved") return `${name} is already on the attendance list${via}.`;
    if (status === "pending")
      return `${name} already checked in${via} and is waiting for approval. Approve their row in the Pending tab instead.`;
    return `${name} already has a check-in${via} that was not approved. If they did attend, approve it in the Not approved tab.`;
  };

  /* `differentPerson`: the organizer confirmed a same-name QR check-in is
     somebody else, so the API records this person anyway. */
  const handleEncode = async ({ differentPerson = false } = {}) => {
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
    /* Already on the sheet: nothing is sent. Saving used to go through and
       the API re-approved the existing row, so a QR check-in the organizer had
       rejected came back as approved and looked like a second entry. */
    const listed = rowInSheet(person, existingGuests);
    if (listed) {
      setFeedback({ tone: "warn", message: onListMessage(name, listed) });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      /* Writes an approved EventGuest row so the person appears in the
         attendance table, overview counters, prints and reports — the same
         records QR check-ins use. Identity fields fill gaps in the profile. */
      await axios.post("/api/events/guests/manual", {
        event_id: eventId,
        user_id: person._id,
        full_name: identity.full_name,
        sex: identity.sex,
        contact: identity.contact,
        ...(differentPerson ? { confirm_different_person: true } : {}),
      });
      setFeedback({ tone: "ok", message: `Recorded — ${name}` });
      setPicked(null);
      setQuery("");
      setResults([]);
      onEncoded?.();
    } catch (err) {
      const data = err?.response?.data || {};
      /* 409: already on the list (the loaded table was stale, or a same-name
         QR walk-in). Nothing was written; the table is refreshed so the
         existing row shows. The person stays picked for a same-name match so
         the organizer can record them as a different person. */
      if (err?.response?.status === 409) {
        setFeedback({
          tone: "warn",
          message: data.message || `${name} is already on the attendance list.`,
          sameName: data.code === "SAME_NAME_ON_LIST",
        });
        onEncoded?.();
      } else {
        setFeedback({
          tone: "error",
          message: data.message || "Unable to record attendance.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  /* Never closes mid-save (Escape, X or Cancel), so the result is seen. */
  const closeIfIdle = () => {
    if (!saving) onClose?.();
  };
  const dialogRef = useDialog(closeIfIdle);

  if (!open) return null;

  const chosenName = picked ? fullNameOf(picked) || "Selected record" : "";
  const chosenDetails = picked ? detailsOf(picked, type) : "";
  const chosenId = picked?.username || "";
  const term = query.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-encode-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
              <FiUserPlus size={16} />
            </span>
            <div>
              <h2
                id="manual-encode-title"
                className="text-sm font-semibold text-fg"
              >
                Manual Encode
              </h2>
              <p className="text-xs text-fg-muted">
                Record attendance without a QR scan
                {eventTitle ? ` for ${eventTitle}` : ""}.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close manual encode"
            onClick={closeIfIdle}
            disabled={saving}
            className="touch-target rounded-lg p-1.5 text-fg-muted transition hover:bg-muted hover:text-fg-4"
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
                      ? "border-secondary-600 bg-secondary-50 text-secondary-700"
                      : "border-line bg-white text-fg-muted hover:border-line-strong hover:text-fg-3"
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
            <span className="text-xs text-fg-muted">
              {TYPES.find((t) => t.key === type)?.hint}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch
              className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted"
              size={14}
            />
            <input
              ref={inputRef}
              className="input !pl-9 !rounded-lg"
              type="text"
              placeholder="Type a name, ID or username..."
              aria-label="Search for a person by name, ID or username"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setFeedback(null);
              }}
            />
            {searching && (
              <FiLoader
                className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-fg-muted"
                size={14}
              />
            )}
          </div>

          {searchError && <p className="text-xs text-danger">{searchError}</p>}


          {/* Results */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-line-subtle">
            {term.length < MIN_QUERY ? (
              <p className="px-4 py-10 text-center text-sm text-fg-muted">
                Type at least {MIN_QUERY} letters to search {type.toLowerCase()}{" "}
                records.
              </p>
            ) : visibleResults.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-muted">
                {searching
                  ? "Searching records..."
                  : `No matching ${type.toLowerCase()} records.`}
              </p>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {visibleResults.map((person) => {
                  const name =
                    fullNameOf(person) || person.username || "Unknown";
                  const details = detailsOf(person, type);
                  const active = picked?._id === person._id;
                  return (
                    <li
                      key={person._id}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        active ? "bg-secondary-50/60" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">
                          {name}
                        </p>
                        <p className="truncate text-xs text-fg-muted">
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
                            ? "border-secondary-600 bg-secondary-600 text-white"
                            : "border-line bg-white text-fg-4 hover:border-line-strong hover:text-fg-2"
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
                  ? "border-secondary-200 bg-secondary-50"
                  : "border-success-border bg-success-subtle"
              }`}
            >
              {pickedSexMissing ? (
                <FiAlertCircle className="mt-0.5 shrink-0 text-secondary-600" size={14} />
              ) : (
                <FiCheck className="mt-0.5 shrink-0 text-success" size={14} />
              )}
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold ${
                    pickedSexMissing ? "text-secondary-900" : "text-emerald-900"
                  }`}
                >
                  {chosenName}
                </p>
                <p
                  className={`truncate text-xs ${
                    pickedSexMissing ? "text-secondary-700" : "text-success"
                  }`}
                >
                  {[chosenId, chosenDetails || type].filter(Boolean).join(" • ")}
                </p>
                {pickedSexMissing && (
                  <p className="mt-1 text-xs text-secondary-700">
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
                  ? "border-danger-border bg-danger-subtle text-danger"
                  : feedback.tone === "warn"
                    ? "border-secondary-200 bg-secondary-50 text-secondary-800"
                    : "border-success-border bg-success-subtle text-success"
              }`}
            >
              {feedback.tone === "ok" ? (
                <FiCheck className="mt-0.5 shrink-0" size={13} />
              ) : (
                <FiAlertCircle className="mt-0.5 shrink-0" size={13} />
              )}
              <div className="flex flex-col items-start gap-2">
                <span>{feedback.message}</span>
                {feedback.sameName && picked && (
                  <button
                    type="button"
                    onClick={() => handleEncode({ differentPerson: true })}
                    disabled={saving}
                    className="rounded-lg border border-secondary-300 bg-white px-2.5 py-1 font-semibold text-secondary-800 hover:bg-secondary-100 disabled:opacity-60"
                  >
                    Record as a different person
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line-subtle bg-slate-50 px-5 py-3">
          <Button
            type="button"
            onClick={closeIfIdle}
            disabled={saving}
            variant="secondary"
            className="!py-2 !px-4 !text-xs !rounded-lg"
          >
            {feedback?.tone === "ok" ? "Done" : "Cancel"}
          </Button>
          <Button
            type="button"
            disabled={!picked || saving || pickedSexMissing}
            title={
              pickedSexMissing
                ? "This profile has no sex at birth on record."
                : undefined
            }
            onClick={() => handleEncode()}
            variant="primary"
            className="!py-2 !px-4 !text-xs !rounded-lg"
          >
            {saving ? (
              <FiLoader className="animate-spin" size={13} />
            ) : (
              <FiUserPlus size={13} />
            )}
            Record Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}

