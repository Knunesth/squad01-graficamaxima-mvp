import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

async function fetchOrcamentos(query) {
  const { data } = await api.get('/api/orcamentos', { params: { ...query, limit: 8 } });
  return data;
}

export function useOrcamentos(query) {
  return useQuery({
    queryKey: ['orcamentos', query],
    queryFn: () => fetchOrcamentos(query),
    keepPreviousData: true,
  });
}

export function useAlternarStatusOrcamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, versao }) => {
      const { data } = await api.put(`/api/orcamentos/status-orcamento/${id}`, { status, versao });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', String(variables.id)] });
    },
  });
}

export function useOrcamento(id) {
  return useQuery({
    queryKey: ['orcamento', String(id)],
    queryFn: async () => {
      const { data } = await api.get(`/api/orcamentos/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDeletarOrcamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/orcamentos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSalvarOrcamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id) {
        const { data } = await api.put(`/api/orcamentos/${id}`, payload);
        return data;
      } else {
        const { data } = await api.post('/api/orcamentos', payload);
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['orcamento', String(variables.id)] });
      }
    },
  });
}
