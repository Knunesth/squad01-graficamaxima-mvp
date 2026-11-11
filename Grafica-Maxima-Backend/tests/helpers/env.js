// Ambiente determinístico para os testes unitários.
//
// Deve ser o PRIMEIRO require de cada arquivo de teste: vários módulos chamam
// `dotenv.config()` e leem `process.env` no momento do require. Como o dotenv
// não sobrescreve variáveis já definidas, o que for fixado aqui prevalece
// sobre qualquer `.env` local.
//
// DATABASE_URL aponta para uma porta fechada em loopback: o pool do `pg` é
// preguiçoso, então nenhum teste unitário consegue tocar em um banco real.
const crypto = require('node:crypto');

Object.assign(process.env, {
  DOTENV_CONFIG_QUIET: 'true',
  NODE_ENV: 'test',
  TZ: 'America/Sao_Paulo',
  DATABASE_URL: 'postgresql://unit:unit@127.0.0.1:1/unit',
  DATABASE_SSL: 'disable',
  DATABASE_SSL_CA: '',
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  CORS_ORIGINS: 'http://localhost:5173',
  FRONTEND_URL: '',
  TRUST_PROXY: 'false',
  LOGIN_RATE_LIMIT_WINDOW_MS: '900000',
  LOGIN_RATE_LIMIT_MAX: '1000',
  WHATSAPP_MODE: 'mock',
  WHATSAPP_ACCESS_TOKEN: '',
  WHATSAPP_PHONE_NUMBER_ID: '',
  WHATSAPP_DEFAULT_RECIPIENT: '',
  MAX_RECIPIENTS_ACTIVE: '5',
  MAX_RECIPIENTS_TOTAL: '10',
  REPORT_TIMEZONE: 'America/Sao_Paulo',
  REPORT_WEEKLY_CRON: '0 8 * * 1',
  REPORT_MONTHLY_CRON: '0 8 1 * *',
});

/** Executa `fn` e devolve o erro lançado (ou falha se nada for lançado). */
function capturarErro(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Era esperado um erro, mas a função retornou normalmente.');
}

/** Captura tudo que for escrito em stdout/stderr durante `fn`. */
async function capturarSaida(fn) {
  const saida = { stdout: '', stderr: '' };
  const originais = {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr),
  };
  process.stdout.write = (chunk) => { saida.stdout += String(chunk); return true; };
  process.stderr.write = (chunk) => { saida.stderr += String(chunk); return true; };
  try {
    await fn();
  } finally {
    process.stdout.write = originais.stdout;
    process.stderr.write = originais.stderr;
  }
  return saida;
}

module.exports = { capturarErro, capturarSaida };
