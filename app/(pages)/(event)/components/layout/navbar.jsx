"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      settingsHref="/gad-settings"
      fallbackInitial="U"
      fallbackName="User"
    />
  );
}

