import { Suspense } from "react";
import GADARContent from "./content";

export default function GADARPage() {
  return (
    <Suspense fallback={null}>
      <GADARContent />
    </Suspense>
  );
}