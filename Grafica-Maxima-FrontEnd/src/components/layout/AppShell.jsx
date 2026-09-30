import React from 'react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace">
        {children}
      </main>
    </div>
  );
}
