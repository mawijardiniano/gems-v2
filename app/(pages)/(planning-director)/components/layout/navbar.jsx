"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="GENDER MANAGEMENT"
      subtitle="Planning Director Portal"
      settingsHref="/planning-director/settings"
      fallbackInitial="P"
      fallbackName="Planning Director"
    />
  );
}