"use client";

import { useCallback, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

/* Drop-in replacement for window.confirm() that matches the app.

   const { confirm, confirmDialog } = useConfirm();

   async function handleDelete() {
     const ok = await confirm({
       title: "Delete member?",
       message: "This removes them from the GFPS roster.",
       confirmLabel: "Delete",
       tone: "danger",
     });
     if (!ok) return;
     ...
   }

   return (<>{...page}{confirmDialog}</>);

   Resolves true on confirm, false on Cancel / X / Escape / backdrop. Built on
   Modal, so it is a real dialog (focus trap, Escape, focus return) and can
   open on top of another modal. tone: "danger" (default) | "primary". */

export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    resolver.current?.(false);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setRequest(typeof options === "string" ? { message: options } : options);
    });
  }, []);

  const settle = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  const {
    title = "Are you sure?",
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "danger",
  } = request ?? {};

  const confirmDialog = (
    <Modal
      open={Boolean(request)}
      onClose={() => settle(false)}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => settle(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "primary" ? "primary" : "danger"}
            onClick={() => settle(true)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </Modal>
  );

  return { confirm, confirmDialog };
}
