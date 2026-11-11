import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/shared/components/layout";
import Dashboard from "@/features/dashboard/pages/DashboardPage.jsx";
import Orcamentos from "@/features/budgets/pages/BudgetsPage.jsx";
import NovoOrcamentos, {
  ClienteFormulario,
  EscolherCliente,
} from "@/features/budgets/pages/NewBudgetPage.jsx";
import Papeis from "@/features/catalog/pages/PapersPage.jsx";
import Configuracao from "@/features/settings/pages/SettingsPage.jsx";
import StatusOrcamento from "@/features/budgets/pages/BudgetStatusPage.jsx";
import Usuarios from "@/features/users/pages/UsersPage.jsx";
import Acesso from "@/features/auth/pages/AccessPage.jsx";
import Clientes from "@/features/customers/pages/CustomersPage.jsx";
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage.jsx"));

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
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/orcamentos/novo" element={<EscolherCliente />} />
            <Route
              path="/orcamentos/novo/cliente"
              element={<ClienteFormulario key="existente" />}
            />
            <Route
              path="/orcamentos/novo/cadastro"
              element={<ClienteFormulario key="novo" novo />}
            />
            <Route
              path="/orcamentos/novo/producao"
              element={<NovoOrcamentos key="novo" />}
            />
            <Route
              path="/orcamentos/:id/editar"
              element={<NovoOrcamentos key="editar" />}
            />
            <Route path="/status-orcamento/:id" element={<StatusOrcamento />} />
            <Route path="/papel" element={<Papeis />} />
            <Route path="/configuracao" element={<Configuracao />} />
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
                  <Usuarios />
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
