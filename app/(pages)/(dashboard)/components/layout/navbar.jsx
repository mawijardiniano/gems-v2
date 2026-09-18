"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="GENDER MANAGEMENT"
      subtitle="User Portal"
      settingsHref="/settings"
      fallbackInitial="U"
      fallbackName="User"
    />
  );
}