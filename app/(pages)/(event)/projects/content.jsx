"use client";
import React, { useEffect, useState } from "react";
import { FaFolderPlus } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function ProjectContent() {
  const [newProject, setNewProject] = useState({
    gender_issue: "",
    cause_gender_issue: "",
    gad_objective: "",
    supporting_statistics_data: "",
    relevant_agency: "",
    gad_activity: "",
    performance_indicator_target: "",
    gad_budget: "",
    source_budget: "",
    responsible_office: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const handleNewProjectChange = (field, value) => {
    setNewProject((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (res.ok) {
        setNewProject({
          gender_issue: "",
          cause_gender_issue: "",
          gad_objective: "",
          supporting_statistics_data: "",
          relevant_agency: "",
          gad_activity: "",
          performance_indicator_target: "",
          gad_budget: "",
          source_budget: "",
          responsible_office: "",
        });
        fetchProjects();
      } else {
        setAddError(data.error || "Failed to add project");
      }
    } catch (err) {
      setAddError("Network error");
    } finally {
      setAddLoading(false);
    }
  };
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    project: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const startEdit = (project) => {
    setEditingId(project._id);
    setEditRow({ ...project });
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow(null);
    setEditError("");
  };

  const handleEditRowChange = (field, value) => {
    setEditRow((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/project/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRow),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setEditRow(null);
        fetchProjects();
      } else {
        setEditError(data.error || "Failed to update project");
      }
    } catch (err) {
      setEditError("Network error");
    } finally {
      setEditLoading(false);
    }
  };
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
        {/* <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={() => setModalOpen(true)}
        >
          <FaFolderPlus /> Create Project
        </button> */}
      </div>
      {/* <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchProjects}
      /> */}
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
            <p>Are you sure you want to delete this project?</p>
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

      {loading ? (
        <div>Loading projects...</div>
      ) : (
        <div className="overflow-x-auto">
          <form onSubmit={handleAddProject}>
            <table className="min-w-full bg-white rounded shadow">
              <thead>
                <tr className="bg-gray-900 border text-white ">
                  <th className="py-2 px-4 border-b text-center">No.</th>
                  <th className="py-2 px-4 border-b text-center">
                    Gender Issue and/or GAD Mandate
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Cause of the Gender Issue
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    GAD Result Statement/GAD Objective
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Supporting Statistics Data
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Relevant Agency MFO/PAP
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    GAD Activity
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Output Performance Indicators and Target
                  </th>
                  <th className="py-2 px-4 border-b text-center">GAD Budget</th>
                  <th className="py-2 px-4 border-b text-center">
                    Source of Budget
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Responsible Unit/Office
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Number of Events
                  </th>
                  <th className="py-2 px-4 border-b text-center">Actions</th>
                </tr>
                <tr className="bg-gray-100">
                  <td className="py-2 px-4 border-b text-center">—</td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.gender_issue}
                      onChange={(e) =>
                        handleNewProjectChange("gender_issue", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.cause_gender_issue}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "cause_gender_issue",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.gad_objective}
                      onChange={(e) =>
                        handleNewProjectChange("gad_objective", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.supporting_statistics_data}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "supporting_statistics_data",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.relevant_agency}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "relevant_agency",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.gad_activity}
                      onChange={(e) =>
                        handleNewProjectChange("gad_activity", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.performance_indicator_target}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "performance_indicator_target",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-32 border rounded px-2 py-1"
                      value={newProject.gad_budget}
                      onChange={(e) =>
                        handleNewProjectChange("gad_budget", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-32 border rounded px-2 py-1"
                      value={newProject.source_budget}
                      onChange={(e) =>
                        handleNewProjectChange("source_budget", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.responsible_office}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "responsible_office",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b text-center">—</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      disabled={addLoading}
                    >
                      {addLoading ? "Adding..." : "Add"}
                    </button>
                  </td>
                </tr>
              </thead>
              <tbody>
                {addError && (
                  <tr>
                    <td colSpan={13} className="text-red-500 text-sm px-4 py-2">
                      {addError}
                    </td>
                  </tr>
                )}
                {paginatedProjects.map((project, idx) => (
                  <tr key={project._id} className="hover:bg-gray-50 border">
                    <td className="py-2 px-4 border">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    {editingId === project._id ? (
                      <>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.gender_issue}
                            onChange={(e) =>
                              handleEditRowChange(
                                "gender_issue",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.cause_gender_issue}
                            onChange={(e) =>
                              handleEditRowChange(
                                "cause_gender_issue",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.gad_objective}
                            onChange={(e) =>
                              handleEditRowChange(
                                "gad_objective",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.supporting_statistics_data}
                            onChange={(e) =>
                              handleEditRowChange(
                                "supporting_statistics_data",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.relevant_agency}
                            onChange={(e) =>
                              handleEditRowChange(
                                "relevant_agency",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.gad_activity}
                            onChange={(e) =>
                              handleEditRowChange(
                                "gad_activity",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.performance_indicator_target}
                            onChange={(e) =>
                              handleEditRowChange(
                                "performance_indicator_target",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-32 border rounded px-2 py-1"
                            value={editRow.gad_budget}
                            onChange={(e) =>
                              handleEditRowChange("gad_budget", e.target.value)
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-32 border rounded px-2 py-1"
                            value={editRow.source_budget}
                            onChange={(e) =>
                              handleEditRowChange(
                                "source_budget",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border">
                          <textarea
                            className="w-40 border rounded px-2 py-1"
                            value={editRow.responsible_office}
                            onChange={(e) =>
                              handleEditRowChange(
                                "responsible_office",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-4 border text-center">
                          {Array.isArray(project.events)
                            ? project.events.length
                            : 0}
                        </td>
                        <td className="py-2 px-4 flex gap-2">
                          <button
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                            onClick={(e) => {
                              e.preventDefault();
                              saveEdit();
                            }}
                            disabled={editLoading}
                          >
                            {editLoading ? "Saving..." : "Save"}
                          </button>
                          <button
                            className="px-3 py-1 bg-gray-400 text-black rounded hover:bg-gray-500 transition"
                            onClick={(e) => {
                              e.preventDefault();
                              cancelEdit();
                            }}
                            disabled={editLoading}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-4 border">
                          {project.gender_issue}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.cause_gender_issue}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.gad_objective}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.supporting_statistics_data}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.relevant_agency}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.gad_activity}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.performance_indicator_target}
                        </td>
                        <td className="py-2 px-4 border text-center">
                          {project.gad_budget}
                        </td>
                        <td className="py-2 px-4 border text-center">
                          {project.source_budget}
                        </td>
                        <td className="py-2 px-4 border">
                          {project.responsible_office}
                        </td>
                        <td className="py-2 px-4 border">
                          {Array.isArray(project.events)
                            ? project.events.length
                            : 0}
                        </td>
                        <td className="py-2 px-4 flex gap-2">
                          <button
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            onClick={() =>
                              router.push(`/projects/${project._id}`)
                            }
                          >
                            View
                          </button>
                          <button
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                            onClick={() => startEdit(project)}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                            onClick={() =>
                              setDeleteModal({ open: true, project })
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {editError && (
                  <tr>
                    <td colSpan={13} className="text-red-500 text-sm px-4 py-2">
                      {editError}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </form>
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
