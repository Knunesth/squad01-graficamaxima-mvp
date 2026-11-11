import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { ToastContext } from "@/shared/hooks/useToast.js";

const DURACAO = { success: 5000, error: 8000 };
let sequencia = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      if (!message) return;
      const id = `toast-${++sequencia}`;
      // Mensagem repetida substitui a anterior; no máximo três na tela.
      setToasts((atuais) => [
        ...atuais.filter((toast) => toast.message !== message).slice(-2),
        { id, type, message },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURACAO[type]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pendentes = timers.current;
    return () => pendentes.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-label="Avisos">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            {toast.type === "error" ? (
              <CircleAlert size={20} aria-hidden="true" />
            ) : (
              <CircleCheck size={20} aria-hidden="true" />
            )}
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast-close"
              aria-label="Fechar aviso"
              onClick={() => dismiss(toast.id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
