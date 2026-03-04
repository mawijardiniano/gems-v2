"use client";
import { useRef, useState, useEffect } from "react";
import { HiChevronDown } from "react-icons/hi";

export default function StudentFilterTable({
  filterSex,
  filterYearLevel,
  filterCollege,
  setFilterSex,
  setFilterYearLevel,
  setFilterCollege,
  sexOption = [],
  yearLevelOptions = [],
  collegeOptions = [],
}) {
  const [collegeOpen, setCollegeOpen] = useState(false);
  const collegeRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (collegeRef.current && !collegeRef.current.contains(e.target))
        setCollegeOpen(false);
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
      <div className="relative" ref={collegeRef}>
        <button
          type="button"
          className="border p-2 rounded bg-white text-left min-w-[220px] flex items-center justify-between"
          onClick={() => setCollegeOpen((s) => !s)}
        >
          <span className="truncate mr-2">Colleges</span>
          {Array.isArray(filterCollege) && filterCollege.length > 0 && (
            <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
              {filterCollege.length}
            </span>
          )}
          <HiChevronDown
            className={`ml-2 transition-transform duration-150 ${collegeOpen ? "rotate-180" : ""}`}
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
                  checked={Array.isArray(filterCollege) ? filterCollege.includes(c) : false}
                  onChange={() =>
                    setFilterCollege((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
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
    </div>
  );
}
