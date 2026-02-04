"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

export default function CreateEventModal({ isOpen, onClose, onEventCreated }) {
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
      sex: null,
      college_scope: "ALL",
      colleges: [],
    },
  });

  const [colleges, setColleges] = useState([]);
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
    if (isOpen) setColleges(COLLEGE_LIST);
  }, [isOpen]);

  const isEmployeeSelected =
    formData.invitation_rules.person_type.includes("Employee");

  useEffect(() => {
    if (!isEmployeeSelected) {
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

      await axios.post("/api/events", payload);
      setSuccess("Event created successfully!");

      setTimeout(() => {
        resetForm();
        onClose();
        onEventCreated?.();
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error creating event. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      venue: "",
      invitation_rules: {
        person_type: [],
        employment_status: [],
        pwd: null,
        solo_parent: null,
        sex: null,
        college_scope: "ALL",
        colleges: [],
      },
    });
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-300 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Create New Event</h2>
            <p className="text-gray-500 text-sm">
              Set up your event and define invitation rules
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-4xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          <section>
            <h3 className="text-lg font-semibold mb-4">Event Details</h3>

            <div className="space-y-4">
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
                  min={getNowForDatetimeLocal()}
                  onChange={(e) =>
                    handleBasicInputChange("date", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded px-4 py-2"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleBasicInputChange("description", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  placeholder="Event description"
                  rows="3"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) =>
                    handleBasicInputChange("venue", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  placeholder="Event venue"
                />
              </div>
            </div>
          </section>

          <section className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-semibold mb-4">Who Can Attend</h3>
            <p className="text-gray-600 text-sm mb-4">
              Leave all empty to allow everyone.
            </p>

            <div>
              <label className="block font-medium mb-2">Person Type</label>
              <div className="space-y-2">
                {["Student", "Employee"].map((type) => (
                  <label key={type} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={formData.invitation_rules.person_type.includes(
                        type,
                      )}
                      onChange={() => handleArrayToggle("person_type", type)}
                      className="mr-2"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div>
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

            <div>
              <label className="block font-medium mb-2">Sex</label>
              <select
                value={
                  formData.invitation_rules.sex === null
                    ? ""
                    : formData.invitation_rules.sex
                }
                onChange={(e) => {
                  const value = e.target.value;
                  handleRulesChange("sex", value === "" ? null : value);
                }}
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

            {/* Solo Parent */}
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

            <div>
              <label className="block font-medium mb-2">College Scope</label>
              <select
                value={formData.invitation_rules.college_scope}
                onChange={(e) =>
                  handleRulesChange("college_scope", e.target.value)
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="ALL">All Colleges</option>
                <option value="SELECTED">Selected Colleges Only</option>
              </select>
            </div>

            {/* Colleges */}
            {formData.invitation_rules.college_scope === "SELECTED" && (
              <div className="bg-gray-50 p-3 rounded">
                <label className="block font-medium mb-2 text-sm">
                  Select Colleges
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {colleges.map((college) => (
                    <label key={college} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={formData.invitation_rules.colleges.includes(
                          college,
                        )}
                        onChange={() => handleCollegeToggle(college)}
                        className="mr-2"
                      />
                      <span className="text-sm">{college}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>
        </form>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-300 p-6 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
