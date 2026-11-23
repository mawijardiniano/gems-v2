"use client";
import SharedStudentFilterTable from "@/components/students/StudentFilterTable";

/* Admin student list: the multi-select filters by college. */
export default function StudentFilterTable({
  filterCollege,
  setFilterCollege,
  collegeOptions = [],
  ...rest
}) {
  return (
    <SharedStudentFilterTable
      {...rest}
      multiLabel="Colleges"
      multiHeading="Select Colleges"
      multiValue={filterCollege}
      setMultiValue={setFilterCollege}
      multiOptions={collegeOptions}
    />
  );
}
