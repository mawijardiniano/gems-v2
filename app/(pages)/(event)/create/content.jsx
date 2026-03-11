"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    venue: "",
    type_of_activity: "Academic",
    organizing_office_unit: "",
    eligibility_criteria: "",
    target_number_of_participants: "",
  });

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

    fetchProfile();
  }, []);

  const nowLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    if (!formData.start_date) {
      setError("Start date/time is required");
      setLoading(false);
      return;
    }

    if (!formData.end_date) {
      setError("End date/time is required");
      setLoading(false);
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError("End date/time must be after start date/time");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        venue: formData.venue.trim(),
        type_of_activity: formData.type_of_activity,
        organizing_office_unit: formData.organizing_office_unit.trim(),
        eligibility_criteria: formData.eligibility_criteria,
        target_number_of_participants: formData.target_number_of_participants,
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
          <div className="sm:col-span-2">
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

          <div>
            <label className="block text-sm font-medium mb-2">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start_date}
              min={nowLocal}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.end_date}
              min={formData.start_date || nowLocal}
              onChange={(e) => handleChange("end_date", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
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

        <div>
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
            <option value="Extension Research">Extension Research</option>
            <option value="Students">Students</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Organizing Office/Unit <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.organizing_office_unit}
            onChange={(e) =>
              handleChange("organizing_office_unit", e.target.value)
            }
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Enter organizing office or unit"
            required
          >
            <option value="">Select</option>
            <option>Graduate School</option>
            <option>College of Agriculture</option>
            <option>College of Allied Health Sciences</option>
            <option>College of Arts & Social Sciences</option>
            <option>College of Business & Accountancy</option>
            <option>College of Criminal Justice Education</option>
            <option>College of Education</option>
            <option>College of Engineering</option>
            <option>College of Environmental Studies</option>
            <option>College of Fisheries & Aquatic Sciences</option>
            <option>College of Governance</option>
            <option>College of Industrial Technology</option>
            <option>College of Information & Computing Sciences</option>
            <option>
              Offices under the Office of the University President
            </option>
            <option>
              Offices under the Office of the Vice President for Academic
              Affairs
            </option>
            <option>
              Offices under the Office of the Vice President for Administration
              and Finance
            </option>
            <option>
              Offices under the Office of the Vice President for Research and
              Extension
            </option>
            <option>
              Offices under the Office of the Vice President for Student Affairs
              and Services
            </option>
          </select>
        </div>

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
