import React, { useId, forwardRef } from "react";

export const InputField = forwardRef(function InputField(
  { label, id, error, className = "", ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={fieldId}>{label}</label>
      <input {...props} id={fieldId} ref={ref} aria-invalid={error ? "true" : undefined} aria-describedby={describedBy} />
      {error && (
        <small
          id={errorId}
          role="alert"
          className="error-text"
          style={{
            color: "var(--danger-700)",
            marginTop: "0.25rem",
            display: "block",
          }}
        >
          {error}
        </small>
      )}
    </div>
  );
});
