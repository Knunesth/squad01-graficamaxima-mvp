import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3301', timeout: 10000, withCredentials: true });
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config?.url?.startsWith('/api/auth/')) window.dispatchEvent(new Event('session-expired'));
  return Promise.reject(error);
});
export function mensagemErro(error) {
  return error.response?.data?.error || (error.code === 'ECONNABORTED' ? 'A operação demorou mais que o esperado. Confira a conexão e tente novamente.' : 'Não foi possível conectar ao servidor. Tente novamente.');
}
export default api;
