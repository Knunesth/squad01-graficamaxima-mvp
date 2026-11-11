import { afterEach, describe, expect, it, vi } from "vitest";
import api, { mensagemErro } from "@/shared/services/api.js";

describe("api — configuração", () => {
  it("envia cookies de sessão e limita a espera a 10 segundos", () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout).toBe(10000);
  });
});

describe("api — sessão expirada", () => {
  const ouvinte = vi.fn();
  afterEach(() => {
    window.removeEventListener("session-expired", ouvinte);
    ouvinte.mockClear();
  });

  // Adapter falso: simula a resposta do servidor sem tocar na rede.
  const responder = (status) => (config) =>
    Promise.reject(
      Object.assign(new Error(`HTTP ${status}`), { config, response: { status, data: { error: "x" } } }),
    );

  it("avisa o app quando uma rota protegida responde 401", async () => {
    window.addEventListener("session-expired", ouvinte);
    await expect(api.get("/api/clientes", { adapter: responder(401) })).rejects.toThrow();
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("não dispara em 401 das rotas de autenticação", async () => {
    window.addEventListener("session-expired", ouvinte);
    for (const url of ["/api/auth/login", "/api/auth/register", "/api/auth/me", "/api/auth/password"]) {
      await expect(api.post(url, {}, { adapter: responder(401) })).rejects.toThrow();
    }
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it("não dispara em outros erros", async () => {
    window.addEventListener("session-expired", ouvinte);
    for (const status of [403, 404, 422, 500]) {
      await expect(api.get("/api/clientes", { adapter: responder(status) })).rejects.toThrow();
    }
    expect(ouvinte).not.toHaveBeenCalled();
  });
});

describe("mensagemErro", () => {
  it("usa a mensagem da API quando existe", () => {
    expect(mensagemErro({ response: { data: { error: "Status inválido." } } })).toBe("Status inválido.");
  });

  it("diferencia tempo esgotado de falha de conexão", () => {
    expect(mensagemErro({ code: "ECONNABORTED" })).toMatch(/demorou mais que o esperado/);
    expect(mensagemErro({ code: "ERR_NETWORK" })).toBe("Não foi possível conectar ao servidor. Tente novamente.");
    expect(mensagemErro({ response: { status: 500, data: {} } })).toBe(
      "Não foi possível conectar ao servidor. Tente novamente.",
    );
  });
});
