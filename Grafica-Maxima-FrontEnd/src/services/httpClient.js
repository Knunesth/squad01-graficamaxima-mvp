import axios from 'axios';
import { handleError } from '../utils/errorHandler';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3301',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para tratamento global e unificado de resposta
httpClient.interceptors.response.use(
  (response) => {
    // Pode-se extrair diretamente os dados aqui se for o padrão do projeto
    // return response.data;
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/api/auth/')) {
      // Dispara evento global de sessão expirada para o front-end deslogar
      window.dispatchEvent(new Event('session-expired'));
    }
    
    // Anexa uma mensagem amigável no objeto de erro para facilitar a UI
    error.friendlyMessage = handleError(error);
    
    return Promise.reject(error);
  }
);

export default httpClient;
