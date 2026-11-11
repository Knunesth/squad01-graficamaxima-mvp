const { rateLimit } = require("express-rate-limit");

function positiveInteger(value, fallback, name) {
  const parsed = Number(value || fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }
  return parsed;
}

function createLoginRateLimiter({ env = process.env, store } = {}) {
  return rateLimit({
    windowMs: positiveInteger(env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000, "LOGIN_RATE_LIMIT_WINDOW_MS"),
    limit: positiveInteger(env.LOGIN_RATE_LIMIT_MAX, 20, "LOGIN_RATE_LIMIT_MAX"),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
    ...(store ? { store } : {}),
  });
}

module.exports = { createLoginRateLimiter };
