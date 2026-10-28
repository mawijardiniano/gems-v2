"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      settingsHref="/ictu-director/settings"
      fallbackInitial="I"
      fallbackName="ICTU Director"
    />
  );
}
