"use client";
import { useSelector } from "react-redux";
import StudentsUserListContent from "./content";

export default function StudentsUserListPage() {
  const college = useSelector((state) => state.auth.college);
  return (
    <div>
      <StudentsUserListContent college={college} />
    </div>
  );
}
