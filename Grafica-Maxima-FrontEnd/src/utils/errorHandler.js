/**
 * Converte erros técnicos em mensagens de negócio para o usuário final.
 * Pode ser integrado a um serviço de monitoramento (Sentry) no futuro.
 * 
 * @param {Error|import('axios').AxiosError} error - Objeto de erro capturado
 * @param {string} fallbackMessage - Mensagem padrão caso não haja mapeamento claro
 * @returns {string} Mensagem tratada para exibição
 */
export function handleError(error, fallbackMessage = 'Ocorreu um erro inesperado. Tente novamente.') {
  // TODO: Fase 5 - Integrar com Sentry (se ativado via env)
  // if (import.meta.env.VITE_ENABLE_SENTRY) Sentry.captureException(error);

  if (!error) return fallbackMessage;

  // Erro retornado pela nossa própria API
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // Erros de Timeout
  if (error.code === 'ECONNABORTED') {
    return 'A operação demorou mais que o esperado. Confira sua conexão e tente novamente.';
  }

  // Mapeamento de status HTTP comuns para erros de negócio
  const status = error.response?.status;
  if (status) {
    switch (status) {
      case 401:
        return 'Sua sessão expirou ou você não tem permissão. Faça login novamente.';
      case 403:
        return 'Você não tem permissão para realizar esta ação.';
      case 404:
        return 'O recurso solicitado não foi encontrado.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Não foi possível conectar ao servidor. Verifique sua conexão ou tente mais tarde.';
      default:
        return fallbackMessage;
    }
  }

  return fallbackMessage;
}
