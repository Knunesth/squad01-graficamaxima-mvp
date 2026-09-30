import React from 'react';

export function Badge({ children, variant = 'neutral', className = '' }) {
  // variants can be: success, warning, danger, info, neutral
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
