import React, { useId, forwardRef } from 'react';

export const InputField = forwardRef(function InputField({ label, id, error, className = '', ...props }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={fieldId}>{label}</label>
      <input id={fieldId} ref={ref} aria-invalid={!!error} {...props} />
      {error && <small role="alert" className="error-text" style={{ color: 'var(--danger-700)', marginTop: '0.25rem', display: 'block' }}>{error}</small>}
    </div>
  );
});
