"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChevronRight, FaHome } from "react-icons/fa";
import { buildBreadcrumbs, BREADCRUMB_HOMES } from "@/lib/breadcrumbs";

/**
 * Breadcrumbs for a role shell.
 *
 * Rendered once per route-group layout (above the page content), so every page
 * inside the shell gets crumbs with no per-page changes.
 *
 * - The trail is derived from the pathname via lib/breadcrumbs.js.
 * - `home` defaults to the crumb for the given shell key.
 * - All crumbs but the last are links; the last is aria-current="page".
 * - On small screens the middle crumbs collapse so the trail stays one line.
 */
export default function PageBreadcrumbs({
  home,
  role,
  pathname: pathnameProp,
  items,
  resolvedLabels,
  className = "",
  showHomeIcon = true,
}) {
  const currentPathname = usePathname();
  const pathname = pathnameProp || currentPathname;

  const homeCrumb = home ?? BREADCRUMB_HOMES[role] ?? null;

  const crumbs =
    items ??
    buildBreadcrumbs(pathname, {
      home: homeCrumb,
      resolvedLabels,
    });

  if (!crumbs.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`min-w-0 py-3 ${className}`}
    >
      <ol className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
        {crumbs.map((crumb, index) => {
          const isFirst = index === 0;
          const isLast = index === crumbs.length - 1;
          const isMiddle = !isFirst && !isLast;
          const showIcon = isFirst && showHomeIcon;

          return (
            <li
              key={`${crumb.href || "current"}-${index}`}
              className={`${isMiddle ? "hidden sm:flex" : "flex"} min-w-0 items-center gap-1.5`}
            >
              {!isFirst && (
                <FaChevronRight
                  aria-hidden="true"
                  className="flex-shrink-0 text-[8px] text-gray-300"
                />
              )}

              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="flex min-w-0 items-center gap-1.5 rounded font-medium text-gray-500 transition-colors hover:text-secondary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400 focus-visible:ring-offset-1"
                >
                  {showIcon && (
                    <FaHome aria-hidden="true" className="flex-shrink-0 text-[11px]" />
                  )}
                  <span className="truncate">{crumb.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={`flex min-w-0 items-center gap-1.5 ${
                    isLast
                      ? "font-semibold text-gray-900"
                      : "font-medium text-gray-500"
                  }`}
                >
                  {showIcon && (
                    <FaHome aria-hidden="true" className="flex-shrink-0 text-[11px]" />
                  )}
                  <span className="truncate">{crumb.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
