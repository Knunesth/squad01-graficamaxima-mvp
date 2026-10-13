const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function getAllowedOrigins(env = process.env) {
  const configured = (env.CORS_ORIGINS || env.FRONTEND_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return [...new Set([
    ...configured,
    ...(env.NODE_ENV === 'production' ? [] : developmentOrigins),
  ])];
}

module.exports = { getAllowedOrigins };
