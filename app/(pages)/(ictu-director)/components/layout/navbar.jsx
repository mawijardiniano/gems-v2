"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="ICTU PANEL"
      subtitle="ICTU Director"
      settingsHref="/ictu-director/settings"
      fallbackInitial="I"
      fallbackName="ICTU Director"
    />
  );
}