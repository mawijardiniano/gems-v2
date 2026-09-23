import { Suspense } from "react";
import Content from "./content";

export default function AcademicProjectsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
