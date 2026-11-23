"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiExternalLink } from "react-icons/fi";
import {
  FaCalendarAlt,
  FaClipboardCheck,
  FaMapMarkerAlt,
  FaUsers,
} from "react-icons/fa";

/* Read-only body of the Event Details card: description, GAD activity and the
   metric tiles. */
export default function EventDetailsView({
  event,
  attendedCount,
  pendingGuestCount,
  formatRangeLines,
}) {
  const pathname = usePathname();

  const metrics = [
    {
      label: "Date Range",
      icon: FaCalendarAlt,
      gradient: "from-secondary-600 to-secondary-400",
      iconBg: "bg-secondary-100",
      iconColor: "text-secondary-600",
      value: (
        <div className="flex flex-col gap-1">
          {formatRangeLines(
            event.start_date || event.date,
            event.end_date,
            event,
          ).map((line, idx) => (
            <span key={idx} className="text-sm font-semibold text-fg">
              {line}
            </span>
          ))}
        </div>
      ),
    },
    {
      label: "Venue",
      icon: FaMapMarkerAlt,
      gradient: "from-secondary-500 to-secondary-400",
      iconBg: "bg-secondary-100",
      iconColor: "text-secondary-600",
      value: event.venue || "—",
    },
    {
      label: "Attended",
      icon: FaUsers,
      gradient: "from-emerald-600 to-emerald-400",
      iconBg: "bg-emerald-100",
      iconColor: "text-success",
      /* Same number the Insights tab shows: profiles + approved guests. */
      value: attendedCount || "—",
    },
    {
      label: "Pending Validation",
      icon: FaClipboardCheck,
      gradient: "from-secondary-600 to-secondary-400",
      iconBg: "bg-secondary-100",
      iconColor: "text-secondary-600",
      /* QR check-ins waiting for organizer approval, with a way to reach them. */
      value: pendingGuestCount || "—",
      action:
        pendingGuestCount > 0
          ? {
              /* The current path, so the Dean's copy of this page links to
                 itself rather than to /events-list. */
              href: `${pathname}?tab=attendance&validation=pending`,
              label: "Review",
            }
          : null,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-fg-muted mb-2">
            Event Description
          </p>
          <p className="text-sm text-fg-3 leading-relaxed">
            {event.description || "No description provided."}
          </p>
        </div>
        {event.type_of_activity === "GAD" && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-fg-muted mb-2">
              GAD Activity
            </p>
            <p className="text-sm text-fg-3">{event.gad_activity}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="group relative overflow-hidden rounded-xl border border-line-subtle bg-white p-6 transition duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.gradient}`}
              />
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${m.iconBg} ${m.iconColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="text-lg" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
                    {m.label}
                  </p>
                  <div className="mt-2 text-2xl font-bold text-fg leading-tight">
                    {m.value}
                  </div>
                  {m.action && (
                    <Link
                      href={m.action.href}
                      scroll={false}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 hover:text-secondary-700"
                    >
                      {m.action.label}
                      <FiExternalLink size={11} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
