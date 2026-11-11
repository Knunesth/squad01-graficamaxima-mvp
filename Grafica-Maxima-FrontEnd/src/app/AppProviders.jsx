import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionContext } from "./SessionContext";
import api from "@/shared/services/api";
import { ToastProvider } from "@/shared/components/ui/Toast.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  },
});

export function AppProviders({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/api/auth/me", { signal: controller.signal })
      .then(({ data }) => setUsuario(data.usuario))
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const expired = () => {
      setUsuario(null);
      queryClient.clear();
    };
    window.addEventListener("session-expired", expired);
    return () => {
      controller.abort();
      window.removeEventListener("session-expired", expired);
    };
  }, []);

  if (loading)
    return (
      <p className="loading-session" role="status">
        Carregando sessão...
      </p>
    );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={{ usuario, setUsuario }}>
        <ToastProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </ToastProvider>
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}
