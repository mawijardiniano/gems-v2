"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectContent() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/project/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setProject(data.data);
        } else {
          setError(data.error || "Failed to load project");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchProject();
  }, [params.id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!project) return <div className="p-6">Project not found.</div>;

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/projects")}
        className="text-sm text-blue-600 hover:underline mb-4"
      >
        ← Back to Projects
      </button>
      <h2 className="text-3xl font-bold mb-4">
        Project {project.project_name}
      </h2>
      <h3 className="text-lg font-semibold mb-2">Events</h3>
      {Array.isArray(project.events) && project.events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full  rounded shadow">
            <thead>
              <tr className="border bg-gray-800 text-white">
                <th className="py-2 px-4 border-b text-left">Name</th>
                <th className="py-2 px-4 border-b text-left">Start Date</th>
                <th className="py-2 px-4 border-b text-left">End Date</th>
                <th className="py-2 px-4 border-b text-left">Venue</th>
                <th className="py-2 px-4 border-b text-left">
                  Type of Activity
                </th>
                <th className="py-2 px-4 border-b text-left">Office/Unit</th>
                <th className="py-2 px-4 border-b text-left">Participants</th>
              </tr>
            </thead>
            <tbody>
              {project.events.map((event) => (
                <tr key={event._id || event} className="hover:bg-gray-50 border-b">
                  <td className="py-2 px-4 border-b font-medium">
                    {event.title || event}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {formatDate(event.start_date)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {formatDate(event.end_date)}
                  </td>
                  <td className="py-2 px-4 border-b">{event.venue || "-"}</td>
                  <td className="py-2 px-4 border-b">
                    {event.type_of_activity || "-"}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {event.organizing_office_unit || "-"}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {Array.isArray(event.registered_users)
                      ? event.registered_users.length
                      : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500">No events for this project.</div>
      )}
    </div>
  );
}
