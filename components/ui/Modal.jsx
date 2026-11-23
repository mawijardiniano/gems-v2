"use client";

import { useId } from "react";
import { HiOutlineX } from "react-icons/hi";
import { useDialog } from "@/hooks/useDialog";

/* Shared modal shell for new dialogs. Builds on the .modal* primitives in
   app/globals.css and the useDialog hook, so every dialog gets the same
   semantics for free: role="dialog", aria-modal, a labelled title, focus
   moved in and trapped, Escape to close, scroll lock, focus returned.

   <Modal open={open} onClose={close} title="Delete project"
          footer={<><Button variant="secondary" onClick={close}>Cancel</Button>
                    <Button variant="danger" onClick={remove}>Delete</Button></>}>
     This cannot be undone.
   </Modal>

   `busy` blocks every way of closing (X, Escape, backdrop) while a request
   runs. `size` sets the panel width: "sm" (short confirms), "md" (default),
   "lg", "xl". */

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  busy = false,
  size = "md",
  children,
}) {
  const titleId = useId();
  const descId = useId();
  const close = busy ? null : onClose;
  const dialogRef = useDialog(close);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`modal ${SIZE_CLASS[size] ?? SIZE_CLASS.md}`}
      >
        <div className="modal-header">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => close?.()}
            disabled={busy}
            className="touch-target -mr-2 rounded-lg p-2 text-fg-muted transition hover:bg-muted hover:text-fg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary-500/30 disabled:opacity-50"
          >
            <HiOutlineX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
