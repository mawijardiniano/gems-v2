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
} from "recharts";

export default function Demographics({ data }) {
  const countBy = (key) => {
    const counts = {};
    data.forEach((d) => {
      const value = d.personal_information[key];
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const ageData = countBy("age_bracket");
  const civilData = countBy("civil_status");
  const religionData = countBy("religion");

  const employmentData = countBy("employment_status");
  const appointmentData = countBy("employment_appointment_status");

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Religion</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={religionData}
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
                {religionData.map((entry, index) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Employment Type</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={employmentData}
              layout="horizontal"
              margin={{ left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" type="category" />
              <YAxis type="number" />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Appointment Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={appointmentData}
              layout="horizontal"
              margin={{ left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" type="category" />
              <YAxis type="number" />
              <Tooltip />
              <Bar dataKey="value" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
