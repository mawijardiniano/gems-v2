"use client";
import React, { useEffect, useState } from "react";
import { FaFolderPlus } from "react-icons/fa";
import { useRouter } from "next/navigation";

function CreateProjectModal({ open, onClose, onCreated }) {
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: projectName }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjectName("");
        onCreated();
        onClose();
      } else {
        setError(data.error || "Failed to create project");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white bg-opacity-80 rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-4xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4">Create Project</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="font-medium">Project Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            disabled={loading}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditProjectModal({ open, onClose, project, onUpdated }) {
  const [projectName, setProjectName] = useState(project?.project_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setProjectName(project?.project_name || "");
    setError("");
  }, [project, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/project/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: projectName }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        setError(data.error || "Failed to update project");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !project) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white bg-opacity-80 rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-4xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4">Edit Project</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="font-medium">Project Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            disabled={loading}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProjectContent() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    project: null,
  });
  const [editModal, setEditModal] = useState({ open: false, project: null });
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");

  const safeProjects = Array.isArray(projects) ? projects : [];
  const totalPages = Math.max(1, Math.ceil(safeProjects.length / pageSize));
  const paginatedProjects = safeProjects.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/project");
      const data = await res.json();
      setProjects(data.data || []);
    } catch (err) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {

    if (page > totalPages) setPage(totalPages);
    setPageSizeInput(String(pageSize));
  }, [page, totalPages, pageSize]);

  const handleDelete = async (projectId) => {
    try {
      const res = await fetch(`/api/project/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteModal({ open: false, project: null });
        fetchProjects();
      }
    } catch (err) {}
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Projects</h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={() => setModalOpen(true)}
        >
          <FaFolderPlus /> Create Project
        </button>
      </div>
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchProjects}
      />
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-4xl"
              onClick={() => setDeleteModal({ open: false, project: null })}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Delete Project</h3>
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteModal.project?.project_name}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setDeleteModal({ open: false, project: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => handleDelete(deleteModal.project._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {editModal.open && (
        <EditProjectModal
          open={editModal.open}
          onClose={() => setEditModal({ open: false, project: null })}
          project={editModal.project}
          onUpdated={fetchProjects}
        />
      )}
      {loading ? (
        <div>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-500">No projects found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr className="bg-gray-900 border text-white">
                <th className="py-2 px-4 border-b text-left">No.</th>
                <th className="py-2 px-4 border-b text-left">Project Name</th>
                <th className="py-2 px-4 border-b text-left">
                  Number of Events
                </th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((project, idx) => (
                <tr key={project._id} className="hover:bg-gray-50 border-b">
                  <td className="py-2 px-4 border-b">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td className="py-2 px-4 border-b font-medium">
                    {project.project_name}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {Array.isArray(project.events) ? project.events.length : 0}
                  </td>
                  <td className="py-2 px-4 flex gap-2">
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      onClick={() => router.push(`/projects/${project._id}`)}
                    >
                      View
                    </button>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      onClick={() => setEditModal({ open: true, project })}
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      onClick={() => setDeleteModal({ open: true, project })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-4 mt-6">
            <label className="text-sm gap">
              Show
              <input
                type="number"
                min={1}
                max={100}
                value={pageSizeInput}
                onChange={(e) => {
                  let val = e.target.value;
                  setPageSizeInput(val);
                  let num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 1 && num <= 100) {
                    setPageSize(num);
                    const newTotalPages = Math.max(
                      1,
                      Math.ceil(safeProjects.length / num),
                    );
                    if (page > newTotalPages) setPage(newTotalPages);
                  }
                }}
                className="w-16 border rounded px-2 py-1 mx-2"
              />
              per page
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded bg-gray-400 hover:bg-gray-500 disabled:opacity-50" 
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 rounded bg-gray-400 hover:bg-gray-500 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
