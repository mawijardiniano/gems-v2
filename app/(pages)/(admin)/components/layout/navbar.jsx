"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      settingsHref="/admin-settings"
      fallbackInitial="A"
      fallbackName="Admin"
    />
  );
}
