"use client";

import { useState, useRef, useEffect } from "react";
import { HiChevronDown } from "react-icons/hi";

export default function Filter({
  filterSex,
  filterPersonType,
  filterYearLevel,
  filterCollege,
  filterEmployment,
  filterAppointment,
  setFilterSex,
  setFilterYearLevel,
  setFilterPersonType,
  setFilterCollege,
  setFilterEmployment,
  setFilterAppointment,
  sexOption,
  personTypeOptions = [],
  yearLevelOptions = [],
  collegeOptions = [],
  employmentOptions = [],
  appointmentOptions = [],
}) {
  const [collegeOpen, setCollegeOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const collegeRef = useRef(null);
  const appointmentRef = useRef(null);

  useEffect(() => {
    if (filterPersonType === "Student") {
      setFilterEmployment("");
      setFilterAppointment([]);
    } else if (filterPersonType === "Employee") {
      setFilterYearLevel("");
    } else {
      setFilterYearLevel("");
      setFilterEmployment("");
      setFilterAppointment([]);
    }
  }, [
    filterPersonType,
    setFilterEmployment,
    setFilterAppointment,
    setFilterYearLevel,
  ]);
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
        <option value="">All Sex at Birth</option>
        {sexOption.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded bg-white"
        value={filterPersonType}
        onChange={(e) => setFilterPersonType(e.target.value)}
      >
        <option value="">All Status</option>
        {personTypeOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {filterPersonType === "Student" && (
        <select
          className="border p-2 rounded bg-white"
          value={filterYearLevel}
          onChange={(e) => setFilterYearLevel(e.target.value)}
        >
          <option value="">All Year Levels</option>
          {yearLevelOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}
      {(filterPersonType === "" ||
        filterPersonType === "Student" ||
        filterPersonType === "Employee") && (
        <div className="relative" ref={collegeRef}>
          <button
            type="button"
            className="border p-2 rounded bg-white text-left min-w-[220px] flex items-center justify-between"
            onClick={() => setCollegeOpen((s) => !s)}
          >
            <span className="truncate mr-2">
              {filterPersonType === "Student"
                ? "Colleges"
                : filterPersonType === "Employee"
                  ? "Offices"
                  : "Colleges / Offices"}
            </span>
            {Array.isArray(filterCollege) && filterCollege.length > 0 && (
              <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                {filterCollege.length}
              </span>
            )}
            <HiChevronDown
              className={`ml-2 transition-transform duration-150 ${
                collegeOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {collegeOpen && (
            <div className="absolute z-10 mt-1 w-64 bg-white border rounded shadow max-h-48 overflow-auto p-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Select{" "}
                  {filterPersonType === "Employee" ? "Offices" : "Colleges"}
                </span>
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
                          : [...prev, c],
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
      )}

      {filterPersonType === "Employee" && (
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
      )}

      {filterPersonType === "Employee" && (
        <div className="relative" ref={appointmentRef}>
          <button
            type="button"
            className="border p-2 rounded bg-white text-left min-w-[220px] flex items-center justify-between"
            onClick={() => setAppointmentOpen((s) => !s)}
          >
            <span className="truncate mr-2">Appointment Status</span>
            {Array.isArray(filterAppointment) &&
              filterAppointment.length > 0 && (
                <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                  {filterAppointment.length}
                </span>
              )}
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
                          : [...prev, a],
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
      )}
    </div>
  );
}
