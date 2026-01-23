"use client";

import { useState, useMemo } from "react";
import useFetchData from "@/hooks/useSample";
import Snapshot from "./components/snapshot";
import GenderPanel from "./components/genderPanel";
import Demographics from "./components/demographics";
import Economic from "./components/economic";
import GenderResponsive from "./components/genderResponsive";
import Health from "./components/health";
import PeaceJustice from "./components/peaceJustice";
import Filter from "./components/Filter";

export default function Page() {
  const { data: rawData, loading } = useFetchData();

  const [filterSex, setFilterSex] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const sexOption = useMemo(    
    () => [...new Set(rawData.map((d) => d.personal_information.sex).filter(Boolean))],
    [rawData]
  );

  const collegeOptions = useMemo(
    () =>
      [...new Set(rawData.map((d) => d.personal_information.college_office).filter(Boolean))],
    [rawData]
  );

  const employmentOptions = useMemo(
    () =>
      [...new Set(rawData.map((d) => d.personal_information.employment_status).filter(Boolean))],
    [rawData]
  );

  const appointmentOptions = useMemo(
    () =>
      [...new Set(
        rawData
          .map((d) => d.personal_information.employment_appointment_status)
          .filter(Boolean)
      )],
    [rawData]
  );

  const filteredData = useMemo(() => {
    return rawData.filter((d) => {
      const p = d.personal_information;
      if (!p || Object.keys(p).length === 0) return false;

      return (
        (!filterSex || p.sex === filterSex) &&
        (filterCollege.length === 0 || filterCollege.includes(p.college_office)) &&
        (!filterEmployment || p.employment_status === filterEmployment) &&
        (filterAppointment.length === 0 ||
          filterAppointment.includes(p.employment_appointment_status))
      );
    });
  }, [rawData, filterSex, filterCollege, filterEmployment, filterAppointment]);


  return (
    <div className="py-8 flex flex-col gap-4">
      <div className="flex justify-end">
        <Filter
          filterSex={filterSex}
          filterCollege={filterCollege}
          filterEmployment={filterEmployment}
          filterAppointment={filterAppointment}
          setFilterSex={setFilterSex}
          setFilterCollege={setFilterCollege}
          setFilterEmployment={setFilterEmployment}
          setFilterAppointment={setFilterAppointment}
          sexOption={sexOption}
          collegeOptions={collegeOptions}
          employmentOptions={employmentOptions}
          appointmentOptions={appointmentOptions}
        />
      </div>

      <Snapshot data={filteredData} />
      <GenderPanel data={filteredData} />
      <Demographics data={filteredData} />
      <Economic data={filteredData} />
      <Health data={filteredData} />
      <GenderResponsive data={filteredData} />
      <PeaceJustice data={filteredData} />
    </div>
  );
}
