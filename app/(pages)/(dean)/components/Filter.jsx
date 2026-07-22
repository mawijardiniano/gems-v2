"use client";

import { useState, useRef, useEffect } from "react";
import { HiChevronDown, HiX } from "react-icons/hi";

export default function Filter({
  filterSex,
  filterPersonType,
  filterYearLevel,
  filterSchoolYear,
  filterSemester,
  filterEmployment,
  filterAppointment,
  setFilterSex,
  setFilterYearLevel,
  setFilterSchoolYear,
  setFilterSemester,
  setFilterPersonType,
  setFilterEmployment,
  setFilterAppointment,
  sexOption,
  personTypeOptions = [],
  yearLevelOptions = [],
  schoolYearOptions = [],
  semesterOptions = [],
  employmentOptions = [],
  appointmentOptions = [],
}) {
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const appointmentRef = useRef(null);

  useEffect(() => {
    if (filterPersonType === "Student") {
      setFilterEmployment("");
      setFilterAppointment([]);
    } else if (filterPersonType === "Employee") {
      setFilterYearLevel("");
    } else {
      setFilterYearLevel("");
      setFilterSchoolYear("");
      setFilterSemester("");
      setFilterEmployment("");
      setFilterAppointment([]);
    }
  }, [
    filterPersonType,
    setFilterEmployment,
    setFilterAppointment,
    setFilterYearLevel,
    setFilterSchoolYear,
    setFilterSemester,
  ]);

  useEffect(() => {
    function onDoc(e) {
      if (appointmentRef.current && !appointmentRef.current.contains(e.target))
        setAppointmentOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /* Reusable select */
  function Select({ value, onChange, label, options }) {
    return (
      <select
        className="h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-xs text-gray-700 transition-colors hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.5rem center",
          backgroundSize: "1rem",
        }}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  /* Multi-checkbox dropdown */
  function MultiCheckbox({ label, options, value, onChange, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      function handleMouseDown(e) {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener("mousedown", handleMouseDown);
      return () => document.removeEventListener("mousedown", handleMouseDown);
    }, []);

    const count = Array.isArray(value) ? value.length : 0;

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className={`flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-xs text-gray-700 transition-colors hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
            open ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
          }`}
        >
          <span className="truncate">{placeholder}</span>
          {count > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-medium text-blue-700">
              {count}
            </span>
          )}
          <HiChevronDown
            className={`ml-auto text-gray-400 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-gray-100 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-50 px-3 py-2">
              <span className="text-[11px] font-medium text-gray-500">
                {label}
              </span>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                >
                  <HiX className="text-xs" />
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {options.map((opt) => {
                const checked = Array.isArray(value) && value.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 ${
                      checked ? "bg-blue-50 text-blue-800" : "text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange(
                          checked
                            ? value.filter((x) => x !== opt)
                            : [...value, opt],
                        )
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <Select
        label="All Sex at Birth"
        value={filterSex}
        onChange={setFilterSex}
        options={sexOption}
      />

      <Select
        label="All Status"
        value={filterPersonType}
        onChange={setFilterPersonType}
        options={personTypeOptions}
      />

      {filterPersonType === "Student" && (
        <Select
          label="All Year Levels"
          value={filterYearLevel}
          onChange={setFilterYearLevel}
          options={yearLevelOptions}
        />
      )}

      <Select
        label="School Year"
        value={filterSchoolYear}
        onChange={setFilterSchoolYear}
        options={schoolYearOptions}
      />

      <Select
        label="Semester"
        value={filterSemester}
        onChange={setFilterSemester}
        options={semesterOptions}
      />

      {filterPersonType === "Employee" && (
        <Select
          label="All Employment Status"
          value={filterEmployment}
          onChange={setFilterEmployment}
          options={employmentOptions}
        />
      )}

      {filterPersonType === "Employee" && (
        <MultiCheckbox
          label="Select Appointment Status"
          placeholder="Appointment Status"
          options={appointmentOptions}
          value={filterAppointment}
          onChange={setFilterAppointment}
        />
      )}
    </div>
  );
}