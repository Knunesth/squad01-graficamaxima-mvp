import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout';
import Dashboard from './features/dashboard';
import Orcamentos from './Paginas/Orcamentos';
import NovoOrcamentos, { ClienteFormulario, EscolherCliente } from './Paginas/NovoOrcamentos';
import Papeis from './Paginas/Papeis';
import Configuracao from './Paginas/Config';
import StatusOrcamento from './Paginas/StatusOrcamento';
import Usuarios from './Paginas/Usuarios';
import Acesso from './Paginas/Acesso';
import CalculadoraM2 from './Componentes/calculadoraM2';
import { SessionContext } from './services/session';
import api from './services/api';
import './styles/global.css';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculadora, setCalculadora] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/auth/me', { signal: controller.signal }).then(({data}) => setUsuario(data.usuario)).catch(() => {}).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const expired = () => setUsuario(null);
    window.addEventListener('session-expired', expired);
    return () => { controller.abort(); window.removeEventListener('session-expired', expired); };
  }, []);
  if (loading) return <p className="loading-session" role="status">Carregando sessão...</p>;
  return <QueryClientProvider client={queryClient}><SessionContext.Provider value={{ usuario, setUsuario }}><BrowserRouter>
    {!usuario ? <Routes><Route path="/cadastro" element={<Acesso key="cadastro" cadastro />} /><Route path="/login" element={<Acesso key="login" />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes> : <AppShell><Routes>
      <Route path="/" element={<Dashboard />} /><Route path="/orcamentos" element={<Orcamentos />} /><Route path="/orcamentos/novo" element={<EscolherCliente />} />
      <Route path="/orcamentos/novo/cliente" element={<ClienteFormulario key="existente" />} /><Route path="/orcamentos/novo/cadastro" element={<ClienteFormulario key="novo" novo />} />
      <Route path="/orcamentos/novo/producao" element={<NovoOrcamentos key="novo" />} /><Route path="/orcamentos/:id/editar" element={<NovoOrcamentos key="editar" />} />
      <Route path="/status-orcamento/:id" element={<StatusOrcamento />} /><Route path="/papel" element={<Papeis />} /><Route path="/configuracao" element={<Configuracao />} />
      <Route path="/usuarios" element={usuario.tipo === 'admin' ? <Usuarios /> : <Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} />
    </Routes></AppShell>}
    <button 
      className="fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 bg-[var(--ink)] text-[var(--paper)] font-bold rounded-full shadow-lg hover:bg-[var(--ink-light)] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ink)] z-50"
      title="Calculadora de m²"
      aria-label="Calculadora de m²"
      onClick={() => setCalculadora(c => !c)}
    >
      m²
    </button>
    {calculadora && <div className="calculator-window"><CalculadoraM2 aoFechar={() => setCalculadora(false)} /></div>}  </BrowserRouter></SessionContext.Provider></QueryClientProvider>;
}
