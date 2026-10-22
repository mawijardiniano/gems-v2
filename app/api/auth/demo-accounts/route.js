import { NextResponse } from "next/server";

/**
 * Demo accounts for the Quick Sign In buttons on the landing page.
 *
 * These credentials used to be inlined into the browser bundle as
 * `NEXT_PUBLIC_ADMIN_PASSWORD` / `NEXT_PUBLIC_DEFAULT_PASSWORD`. `NEXT_PUBLIC_*`
 * values are substituted at build time, so the production password of every
 * seeded account was sitting in readable JavaScript that anyone could download.
 * Serving them from here instead keeps the values on the server, where they are
 * only ever handed out in non-production.
 *
 * This route is intentionally unauthenticated: it exists so a developer can
 * click a button and sign in. That is safe only because a production build
 * never reaches the branch below — the 404 is the first thing that runs.
 */

/* The shared password for every seeded account except where overridden. */
function demoPassword() {
  return process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || "";
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function GET() {
  /* Hard stop before anything is read. Not a role check — a build-environment
     check. In production these accounts do not exist as far as this app is
     concerned. */
  if (isProduction()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const defaultPassword = demoPassword();
  const shared = (username) => ({
    username: username || "",
    password: defaultPassword,
  });

  const accounts = [
    {
      label: "Admin",
      ...shared(process.env.NEXT_PUBLIC_ADMIN_USERNAME),
      password:
        process.env.NEXT_PUBLIC_ADMIN_PASSWORD || defaultPassword,
    },
    {
      label: "GAD Focal",
      ...shared(process.env.NEXT_PUBLIC_FOCAL_USERNAME),
      password:
        process.env.NEXT_PUBLIC_FOCAL_PASSWORD || defaultPassword,
    },
    { label: "GAD Coordinator", ...shared(process.env.NEXT_PUBLIC_COORDINATOR_USERNAME) },
    { label: "Dean", ...shared(process.env.NEXT_PUBLIC_DEAN_USERNAME) },
    { label: "Planning Director", ...shared(process.env.NEXT_PUBLIC_PLANNINGDIRECTOR_USERNAME) },
    { label: "SUC President", ...shared(process.env.NEXT_PUBLIC_PRESIDENT_USERNAME) },
    { label: "ICTU Director", ...shared(process.env.NEXT_PUBLIC_ICTUDIRECTOR_USERNAME) },
    { label: "Student", ...shared(process.env.NEXT_PUBLIC_STUDENT_USERNAME) },
  ];

  /* Accounts with no configured username are useless to the client, so they are
     dropped here rather than making every consumer filter for itself. */
  return NextResponse.json({
    enabled: true,
    accounts: accounts.filter((acc) => acc.username),
  });
}
