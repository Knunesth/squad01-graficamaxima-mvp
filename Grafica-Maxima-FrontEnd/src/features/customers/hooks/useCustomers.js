import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/shared/services/api.js";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await api.get("/api/clientes")).data,
  });
}

export function useSalvarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = id
        ? await api.put(`/api/clientes/${id}`, payload)
        : await api.post("/api/clientes", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    },
  });
}

export function useExcluirCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/clientes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientes"] }),
  });
}
