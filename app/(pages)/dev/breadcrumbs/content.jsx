"use client";

import { useMemo, useState } from "react";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { BREADCRUMB_HOMES, buildBreadcrumbs } from "@/lib/breadcrumbs";
import { BREADCRUMB_ROUTE_PREVIEW } from "@/lib/breadcrumbRoutes";

/**
 * Dev-only preview: renders EVERY route's breadcrumb as the real component so
 * labels, truncation and spacing can be eyeballed before shipping.
 *
 * Not linked from the app and returns 404 outside development.
 */
const ROLE_ORDER = [
  "admin",
  "dashboard",
  "event",
  "dean",
  "president",
  "planning-director",
  "ictu-director",
];

export default function BreadcrumbsPreview() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ROLE_ORDER.map((role) => ({
      role,
      home: BREADCRUMB_HOMES[role],
      routes: BREADCRUMB_ROUTE_PREVIEW.filter(
        (route) =>
          route.role === role &&
          (!normalized || route.path.toLowerCase().includes(normalized))
      ),
    })).filter((group) => group.routes.length > 0);
  }, [query]);

  const total = groups.reduce((sum, group) => sum + group.routes.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Breadcrumb preview
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every route rendered with the real{" "}
          <code className="rounded bg-gray-200 px-1 py-0.5 text-[11px]">
            PageBreadcrumbs
          </code>{" "}
          component. Development only.
        </p>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by path…"
          className="mt-4 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-200"
        />
        <p className="mt-2 text-xs text-gray-400">
          Showing {total} of {BREADCRUMB_ROUTE_PREVIEW.length} routes
        </p>
      </header>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.role}>
            <div className="mb-2 flex items-baseline gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-secondary-700">
                {group.role}
              </h2>
              <span className="text-xs text-gray-400">
                home: {group.home.label} → {group.home.href}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50/70">
                  <tr>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Route
                    </th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Breadcrumb
                    </th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Plain text
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.routes.map((route) => {
                    const plain = buildBreadcrumbs(route.path, {
                      home: BREADCRUMB_HOMES[route.role],
                    })
                      .map((crumb) => crumb.label)
                      .join(" > ");

                    return (
                      <tr key={`${route.role}${route.path}`}>
                        <td className="whitespace-nowrap px-4 py-2 align-middle font-mono text-xs text-gray-600">
                          {route.path}
                          {route.group && (
                            <span
                              title="Navigation group with no page — its crumb is not a link"
                              className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                            >
                              group
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <PageBreadcrumbs
                            role={route.role}
                            pathname={route.path}
                            className="py-0"
                          />
                        </td>
                        <td className="px-4 py-2 align-middle text-xs text-gray-400">
                          {plain}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
