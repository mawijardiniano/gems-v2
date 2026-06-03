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

export default function Demographics({ data, personTypeFilter = "" }) {
  const statusFilter = `${personTypeFilter || ""}`.trim().toLowerCase();
  const isEmployeeFilter = statusFilter === "employee";
  const isStudentFilter = statusFilter === "student";

  const safeGet = (fn, fallback = null) => {
    try {
      const v = fn();
      return v === undefined || v === null || v === "" ? fallback : v;
    } catch (e) {
      return fallback;
    }
  };

  const countByAccessors = (accessors, fallback = "Unknown", source = data) => {
    const counts = {};
    source.forEach((d) => {
      let value = fallback;
      for (const fn of accessors) {
        const v = safeGet(() => fn(d));
        if (v !== null && v !== undefined && v !== "") {
          value = v;
          break;
        }
      }
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getStatus = (d) => {
    const status =
      safeGet(() => d.personal_info_id?.personal?.currentStatus) ||
      safeGet(() => d.personal_information?.person_type);
    if (status) return status;
    const isStudentFlag = safeGet(() => d.personal_information?.is_student);
    if (isStudentFlag === true) return "Student";
    if (isStudentFlag === false) return "Employee";
    return null;
  };

  const getGender = (d) => {
    const value =
      safeGet(() => d.personal_info_id?.gadData?.sexAtBirth) ||
      safeGet(() => d.personal_information?.gadData?.sexAtBirth) ||
      safeGet(() => d.personal_info_id?.personal?.sex) ||
      safeGet(() => d.personal_information?.sex);
    const normalized = `${value || ""}`.trim().toLowerCase();
    if (normalized === "male" || normalized === "m") return "Male";
    if (normalized === "female" || normalized === "f") return "Female";
    return "Other";
  };

  const countByCategoryAndGender = (accessors, source = data) => {
    const groups = {};
    source.forEach((d) => {
      let category = "Unknown";
      for (const fn of accessors) {
        const v = safeGet(() => fn(d));
        if (v !== null && v !== undefined && v !== "") {
          category = v;
          break;
        }
      }
      const gender = getGender(d);
      if (!groups[category])
        groups[category] = { name: category, Male: 0, Female: 0, Other: 0 };
      groups[category][gender] = (groups[category][gender] || 0) + 1;
    });
    return Object.values(groups);
  };

  const employees = data.filter(
    (d) => (getStatus(d) || "").toLowerCase() === "employee",
  );
  const students = data.filter(
    (d) => (getStatus(d) || "").toLowerCase() === "student",
  );

  const ageData = (() => {
    const counts = {};

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

    data.forEach((d) => {
      const age = calcAge(
        safeGet(() => d.personal_info_id?.personal?.birthday) ||
          safeGet(() => d.personal_information?.birthday),
      );
      if (age === null) return;
      const bucket = Math.floor(age / 10) * 10;
      const label = `${bucket}-${bucket + 9}`;
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
      .map(([name, value]) => ({ name, value }));
  })();
  const civilData = countByAccessors([
    (d) => d.personal_info_id?.personal?.civil_status,
    (d) => d.personal_information?.civil_status,
  ]);

  const religionData = countByAccessors([
    (d) => d.personal_info_id?.personal?.religion,
    (d) => d.personal_information?.religion,
  ]);

  const employmentData = countByCategoryAndGender(
    [
      (d) =>
        d.personal_info_id?.affiliation?.employment_information
          ?.employment_status,
      (d) => d.personal_information?.employment_status,
    ],
    employees,
  );

  const appointmentData = countByCategoryAndGender(
    [
      (d) =>
        d.personal_info_id?.affiliation?.employment_information
          ?.employment_appointment_status,
      (d) => d.personal_information?.employment_appointment_status,
    ],
    employees,
  );

  const employeeOfficeData = countByCategoryAndGender(
    [
      (d) => d.personal_info_id?.affiliation?.employment_information?.office,
      (d) => d.personal_information?.employment_information?.office,
    ],
    employees,
  );

  const studentCollegeData = countByAccessors(
    [
      (d) => d.personal_info_id?.affiliation?.academic_information?.college,
      (d) => d.personal_information?.academic_information?.college,
    ],
    "Unknown",
    students,
  );

  const studentCampusData = countByAccessors(
    [
      (d) => d.personal_info_id?.affiliation?.academic_information?.campus,
      (d) => d.personal_information?.academic_information?.campus,
    ],
    "Unknown",
    students,
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
      const normalized = `${name || ""}`.trim().toLowerCase();
      const index = order.findIndex(
        (term) => normalized === term || normalized.includes(term),
      );
      return index === -1 ? order.length : index;
    };

    return [...rows].sort((a, b) => {
      const rankA = rank(a.name);
      const rankB = rank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });
  };

  const studentYearLevelData = sortStudentYearLevels(
    countByAccessors(
      [
        (d) =>
          d.personal_info_id?.affiliation?.academic_information?.year_level,
        (d) => d.personal_information?.academic_information?.year_level,
      ],
      "Unknown",
      students,
    ),
  );

  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444"];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-black">
          Demographic & Employment Profile
        </h1>
        <p className="text-sm text-gray-500">
          Personnel and occupational overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Age Groups</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={ageData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                innerRadius={35}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {ageData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} people`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Civil Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={civilData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                innerRadius={35}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {civilData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} people`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h2 className="font-semibold mb-2">Religion</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={religionData} layout="vertical" margin={{ left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip formatter={(value) => `${value} people`} />
            <Bar dataKey="value">
              {religionData.map((entry, index) => (
                <Cell
                  key={`cell-bar-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!isEmployeeFilter && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="font-semibold mb-2">Students by Campus</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={studentCampusData}
                layout="horizontal"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" type="category" width={120} />
                <YAxis type="number" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="font-semibold mb-2">Students by Year Level</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={studentYearLevelData}
                layout="horizontal"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" type="category" width={120} />
                <YAxis type="number" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isEmployeeFilter && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h2 className="font-semibold mb-2">Students by College</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={studentCollegeData}
              layout="vertical"
              margin={{ left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={140} />
              <Tooltip />
              <Bar dataKey="value" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {isStudentFilter ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="font-semibold mb-2">Employment Type (Employees)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={employmentData}
                layout="horizontal"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" type="category" />
                <YAxis type="number" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Male" fill="#3B82F6" />
                <Bar dataKey="Female" fill="#EC4899" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="font-semibold mb-2">
              Appointment Status (Employees)
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={appointmentData}
                layout="horizontal"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" type="category" />
                <YAxis type="number" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Male" fill="#3B82F6" />
                <Bar dataKey="Female" fill="#EC4899" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {isStudentFilter ? null : (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h2 className="font-semibold mb-2">Employee by Office</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={employeeOfficeData}
              layout="vertical"
              margin={{ left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={160} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Male" fill="#3B82F6" />
              <Bar dataKey="Female" fill="#EC4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
