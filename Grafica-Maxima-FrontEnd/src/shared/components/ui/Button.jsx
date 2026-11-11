import React from "react";

export function Button({
  children,
  label,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      type="button"
      className={`button button-${variant.toLowerCase()} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children || label}
    </button>
  );
}
