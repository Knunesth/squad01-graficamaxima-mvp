import React from 'react';

export function Button({ children, label, variant = 'primary', className = '', ...props }) {
  return (
    <button 
      type="button" 
      className={`button button-${variant.toLowerCase()} ${className}`} 
      {...props}
    >
      {children || label}
    </button>
  );
}
