function assertSeedAllowed(env = process.env) {
  if (env.NODE_ENV === "production" && env.ALLOW_SEED_IN_PRODUCTION !== "true") {
    throw new Error(
      "Seed bloqueado em produção. Para uma exceção intencional, defina ALLOW_SEED_IN_PRODUCTION=true.",
    );
  }
}

module.exports = { assertSeedAllowed };
