"use client";

import { useMemo, useState } from "react";
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs";
import { BREADCRUMB_HOMES, buildBreadcrumbs } from "@/data/lib/breadcrumbs";
import { BREADCRUMB_ROUTE_PREVIEW } from "@/data/lib/breadcrumbRoutes";

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
          (!normalized || route.path.toLowerCase().includes(normalized)),
      ),
    })).filter((group) => group.routes.length > 0);
  }, [query]);

  const total = groups.reduce((sum, group) => sum + group.routes.length, 0);

  return (
    <div className="min-h-screen bg-subtle px-4 py-8 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Breadcrumb preview</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every route rendered with the real{" "}
          <code className="rounded bg-emphasis px-1 py-0.5 text-xs">
            PageBreadcrumbs
          </code>{" "}
          component. Development only.
        </p>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by path…"
          className="mt-4 w-full max-w-sm rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-200"
        />
        <p className="mt-2 text-xs text-fg-muted">
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
              <span className="text-xs text-fg-muted">
                home: {group.home.label} → {group.home.href}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
              <table className="w-full text-left">
                <thead className="border-b border-line-subtle bg-subtle/70">
                  <tr>
                    <th className="px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                      Route
                    </th>
                    <th className="px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                      Breadcrumb
                    </th>
                    <th className="px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                      Plain text
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {group.routes.map((route) => {
                    const plain = buildBreadcrumbs(route.path, {
                      home: BREADCRUMB_HOMES[route.role],
                    })
                      .map((crumb) => crumb.label)
                      .join(" > ");

                    return (
                      <tr key={`${route.role}${route.path}`}>
                        <td className="whitespace-nowrap px-4 py-2 align-middle font-mono text-xs text-fg-4">
                          {route.path}
                          {route.group && (
                            <span
                              title="Navigation group with no page — its crumb is not a link"
                              className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-warning"
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
                        <td className="px-4 py-2 align-middle text-xs text-fg-muted">
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
