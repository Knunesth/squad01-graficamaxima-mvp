const logger = require('../utils/logger');

module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const databaseStatuses = {
    "22P02": 422,
    "23502": 422,
    "23503": 409,
    "23505": 409,
    "23514": 422,
    "22001": 422,
    "40001": 409,
  };
  const status = error.status || databaseStatuses[error.code] || 500;
  const databaseMessages = {
    "23503": "O registro está vinculado a outros dados.",
    "23505": "Já existe um registro com esses dados.",
    "23514": "Os dados informados não são válidos.",
    "22P02": "O formato de um dos campos é inválido.",
    "23502": "Preencha os campos obrigatórios.",
    "22001": "Um dos campos excedeu o tamanho permitido.",
    "40001": "O registro mudou durante a operação. Tente novamente.",
  };
  if (status >= 500) logger.error('request_failed', {
    requestId: req.requestId,
    statusCode: status,
    code: typeof error.code === 'string' ? error.code : undefined,
  });
  res
    .status(status)
    .json({
      error:
        status >= 500
          ? "Não foi possível concluir a operação. Tente novamente."
          : databaseMessages[error.code] || error.message,
    });
};
