"use client";

import {
  FaUsers,
  FaVenusMars,
  FaWheelchair,
  FaLeaf,
  FaGraduationCap,
} from "react-icons/fa";

const statCards = [
  {
    key: "total",
    label: "Total Population",
    icon: FaUsers,
    gradient: "from-blue-600 to-blue-400",
    lightBg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    key: "gender",
    label: "Gender Breakdown",
    icon: FaVenusMars,
    gradient: "from-purple-600 to-pink-400",
    lightBg: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    key: "pwd",
    label: "PWD",
    icon: FaWheelchair,
    gradient: "from-emerald-600 to-emerald-400",
    lightBg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    key: "ip",
    label: "Indigenous Peoples",
    icon: FaLeaf,
    gradient: "from-teal-600 to-teal-400",
    lightBg: "bg-teal-50",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
];

function StatCard({ card, children }) {
  const Icon = card.icon;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.gradient}`}
      />

      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="text-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {card.label}
          </p>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const getGender = (d) => {
  const v = (
    d?.personal_info_id?.gadData?.sexAtBirth ||
    d?.personal_information?.gadData?.sexAtBirth ||
    d?.personal_info_id?.personal?.sex ||
    ""
  ).toLowerCase();
  if (v === "male" || v === "m") return "Male";
  if (v === "female" || v === "f") return "Female";
  return "Other";
};

const sortYearLevels = (rows) => {
  const order = [
    "grade 11",
    "grade 12",
    "1st year",
    "2nd year",
    "3rd year",
    "4th year",
    "5th year",
    "graduate",
    "graduates",
    "unknown",
  ];
  const rank = (name) => {
    const n = `${name || ""}`.trim().toLowerCase();
    const i = order.findIndex((t) => n === t || n.includes(t));
    return i === -1 ? order.length : i;
  };
  return [...rows].sort(
    (a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label),
  );
};

export default function Snapshot({
  data,
  college,
  filterSchoolYear,
  filterSemester,
  snapshot,
  serverYearGenderData,
}) {

  if (snapshot) {
    const total = snapshot.total || 0;
    const femaleCount = snapshot.femaleCount || 0;
    const maleCount = snapshot.maleCount || 0;
    const pwdCount = snapshot.pwdCount || 0;
    const ipCount = snapshot.ipCount || 0;

    const yearRows = serverYearGenderData || [];
    const yearLevelStatCards = yearRows.map((row) => ({
      key: row.label,
      label: row.label,
      icon: FaGraduationCap,
      gradient: "from-amber-500 to-yellow-400",
      lightBg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    }));

    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Executive Snapshot
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Overview of key indicators and demographic gaps
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard card={statCards[0]}>{total.toLocaleString()}</StatCard>

          <StatCard card={statCards[1]}>
            <div className="flex items-baseline gap-2">
              <span className="text-purple-600">{femaleCount}</span>
              <span className="text-sm font-normal text-gray-400">·</span>
              <span className="text-blue-600">{maleCount}</span>
              <span className="text-xs font-normal text-gray-400">(F · M)</span>
            </div>
            {total > 0 && (
              <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-purple-500 transition-all duration-500"
                  style={{ width: `${(femaleCount / total) * 100}%` }}
                />
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(maleCount / total) * 100}%` }}
                />
              </div>
            )}
          </StatCard>

          <StatCard card={statCards[2]}>
            {pwdCount}
            {pwdCount === 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                No declaration
              </span>
            )}
          </StatCard>

          <StatCard card={statCards[3]}>
            {ipCount}
            {ipCount === 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                No declaration
              </span>
            )}
          </StatCard>
        </div>

        {yearRows.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <FaGraduationCap className="text-sm text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">
                Students by Year Level
              </h3>
              <span className="text-xs text-gray-400">
                ({yearRows.reduce((s, r) => s + (r.total || 0), 0).toLocaleString()} total students)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {yearRows.map((row, i) => (
                <StatCard key={row.label} card={yearLevelStatCards[i]}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-purple-600">{row.Female || 0}</span>
                    <span className="text-sm font-normal text-gray-400">·</span>
                    <span className="text-blue-600">{row.Male || 0}</span>
                    <span className="text-xs font-normal text-gray-400">
                      (F · M)
                    </span>
                  </div>
                  {row.total > 0 && (
                    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="bg-purple-500 transition-all duration-500"
                        style={{ width: `${((row.Female || 0) / row.total) * 100}%` }}
                      />
                      <div
                        className="bg-blue-500 transition-all duration-500"
                        style={{ width: `${((row.Male || 0) / row.total) * 100}%` }}
                      />
                    </div>
                  )}
                </StatCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const filterByTerm = (d) => {
    const schoolYearMatches =
      !filterSchoolYear ||
      d?.school_year === filterSchoolYear ||
      (!d?.school_year &&
        Array.isArray(d?.profile_terms) &&
        d.profile_terms.some((t) => t?.school_year === filterSchoolYear));

    const semesterMatches =
      !filterSemester ||
      d?.semester === filterSemester ||
      (!d?.semester &&
        !filterSchoolYear &&
        Array.isArray(d?.profile_terms) &&
        d.profile_terms.some((t) => t?.semester === filterSemester)) ||
      (!d?.semester &&
        filterSchoolYear &&
        Array.isArray(d?.profile_terms) &&
        d.profile_terms.some((t) => t?.school_year === filterSchoolYear && t?.semester === filterSemester));

    return schoolYearMatches && semesterMatches;
  };

  const filteredData = filterSchoolYear || filterSemester
    ? data.filter(filterByTerm)
    : data;

  const students = filteredData.filter((d) => {
    const acad = d?.personal_info_id?.affiliation?.academic_information;
    return !college || acad?.college === college;
  });

  const employees = filteredData.filter((d) => {
    const emp = d?.personal_info_id?.affiliation?.employment_information;
    return !college || emp?.office === college;
  });

  const total = filteredData.length;
  const femaleCount = filteredData.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Female",
  ).length;
  const maleCount = filteredData.filter(
    (d) => d.personal_info_id?.gadData?.sexAtBirth === "Male",
  ).length;
  const pwdCount =
    filteredData.filter((d) => d.personal_info_id?.gadData?.isPWD === true).length || 0;
  const ipCount =
    filteredData.filter((d) => d.personal_info_id?.gadData?.isIndigenousPerson === true)
      .length || 0;

  const studentYearGenderData = (() => {
    const grouped = {};
    students.forEach((d) => {
      const acad = d?.personal_info_id?.affiliation?.academic_information || {};
      const year = acad.year_level || "Unknown";
      if (!grouped[year])
        grouped[year] = { label: year, Female: 0, Male: 0, Other: 0, total: 0 };
      const g = getGender(d);
      grouped[year][g] = (grouped[year][g] || 0) + 1;
      grouped[year].total += 1;
    });
    return sortYearLevels(Object.values(grouped));
  })();

  const yearLevelStatCards = studentYearGenderData.map((row) => ({
    key: row.label,
    label: row.label,
    icon: FaGraduationCap,
    gradient: "from-amber-500 to-yellow-400",
    lightBg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Executive Snapshot
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Overview of key indicators and demographic gaps
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard card={statCards[0]}>{total.toLocaleString()}</StatCard>

        <StatCard card={statCards[1]}>
          <div className="flex items-baseline gap-2">
            <span className="text-purple-600">{femaleCount}</span>
            <span className="text-sm font-normal text-gray-400">·</span>
            <span className="text-blue-600">{maleCount}</span>
            <span className="text-xs font-normal text-gray-400">(F · M)</span>
          </div>
          {total > 0 && (
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="bg-purple-500 transition-all duration-500"
                style={{ width: `${(femaleCount / total) * 100}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${(maleCount / total) * 100}%` }}
              />
            </div>
          )}
        </StatCard>

        <StatCard card={statCards[2]}>
          {pwdCount}
          {pwdCount === 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              No declaration
            </span>
          )}
        </StatCard>

        <StatCard card={statCards[3]}>
          {ipCount}
          {ipCount === 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              No declaration
            </span>
          )}
        </StatCard>
      </div>

      {/* Students by Year Level with Gender Breakdown */}
      {studentYearGenderData.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <FaGraduationCap className="text-sm text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">
              Students by Year Level
            </h3>
            <span className="text-xs text-gray-400">
              ({students.length.toLocaleString()} total students)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {studentYearGenderData.map((row, i) => (
              <StatCard key={row.label} card={yearLevelStatCards[i]}>
                <div className="flex items-baseline gap-2">
                  <span className="text-purple-600">{row.Female}</span>
                  <span className="text-sm font-normal text-gray-400">·</span>
                  <span className="text-blue-600">{row.Male}</span>
                  <span className="text-xs font-normal text-gray-400">
                    (F · M)
                  </span>
                </div>
                {row.total > 0 && (
                  <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="bg-purple-500 transition-all duration-500"
                      style={{ width: `${(row.Female / row.total) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all duration-500"
                      style={{ width: `${(row.Male / row.total) * 100}%` }}
                    />
                  </div>
                )}
              </StatCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
