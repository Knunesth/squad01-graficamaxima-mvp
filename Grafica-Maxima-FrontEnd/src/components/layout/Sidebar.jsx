import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Box, Users, Settings, LogOut, Printer } from 'lucide-react';
import { SessionContext } from '../../services/session';
import api, { mensagemErro } from '../../services/api';
import { Button, Feedback } from '../ui';

const links = [
  ['/', 'Dashboard', LayoutDashboard], 
  ['/orcamentos', 'Orçamentos', FileText], 
  ['/orcamentos/novo', 'Novo orçamento', PlusCircle], 
  ['/papel', 'Papel', Box]
];

export function Sidebar() {
  const { usuario, setUsuario } = useContext(SessionContext);
  const [error, setError] = useState('');

  async function sair() { 
    try { 
      await api.post('/api/auth/logout'); 
      setUsuario(null); 
    } catch (e) { 
      setError(mensagemErro(e)); 
    } 
  }

  return (
    <aside className="sidebar">
      <div className="logo-placeholder"><Printer size={32} /></div>
      <strong className="brand-name">Gráfica Máxima</strong>
      
      <nav aria-label="Navegação principal">
        {/* eslint-disable-next-line no-unused-vars */}
        {links.map(([path, label, Icon]) => (
          <NavLink 
            key={path} 
            end 
            to={path} 
            className={({ isActive }) => `button ${isActive ? 'button-primary' : 'button-subtle'} justify-start gap-2`}
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-session">
        <span className="session-user">{usuario.nome}</span>
        {usuario.tipo === 'admin' && (
          <NavLink to="/usuarios" className="button button-subtle justify-start gap-2"><Users size={18} /> Usuários</NavLink>
        )}
        <NavLink to="/configuracao" className="button button-subtle justify-start gap-2"><Settings size={18} /> Configurações</NavLink>
        <Button variant="subtle" className="justify-start gap-2 text-danger" onClick={sair}><LogOut size={18} /> Sair</Button>
        <Feedback error={error} />
      </div>
    </aside>
  );
}
