"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      settingsHref="/dean/settings"
      fallbackInitial="U"
      fallbackName="User"
    />
  );
}
