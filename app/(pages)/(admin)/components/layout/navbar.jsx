"use client";

import DashboardNavbar from "@/components/layout/DashboardNavbar";

export default function Navbar(props) {
  return (
    <DashboardNavbar
      {...props}
      title="ADMIN PANEL"
      subtitle={(role) =>
        role === "planning director" ? "Planning Director" : "Admin"
      }
      settingsHref="/admin-settings"
      fallbackInitial="A"
      fallbackName="Admin"
    />
  );
}
