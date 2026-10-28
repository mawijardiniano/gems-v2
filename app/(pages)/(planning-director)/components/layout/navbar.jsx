"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      settingsHref="/planning-director/settings"
      fallbackInitial="P"
      fallbackName="Planning Director"
    />
  );
}
