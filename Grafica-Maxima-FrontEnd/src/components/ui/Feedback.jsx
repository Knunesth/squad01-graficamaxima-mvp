import React from 'react';

export function Feedback({ error, message }) {
  return error ? (
    <p className="feedback error" role="alert">{error}</p>
  ) : message ? (
    <p className="feedback success" role="status">{message}</p>
  ) : null;
}
