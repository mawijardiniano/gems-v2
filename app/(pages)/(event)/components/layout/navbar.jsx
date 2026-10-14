"use client";

import { usePathname } from "next/navigation";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { resolveEventSectionTitle } from "@/lib/sectionTitles";

export default function Navbar(props) {
  const pathname = usePathname();
  return (
    <DashboardNavbar
      {...props}
      title={resolveEventSectionTitle(pathname)}
      subtitle={(role) =>
        role !== "planning director" ? "GAD Engagement" : "Planning Director"
      }
      settingsHref="/gad-settings"
      fallbackInitial="U"
      fallbackName="User"
    />
  );
}