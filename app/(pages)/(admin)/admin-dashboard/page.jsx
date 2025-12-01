"use client";

import useProfileData from "@/hooks/useProfileData";
import Filter from "../components/Filter";
import GenderCharts from "../components/GenderCharts";
import AgeCharts from "../components/AgeCharts";
import StatusChart from "../components/StatusChart";
import PwdChart from "../components/PwdChart";
import IndigenousChart from "../components/IndigenousChart";

export default function Dashboard() {
  const data = useProfileData();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <h2 className="text-lg mb-4">
            Total Profiles: {data.filteredProfiles.length}
          </h2>
          {data.error && <p className="text-red-500">{data.error}</p>}
        </div>
        <div>
          <Filter {...data} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <GenderCharts data={data.genderData} />
        <AgeCharts data={data.ageData} />
        <StatusChart data={data.statusData} />
        <PwdChart data={data.pwdData} />
        <IndigenousChart data={data.indigenousData} />
      </div>
    </div>
  );
}
