import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/shared/components/layout";
import Dashboard from "@/features/dashboard/pages/DashboardPage.jsx";
import Orcamentos from "@/features/budgets/pages/BudgetsPage.jsx";
import {
  CadastrarCliente,
  EscolherCliente,
} from "@/features/budgets/pages/CustomerStepPages.jsx";
import Acesso from "@/features/auth/pages/AccessPage.jsx";
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage.jsx"));
const Papeis = lazy(() => import("@/features/catalog/pages/PapersPage.jsx"));
const Usuarios = lazy(() => import("@/features/users/pages/UsersPage.jsx"));
const Configuracao = lazy(() => import("@/features/settings/pages/SettingsPage.jsx"));
const NovoOrcamentos = lazy(() => import("@/features/budgets/pages/NewBudgetPage.jsx"));
const Clientes = lazy(() => import("@/features/customers/pages/CustomersPage.jsx"));
const StatusOrcamento = lazy(() => import("@/features/budgets/pages/BudgetStatusPage.jsx"));

export function AppRoutes({ usuario }) {
  return (
    <>
      {!usuario ? (
        <Routes>
          <Route
            path="/cadastro"
            element={<Acesso key="cadastro" cadastro />}
          />
          <Route path="/login" element={<Acesso key="login" />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/clientes" element={<Suspense fallback={<div role="status">Carregando clientes…</div>}><Clientes /></Suspense>} />
            <Route path="/orcamentos/novo" element={<EscolherCliente />} />
            <Route
              path="/orcamentos/novo/cliente"
              element={<Navigate to="/orcamentos/novo" replace />}
            />
            <Route
              path="/orcamentos/novo/cadastro"
              element={<CadastrarCliente />}
            />
            <Route
              path="/orcamentos/novo/producao"
              element={<Suspense fallback={<div role="status">Carregando orçamento…</div>}><NovoOrcamentos key="novo" /></Suspense>}
            />
            <Route
              path="/orcamentos/:id/editar"
              element={<Suspense fallback={<div role="status">Carregando orçamento…</div>}><NovoOrcamentos key="editar" /></Suspense>}
            />
            <Route path="/status-orcamento/:id" element={<Suspense fallback={<div role="status">Carregando detalhes…</div>}><StatusOrcamento /></Suspense>} />
            <Route path="/papel" element={<Suspense fallback={<div role="status">Carregando papel…</div>}><Papeis /></Suspense>} />
            <Route path="/configuracao" element={<Suspense fallback={<div role="status">Carregando configurações…</div>}><Configuracao /></Suspense>} />
            <Route
              path="/relatorios"
              element={
                usuario.tipo === "admin" ? (
                  <Suspense fallback={<div role="status">Carregando relatórios…</div>}>
                    <ReportsPage />
                  </Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/usuarios"
              element={
                usuario.tipo === "admin" ? (
                  <Suspense fallback={<div role="status">Carregando usuários…</div>}><Usuarios /></Suspense>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      )}
    </>
  );
}
