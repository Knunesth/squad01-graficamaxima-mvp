import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';

export function useCatalogo() {
  return useQuery({
    queryKey: ['catalogo'],
    queryFn: async () => {
      const { data } = await api.get('/api/materiais');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useSalvarMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id) {
        const { data } = await api.put(`/api/materiais/${id}`, payload);
        return data;
      } else {
        const { data } = await api.post('/api/materiais', payload);
        return data;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo'] })
  });
}

export function useDeletarMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/materiais/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogo'] })
  });
}
