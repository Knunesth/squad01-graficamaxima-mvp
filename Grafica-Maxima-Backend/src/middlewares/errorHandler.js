module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  if (status >= 500) console.error(`[${req.method} ${req.path}]`, error.code || error.message);
  res.status(status).json({ error: status >= 500 ? 'Não foi possível concluir a operação. Tente novamente.' : error.message });
};
