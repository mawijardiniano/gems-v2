"use client";

import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";

/* Extracted from the GPB year page (gpb/[year]/content.jsx). The page owns
   the state and handlers and passes them in. */
export default function CommentModal({
  comment,
  commentError,
  commentField,
  commentSaving,
  commentType,
  handleSubmitComment,
  setComment,
  setCommentField,
  setCommentProjectId,
  setCommentType,
  setShowCommentForm,
}) {
  const dialogRef = useDialog(
    commentSaving
      ? null
      : () => {
          setShowCommentForm(false);
          setCommentField([]);
          setCommentProjectId(null);
        },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative"
        role="dialog"
        aria-modal="true"
        aria-label="Add comment"
      >
        <h3 className="text-xl font-semibold mb-3">Add Comment</h3>

        <div className="mb-3">
          <label className="block text-sm font-medium text-fg-3 mb-2">
            Fields{" "}
            <span className="text-xs text-fg-muted">
              (select one or more)
            </span>
          </label>
          <div className="border rounded p-2 max-h-48 overflow-y-auto flex flex-col gap-1">
            {[
              { value: "project_type", label: "Project Type" },
              { value: "gender_issue", label: "Gender Issue" },
              {
                value: "cause_gender_issue",
                label: "Cause of Gender Issue",
              },
              { value: "gad_objective", label: "GAD Objective" },
              {
                value: "supporting_statistics_data",
                label: "Supporting Statistics Data",
              },
              { value: "relevant_agency", label: "Relevant Agency" },
              { value: "gad_activity", label: "GAD Activity" },
              {
                value: "gad_activity_description",
                label: "GAD Activity Description",
              },
              {
                value: "performance_indicator_target",
                label: "Performance Indicator Target",
              },
              { value: "gad_budget", label: "GAD Budget" },
              { value: "source_budget", label: "Source Budget" },
              { value: "responsible_office", label: "Responsible Office" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-subtle px-1 py-0.5 rounded"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(commentField) &&
                    commentField.includes(opt.value)
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCommentField((prev) => [
                        ...(Array.isArray(prev) ? prev : []),
                        opt.value,
                      ]);
                    } else {
                      setCommentField((prev) =>
                        (Array.isArray(prev) ? prev : []).filter(
                          (f) => f !== opt.value,
                        ),
                      );
                    }
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {Array.isArray(commentField) && commentField.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {commentField.map((f) => (
                <span
                  key={f}
                  className="bg-secondary-100 text-secondary-700 text-xs px-2 py-0.5 rounded-full capitalize"
                >
                  {f.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        <textarea
          className="w-full border rounded p-2 mb-2"
          rows={3}
          placeholder="Write your comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <select
          className="border rounded p-2 mb-2 w-full"
          value={commentType}
          onChange={(e) => setCommentType(e.target.value)}
        >
          <option value="approval">Approval</option>
          <option value="revision">Needs Revision</option>
        </select>
        {commentError && (
          <p className="mb-2 text-sm text-danger" role="alert">
            {commentError}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button
            variant="success"
            onClick={handleSubmitComment}
            disabled={commentSaving}
          >
            {commentSaving ? "Saving..." : "Submit"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCommentForm(false);
              setCommentField([]);
              setCommentProjectId(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
