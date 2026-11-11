import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/shared/services/api.js";

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data } = await api.get("/api/auth/usuarios");
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSalvarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id_usuario, tipo, ativo }) => {
      const { data } = await api.patch(`/api/auth/usuarios/${id_usuario}`, {
        tipo,
        ativo,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: async ({ id_usuario, nova_senha }) => {
      const { data } = await api.patch(`/api/auth/usuarios/${id_usuario}/senha`, { nova_senha });
      return data;
    },
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: async ({ senha_atual, nova_senha }) => {
      const { data } = await api.post("/api/auth/password", { senha_atual, nova_senha });
      return data;
    },
  });
}
