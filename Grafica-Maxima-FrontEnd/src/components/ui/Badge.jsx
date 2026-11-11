import React from "react";

export function Badge({ children, variant = "neutral", className = "" }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
}
