"use client";

import useProfileData from "@/hooks/useProfileData";
import Filter from "../components/Filter";
import GenderCharts from "../components/GenderCharts";
import AgeCharts from "../components/AgeCharts";
import StatusChart from "../components/StatusChart";
import PwdChart from "../components/PwdChart";
import IndigenousChart from "../components/IndigenousChart";

export default function DashboardClient() {
  const data = useProfileData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end gap-6">
        <Filter {...data} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
        <div className="p-4 border rounded-lg bg-white">
          <p className="text-sm text-gray-500">Total Profiles</p>
          <p className="text-2xl font-semibold">
            {data.filteredProfiles.length}
          </p>
        </div>

        <div className="p-4 border rounded-lg bg-white">
<p className="text-sm text-gray-500">Total Persons with Disabilities</p>
          <p className="text-2xl font-semibold">
            {data.totalPWD}
          </p>
        </div>

        <div className="p-4 border rounded-lg bg-white">
<p className="text-sm text-gray-500">Total Indigenous Persons</p>
          <p className="text-2xl font-semibold">
            {data.totalIndigenous}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <GenderCharts data={data.genderData} />
        <AgeCharts data={data.ageData} />
        <StatusChart data={data.statusData} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
        <PwdChart data={data.pwdData} />
        <IndigenousChart data={data.indigenousData} />
      </div>
    </div>
  );
}
