import { Suspense } from "react";
import Content from "./content";

export default function GADProjectsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}