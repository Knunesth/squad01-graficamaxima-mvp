import { useContext, useState } from "react";
import { AppProviders } from "./AppProviders";
import { AppRoutes } from "./AppRoutes";
import { SessionContext } from "./SessionContext";
import CalculadoraM2 from "@/features/calculator/CalculatorM2";

function Application() {
  const { usuario } = useContext(SessionContext);
  const [calculadora, setCalculadora] = useState(false);
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
            onClick={() => setCalculadora((open) => !open)}
          >
            m²
          </button>
          {calculadora && (
            <div className="calculator-window">
              <CalculadoraM2 aoFechar={() => setCalculadora(false)} />
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
