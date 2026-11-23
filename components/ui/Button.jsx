"use client";

import { forwardRef } from "react";

/* Shared button. Styling lives in app/globals.css (.btn-*), so this component
   only picks the variant and fixes the defaults people forget:
   - type="button" (a bare <button> inside a <form> submits it),
   - disabled + aria-busy while `loading`,
   - an icon slot with consistent spacing.

   <Button variant="primary" onClick={save} loading={saving}>Save</Button>
   <Button variant="danger" type="submit">Delete</Button>

   Variants: primary (brand action), secondary (neutral), ghost (low
   emphasis), danger (destructive), success (confirming a positive outcome). */

const VARIANT_CLASS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  success: "btn-success",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const Button = forwardRef(function Button(
  {
    variant = "primary",
    type = "button",
    loading = false,
    disabled = false,
    icon = null,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const base = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={className ? `${base} ${className}` : base}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export default Button;
