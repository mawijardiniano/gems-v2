"use client";
import SharedStudentFilterTable from "@/components/students/StudentFilterTable";

/* Dean student list: the multi-select filters by course. */
export default function StudentFilterTable({
  filterCourse,
  setFilterCourse,
  courseOptions = [],
  ...rest
}) {
  return (
    <SharedStudentFilterTable
      {...rest}
      multiLabel="Courses"
      multiHeading="Select Course"
      multiValue={filterCourse}
      setMultiValue={setFilterCourse}
      multiOptions={courseOptions}
    />
  );
}
