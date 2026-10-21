import React, { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  FileText,
  Layers3,
  Plus,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { SessionContext } from "../../services/session.js";
import api, { mensagemErro } from "../../services/api.js";
import { Button, Feedback } from "../ui";

const links = [
  ["/", "Dashboard", BarChart3],
  ["/orcamentos", "Orçamentos", FileText],
  ["/clientes", "Clientes", Users],
  ["/orcamentos/novo", "Novo orçamento", Plus],
  ["/papel", "Papel", Layers3],
];

export function Sidebar() {
  const { usuario, setUsuario } = useContext(SessionContext);
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  async function sair() {
    try {
      await api.post("/api/auth/logout");
      queryClient.clear();
      setUsuario(null);
    } catch (e) {
      setError(mensagemErro(e));
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logomarca-grafica-maxima.png" alt="Gráfica Máxima" />
        <span>Gestão de impressão</span>
      </div>

      <nav aria-label="Navegação principal">
        {links.map(([path, label, Icon]) => (
          <NavLink
            key={path}
            end={path !== "/orcamentos/novo"}
            to={path}
            className={({ isActive }) =>
              `button ${isActive ? "button-primary" : "button-subtle"}`
            }
          >
            {React.createElement(Icon, {
              size: 18,
              strokeWidth: 1.8,
              "aria-hidden": true,
            })}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-session">
        <span className="session-user">
          <span className="session-avatar" aria-hidden="true">
            {usuario.nome?.trim().charAt(0).toUpperCase() || "G"}
          </span>
          <span className="session-user-copy">
            <strong>{usuario.nome}</strong>
            <small>{usuario.tipo === "admin" ? "Administrador" : "Atendente"}</small>
          </span>
        </span>
        {usuario.tipo === "admin" && (
          <NavLink
            to="/usuarios"
            className="button button-subtle justify-start gap-3"
          >
            <Users size={18} strokeWidth={1.5} /> Usuários
          </NavLink>
        )}
        <NavLink
          to="/configuracao"
          className="button button-subtle justify-start gap-3"
        >
          <Settings size={18} strokeWidth={1.5} /> Configurações
        </NavLink>
        <Button
          variant="subtle"
          className="justify-start gap-3 text-danger"
          onClick={sair}
        >
          <LogOut size={18} strokeWidth={1.5} /> Sair
        </Button>
        <Feedback error={error} />
      </div>
    </aside>
  );
}
