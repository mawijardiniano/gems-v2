export default function Filters({
  filterCampus,
  filterCollege,
  filterStatus,
  setFilterCampus,
  setFilterCollege,
  setFilterStatus,
  campusOptions,
  collegeOptions,
  statusOptions,
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-10">
      <select
        className="border p-2 rounded bg-white"
        value={filterCampus}
        onChange={(e) => setFilterCampus(e.target.value)}
      >
        <option value="">All Campuses</option>
        {campusOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded bg-white w-32"
        value={filterCollege}
        onChange={(e) => setFilterCollege(e.target.value)}
      >
        <option value="">All Colleges</option>
        {collegeOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded bg-white"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
      >
        <option value="">All Statuses</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

