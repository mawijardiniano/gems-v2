"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      settingsHref="/president/settings"
      fallbackInitial="S"
      fallbackName="SUC President"
    />
  );
}
