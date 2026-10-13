import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';

export function useTiposCalculo() {
  return useQuery({
    queryKey: ['tiposCalculo'],
    queryFn: async () => {
      const { data } = await api.get('/api/calculo/tipos');
      return data.tipos;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useSalvarTipoCalculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, preco_base_m2 }) => {
      const { data } = await api.put('/api/calculo/tipos/atualizar', { tipo, preco_base_m2 });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tiposCalculo'] })
  });
}
