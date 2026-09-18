"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="EVENTS MANAGEMENT"
      subtitle={(role) =>
        role !== "planning director" ? "GAD Engagement" : "Planning Director"
      }
      settingsHref="/gad-settings"
      fallbackInitial="U"
      fallbackName="User"
    />
  );
}