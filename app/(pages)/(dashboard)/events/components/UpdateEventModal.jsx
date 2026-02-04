"use client";

import axios from "axios";
import { useState, useEffect } from "react";

export default function UpdateEventModal({
  isOpen,
  onClose,
  event,
  onEventUpdated,
}) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const COLLEGE_LIST = [
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

  useEffect(() => {
    if (isOpen && event) {
      setFormData({
        title: event.title || "",
        description: event.description || "",
        date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
        venue: event.venue || "",
        invitation_rules: {
          person_type: event.invitation_rules?.person_type || [],
          employment_status: event.invitation_rules?.employment_status || [],
          pwd:
            event.invitation_rules?.pwd === undefined
              ? null
              : event.invitation_rules.pwd,
          solo_parent:
            event.invitation_rules?.solo_parent === undefined
              ? null
              : event.invitation_rules.solo_parent,
          college_scope: event.invitation_rules?.college_scope || "ALL",
          colleges: event.invitation_rules?.colleges || [],
          sex: event.invitation_rules?.sex || "",
        },
      });
    }
  }, [isOpen, event]);

  const isEmployeeSelected =
    formData?.invitation_rules.person_type.includes("Employee");

  useEffect(() => {
    if (formData && !isEmployeeSelected) {
      setFormData((prev) => ({
        ...prev,
        invitation_rules: {
          ...prev.invitation_rules,
          employment_status: [],
        },
      }));
    }
  }, [isEmployeeSelected]);

  const handleBasicInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

    const getNowForDatetimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
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
      const current = prev.invitation_rules[ruleField];
      return {
        ...prev,
        invitation_rules: {
          ...prev.invitation_rules,
          [ruleField]: current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value],
        },
      };
    });
  };

  const handleCollegeToggle = (college) => {
    setFormData((prev) => {
      const current = prev.invitation_rules.colleges;
      return {
        ...prev,
        invitation_rules: {
          ...prev.invitation_rules,
          colleges: current.includes(college)
            ? current.filter((c) => c !== college)
            : [...current, college],
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

      await axios.put(`/api/events/${event._id}`, formData);

      setSuccess("Event updated successfully!");

      setTimeout(() => {
        onClose();
        onEventUpdated?.();
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update event.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-400 p-6 flex justify-between">
          <div>
            <h2 className="text-2xl font-bold">Update Event</h2>
            <p className="text-sm text-gray-500">
              Modify event details and invitation rules
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-4xl text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}

          <section>
            <h3 className="font-semibold mb-3">Event Details</h3>

            <input
              className="w-full border border-gray-400 rounded px-4 py-2 mb-3"
              placeholder="Event Title"
              value={formData.title}
              onChange={(e) => handleBasicInputChange("title", e.target.value)}
            />

            <input
              type="datetime-local"
              className="w-full border border-gray-400 rounded px-4 py-2 mb-3"
              value={formData.date}
               min={getNowForDatetimeLocal()}
              onChange={(e) => handleBasicInputChange("date", e.target.value)}
            />

            <textarea
              className="w-full border border-gray-400 rounded px-4 py-2 mb-3"
              rows="3"
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                handleBasicInputChange("description", e.target.value)
              }
            />

            <input
              className="w-full border border-gray-400 rounded px-4 py-2"
              placeholder="Venue"
              value={formData.venue}
              onChange={(e) => handleBasicInputChange("venue", e.target.value)}
            />
          </section>

          <section className="border-t border-gray-400 pt-5">
            <h3 className="text-lg font-semibold mb-4">Who Can Attend</h3>
            <p className="text-gray-600 text-sm mb-4">
              Leave all empty to allow everyone.
            </p>


            {["Student", "Employee"].map((type) => (
              <label key={type} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.invitation_rules.person_type.includes(type)}
                  onChange={() => handleArrayToggle("person_type", type)}
                />
                {type}
              </label>
            ))}

            <div className="mt-2">
              <label className="block font-medium mb-2">
                Employment Status
                {!isEmployeeSelected && (
                  <span className="text-gray-400 text-xs ml-2">
                    (Select Employee first)
                  </span>
                )}
              </label>
              <div className="space-y-2">
                {["Faculty", "Non-teaching Personnel"].map((status) => (
                  <label
                    key={status}
                    className={`flex items-center text-sm ${
                      !isEmployeeSelected ? "text-gray-400" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isEmployeeSelected}
                      checked={formData.invitation_rules.employment_status.includes(
                        status,
                      )}
                      onChange={() =>
                        handleArrayToggle("employment_status", status)
                      }
                      className="mr-2"
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

                        <div className="mt-2">
              <label className="block font-medium mb-2">Sex Restriction</label>
              <select
                value={formData.invitation_rules.sex || ""}
                onChange={(e) => handleRulesChange("sex", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">No restriction</option>
                <option value="Male">Male only</option>
                <option value="Female">Female only</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">
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
                    value === "" ? null : value === "true",
                  );
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">No restriction</option>
                <option value="true">PWD only</option>
                <option value="false">Non-PWD only</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">
                Solo Parent Status
              </label>
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
                    value === "" ? null : value === "true",
                  );
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">No restriction</option>
                <option value="true">Solo Parents only</option>
                <option value="false">Non-Solo Parents only</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">College Scope</label>
              <select
                className="w-full border border-gray-400 rounded px-3 py-2"
                value={formData.invitation_rules.college_scope}
                onChange={(e) =>
                  handleRulesChange("college_scope", e.target.value)
                }
              >
                <option value="ALL">All Colleges</option>
                <option value="SELECTED">Selected Colleges</option>
              </select>
            </div>

            {formData.invitation_rules.college_scope === "SELECTED" && (
              <div className="mt-3 max-h-40 overflow-y-auto">
                {COLLEGE_LIST.map((college) => (
                  <label key={college} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.invitation_rules.colleges.includes(
                        college,
                      )}
                      onChange={() => handleCollegeToggle(college)}
                    />
                    {college}
                  </label>
                ))}
              </div>
            )}
          </section>
        </form>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-400 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-400"
          >
            {loading ? "Updating..." : "Update Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
