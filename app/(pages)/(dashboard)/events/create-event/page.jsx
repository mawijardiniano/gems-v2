"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

export default function CreateEventPage() {
  const router = useRouter();
  const userId = useSelector((state) => state.auth.userId);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    venue: "",
    invitation_rules: {
      person_type: [],
      employment_status: [],
      pwd: null,
      solo_parent: null,
      college_scope: "ALL",
      colleges: [],
    },
  });

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await axios.get("/api/profile");
      const uniqueColleges = [
        ...new Set(
          response.data.data
            .map((p) => p.personal_information?.college_office)
            .filter(Boolean)
        ),
      ];
      setColleges(uniqueColleges.sort());
    } catch (err) {
      console.error("Error fetching colleges:", err);
    }
  };

  const handleBasicInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRulesChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      invitation_rules: {
        ...prev.invitation_rules,
        [field]: value,
      },
    }));
  };

  const handleArrayToggle = (ruleField, value) => {
    setFormData((prev) => {
      const currentArray = prev.invitation_rules[ruleField];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value];

      return {
        ...prev,
        invitation_rules: {
          ...prev.invitation_rules,
          [ruleField]: newArray,
        },
      };
    });
  };

  const handleCollegeToggle = (college) => {
    setFormData((prev) => {
      const currentColleges = prev.invitation_rules.colleges;
      const newColleges = currentColleges.includes(college)
        ? currentColleges.filter((c) => c !== college)
        : [...currentColleges, college];

      return {
        ...prev,
        invitation_rules: {
          ...prev.invitation_rules,
          colleges: newColleges,
        },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!formData.title.trim()) {
        setError("Event title is required");
        setLoading(false);
        return;
      }

      if (!formData.date) {
        setError("Event date is required");
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        created_by: userId,
      };

      const response = await axios.post("/api/events", payload);
      setSuccess("Event created successfully!");

      setTimeout(() => {
        router.push("/dashboard/events");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Error creating event. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
      <p className="text-gray-500 mb-8">
        Set up your event and define invitation rules
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-8"
      >
        {/* Basic Event Information */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">Event Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium mb-2">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  handleBasicInputChange("title", e.target.value)
                }
                className="w-full border border-gray-300 rounded px-4 py-2"
                placeholder="Enter event title"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => handleBasicInputChange("date", e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-2"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                handleBasicInputChange("description", e.target.value)
              }
              className="w-full border border-gray-300 rounded px-4 py-2"
              placeholder="Event description"
              rows="4"
            />
          </div>

          <div className="mt-6">
            <label className="block font-medium mb-2">Venue</label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => handleBasicInputChange("venue", e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-2"
              placeholder="Event venue"
            />
          </div>
        </section>


        <section className="mb-8 border-t pt-8">
          <h2 className="text-2xl font-semibold mb-6">Invitation Rules</h2>
          <p className="text-gray-600 mb-6">
            Leave all empty to allow everyone. Set specific criteria to restrict
            invitations.
          </p>


          <div className="mb-8">
            <label className="block font-medium mb-3">Person Type</label>
            <div className="space-y-2">
              {["Student", "Employee", "Applicant"].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.invitation_rules.person_type.includes(
                      type
                    )}
                    onChange={() => handleArrayToggle("person_type", type)}
                    className="mr-3"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block font-medium mb-3">Employment Status</label>
            <div className="space-y-2">
              {["Faculty", "Non-teaching Personnel"].map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.invitation_rules.employment_status.includes(
                      status
                    )}
                    onChange={() =>
                      handleArrayToggle("employment_status", status)
                    }
                    className="mr-3"
                  />
                  <span>{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block font-medium mb-3">
              Person with Disability
            </label>
            <select
              value={
                formData.invitation_rules.pwd === null
                  ? ""
                  : formData.invitation_rules.pwd
                  ? "true"
                  : "false"
              }
              onChange={(e) => {
                const value = e.target.value;
                handleRulesChange(
                  "pwd",
                  value === "" ? null : value === "true"
                );
              }}
              className="w-full border border-gray-300 rounded px-4 py-2"
            >
              <option value="">No restriction (anyone)</option>
              <option value="true">PWD only</option>
              <option value="false">Non-PWD only</option>
            </select>
          </div>

          <div className="mb-8">
            <label className="block font-medium mb-3">Solo Parent Status</label>
            <select
              value={
                formData.invitation_rules.solo_parent === null
                  ? ""
                  : formData.invitation_rules.solo_parent
                  ? "true"
                  : "false"
              }
              onChange={(e) => {
                const value = e.target.value;
                handleRulesChange(
                  "solo_parent",
                  value === "" ? null : value === "true"
                );
              }}
              className="w-full border border-gray-300 rounded px-4 py-2"
            >
              <option value="">No restriction (anyone)</option>
              <option value="true">Solo Parents only</option>
              <option value="false">Non-Solo Parents only</option>
            </select>
          </div>

          <div className="mb-8">
            <label className="block font-medium mb-3">College Scope</label>
            <select
              value={formData.invitation_rules.college_scope}
              onChange={(e) =>
                handleRulesChange("college_scope", e.target.value)
              }
              className="w-full border border-gray-300 rounded px-4 py-2"
            >
              <option value="ALL">All Colleges</option>
              <option value="SELECTED">Selected Colleges Only</option>
            </select>
          </div>

          {formData.invitation_rules.college_scope === "SELECTED" && (
            <div className="mb-8 bg-gray-50 p-4 rounded">
              <label className="block font-medium mb-3">Select Colleges</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {colleges.map((college) => (
                  <label key={college} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.invitation_rules.colleges.includes(
                        college
                      )}
                      onChange={() => handleCollegeToggle(college)}
                      className="mr-3"
                    />
                    <span className="text-sm">{college}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex gap-4 justify-end border-t pt-8">
          <button
            type="button"
            onClick={() => router.push("/dashboard/events")}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
