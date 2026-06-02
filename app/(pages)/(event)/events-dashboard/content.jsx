"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { useRouter } from "next/navigation";

export default function EventsDashboardContent() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [GPB, setGPB] = useState([]);
  const [gaaBudget, setGAABudget] = useState([]);
  const router = useRouter();
  const { totalGAA, totalGAD, avgGADPercent } = useMemo(() => {
    const totalGAA = gaaBudget.reduce((sum, g) => sum + (g.totalGAA || 0), 0);
    const totalGAD = gaaBudget.reduce(
      (sum, g) => sum + (g.gadAnnualBudget || 0),
      0,
    );

    const avgGADPercent =
      gaaBudget.length > 0
        ? (
            gaaBudget.reduce((sum, g) => sum + (g.gadPercent || 0), 0) /
            gaaBudget.length
          ).toFixed(2)
        : 0;

    return {
      totalGAA: totalGAA.toLocaleString(),
      totalGAD: totalGAD.toLocaleString(),
      avgGADPercent,
    };
  }, [gaaBudget]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("/api/gaa-budget");
        setGAABudget(res.data?.data.slice(0, 5) || []);
        console.log("GAA", res.data?.data);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load gaa budget.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("/api/gpb");
        setGPB(res.data?.data.slice(0, 4) || []);
        console.log("GPB", res.data?.data);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load gpb.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("/api/events");
        setEvents(res.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load events.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const gaaChartData = useMemo(() => {
    return [...gaaBudget]
      .sort((a, b) => a.year - b.year)
      .map((g) => ({
        year: g.year,
        gaa: g.totalGAA,
        gad: g.gadAnnualBudget,
      }));
  }, [gaaBudget]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Overview of events, GPB, and GAA budget allocation
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 h-screen">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-4 border border-gray-200 rounded-lg bg-white h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">GAA Budget per Year</h2>
                <span className="text-xs text-gray-500">
                  GAD allocation from total budget
                </span>
              </div>
              {gaaBudget.length === 0 ? (
                <p className="text-sm text-gray-600">No data available.</p>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gaaChartData}>
                      <XAxis dataKey="year" tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={(value) =>
                          `₱${(value / 1000000).toFixed(0)}M`
                        }
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) =>
                          `₱ ${Number(value).toLocaleString()}`
                        }
                      />
                      <Legend />

                      <Bar
                        dataKey="gaa"
                        name="Total GAA"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="gaa"
                          position="top"
                          formatter={(value) =>
                            `₱${(value / 1000000).toFixed(1)}M`
                          }
                        />
                      </Bar>

                      <Bar
                        dataKey="gad"
                        name="GAD Budget"
                        fill="#16a34a"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="gad"
                          position="top"
                          formatter={(value) =>
                            `₱${(value / 1000000).toFixed(1)}M`
                          }
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="p-5 border border-gray-200 rounded-xl bg-white h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">GPB Overview</h2>
                <span className="text-xs text-gray-500">Projects per year</span>
              </div>

              {GPB.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">
                  No GPB records available.
                </div>
              ) : (
                <ul className="space-y-2">
                  {GPB.map((gpb, idx) => {
                    const projectCount = Array.isArray(gpb.projects)
                      ? gpb.projects.length
                      : 0;

                    return (
                      <li
                        key={gpb._id || idx}
                        className="flex items-center justify-between gap-4 border-b border-gray-200"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-gray-800">
                            GPB {gpb.year}
                          </p>

                          <p className="text-sm text-gray-500 mb-2">
                            {projectCount} project
                            {projectCount !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                              gpb?.status_of_gpb?.status === "draft"
                                ? "bg-yellow-100 text-yellow-700"
                                : gpb?.status_of_gpb?.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {gpb?.status_of_gpb?.status}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => router.push("/gpb")}
                  className="text-xs text-blue-600 mt-2"
                >
                  View All
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">GAA Budget</h2>
              <span className="text-xs text-gray-500">Annual allocation</span>
            </div>

            {gaaBudget.length === 0 ? (
              <p className="text-sm text-gray-600">
                No GAA budget data available.
              </p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Year</th>
                      <th className="px-4 py-2 font-medium">Total GAA</th>
                      <th className="px-4 py-2 font-medium">GAD %</th>
                      <th className="px-4 py-2 font-medium">GAD Budget</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {gaaBudget.map((gaa) => (
                      <tr key={gaa._id}>
                        <td className="px-4 py-2 font-medium">{gaa.year}</td>

                        <td className="px-4 py-2">
                          ₱ {Number(gaa.totalGAA).toLocaleString()}
                        </td>

                        <td className="px-4 py-2">{gaa.gadPercent}%</td>

                        <td className="px-4 py-2 text-green-600 font-medium">
                          ₱ {Number(gaa.gadAnnualBudget).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => router.push("/gaa-budget")}
                className="text-xs text-blue-600 mt-2"
              >
                View All
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
