"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const PIE_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#EC4899",
];
const GENDER_BAR_COLORS = {
  Male: "#3B82F6",
  Female: "#EC4899",
  Other: "#A3E635",
};

const safeGet = (fn, fb = null) => {
  try {
    const v = fn();
    return v === undefined || v === null || v === "" ? fb : v;
  } catch {
    return fb;
  }
};

const getStatus = (d) =>
  safeGet(() => d.personal_info_id?.personal?.currentStatus) ||
  safeGet(() => d.personal_information?.person_type) ||
  (safeGet(() => d.personal_information?.is_student) === true
    ? "Student"
    : null);

const getGender = (d) => {
  const v = (
    safeGet(() => d.personal_info_id?.gadData?.sexAtBirth) ||
    safeGet(() => d.personal_information?.gadData?.sexAtBirth) ||
    safeGet(() => d.personal_info_id?.personal?.sex) ||
    ""
  ).toLowerCase();
  if (v === "male" || v === "m") return "Male";
  if (v === "female" || v === "f") return "Female";
  return "Other";
};

const countBy = (data, accessor, fb = "Unknown") => {
  const counts = {};
  data.forEach((d) => {
    const v = accessor(d) || fb;
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const countByGender = (data, accessor, fb = "Unknown") => {
  const groups = {};
  data.forEach((d) => {
    const cat = accessor(d) || fb;
    const g = getGender(d);
    if (!groups[cat]) groups[cat] = { name: cat, Male: 0, Female: 0, Other: 0 };
    groups[cat][g] = (groups[cat][g] || 0) + 1;
  });
  return Object.values(groups);
};

const calcAge = (birthday) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age < 0 ? null : age;
};

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

function InlineLegend({ data, colors }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {data.map((entry, i) => (
        <div
          key={entry.name}
          className="flex items-center gap-1.5 text-xs text-gray-600"
        >
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: colors[i % colors.length] }}
          />
          {entry.name}:{" "}
          <span className="font-semibold ml-0.5">
            {entry.value?.toLocaleString() ??
              ((entry.Male || 0) + (entry.Female || 0)).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieCard({
  title,
  data,
  height = 200,
  innerRadius = 35,
  outerRadius = 60,
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mb-3 text-xs text-gray-400">
        {total.toLocaleString()} total
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => `${v} people`}
          />
        </PieChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={PIE_COLORS} />
    </div>
  );
}

function HorzBarCard({
  title,
  data,
  dataKey = "value",
  height = 240,
}) {
  const total = data.reduce((s, d) => s + (d[dataKey] || 0), 0);
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mb-3 text-xs text-gray-400">
        {total.toLocaleString()} total
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => `${v} people`}
          />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={PIE_COLORS} />
    </div>
  );
}

function VertBarCard({ title, data, height = 240 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mb-3 text-xs text-gray-400">
        {total.toLocaleString()} total
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ left: 0, right: 0 }} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={PIE_COLORS} />
    </div>
  );
}

function GenderBarCard({ title, data, height = 260 }) {
  const total = data.reduce(
    (s, d) => s + (d.Male || 0) + (d.Female || 0),
    0,
  );
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mb-3 text-xs text-gray-400">
        {total.toLocaleString()} total
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barSize={20} margin={{ left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Bar
            dataKey="Male"
            fill={GENDER_BAR_COLORS.Male}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Female"
            fill={GENDER_BAR_COLORS.Female}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={[GENDER_BAR_COLORS.Male, GENDER_BAR_COLORS.Female]} />
    </div>
  );
}

function GenderHorzBarCard({ title, data, height = 300 }) {
  const total = data.reduce(
    (s, d) => s + (d.Male || 0) + (d.Female || 0),
    0,
  );
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mb-3 text-xs text-gray-400">
        {total.toLocaleString()} total
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={160}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Bar
            dataKey="Male"
            fill={GENDER_BAR_COLORS.Male}
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="Female"
            fill={GENDER_BAR_COLORS.Female}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={[GENDER_BAR_COLORS.Male, GENDER_BAR_COLORS.Female]} />
    </div>
  );
}


export default function Demographics({
  data,
  personTypeFilter = "",
  college,
  demographics,
  serverStudentProgramData,
  serverStudentYearCourseData,
  serverCourseKeys,
  studentCount,
}) {
  const statusFilter = `${personTypeFilter || ""}`.trim().toLowerCase();
  const isEmployeeFilter = statusFilter === "employee";
  const isStudentFilter = statusFilter === "student";

  if (demographics) {
    const palette = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
      "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
      "#14B8A6", "#D946EF", "#0EA5E9", "#22C55E", "#EAB308",
    ];
    const keys = serverCourseKeys || [];
    const courseColorsMap = {};
    keys.forEach((key, i) => {
      courseColorsMap[key] = palette[i % palette.length];
    });

    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Demographic & Employment Profile
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Personnel and occupational overview
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <PieCard title="Age Groups" data={demographics.ageData || []} />
          <PieCard title="Civil Status" data={demographics.civilData || []} />
        </div>

        <div className="mb-6">
          <HorzBarCard
            title="Religion"
            data={demographics.religionData || []}
            height={300}
          />
        </div>

        {!isEmployeeFilter && serverStudentProgramData && (
          <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <VertBarCard title="Students by Program" data={serverStudentProgramData} />
            <VertBarCard
              title="Students by Year Level"
              data={demographics.studentYearLevelData || []}
            />
          </div>
        )}

        {!isEmployeeFilter && serverStudentYearCourseData && serverStudentYearCourseData.length > 0 && (
          <div className="mb-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Students by Year Level and Course
              </h3>
              <p className="mb-3 text-xs text-gray-400">
                {(studentCount || 0).toLocaleString()} total
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={serverStudentYearCourseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  {keys.map((course) => (
                    <Bar
                      key={course}
                      dataKey={course}
                      fill={courseColorsMap[course]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!isStudentFilter && (
          <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <GenderBarCard
              title="Employment Type (Employees)"
              data={demographics.employmentData || []}
            />
            <GenderBarCard
              title="Appointment Status (Employees)"
              data={demographics.appointmentData || []}
            />
          </div>
        )}
      </div>
    );
  }

  const employees = data.filter(
    (d) => (getStatus(d) || "").toLowerCase() === "employee",
  );
  const students = data.filter(
    (d) => (getStatus(d) || "").toLowerCase() === "student",
  );

  const ageData = (() => {
    const counts = {};
    data.forEach((d) => {
      const age = calcAge(
        safeGet(() => d.personal_info_id?.personal?.birthday) ||
          safeGet(() => d.personal_information?.birthday),
      );
      if (age === null) return;
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}–${bucket + 9}`;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
      .map(([name, value]) => ({ name, value }));
  })();

  const civilData = countBy(
    data,
    (d) =>
      safeGet(() => d.personal_info_id?.personal?.civil_status) ||
      safeGet(() => d.personal_information?.civil_status),
  );

  const religionData = countBy(
    data,
    (d) =>
      safeGet(() => d.personal_info_id?.personal?.religion) ||
      safeGet(() => d.personal_information?.religion),
  );

  const collegeFilteredStudents = students.filter((d) => {
    const acad = d?.personal_info_id?.affiliation?.academic_information;
    return !college || acad?.college === college;
  });

  const studentProgramData = countBy(
    collegeFilteredStudents,
    (d) =>
      safeGet(
        () => d.personal_info_id?.affiliation?.academic_information?.course,
      ),
  );

  const sortStudentYearLevels = (rows) => {
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
      (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name),
    );
  };

  const studentYearLevelData = sortStudentYearLevels(
    countBy(
      collegeFilteredStudents,
      (d) =>
        safeGet(
          () =>
            d.personal_info_id?.affiliation?.academic_information?.year_level,
        ),
    ),
  );

  const studentYearCourseData = (() => {
    const grouped = {};
    collegeFilteredStudents.forEach((d) => {
      const acad = d?.personal_info_id?.affiliation?.academic_information || {};
      const year = acad.year_level || "Unknown";
      const course = acad.course || "Unknown";
      if (!grouped[year]) grouped[year] = { name: year };
      grouped[year][course] = (grouped[year][course] || 0) + 1;
    });
    const order = {
      "1st Year": 1,
      "2nd Year": 2,
      "3rd Year": 3,
      "4th Year": 4,
      "5th Year": 5,
    };
    return Object.values(grouped).sort(
      (a, b) => (order[a.name] || 999) - (order[b.name] || 999),
    );
  })();

  const courseKeys = (() => {
    const keys = new Set();
    studentYearCourseData.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (k !== "name") keys.add(k);
      });
    });
    return Array.from(keys).sort();
  })();

  const courseColors = (() => {
    const palette = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
      "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
      "#14B8A6", "#D946EF", "#0EA5E9", "#22C55E", "#EAB308",
    ];
    const map = {};
    courseKeys.forEach((key, i) => {
      map[key] = palette[i % palette.length];
    });
    return map;
  })();

  const collegeFilteredEmployees = employees.filter((d) => {
    const emp = d?.personal_info_id?.affiliation?.employment_information;
    return !college || emp?.office === college;
  });

  const employmentData = countByGender(
    collegeFilteredEmployees,
    (d) =>
      safeGet(
        () =>
          d.personal_info_id?.affiliation?.employment_information
            ?.employment_status,
      ),
  );

  const appointmentData = countByGender(
    collegeFilteredEmployees,
    (d) =>
      safeGet(
        () =>
          d.personal_info_id?.affiliation?.employment_information
            ?.employment_appointment_status,
      ),
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Demographic & Employment Profile
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Personnel and occupational overview
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <PieCard title="Age Groups" data={ageData} />
        <PieCard title="Civil Status" data={civilData} />
      </div>

      <div className="mb-6">
        <HorzBarCard title="Religion" data={religionData} height={300} />
      </div>

      {!isEmployeeFilter && (
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <VertBarCard
            title="Students by Program"
            data={studentProgramData}
          />
          <VertBarCard
            title="Students by Year Level"
            data={studentYearLevelData}
          />
        </div>
      )}

      {!isEmployeeFilter && (
        <div className="mb-6">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Students by Year Level and Course
            </h3>
            <p className="mb-3 text-xs text-gray-400">
              {collegeFilteredStudents.length.toLocaleString()} total
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={studentYearCourseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                {courseKeys.map((course) => (
                  <Bar
                    key={course}
                    dataKey={course}
                    fill={courseColors[course]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isStudentFilter && (
        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <GenderBarCard
            title="Employment Type (Employees)"
            data={employmentData}
          />
          <GenderBarCard
            title="Appointment Status (Employees)"
            data={appointmentData}
          />
        </div>
      )}
    </div>
  );
}