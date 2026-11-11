import React, { useContext, useEffect, useRef, useState } from "react";
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
  ChartColumn,
  Menu,
  X,
} from "lucide-react";
import { SessionContext } from "@/app/SessionContext.js";
import api, { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback } from "@/shared/components/ui";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
      <div className="sidebar-topbar">
        <div className="sidebar-brand">
          <img src="/logomarca-grafica-maxima.png" alt="Gráfica Máxima" />
          <span>Gestão de impressão</span>
        </div>
        <button
          ref={menuButtonRef}
          className="sidebar-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <div className={`sidebar-drawer${menuOpen ? " is-open" : ""}`}>
      <nav id="primary-navigation" aria-label="Navegação principal" onClick={() => setMenuOpen(false)}>
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
        {usuario.tipo === "admin" && (
          <NavLink
            to="/relatorios"
            className={({ isActive }) =>
              `button ${isActive ? "button-primary" : "button-subtle"}`
            }
          >
            <ChartColumn size={18} strokeWidth={1.8} aria-hidden="true" />
            Relatórios
          </NavLink>
        )}
      </nav>

      <div className="sidebar-session" onClick={() => setMenuOpen(false)}>
        <span className="session-user">
          <span className="session-avatar" aria-hidden="true">
            {usuario.nome?.trim().charAt(0).toUpperCase() || "G"}
          </span>
          <span className="session-user-copy">
            <strong>{usuario.nome}</strong>
            <small>
              {usuario.tipo === "admin" ? "Administrador" : "Atendente"}
            </small>
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
      </div>
    </aside>
  );
}
