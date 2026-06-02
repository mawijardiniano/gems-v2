"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendar, FaLocationArrow, FaArrowRight } from "react-icons/fa";

export default function EventsListContent() {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activityType, setActivityType] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const activityTypes = [
    "Academic",
    "Administrative",
    "GAD",
    "Extension",
    "Research",
    "Students",
    "Others",
  ];

  const goToManage = (id) => {
    if (!id) return;
    router.push(`/events-list/${id}`);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [eventsRes, projectsRes] = await Promise.all([
          axios.get("/api/events"),
          axios.get("/api/project"),
        ]);

        setEvents(eventsRes.data?.data || []);
        setProjects(projectsRes.data?.data || []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load events. Please retry.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const availableYears = useMemo(() => {
    const years = [...new Set(projects.map((p) => p.year))];
    return years.sort((a, b) => b - a);
  }, [projects]);



  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesType =
        !activityType ||
        evt.type_of_activity?.toLowerCase() ===
          activityType.toLowerCase();

      let matchesYear = true;

      if (selectedYear) {
        const relatedProject = projects.find(
          (p) => p._id === evt.project,
        );

        matchesYear =
          relatedProject &&
          Number(relatedProject.year) === Number(selectedYear);
      }

      return matchesType && matchesYear;
    });
  }, [events, projects, activityType, selectedYear]);

const formatRange = (evt) => {
  let startDates = evt.start_dates || [];
  let endDates = evt.end_dates || [];

  if (Array.isArray(startDates) && startDates.length > 0) {
    return startDates.map((startDate, index) => {
      const dayNumber = index + 1;
      const endDate = endDates[index];
      const startStr = new Date(startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const timeStart = new Date(startDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (!endDate) {
        return <div key={index}>Day {dayNumber}: {startStr} {timeStart}</div>;
      }

      const timeEnd = new Date(endDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <div key={index}>
        <div className="flex flex-row gap-2 items-center">
 <FaCalendar />
          Day {dayNumber}: {startStr} {timeStart} - {timeEnd}
        </div>
       
        </div>
      );
    });
  }
};

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-500 h-screen">
        Loading events...
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-6 space-y-8 h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Events
          </h1>

          <p className="text-gray-500 text-sm">
            Browse and manage your events
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">All GPB Years</option>

            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
            <option value="">All Types</option>

            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            onClick={() => router.push("/create")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
          >
            + Create Event
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <section>
        {filteredEvents.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-500">No events found.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredEvents.map((evt) => (
              <div
                key={evt._id}
                className="group border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm hover:shadow-lg transition"
              >
                {evt.event_poster?.url && (
                  <div className="overflow-hidden">
                    <img
                      src={evt.event_poster.url}
                      alt={evt.title}
                      className="w-full h-44 object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="text-lg font-semibold leading-snug">
                        {evt.title}
                      </h3>

                    </div>

                    {evt.type_of_activity && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                        {evt.type_of_activity}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col text-sm text-gray-500">
         
                    {formatRange(evt)}
               

                  </div>

                  {evt.venue && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FaLocationArrow />
                      {evt.venue}
                    </div>
                  )}

                  {/* GAD ACTIVITY */}
                  {evt.gad_activity && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">
                        GAD Activity:
                      </span>{" "}
                      <span className="text-gray-600">
                        {evt.gad_activity}
                      </span>
                    </div>
                  )}

                  {evt.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {evt.description}
                    </p>
                  )}

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={() => goToManage(evt._id)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Manage <FaArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

