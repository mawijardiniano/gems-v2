"use client";

import axios from "axios";
import { useEffect, useMemo, useState, useRef } from "react";
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
import { useRouter } from "next/navigation";

const ELIGIBILITY_OPTIONS = [
  { value: "Scholarship Applicant", label: "Scholarship Applicant" },
  { value: "Solo Parent", label: "Solo Parent" },
  { value: "PWDs", label: "Person with Disability (PWD)" },
  { value: "Indigenous Group", label: "Indigenous Group Member" },
  { value: "LGBTQIA+", label: "LGBTQIA+" },
  { value: "Low Income Student", label: "Low-income Student" },
  { value: "None", label: "None" },
];

export default function CreateEventsContent() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const OFFICE_OPTIONS = [
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
  ];
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    number_of_days: 1,
    start_dates: [""],
    end_dates: [""],
    venue: "",
    type_of_activity: "Academic",
    organizing_office_unit: [],
    co_organizing_office_unit: [],
    eligibility_criteria: "",
    target_number_of_participants: "",
    project: "",
  });
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/profile/my-profile");
        setUserId(res.data?.user?._id || null);
      } catch (err) {
        console.error("Error loading profile", err);
      }
    };

    const fetchProjects = async () => {
      try {
        const res = await axios.get("/api/project");
        setProjects(res.data?.data || []);
      } catch (err) {
        setProjects([]);
      }
    };

    fetchProfile();
    fetchProjects();
  }, []);

  const nowLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      if (field === "number_of_days") {
        // Allow empty string for custom typing
        if (value === "" || isNaN(Number(value)) || Number(value) < 1) {
          return {
            ...prev,
            number_of_days: value,
            start_dates: [],
            end_dates: [],
          };
        }
        const num = Number(value);
        let start_dates = prev.start_dates.slice(0, num);
        let end_dates = prev.end_dates.slice(0, num);
        while (start_dates.length < num) start_dates.push("");
        while (end_dates.length < num) end_dates.push("");
        return { ...prev, number_of_days: num, start_dates, end_dates };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleOfficeSelect = (field, options) => {
    const values = Array.from(options).map((o) => o.value);
    setFormData((prev) => ({ ...prev, [field]: values }));
  };

  const handleDateChange = (type, idx, value) => {
    setFormData((prev) => {
      const arr = [...prev[type]];
      arr[idx] = value;
      return { ...prev, [type]: arr };
    });
  };

  const handleEligibilityChange = (e) => {
    setFormData((prev) => ({ ...prev, eligibility_criteria: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Event title is required");
      setLoading(false);
      return;
    }

    for (let i = 0; i < formData.number_of_days; i++) {
      if (!formData.start_dates[i]) {
        setError(`Start date/time for day ${i + 1} is required`);
        setLoading(false);
        return;
      }
      if (!formData.end_dates[i]) {
        setError(`End date/time for day ${i + 1} is required`);
        setLoading(false);
        return;
      }
      if (new Date(formData.end_dates[i]) < new Date(formData.start_dates[i])) {
        setError(
          `End date/time must be after start date/time for day ${i + 1}`,
        );
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        number_of_days: formData.number_of_days,
        start_dates: formData.start_dates,
        end_dates: formData.end_dates,
        venue: formData.venue.trim(),
        type_of_activity: formData.type_of_activity,
        organizing_office_unit: formData.organizing_office_unit,
        co_organizing_office_unit: formData.co_organizing_office_unit,
        eligibility_criteria: formData.eligibility_criteria,
        target_number_of_participants: formData.target_number_of_participants,
        ...(formData.project ? { project: formData.project } : {}),
        ...(formData.gad_activity
          ? { gad_activity: formData.gad_activity }
          : {}),
        ...(userId ? { created_by: userId } : {}),
      };

      await axios.post("/api/events", payload);
      setSuccess("Event created successfully");

      setTimeout(() => router.push("/events-list"), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error creating event. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Create Event</h1>
          <p className="text-gray-600 text-sm">Set the schedule and details.</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-4 rounded border border-green-300 bg-green-50 text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Type of Activity <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type_of_activity}
              onChange={(e) => handleChange("type_of_activity", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="Academic">Academic</option>
              <option value="Administrative">Administrative</option>
              <option value="GAD">GAD</option>
              <option value="Extension">Extension</option>
              <option value="Research">Research</option>
              <option value="Students">Students</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={
                formData.project && formData.gad_activity
                  ? `${formData.project}||||${formData.gad_activity}`
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setFormData((prev) => ({
                    ...prev,
                    project: "",
                    gad_activity: "",
                  }));
                  return;
                }
                const [project, gad_activity] = val.split("||||");
                setFormData((prev) => ({ ...prev, project, gad_activity }));
              }}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">No Project</option>
              {projects.flatMap((proj) =>
                (Array.isArray(proj.gad_activity)
                  ? proj.gad_activity
                  : [proj.gad_activity]
                )
                  .filter(Boolean)
                  .map((activity, idx) => (
                    <option
                      key={proj._id + "-" + idx}
                      value={proj._id + "||||" + activity}
                    >
                      {activity}
                    </option>
                  )),
              )}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter event title"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Number of Days <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.number_of_days}
              onChange={(e) => handleChange("number_of_days", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {Number(formData.number_of_days) > 0 &&
            Array.from({ length: Number(formData.number_of_days) }).map(
              (_, idx) => (
                <div
                  className="col-span-2 flex flex-col sm:flex-row gap-4 items-end"
                  key={"day-row-" + idx}
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">
                      Day {idx + 1} Start Date & Time{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_dates[idx] || ""}
                      min={nowLocal}
                      onChange={(e) =>
                        handleDateChange("start_dates", idx, e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">
                      Day {idx + 1} End Date & Time{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_dates[idx] || ""}
                      min={formData.start_dates[idx] || nowLocal}
                      onChange={(e) =>
                        handleDateChange("end_dates", idx, e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
              ),
            )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={4}
            placeholder="Add event description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Venue</label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => handleChange("venue", e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Where will this be held?"
          />
        </div>
        <CheckboxDropdown
          label="Organizing Office/Unit"
          options={OFFICE_OPTIONS}
          selected={formData.organizing_office_unit}
          onChange={(vals) =>
            setFormData((prev) => ({ ...prev, organizing_office_unit: vals }))
          }
          required
        />
        <CheckboxDropdown
          label="Co Organizing Office/Unit"
          options={OFFICE_OPTIONS}
          selected={formData.co_organizing_office_unit}
          onChange={(vals) =>
            setFormData((prev) => ({
              ...prev,
              co_organizing_office_unit: vals,
            }))
          }
          required
        />
        <div>
          <label className="block text-sm font-medium mb-2">
            Eligibility Criteria
          </label>
          <select
            value={formData.eligibility_criteria}
            onChange={handleEligibilityChange}
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Target Number of Participants
          </label>
          <input
            type="number"
            value={formData.target_number_of_participants}
            onChange={(e) =>
              handleChange("target_number_of_participants", e.target.value)
            }
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-400">
          <button
            type="button"
            onClick={() => router.push("/events-list")}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
