"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { nextRefNumber } from "@/data/lib/referenceNumber";
import { orderProjectsByType } from "./lib/projectForm";
import { useGpbYear } from "./hooks/useGpbYear";
import { useAddProject, useEditProject } from "./hooks/useProjectForms";
import {
  useGpbStatusUpdate,
  useScannedViewer,
} from "./hooks/useGpbStatusUpdate";
import { useDeleteProject, useProjectComments } from "./hooks/useProjectActions";
import GpbHeader from "./components/GpbHeader";
import BudgetCards from "./components/BudgetCards";
import UpdateStatusModal from "./components/UpdateStatusModal";
import ScannedCopyViewer from "./components/ScannedCopyViewer";
import CommentModal from "./components/CommentModal";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import GpbEditProjectModal from "./components/GpbEditProjectModal";
import AddProjectWizard from "./components/AddProjectWizard";
import GpbProjectsTable from "./components/GpbProjectsTable";

/* Clears a transient notice after `ms`. */
function useAutoClear(value, clear, ms) {
  useEffect(() => {
    if (!value) return undefined;
    const timer = setTimeout(() => clear(""), ms);
    return () => clearTimeout(timer);
  }, [value, clear, ms]);
}

export default function ProjectContent({ sidebarOpen, backPath = "/gpb" }) {
  const router = useRouter();
  const params = useParams();
  const year = params?.year;
  const role = useSelector((state) => state.auth.role);

  const gpb = useGpbYear(year);
  const { projects, gpbStatus, status, budgetSummary, loadError } = gpb;
  const refreshAll = () => {
    gpb.fetchProjects({ quiet: true });
    gpb.fetchBudgetSummary();
  };
  const refreshProjects = () => gpb.fetchProjects({ quiet: true });

  const add = useAddProject({ year, projects, onCreated: refreshAll });
  const edit = useEditProject({ year, projects, onSaved: refreshAll });
  const del = useDeleteProject({ onDeleted: refreshAll });
  const comments = useProjectComments({ onChanged: refreshProjects });
  const statusUpdate = useGpbStatusUpdate({
    gpbId: gpb.gpbId,
    gpbStatus,
    onUpdated: () => gpb.fetchProjects({ quiet: true }),
  });
  const viewer = useScannedViewer(gpbStatus?.scanned_copy?.url);

  useAutoClear(add.addError, add.setAddError, 3000);
  useAutoClear(add.addWarning, add.setAddWarning, 6000);

  // ── Pagination ───────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");

  const orderedProjects = orderProjectsByType(projects);
  const totalPages = Math.max(1, Math.ceil(orderedProjects.length / pageSize));
  const paginatedProjects = orderedProjects.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    setPageSizeInput(String(pageSize));
  }, [page, totalPages, pageSize]);

  /* The API assigns the real reference number on save; this is only the
     preview shown while filling in the "add project" wizard. */
  const nextRefPreview = nextRefNumber(
    year,
    projects.map((project) => project.reference_number).filter(Boolean),
  );

  const gpbOpen =
    gpbStatus?.status !== "approved" && gpbStatus?.status !== "disapproved";

  return (
    <div className="p-6">
      <GpbHeader
        year={year}
        status={status}
        gpbStatus={gpbStatus}
        projects={projects}
        totalGAA={gpb.totalGAA}
        /* The same "used" figure as the budget cards. */
        totalGadBudget={budgetSummary?.usedBudget}
        onBack={() => router.push(backPath)}
        onViewScannedCopy={viewer.openViewer}
      />

      {statusUpdate.open && (
        <UpdateStatusModal
          handleUpdateStatus={statusUpdate.handleUpdateStatus}
          openScannedViewer={viewer.openViewer}
          reasonField={statusUpdate.reasonField}
          saving={statusUpdate.saving}
          selectedFile={statusUpdate.selectedFile}
          selectedGPBStatus={gpbStatus}
          setReasonField={statusUpdate.setReasonField}
          setSelectedFile={statusUpdate.setSelectedFile}
          setStatusType={statusUpdate.setStatusType}
          setUpdateStatusModal={statusUpdate.setUpdateStatusModal}
          statusType={statusUpdate.statusType}
        />
      )}

      {viewer.open && (
        <ScannedCopyViewer
          closeScannedViewer={viewer.closeViewer}
          downloadScannedCopy={viewer.download}
          scannedPreviewError={viewer.previewError}
          scannedPreviewLoading={viewer.previewLoading}
          selectedGPBStatus={gpbStatus}
          setScannedPreviewError={viewer.setPreviewError}
          setScannedPreviewLoading={viewer.setPreviewLoading}
          year={year}
        />
      )}

      {comments.showCommentForm && (
        <CommentModal
          comment={comments.comment}
          commentError={comments.commentError}
          commentField={comments.commentField}
          commentSaving={comments.commentSaving}
          commentType={comments.commentType}
          handleSubmitComment={comments.handleSubmitComment}
          setComment={comments.setComment}
          setCommentField={comments.setCommentField}
          setCommentProjectId={comments.setCommentProjectId}
          setCommentType={comments.setCommentType}
          setShowCommentForm={(show) =>
            show ? comments.setShowCommentForm(true) : comments.closeComment()
          }
        />
      )}

      {loadError && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => gpb.fetchProjects()}
            className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* A failed comment delete happens outside the comment modal. */}
      {comments.commentError && !comments.showCommentForm && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {comments.commentError}
        </div>
      )}

      <div className="flex justify-end mb-4 gap-2">
        {!loadError && role !== "planning director" && gpbOpen && (
          <button
            type="button"
            onClick={add.openWizard}
            className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition"
          >
            + Add Project
          </button>
        )}
        {/* Hidden until the plan has loaded: with no GPB id the save posted
            to /api/gpb/status/null. */}
        {!loadError && gpb.gpbId && role !== "gad coordinator" && (
          <button
            type="button"
            onClick={statusUpdate.openModal}
            className="bg-secondary-600 py-2 px-5 text-white rounded-md font-medium"
          >
            Update Status
          </button>
        )}
      </div>

      <BudgetCards budgetSummary={budgetSummary} status={status} year={year} />

      {del.deleteModal.open && (
        <ConfirmDeleteModal
          deleteError={del.deleteError}
          deleteModal={del.deleteModal}
          deletingProject={del.deletingProject}
          handleDelete={del.handleDelete}
          setDeleteError={del.setDeleteError}
          setDeleteModal={(next) =>
            next?.open ? del.setDeleteModal(next) : del.closeDelete()
          }
        />
      )}

      {edit.editRow && (
        <GpbEditProjectModal
          cancelEdit={edit.cancelEdit}
          editDuplicateWarnings={edit.editDuplicateWarnings}
          editError={edit.editError}
          editLoading={edit.editLoading}
          editRow={edit.editRow}
          handleAddEditActivityRow={edit.handleAddEditActivityRow}
          handleEditActivityDescriptionChange={
            edit.handleEditActivityDescriptionChange
          }
          handleEditActivityTitleChange={edit.handleEditActivityTitleChange}
          handleEditRowChange={edit.handleEditRowChange}
          handleRemoveEditActivityRow={edit.handleRemoveEditActivityRow}
          saveEdit={edit.saveEdit}
        />
      )}

      {add.showWizard && (
        <AddProjectWizard
          addError={add.addError}
          addLoading={add.addLoading}
          addWarning={add.addWarning}
          budgetSummary={budgetSummary}
          duplicateWarnings={add.duplicateWarnings}
          handleActivityDescriptionChange={add.handleActivityDescriptionChange}
          handleActivityTitleChange={add.handleActivityTitleChange}
          handleAddActivityRow={add.handleAddActivityRow}
          handleAddArrayField={add.handleAddArrayField}
          handleArrayFieldChange={add.handleArrayFieldChange}
          handleNewProjectChange={add.handleNewProjectChange}
          handleRemoveActivityRow={add.handleRemoveActivityRow}
          handleRemoveArrayField={add.handleRemoveArrayField}
          handleWizardSubmit={add.handleWizardSubmit}
          newProject={add.newProject}
          nextRefPreview={nextRefPreview}
          setShowWizard={(show) =>
            show ? add.setShowWizard(true) : add.closeWizard()
          }
          setWizardStep={add.setWizardStep}
          wizardStep={add.wizardStep}
          year={year}
        />
      )}

      {gpb.loading ? (
        <div className="h-screen">Loading projects...</div>
      ) : (
        <GpbProjectsTable
          addError={add.addError}
          addWarning={add.addWarning}
          budgetSummary={budgetSummary}
          gpbStatus={gpbStatus}
          page={page}
          pageSize={pageSize}
          pageSizeInput={pageSizeInput}
          paginatedProjects={paginatedProjects}
          projectCount={projects.length}
          setPage={setPage}
          setPageSize={setPageSize}
          setPageSizeInput={setPageSizeInput}
          sidebarOpen={sidebarOpen}
          totalPages={totalPages}
          year={year}
          onEdit={edit.startEdit}
          onDelete={del.openDelete}
          onComment={comments.openComment}
          onDeleteComment={comments.handleDeleteComment}
        />
      )}
    </div>
  );
}
