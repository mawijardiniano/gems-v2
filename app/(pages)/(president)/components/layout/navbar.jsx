"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="GENDER MANAGEMENT"
      subtitle="President Portal"
      settingsHref="/president/settings"
      fallbackInitial="S"
      fallbackName="SUC President"
    />
  );
}