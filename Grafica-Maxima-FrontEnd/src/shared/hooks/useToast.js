import { createContext, useContext } from "react";

// Sem provedor (por exemplo, em um teste isolado) os avisos viram no-op,
// para que nenhuma tela quebre por falta dele.
const semProvedor = { success() {}, error() {}, dismiss() {} };

export const ToastContext = createContext(semProvedor);

/**
 * Avisos curtos de sucesso ou erro, exibidos no canto da tela ao final de
 * uma ação (salvar, excluir, mudar status).
 *
 * @returns {{ success(message: string): void, error(message: string): void, dismiss(id: string): void }}
 */
export function useToast() {
  return useContext(ToastContext);
}
