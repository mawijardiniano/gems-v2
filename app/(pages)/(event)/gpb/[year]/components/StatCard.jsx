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
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-secondary-50 text-secondary-600",
    violet: "bg-secondary-50 text-secondary-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm p-5 transition-all duration-200 ${
        danger
          ? "border-red-200 bg-red-50/50 hover:shadow-md"
          : "bg-white border-gray-100 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-xl ${colorMap[color] || colorMap.blue} flex items-center justify-center shrink-0`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p
              className={`text-xl font-bold truncate ${danger ? "text-red-700" : "text-gray-900"}`}
            >
              {value}
            </p>
            {badge}
          </div>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
