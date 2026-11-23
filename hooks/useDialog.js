"use client";

import { useCallback, useRef } from "react";

/* Keyboard and screen-reader behavior for a hand-built modal.

   Usage: put the returned ref on the dialog panel (the element that carries
   role="dialog" and aria-modal="true"):

     const dialogRef = useDialog(onClose);
     {open && (
       <div className="fixed inset-0 ...">
         <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
           ...

   While the panel is mounted it:
   - moves focus into the dialog (keeps focus on an autoFocus field if one
     already took it, otherwise focuses the panel itself so a screen reader
     announces the dialog and Enter cannot fire a destructive button by
     accident),
   - keeps Tab / Shift+Tab inside the dialog,
   - calls `onClose` on Escape (pass null/undefined to disable, e.g. while a
     request is in flight),
   - locks page scroll behind the overlay,
   - returns focus to whatever opened the dialog when it unmounts.

   It is driven by the panel mounting and unmounting, so conditionally
   rendered modals need no extra `open` flag. Stacked dialogs are tracked so
   Escape and the focus trap only act on the topmost one. */

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const stack = [];
let scrollLocks = 0;
let savedOverflow = "";

function focusableIn(node) {
  return Array.from(node.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest("[inert]"),
  );
}

function lockScroll() {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

export function useDialog(onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  return useCallback((node) => {
    if (!node) return undefined;

    const opener = document.activeElement;
    stack.push(node);
    lockScroll();

    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    if (!node.contains(document.activeElement)) {
      node.focus({ preventScroll: true });
    }

    const onKeyDown = (e) => {
      if (stack[stack.length - 1] !== node) return;

      if (e.key === "Escape") {
        // A control inside the dialog (inline editor, open dropdown) that
        // handles Escape itself calls preventDefault or stopPropagation so
        // the keypress cancels just that control, not the whole dialog.
        if (e.defaultPrevented) return;
        if (closeRef.current) {
          e.stopPropagation();
          closeRef.current();
        }
        return;
      }

      if (e.key !== "Tab") return;
      const items = focusableIn(node);
      if (items.length === 0) {
        e.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const i = stack.lastIndexOf(node);
      if (i !== -1) stack.splice(i, 1);
      unlockScroll();
      if (opener && opener.isConnected && typeof opener.focus === "function") {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);
}
