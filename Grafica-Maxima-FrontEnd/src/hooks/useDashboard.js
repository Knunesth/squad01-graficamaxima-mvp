import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

async function fetchDashboard(mes) {
  const { data } = await api.get('/api/dashboard', { params: { mes } });
  return data;
}

export function useDashboard(mes) {
  return useQuery({
    queryKey: ['dashboard', mes],
    queryFn: () => fetchDashboard(mes),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}
