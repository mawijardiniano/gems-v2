"use client";

import { useState, useRef, useEffect } from "react";
import { HiChevronDown } from "react-icons/hi";

export default function Filter({
  filterSex,
  filterCollege,
  filterEmployment,
  filterAppointment,
  setFilterSex,
  setFilterCollege,
  setFilterEmployment,
  setFilterAppointment,
  sexOption,
  collegeOptions,
  employmentOptions,
  appointmentOptions,
}) {
  const [collegeOpen, setCollegeOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const collegeRef = useRef(null);
  const appointmentRef = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (collegeRef.current && !collegeRef.current.contains(e.target))
        setCollegeOpen(false);
      if (appointmentRef.current && !appointmentRef.current.contains(e.target))
        setAppointmentOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border p-2 rounded bg-white"
        value={filterSex}
        onChange={(e) => setFilterSex(e.target.value)}
      >
        <option value="">All Gender</option>
        {sexOption.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <div className="relative" ref={collegeRef}>
        <button
          type="button"
          className="border p-2 rounded bg-white text-left min-w-[220px] flex items-center justify-between"
          onClick={() => setCollegeOpen((s) => !s)}
        >
          <span className="truncate mr-2">
            {!filterCollege || filterCollege.length > 0
              ? "Colleges / Offices"
              : Array.isArray(filterCollege)
              ? "All Colleges / Offices"
              : filterCollege}
          </span>
          <HiChevronDown
            className={`ml-2 transition-transform duration-150 ${
              collegeOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {collegeOpen && (
          <div className="absolute z-10 mt-1 w-64 bg-white border rounded shadow max-h-48 overflow-auto p-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Select Colleges</span>
              <button
                type="button"
                onClick={() => setFilterCollege([])}
                className="text-xs text-blue-600"
              >
                Clear
              </button>
            </div>
            {collegeOptions.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(filterCollege)
                      ? filterCollege.includes(c)
                      : false
                  }
                  onChange={() =>
                    setFilterCollege((prev) =>
                      prev.includes(c)
                        ? prev.filter((x) => x !== c)
                        : [...prev, c]
                    )
                  }
                  className="form-checkbox"
                />
                <span className="text-sm">{c}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <select
        className="border p-2 rounded bg-white"
        value={filterEmployment}
        onChange={(e) => setFilterEmployment(e.target.value)}
      >
        <option value="">All Employment Status</option>
        {employmentOptions.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      <div className="relative" ref={appointmentRef}>
        <button
          type="button"
          className="border p-2 rounded bg-white text-left min-w-[220px] flex items-center justify-between"
          onClick={() => setAppointmentOpen((s) => !s)}
        >
          <span className="truncate mr-2">
            {!filterAppointment || filterAppointment.length > 0
              ? "Appointment Status"
              : Array.isArray(filterAppointment)
              ? "All Appointment Status"
              : filterAppointment}
          </span>
          <HiChevronDown
            className={`ml-2 transition-transform duration-150 ${
              appointmentOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {appointmentOpen && (
          <div className="absolute z-10 mt-1 w-64 bg-white border rounded shadow max-h-48 overflow-auto p-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Select Appointment Status
              </span>
              <button
                type="button"
                onClick={() => setFilterAppointment([])}
                className="text-xs text-blue-600"
              >
                Clear
              </button>
            </div>
            {appointmentOptions.map((a) => (
              <label
                key={a}
                className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(filterAppointment)
                      ? filterAppointment.includes(a)
                      : false
                  }
                  onChange={() =>
                    setFilterAppointment((prev) =>
                      prev.includes(a)
                        ? prev.filter((x) => x !== a)
                        : [...prev, a]
                    )
                  }
                  className="form-checkbox"
                />
                <span className="text-sm">{a}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
