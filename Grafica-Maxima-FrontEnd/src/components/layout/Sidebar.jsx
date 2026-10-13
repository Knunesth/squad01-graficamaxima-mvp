import React, { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { Users, Settings, LogOut } from "lucide-react";
import { SessionContext } from "../../services/session.js";
import api, { mensagemErro } from "../../services/api.js";
import { Button, Feedback } from "../ui";

const links = [
  ["/", "Dashboard"],
  ["/orcamentos", "Orçamentos"],
  ["/orcamentos/novo", "Novo orçamento"],
  ["/papel", "Papel"],
];

export function Sidebar() {
  const { usuario, setUsuario } = useContext(SessionContext);
  const [error, setError] = useState("");

  async function sair() {
    try {
      await api.post("/api/auth/logout");
      setUsuario(null);
    } catch (e) {
      setError(mensagemErro(e));
    }
  }

  return (
    <aside className="sidebar">
      <div className="logo-placeholder">LOGO DA GRÁFICA</div>
      <strong className="brand-name">Gráfica Máxima</strong>

      <nav aria-label="Navegação principal">
        {links.map(([path, label]) => (
          <NavLink
            key={path}
            end={path !== "/orcamentos/novo"}
            to={path}
            className={({ isActive }) =>
              `button ${isActive ? "button-primary" : "button-subtle"} `
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-session">
        <span className="session-user">{usuario.nome}</span>
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
