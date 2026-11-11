import React from "react";
import { Sidebar } from "./Sidebar.jsx";

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Sidebar />
      <main className="workspace" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
