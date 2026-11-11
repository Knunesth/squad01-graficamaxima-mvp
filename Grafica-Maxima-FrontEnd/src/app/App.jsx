import { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppProviders } from "./AppProviders";
import { AppRoutes } from "./AppRoutes";
import { SessionContext } from "./SessionContext";
import CalculadoraM2 from "@/features/calculator/CalculatorM2";

function Application() {
  const { usuario } = useContext(SessionContext);
  const [calculadora, setCalculadora] = useState(false);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const titles = {
      "/": "Dashboard", "/orcamentos": "Orçamentos", "/clientes": "Clientes",
      "/orcamentos/novo": "Novo orçamento", "/orcamentos/novo/cliente": "Selecionar cliente",
      "/orcamentos/novo/cadastro": "Cadastrar cliente", "/orcamentos/novo/producao": "Novo orçamento",
      "/papel": "Papel", "/configuracao": "Configurações", "/relatorios": "Relatórios",
      "/usuarios": "Usuários", "/login": "Entrar", "/cadastro": "Criar conta",
    };
    const title = titles[location.pathname] || (location.pathname.includes("/editar") ? "Editar orçamento" : location.pathname.includes("/status-orcamento/") ? "Detalhes do orçamento" : "Gráfica Máxima");
    document.title = `${title} | Gráfica Máxima`;
    if (previousPath.current !== location.pathname) {
      requestAnimationFrame(() => document.querySelector("[data-page-title]")?.focus({ preventScroll: true }));
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <>
      <AppRoutes usuario={usuario} />
      {usuario && (
        <>
          <button
            className="calculator-toggle"
            type="button"
            title="Calculadora de m²"
            aria-label="Calculadora de m²"
            aria-expanded={calculadora}
            aria-haspopup="dialog"
            onClick={() => setCalculadora((open) => !open)}
          >
            m²
          </button>
          {calculadora && (
            <div className="calculator-window">
            <CalculadoraM2 aoFechar={() => {
              setCalculadora(false);
              requestAnimationFrame(() => document.querySelector(".calculator-toggle")?.focus());
            }} />
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Application />
    </AppProviders>
  );
}
