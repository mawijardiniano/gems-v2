import React, { useMemo, memo } from "react";
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

const get = (obj, path, fallback = null) => {
  try {
    const v = path.split(".").reduce((acc, key) => acc?.[key], obj);
    return v === null || v === undefined || v === "" ? fallback : v;
  } catch {
    return fallback;
  }
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


const addGender = (groups, cat, gender) => {
  if (!groups[cat]) groups[cat] = { name: cat, Male: 0, Female: 0, Other: 0 };
  groups[cat][gender] = (groups[cat][gender] || 0) + 1;
};

const countToRows = (counts) =>
  Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

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

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};


const InlineLegend = memo(function InlineLegend({ data, colors }) {
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
});

const PieCard = memo(function PieCard({
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
              <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
});

const HorzBarCard = memo(function HorzBarCard({
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
              <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={PIE_COLORS} />
    </div>
  );
});

const VertBarCard = memo(function VertBarCard({ title, data, height = 240 }) {
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
              <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <InlineLegend data={data} colors={PIE_COLORS} />
    </div>
  );
});

const GenderBarCard = memo(function GenderBarCard({ title, data, height = 260 }) {
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
      <InlineLegend
        data={data}
        colors={[GENDER_BAR_COLORS.Male, GENDER_BAR_COLORS.Female]}
      />
    </div>
  );
});

const GenderHorzBarCard = memo(function GenderHorzBarCard({
  title,
  data,
  height = 300,
}) {
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
      <InlineLegend
        data={data}
        colors={[GENDER_BAR_COLORS.Male, GENDER_BAR_COLORS.Female]}
      />
    </div>
  );
});

const UNKNOWN = "Unknown";

function Demographics({ data, personTypeFilter = "", demographics }) {
  const statusFilter = `${personTypeFilter || ""}`.trim().toLowerCase();
  const isEmployeeFilter = statusFilter === "employee";
  const isStudentFilter = statusFilter === "student";

  const {
    ageData,
    civilData,
    religionData,
    studentCollegeData,
    studentCampusData,
    studentYearLevelData,
    employmentData,
    appointmentData,
    employeeOfficeData,
  } = useMemo(() => {
    if (demographics) {
      return {
        ageData: demographics.ageData || [],
        civilData: demographics.civilData || [],
        religionData: demographics.religionData || [],
        studentCollegeData: demographics.studentCollegeData || [],
        studentCampusData: demographics.studentCampusData || [],
        studentYearLevelData: demographics.studentYearLevelData || [],
        employmentData: demographics.employmentData || [],
        appointmentData: demographics.appointmentData || [],
        employeeOfficeData: demographics.employeeOfficeData || [],
      };
    }
    const ageCounts = {};
    const civilCounts = {};
    const religionCounts = {};
    const studentCollegeCounts = {};
    const studentCampusCounts = {};
    const studentYearLevelCounts = {};
    const employmentGroups = {};
    const appointmentGroups = {};
    const officeGroups = {};

    for (const d of data) {
      const status = (getStatus(d) || "").toLowerCase();
      const isStu = status === "student";
      const isEmp = status === "employee";
      const gender = getGender(d);

      const age = calcAge(
        safeGet(() => d.personal_info_id?.personal?.birthday) ||
          safeGet(() => d.personal_information?.birthday),
      );
      if (age !== null) {
        const bucket = Math.floor(age / 10) * 10;
        const label = `${bucket}–${bucket + 9}`;
        ageCounts[label] = (ageCounts[label] || 0) + 1;
      }

      const civil =
        safeGet(() => d.personal_info_id?.personal?.civil_status) ||
        safeGet(() => d.personal_information?.civil_status) ||
        UNKNOWN;
      civilCounts[civil] = (civilCounts[civil] || 0) + 1;

      const religion =
        safeGet(() => d.personal_info_id?.personal?.religion) ||
        safeGet(() => d.personal_information?.religion) ||
        UNKNOWN;
      religionCounts[religion] = (religionCounts[religion] || 0) + 1;

      if (isStu) {
        const college =
          safeGet(
            () =>
              d.personal_info_id?.affiliation?.academic_information?.college,
          ) ||
          safeGet(() => d.personal_information?.academic_information?.college) ||
          UNKNOWN;
        studentCollegeCounts[college] = (studentCollegeCounts[college] || 0) + 1;

        const campus =
          safeGet(
            () => d.personal_info_id?.affiliation?.academic_information?.campus,
          ) ||
          safeGet(() => d.personal_information?.academic_information?.campus) ||
          UNKNOWN;
        studentCampusCounts[campus] = (studentCampusCounts[campus] || 0) + 1;

        const yearLevel =
          safeGet(
            () =>
              d.personal_info_id?.affiliation?.academic_information?.year_level,
          ) ||
          safeGet(() => d.personal_information?.academic_information?.year_level) ||
          UNKNOWN;
        studentYearLevelCounts[yearLevel] =
          (studentYearLevelCounts[yearLevel] || 0) + 1;
      }

      if (isEmp) {
        const empStatus =
          safeGet(
            () =>
              d.personal_info_id?.affiliation?.employment_information
                ?.employment_status,
          ) ||
          safeGet(() => d.personal_information?.employment_status) ||
          UNKNOWN;
        addGender(employmentGroups, empStatus, gender);

        const appointment =
          safeGet(
            () =>
              d.personal_info_id?.affiliation?.employment_information
                ?.employment_appointment_status,
          ) ||
          safeGet(
            () => d.personal_information?.employment_appointment_status,
          ) ||
          UNKNOWN;
        addGender(appointmentGroups, appointment, gender);

        const office =
          safeGet(
            () =>
              d.personal_info_id?.affiliation?.employment_information?.office,
          ) ||
          safeGet(() => d.personal_information?.employment_information?.office) ||
          UNKNOWN;
        addGender(officeGroups, office, gender);
      }
    }

    return {
      ageData: Object.entries(ageCounts)
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([name, value]) => ({ name, value })),
      civilData: countToRows(civilCounts),
      religionData: countToRows(religionCounts),
      studentCollegeData: countToRows(studentCollegeCounts),
      studentCampusData: countToRows(studentCampusCounts),
      studentYearLevelData: sortStudentYearLevels(
        countToRows(studentYearLevelCounts),
      ),
      employmentData: Object.values(employmentGroups),
      appointmentData: Object.values(appointmentGroups),
      employeeOfficeData: Object.values(officeGroups),
    };
  }, [data, demographics]);

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
          <VertBarCard title="Students by Campus" data={studentCampusData} />
          <VertBarCard
            title="Students by Year Level"
            data={studentYearLevelData}
          />
        </div>
      )}

      {!isEmployeeFilter && (
        <div className="mb-6">
          <HorzBarCard
            title="Students by College"
            data={studentCollegeData}
            height={240}
          />
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

      {!isStudentFilter && (
        <div>
          <GenderHorzBarCard
            title="Employees by Office"
            data={employeeOfficeData}
          />
        </div>
      )}
    </div>
  );
}

export default memo(Demographics);