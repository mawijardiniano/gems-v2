import { Suspense } from "react";
import GADProjectsContent from "./content";

export default function GADProjectsPage() {
  return (
    <Suspense fallback={null}>
      <GADProjectsContent />
    </Suspense>
  );
}
