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
  LabelList,
} from "recharts";

export default function Economic({ data }) {
  const total = data.length;

  const breadwinnerData = [
    {
      name: "Breadwinners",
      value: data.filter((d) => d.economic_financial_role.breadwinner).length,
    },
    {
      name: "Non-Breadwinners",
      value: data.filter((d) => !d.economic_financial_role.breadwinner).length,
    },
  ];
  const breadwinnerColors = ["#3B82F6", "#F59E0B"];

  const financialData = [
    {
      name: "Manage Finances",
      value: data.filter(
        (d) => d.economic_financial_role.manage_financial_resources === true
      ).length,
    },
    {
      name: "Do Not Manage",
      value: data.filter(
        (d) => d.economic_financial_role.manage_financial_resources !== true
      ).length,
    },
  ];
  const financialColors = ["#10B981", "#F87171"];

  const incomeData = [
    {
      name: "₱0-50k",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱0") ||
        d.personal_information.total_annual_family_income.includes("₱1,000.00 - ₱50,000.00")
      ).length,
    },
    {
      name: "₱51k-100k",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱51,000.00 - ₱100,000.00")
      ).length,
    },
    {
      name: "₱101k–200k",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱101,000.00-₱200,000.00")
      ).length,
    },
    {
      name: "₱201k-300k",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱201,000.00 - ₱300,000.00")
      ).length,
    },
    {
      name: "₱301k-400k",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱301,000.00 - ₱400,000.00")
      ).length,
    },
    {
      name: "₱401k-500k",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱401,000.00 - ₱500,000.00")
      ).length,
    },
    {
      name: "₱501k+",
      value: data.filter((d) =>
        d.personal_information.total_annual_family_income.includes("₱501,000.00") ||
        d.personal_information.total_annual_family_income.includes("₱501,000.00 and above")
      ).length,
    },
  ];
  const incomeColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#F97316"];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-md px-8 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-black">Economic & Financial Status</h1>
        <p className="text-sm text-gray-500">
          Overview of breadwinner roles and income brackets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Breadwinner Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={breadwinnerData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {breadwinnerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={breadwinnerColors[index % breadwinnerColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Financial Management</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={financialData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {financialData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={financialColors[index % financialColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>


        <div className="bg-gray-50 p-4 rounded-md md:col-span-2">
          <h2 className="font-semibold mb-2">Total Annual Family Income</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart layout="horizontal" data={incomeData}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="category" dataKey="name" />
              <YAxis type="number" />
              <Tooltip />
              <Bar dataKey="value">
                {incomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={incomeColors[index % incomeColors.length]} />
                ))}
                <LabelList dataKey="value" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
