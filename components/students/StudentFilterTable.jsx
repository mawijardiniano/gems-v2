"use client";
import { useRef, useState, useEffect } from "react";
import { HiChevronDown } from "react-icons/hi";

/* Student list filters shared by the admin and dean student pages: four
   single-value selects plus one multi-select checkbox dropdown. Only the
   multi-select differs between roles (admin filters by college, dean by
   course), so its label, heading, value, setter and options come in as
   multi* props. setMultiValue must accept an updater function. */
export default function StudentFilterTable({
  filterSex,
  filterYearLevel,
  filterSchoolYear,
  filterSemester,
  setFilterSex,
  setFilterYearLevel,
  setFilterSchoolYear,
  setFilterSemester,
  sexOption = [],
  yearLevelOptions = [],
  schoolYearOptions = [],
  semesterOptions = [],
  multiLabel,
  multiHeading,
  multiValue,
  setMultiValue,
  multiOptions = [],
}) {
  const [multiOpen, setMultiOpen] = useState(false);
  const multiRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (multiRef.current && !multiRef.current.contains(e.target))
        setMultiOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex flex-wrap gap-4 mb-6 text-black text-xs">
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

      <select
        className="border p-2 rounded bg-white"
        value={filterSchoolYear}
        onChange={(e) => setFilterSchoolYear(e.target.value)}
      >
        <option value="" disabled>
          School Year
        </option>
        {schoolYearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded bg-white"
        value={filterSemester}
        onChange={(e) => setFilterSemester(e.target.value)}
      >
        <option value="" disabled>
          Semester
        </option>
        {semesterOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="relative" ref={multiRef}>
        <button
          type="button"
          className="border p-2 rounded bg-white text-left min-w-[220px] flex items-center justify-between"
          onClick={() => setMultiOpen((s) => !s)}
        >
          <span className="truncate mr-2">{multiLabel}</span>
          {Array.isArray(multiValue) && multiValue.length > 0 && (
            <span className="ml-2 inline-block bg-secondary-100 text-secondary-800 text-xs px-2 py-0.5 rounded">
              {multiValue.length}
            </span>
          )}
          <HiChevronDown
            className={`ml-2 transition-transform duration-150 ${multiOpen ? "rotate-180" : ""}`}
          />
        </button>
        {multiOpen && (
          <div className="absolute z-10 mt-1 w-64 bg-white border rounded shadow max-h-48 overflow-auto p-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">{multiHeading}</span>
              <button
                type="button"
                onClick={() => setMultiValue([])}
                className="text-xs text-secondary-600"
              >
                Clear
              </button>
            </div>
            {multiOptions.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(multiValue)
                      ? multiValue.includes(c)
                      : false
                  }
                  onChange={() =>
                    setMultiValue((prev) =>
                      prev.includes(c)
                        ? prev.filter((x) => x !== c)
                        : [...prev, c],
                    )
                  }
                  className="form-checkbox"
                />
                <span className="text-xs">{c}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
