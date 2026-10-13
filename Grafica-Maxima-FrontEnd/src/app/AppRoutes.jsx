import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout";
import Dashboard from "../features/dashboard";
import Orcamentos from "../features/orcamentos/Orcamentos.jsx";
import NovoOrcamentos, {
  ClienteFormulario,
  EscolherCliente,
} from "../features/orcamentos/NovoOrcamentos.jsx";
import Papeis from "../features/catalogo/Papeis.jsx";
import Configuracao from "../features/configuracoes/Configuracao.jsx";
import StatusOrcamento from "../features/orcamentos/StatusOrcamento.jsx";
import Usuarios from "../features/usuarios/Usuarios.jsx";
import Acesso from "../features/auth/Acesso.jsx";

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
