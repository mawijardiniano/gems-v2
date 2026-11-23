"use client";

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "blue",
  badge,
  danger = false,
}) {
  const colorMap = {
    blue: "bg-secondary-50 text-secondary-600",
    green: "bg-success-subtle text-success",
    amber: "bg-secondary-50 text-secondary-600",
    violet: "bg-secondary-50 text-secondary-600",
    red: "bg-danger-subtle text-danger",
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm p-5 transition duration-200 ${
        danger
          ? "border-danger-border bg-red-50/50 hover:shadow-md"
          : "bg-white border-line-subtle hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-xl ${colorMap[color] || colorMap.blue} flex items-center justify-center shrink-0`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            {label}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p
              className={`text-xl font-bold truncate ${danger ? "text-danger" : "text-fg"}`}
            >
              {value}
            </p>
            {badge}
          </div>
          {sub && <p className="text-xs text-fg-muted mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
