"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="GENDER MANAGEMENT"
      subtitle={(role) => (role === "dean" ? "Dean Portal" : "Dashboard")}
      settingsHref="/dean/settings"
      fallbackInitial="U"
      fallbackName="User"
    />
  );
}