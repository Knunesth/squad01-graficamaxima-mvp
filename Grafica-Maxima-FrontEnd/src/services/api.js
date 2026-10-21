import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3301', timeout: 10000, withCredentials: true });
api.interceptors.response.use(response => response, error => {
  const publicAuthRequest = ['/api/auth/login', '/api/auth/register', '/api/auth/me'].includes(error.config?.url);
  if (error.response?.status === 401 && !publicAuthRequest) window.dispatchEvent(new Event('session-expired'));
  return Promise.reject(error);
});
export function mensagemErro(error) {
  return error.response?.data?.error || (error.code === 'ECONNABORTED' ? 'A operação demorou mais que o esperado. Confira a conexão e tente novamente.' : 'Não foi possível conectar ao servidor. Tente novamente.');
}
export default api;
